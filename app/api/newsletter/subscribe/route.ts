import { NextRequest, NextResponse } from "next/server";
import { getSupabaseBypassClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email-provider";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = await getSupabaseBypassClient();

    // Insert into newsletter_subscribers, ignore if it already exists (conflict on unique constraint)
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email: email.toLowerCase().trim() },
        { onConflict: "email", ignoreDuplicates: true }
      );

    if (error) {
      console.error("[api/newsletter/subscribe] Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Send welcome email
    const subject = "Welcome to Helixa Automation!";
    const html = `
      <div style="font-family: sans-serif; background-color: #03010A; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid rgba(255,255,255,0.08);">
        <h1 style="color: #ffe14d; font-family: Georgia, serif; font-size: 28px; margin-bottom: 20px; text-align: center;">You're Subscribed!</h1>
        <p style="color: #d4d4d4; font-size: 15px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
          Thank you for subscribing to Helixa. You've been successfully subscribed to Helixa Automation updates.
          We will keep you in the loop with weekly newsletters, product updates, and new features to level up your Instagram workflows.
        </p>
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="https://helixa.app/dashboard" style="background-color: #ffe14d; color: #03010A; font-weight: bold; text-decoration: none; padding: 12px 30px; border-radius: 9999px; font-size: 14px; display: inline-block;">Start Building Now</a>
        </div>
        <p style="color: #555555; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 30px; text-align: center;">
          If you didn't request this, you can safely ignore this email. Helixa — Instagram Automation Platform.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject,
      html
    }).catch(err => {
      console.error("[api/newsletter/subscribe] Welcome email failed to send:", err);
    });

    return NextResponse.json({ ok: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("[api/newsletter/subscribe] Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
