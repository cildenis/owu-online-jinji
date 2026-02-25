import { NextResponse } from 'next/server';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const dynamic = 'force-dynamic';

// PDF.js worker configuration
if (typeof window === 'undefined') {
  // Server-side
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// PDF Text Extraction
async function extractTextFromPDF(buffer) {
  try {
    console.log('PDF テキスト抽出を開始しています...');

    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    console.log('PDFテキスト抽出が完了しました。');
    return fullText;
  } catch (error) {
    console.error('PDF抽出エラー:', error);
    return 'PDF テキスト抽出に失敗しました。';
  }
}

// DOCX Text Extraction (Simple - Word için mammoth kullanılabilir)
async function extractTextFromDOCX(buffer) {
  try {
    console.log('DOCX テキスト抽出を開始しています...');

    // Basit text extraction - production'da mammoth kullan
    const text = buffer.toString('utf-8');

    console.log('DOCXテキスト抽出が完了しました。');
    return text;
  } catch (error) {
    console.error('DOCX抽出エラー:', error);
    return 'DOCX テキスト抽出に失敗しました。';
  }
}

export async function POST(request) {
  try {
    console.log('アプリケーションリクエストを受信しました。');

    const formData = await request.formData();

    const cvFile = formData.get('cvFile');
    const applicantName = formData.get('applicantName');
    const applicantEmail = formData.get('applicantEmail');
    const applicantPhone = formData.get('applicantPhone');
    const message = formData.get('message');
    const jobId = formData.get('jobId');
    const jobTitle = formData.get('jobTitle');
    const jobDescription = formData.get('jobDescription');
    const jobRequirements = formData.get('jobRequirements');

    if (!cvFile || !applicantName || !applicantEmail) {
      return NextResponse.json(
        { success: false, error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    console.log('アプリケーション情報:', {
      applicantName,
      applicantEmail,
      fileName: cvFile.name
    });

    // 1. CV'yi Firebase Storage'a yükle
    console.log('Firebase Storage にアップロードしています...');

    const timestamp = Date.now();
    const fileName = `cvs/${timestamp}_${cvFile.name}`;
    const storageRef = ref(storage, fileName);

    const arrayBuffer = await cvFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadBytes(storageRef, buffer, {
      contentType: cvFile.type
    });

    const cvUrl = await getDownloadURL(storageRef);
    console.log('履歴書をアップロードしました:', cvUrl);

    // 2. Text Extraction
    let cvText = '';

    if (cvFile.type === 'application/pdf') {
      cvText = await extractTextFromPDF(buffer);
    } else if (cvFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cvText = await extractTextFromDOCX(buffer);
    } else {
      cvText = 'サポートされていないファイル形式';
    }

    console.log('履歴書テキスト（最初の200文字）:', cvText.substring(0, 200));

    // 3. Firestore'a kaydet
    console.log('Firestore に保存しています...');

    const applicationData = {
      applicantName,
      applicantEmail,
      applicantPhone: applicantPhone || '',
      message: message || '',
      jobId,
      jobTitle,
      jobDescription,
      jobRequirements,
      cvUrl,
      cvText,
      cvFileName: cvFile.name,
      status: 'pending',
      appliedAt: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'applications'), applicationData);
    console.log('Firestore に保存されました:', docRef.id);

    // 4. Confirmation Email Gönder
    console.log('確認メールを送信しています...');

    try {
      const emailResponse = await fetch(`${request.nextUrl.origin}/api/send-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantName,
          applicantEmail,
          jobTitle
        })
      });

      const emailData = await emailResponse.json();

      if (emailData.success) {
        console.log('確認メールを送信しました!');
      } else {
        console.error('メールを送信できませんでした:', emailData.error);
      }
    } catch (emailError) {
      console.error('メール送信エラー:', emailError);
      // Mail hatası uygulamayı durdurmasın
    }

    return NextResponse.json({
      success: true,
      applicationId: docRef.id,
      message: '応募が完了しました'
    });

  } catch (error) {
    console.error('アプリケーション エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}