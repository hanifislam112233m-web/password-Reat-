import { checkConfigStatus } from "./_notifications.js";

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const status = checkConfigStatus();

  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: status,
    instructions: {
      telegram: status.telegram.isConfigured
        ? "Telegram is configured properly!"
        : "Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel Project Settings > Environment Variables.",
      email: status.email.isConfigured
        ? "Gmail SMTP is configured properly!"
        : "Please set GMAIL_USER and GMAIL_APP_PASSWORD (16-char Google App Password) in Vercel Project Settings > Environment Variables.",
      googleSheet: status.googleSheet.isConfigured
        ? "Google Sheet integration is configured properly!"
        : "Please set GOOGLE_SHEET_WEBHOOK_URL in Vercel Project Settings > Environment Variables to append submissions into Google Sheet automatically.",
    },
  });
}
