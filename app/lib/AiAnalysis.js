// AiAnalysis.js - Sadece API çağrısı yapacak
export async function analyzeCVWithAI(cvText, jobTitle, jobDescription, jobRequirements) {
  try {
    console.log('AI履歴書分析が始まります...');

    // Backend API'ye istek gönder
    const response = await fetch('/api/analyze-cv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvText,
        jobTitle,
        jobDescription: `${jobDescription}\n必要なスキル: ${jobRequirements}`
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '分析に失敗しました');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    console.log('AI分析が完了しました:', data.analysis);
    
    return {
      success: true,
      analysis: data.analysis
    };

  } catch (error) {
    console.error('AI分析エラー:', error);
    return {
      success: false,
      error: error.message,
      analysis: fallbackAnalysis(cvText, jobRequirements || '')
    };
  }
}

// Fallback: APIが使えない場合の簡易分析
function fallbackAnalysis(cvText, requirements) {
  const keywords = requirements.toLowerCase().split(/[,、\s]+/);
  const text = cvText.toLowerCase();
  
  let score = 50;
  const foundSkills = [];
  
  keywords.forEach(keyword => {
    if (keyword.trim() && text.includes(keyword.trim())) {
      score += 8;
      foundSkills.push(keyword.trim());
    }
  });
  
  score = Math.min(score, 98);
  
  return {
    score: score,
    strengths: foundSkills.length > 0 ? foundSkills.slice(0, 3) : ["キーワードマッチ分析"],
    weaknesses: ["詳細な分析にはAIが必要です"],
    comment: `キーワードマッチング分析。見つかったスキル: ${foundSkills.join(', ') || 'なし'}`
  };
}