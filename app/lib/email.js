import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);

export async function POST(request) {
  try {
    const { applicantName, applicantEmail, score, jobTitle } = await request.json();

    console.log('面接メールを送信しています...');

    const { data, error } = await resend.emails.send({
      from: 'OwU HR <onboarding@resend.dev>',
      to: [applicantEmail],
      subject: `【OwU】面接のご案内 - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">面接のご案内</h2>
          
          <p>${applicantName} 様</p>
          
          <p>この度は、<strong>${jobTitle}</strong>にご応募いただき、誠にありがとうございます。</p>
          
          <p>書類選考の結果、次の選考（面接）にお進みいただくことになりました。</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>AIスコア:</strong> ${score}点</p>
          </div>
          
          <p>つきましては、下記の日程で面接を実施させていただきたく存じます。</p>
          
          <ul>
            <li>日時: 改めてご連絡いたします</li>
            <li>場所: オンライン（ミーティング）</li>
            <li>所要時間: 約30分</li>
          </ul>
          
          <p>ご都合の良い日時を3つほどお知らせいただけますと幸いです。</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            株式会社OwU 人事部<br>
            Email: hr@owu.com<br>
            Tel: 03-1234-5678
          </p>
        </div>
      `
    });

    if (error) {
      console.error('メール送信エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('メールが送信されました!');

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('メール送信エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}