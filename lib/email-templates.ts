export interface EmailTemplateData {
  template: 'product_update' | 'new_feature' | 'announcement' | 'trial_expiring' | 'promotion' | 'recap' | 'custom';
  subject: string;
  previewText?: string;
  heroImage?: string;
  heading: string;
  subheading?: string;
  bodyText?: string;
  features?: string[];
  ctaText?: string;
  ctaUrl?: string;
  customerName?: string;
}

export function generateEmailHtml(data: EmailTemplateData): string {
  const brandColor = "#ffe14d";
  const brandDark = "#03010A";
  const textColor = "#d4d4d4";
  const linkColor = "#ffe14d";
  
  const logoUrl = "https://helixa.app/logo.png"; // Placeholder logo
  const websiteUrl = "https://helixa.app";
  const appName = "Helixa";

  // Personalization replacement helper
  const personalize = (text: string) => {
    if (!text) return "";
    return text.replace(/{{customer_name}}/g, data.customerName || "there");
  };

  const bodyContent = personalize(data.bodyText || "");
  const headingContent = personalize(data.heading);
  const subheadingContent = personalize(data.subheading || "");

  const hasFeatures = data.features && data.features.length > 0;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${data.subject}</title>
  
  <!--[if mso]>
    <style>
      table {border-collapse:collapse;border-spacing:0;border:none;margin:0;}
      div, td {padding:0;}
      div {margin:0 !important;}
    </style>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
  <![endif]-->

  <style>
    /* Reset styles */
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: ${brandDark};
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    div[style*="margin: 16px 0"] {
      margin: 0 !important;
    }
    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    table {
      border-spacing: 0 !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      margin: 0 auto !important;
    }
    img {
      -ms-interpolation-mode:bicubic;
      border:0;
      height:auto;
      line-height:100%;
      outline:none;
      text-decoration:none;
    }
    a {
      text-decoration: none;
      color: ${linkColor};
    }
    .button-link {
      color: #000000 !important;
      background-color: ${brandColor};
      border-radius: 8px;
      display: inline-block;
      font-weight: bold;
      text-align: center;
      text-decoration: none;
      padding: 14px 28px;
      -webkit-text-size-adjust: none;
    }
    
    /* Responsive utilities */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: auto !important;
      }
      .fluid {
        max-width: 100% !important;
        height: auto !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      .stack-column,
      .stack-column-center {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        direction: ltr !important;
      }
      .stack-column-center {
        text-align: center !important;
      }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: ${brandDark};">
  <center style="width: 100%; background-color: ${brandDark};">
    ${data.previewText ? `
    <!-- Preview Text Spacing Hack -->
    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
      ${data.previewText}
      &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    ` : ''}

    <!-- Email Container -->
    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto;" class="email-container">
      
      <!-- Header / Logo -->
      <tr>
        <td style="padding: 40px 20px 20px 20px; text-align: center;">
          <a href="${websiteUrl}" target="_blank" style="text-decoration: none;">
            <h1 style="margin:0; font-family: sans-serif; font-size: 28px; line-height: 28px; color: #ffffff; font-weight: 800; letter-spacing: -1px;">
              HELIXA<span style="color: ${brandColor};">.</span>
            </h1>
          </a>
        </td>
      </tr>

      ${data.heroImage ? `
      <!-- Hero Image -->
      <tr>
        <td style="padding: 0 20px 20px 20px; text-align: center;">
          <img src="${data.heroImage}" width="560" alt="Hero Image" border="0" style="width: 100%; max-width: 560px; height: auto; background: #222222; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555; margin: auto; display: block; border-radius: 12px;" class="fluid">
        </td>
      </tr>
      ` : ''}

      <!-- Main Body Content -->
      <tr>
        <td style="background-color: #0d0b14; border-radius: 16px; border: 1px solid #ffffff15; padding: 40px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            
            <!-- Heading -->
            <tr>
              <td style="font-family: sans-serif; font-size: 26px; line-height: 34px; color: #ffffff; font-weight: bold; padding-bottom: ${subheadingContent ? '10px' : '20px'};">
                ${headingContent}
              </td>
            </tr>

            <!-- Subheading -->
            ${subheadingContent ? `
            <tr>
              <td style="font-family: sans-serif; font-size: 18px; line-height: 26px; color: ${textColor}; padding-bottom: 20px;">
                ${subheadingContent}
              </td>
            </tr>
            ` : ''}

            <!-- Body Text -->
            ${bodyContent ? `
            <tr>
              <td style="font-family: sans-serif; font-size: 16px; line-height: 26px; color: #a1a1aa; padding-bottom: 24px; white-space: pre-wrap;">${bodyContent}</td>
            </tr>
            ` : ''}

            <!-- Features List -->
            ${hasFeatures ? `
            <tr>
              <td style="padding-bottom: 30px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${data.features!.map(feature => `
                  <tr>
                    <td valign="top" style="padding: 0 10px 12px 0; width: 24px;">
                      <img src="https://img.icons8.com/color/48/000000/checked--v1.png" width="20" height="20" alt="✓" style="display: block;">
                    </td>
                    <td valign="top" style="font-family: sans-serif; font-size: 16px; line-height: 24px; color: #e4e4e7; padding-bottom: 12px;">
                      ${personalize(feature)}
                    </td>
                  </tr>
                  `).join('')}
                </table>
              </td>
            </tr>
            ` : ''}

            <!-- CTA Button -->
            ${data.ctaText && data.ctaUrl ? `
            <tr>
              <td style="padding-top: 10px; padding-bottom: 10px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius: 8px; background: ${brandColor}; text-align: center;" class="button-td">
                      <a href="${data.ctaUrl}" class="button-link" style="background: ${brandColor}; border: 1px solid ${brandColor}; font-family: sans-serif; font-size: 15px; line-height: 15px; text-decoration: none; padding: 14px 28px; color: #000000; display: block; border-radius: 8px; font-weight: 700;">${data.ctaText}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ` : ''}
            
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 40px 20px; font-family: sans-serif; font-size: 13px; line-height: 20px; color: #71717a; text-align: center;">
          <p style="margin: 0 0 10px 0;">
            © ${new Date().getFullYear()} ${appName}. All rights reserved.
          </p>
          <p style="margin: 0;">
            <a href="${websiteUrl}" style="color: #71717a; text-decoration: underline;">Helixa.app</a>
            &nbsp;•&nbsp;
            <a href="${websiteUrl}/unsubscribe" style="color: #71717a; text-decoration: underline;">Unsubscribe</a>
          </p>
        </td>
      </tr>

    </table>
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </center>
</body>
</html>
  `;
}
