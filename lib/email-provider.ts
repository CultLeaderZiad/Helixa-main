import { getSupabaseBypassClient } from "./supabase-server";
import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  fromName,
  fromEmail,
}: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const supabase = await getSupabaseBypassClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "smtp_settings")
      .maybeSingle();

    if (error || !data || !data.value) {
      console.error("[email-provider] Missing SMTP configuration in app_settings.");
      return { success: false, error: "Missing SMTP configuration. Please configure it in the Admin Dashboard." };
    }

    const { host, port, secure, user, pass, fromName: defaultFromName, fromEmail: defaultFromEmail } = data.value;

    if (!host || !port || !user || !pass) {
      return { success: false, error: "Incomplete SMTP configuration." };
    }

    const finalFromName = fromName || defaultFromName || "Helixa";
    const finalFromEmail = fromEmail || defaultFromEmail || user;
    const finalReplyTo = replyTo || finalFromEmail;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: secure ?? (Number(port) === 465), 
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${finalFromName}" <${finalFromEmail}>`,
      to,
      subject,
      html,
      replyTo: finalReplyTo,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[email-provider] Nodemailer error:", error);
    return { success: false, error: error.message || "Unknown error sending email" };
  }
}
