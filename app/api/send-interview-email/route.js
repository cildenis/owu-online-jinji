import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend
// Note: In production, use process.env.RESEND_API_KEY. 
// If specific client-side key needed, verify env names.
const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY || process.env.RESEND_API_KEY);

export async function POST(request) {
    try {
        const { applicantName, applicantEmail, jobTitle, score } = await request.json();

        if (!applicantEmail) {
            return NextResponse.json(
                { success: false, error: 'メールアドレスが必要です' },
                { status: 400 }
            );
        }

        console.log(`Sending interview email to ${applicantEmail} (Score: ${score})`);

        const { data, error } = await resend.emails.send({
            from: 'OwU HR <onboarding@resend.dev>',
            to: [applicantEmail],
            subject: `【OwU】面接のご案内 - ${jobTitle}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">OwU HR</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #059669; margin-top: 0;">おめでとうございます！</h2>
            
            <p style="color: #374151; line-height: 1.6;">${applicantName} 様</p>
            
            <p style="color: #374151; line-height: 1.6;">
              <strong style="color: #059669;">${jobTitle}</strong> へのご応募ありがとうございます。<br>
              書類選考（AI分析）の結果、ぜひ面接にお進みいただきたくご連絡いたしました。
            </p>

            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #a7f3d0;">
              <p style="margin: 0; color: #047857; font-weight: bold; text-align: center; font-size: 18px;">
                AI評価スコア: ${score} / 100
              </p>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              つきましては、下記ボタンよりご都合の良い日時をご予約ください。
            </p>

             <div style="text-align: center; margin: 30px 0;">
              <a href="https://calendly.com/" style="background-color: #059669; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">
                面接を予約する
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              ※このメールは自動送信されています。<br/>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>© 2025 OwU HR Management System. All rights reserved.</p>
          </div>
        </div>
      `
        });

        if (error) {
            console.error('Email send error:', error);
            // Don't fail the whole request just because email failed, but log it
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        console.log('Interview email sent successfully');

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Email API critical error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
