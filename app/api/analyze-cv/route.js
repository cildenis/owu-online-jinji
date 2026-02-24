import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// PDF.js worker configuration
if (typeof window === 'undefined') {
  // Server-side
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// PDF Text Extraction
async function extractTextFromPDF(buffer) {
  try {
    console.log('PDF テキスト抽出を開始しています...');

    // In Node.js environment, we can pass the buffer directly or as Uint8Array
    const uint8Array = new Uint8Array(buffer);

    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      // Disable worker for simpler Node execution if possible, or ensure it works
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    console.log('PDFテキスト抽出が完了しました。文字数:', fullText.length);
    return fullText;
  } catch (error) {
    console.error('PDF抽出エラー:', error);
    // Return empty string but log error to allow fallback
    return '';
  }
}

export async function POST(request) {
  console.log('Analyze CV API request received');

  try {
    // 1. Check API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error('Auto-Analysis Error: OPENAI_API_KEY is missing');
      return NextResponse.json(
        { success: false, error: 'Server Configuration Error: OpenAI API Key is missing' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 2. Parse Request
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    let { cvText, cvFileUrl, jobTitle, jobDescription } = body;

    // 3. Handle extraction if needed
    if (!cvText && cvFileUrl) {
      console.log('cvText is empty, attempting to download from URL:', cvFileUrl);
      try {
        const fileResponse = await fetch(cvFileUrl);
        if (fileResponse.ok) {
          const arrayBuffer = await fileResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Check if PDF
          const isPdf = cvFileUrl.toLowerCase().includes('.pdf') ||
            fileResponse.headers.get('content-type')?.includes('pdf');

          if (isPdf) {
            console.log('File detected as PDF, extracting text...');
            cvText = await extractTextFromPDF(buffer);
          } else {
            console.log('File is not PDF (likely DOCX or other), simple fallback.');
            cvText = "履歴書ファイル (PDF以外) がアップロードされました。";
          }
        } else {
          console.error('Failed to fetch CV file. Status:', fileResponse.status);
        }
      } catch (fetchError) {
        console.error('CV File Fetch Error:', fetchError);
      }
    }

    if (!cvText || !jobTitle || !jobDescription) {
      console.log('Missing data:', { hasCvText: !!cvText, hasJobTitle: !!jobTitle, hasJobDesc: !!jobDescription });
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています (履歴書の内容を読み取れませんでした)' },
        { status: 400 }
      );
    }

    console.log('Starting AI Analysis with text length:', cvText.length);

    // Truncate cvText
    if (cvText.length > 12000) {
      console.log('Truncating CV text from', cvText.length, 'to 12000 chars');
      cvText = cvText.substring(0, 12000);
    }

    const prompt = `
あなたは人事採用の専門家です。以下の履歴書と求人情報を分析し、候補者の適合度を0から100で評価してください。

【求人情報】
タイトル: ${jobTitle}
説明: ${jobDescription}

【候補者の履歴書】
${cvText}

以下の基準で評価してください：
1. 技術スキルの一致度 (40点)
2. 経験年数と関連性 (30点)
3. 学歴とバックグラウンド (15点)
4. その他の資質（言語能力、資格など） (15点)

必ず以下のJSON形式で返してください：
{
  "score": 85,
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["弱み1", "弱み2"],
  "comment": "総合コメント（50文字程度）"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは経験豊富な人事採用の専門家です。候補者の履歴書を客観的かつ公正に評価します。必ずJSON形式で回答してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('OpenAI returned empty content');
    }

    const analysis = JSON.parse(responseContent); // Safe parse? OpenAI json_mode usually guarantees it but...
    console.log('AI Analysis complete. Score:', analysis.score);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('CRITICAL AI ANALYSIS ERROR:', error);
    console.error(error.stack);

    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';

    return NextResponse.json(
      {
        success: false,
        error: `System Error: ${message}`,
      },
      { status }
    );
  }
}