/**
 * Email Provider (Mailgun)
 * Abstracted to easily swap out for Resend, SES, or SendGrid later.
 */

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
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  
  // Default fallbacks from environment
  const finalFromName = fromName || process.env.MAILGUN_FROM_NAME || "Helixa";
  const finalFromEmail = fromEmail || process.env.MAILGUN_FROM_EMAIL || `hello@${domain}`;
  const finalReplyTo = replyTo || process.env.MAILGUN_REPLY_TO || finalFromEmail;

  if (!apiKey || !domain) {
    console.error("[email-provider] MAILGUN_API_KEY or MAILGUN_DOMAIN missing in environment.");
    return { success: false, error: "Missing email provider configuration" };
  }

  const from = `${finalFromName} <${finalFromEmail}>`;

  // Prepare Mailgun URL & form data
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  
  const formData = new URLSearchParams();
  formData.append("from", from);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);
  formData.append("h:Reply-To", finalReplyTo);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[email-provider] Mailgun error:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error("[email-provider] Request error:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
