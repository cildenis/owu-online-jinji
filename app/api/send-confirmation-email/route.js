import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic'; 

const resend = new Resend(process.env.RESEND_API_KEY); 

export async function POST(request) {
  try {
    const { applicantName, applicantEmail, jobTitle } = await request.json();

    console.log('確認メールを準備中です...');

    const { data, error } = await resend.emails.send({
      from: 'OwU HR <onboarding@resend.dev>',
      to: [applicantEmail],
      subject: `【OwU】応募受付完了 - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">OwU HR</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #2563eb; margin-top: 0;">応募を受け付けました</h2>
            
            <p style="color: #374151; line-height: 1.6;">${applicantName} 様</p>
            
            <p style="color: #374151; line-height: 1.6;">
              この度は、<strong style="color: #2563eb;">${jobTitle}</strong> にご応募いただき、誠にありがとうございます。
            </p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0; color: #1e40af; font-weight: 600;">📋 次のステップ</p>
              <ul style="color: #374151; margin: 10px 0 0 0; padding-left: 20px;">
                <li>書類選考を実施いたします</li>
                <li>AIによる自動分析を行います</li>
                <li>3〜5営業日以内にご連絡いたします</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              ※このメールは自動送信されています。<br/>
              ご不明な点がございましたら、hr@owu.com までお問い合わせください。
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>© 2025 OwU HR Management System. All rights reserved.</p>
          </div>
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

    console.log('確認メールを送信しました!');

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('メール API エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}