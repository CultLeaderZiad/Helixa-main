import { NextRequest, NextResponse } from "next/server";
import { getSupabaseBypassClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email-provider";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = await getSupabaseBypassClient();
    const normalizedName = (typeof name === "string" && name.trim()) ? name.trim() : null;

    // Insert into newsletter_subscribers, update name if already exists
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email: email.toLowerCase().trim(), name: normalizedName },
        { onConflict: "email" }
      );

    if (error) {
      console.error("[api/newsletter/subscribe] Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Send welcome email with personalization
    const greeting = normalizedName ? `Hey ${normalizedName},` : "Hey there,";
    const subject = "Welcome to Helixa Automation!";
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#03010A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <center style="width:100%;background-color:#03010A;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:auto;">
            <!-- Header -->
            <tr>
              <td style="padding:40px 20px 20px;text-align:center;">
                <a href="https://helixa.app" style="text-decoration:none;">
                  <h1 style="margin:0;font-family:sans-serif;font-size:28px;color:#ffffff;font-weight:800;letter-spacing:-1px;">HELIXA<span style="color:#ffe14d;">.</span></h1>
                </a>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="background-color:#0d0b14;border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:40px 30px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size:26px;line-height:34px;color:#ffffff;font-weight:bold;padding-bottom:16px;">
                      You're Subscribed! 🎉
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:18px;line-height:26px;color:#d4d4d4;padding-bottom:16px;">
                      ${greeting}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:16px;line-height:26px;color:#a1a1aa;padding-bottom:24px;">
                      Thank you for joining the Helixa community. You'll receive weekly updates on product news, new features, and tips to level up your Instagram automation workflows.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:10px;padding-bottom:10px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="border-radius:8px;background:#ffe14d;text-align:center;">
                            <a href="https://helixa.app/dashboard" style="background:#ffe14d;border:1px solid #ffe14d;font-size:15px;text-decoration:none;padding:14px 28px;color:#000000;display:block;border-radius:8px;font-weight:700;">Start Building Now</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:40px 20px;font-size:13px;line-height:20px;color:#71717a;text-align:center;">
                <p style="margin:0 0 10px 0;">© ${new Date().getFullYear()} Helixa. All rights reserved.</p>
                <p style="margin:0;">
                  <a href="https://helixa.app" style="color:#71717a;text-decoration:underline;">Helixa.app</a>
                  &nbsp;•&nbsp;
                  <a href="https://helixa.app/unsubscribe" style="color:#71717a;text-decoration:underline;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </center>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject,
      html,
    }).catch(err => {
      console.error("[api/newsletter/subscribe] Welcome email failed to send:", err);
    });

    return NextResponse.json({ ok: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("[api/newsletter/subscribe] Server error:", error);
    return NextResponse.json({ error: "Something went wrong subscribing. Please try again." }, { status: 500 });
  }
}
