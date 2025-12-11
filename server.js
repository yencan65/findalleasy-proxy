import "dotenv/config";
import bcrypt from "bcryptjs";

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import crypto from "crypto";
import nodemailer from "nodemailer";
import cron from "node-cron";
import fs from "fs";
import path from "path";
// ================= ROUTE IMPORTLARI =================
import verifyRoutes from "./server/routes/verify.js";
import authRoutes from "./server/routes/auth.js";
import vitrineRoutes from "./server/routes/vitrine.js";
import suggestRoutes from "./server/routes/suggest.js";
import aiRoutes from "./server/routes/ai.js";
import learnRouter from "./server/routes/learn.js";
import productInfoRoute from "./server/routes/product-info.js";

import rewardsRoutes from "./server/routes/rewards.js";          // 🔥 EKSİK OLAN IMPORT EKLENDİ
import referralRoutes from "./server/routes/referral.js";
import clickRoutes from "./server/routes/click.js";
import affiliateCallbackRoutes from "./server/routes/affiliateCallback.js";
import interactionsRouter from "./server/routes/interactions.js";
import couponsRoutes from "./server/routes/coupons.js";
import orderCallbackRoutes from "./server/routes/orderCallback.js";
import walletRoutes from "./server/routes/wallet.js";
import ordersRoutes from "./server/routes/orders.js";
import affiliateRoutes from "./server/routes/affiliate.js";
import visionRoutes from "./server/routes/vision.js";
import revenueRoutes from "./server/routes/revenueRoutes.js";   // 🔥 DOĞRU PATH'E GEÇİRİLDİ
import redirectRoutes from "./server/routes/redirect.js";
import adminTelemetry from "./server/routes/adminTelemetry.js";
import { createServer } from "http";
import { createTelemetryWSS } from "./server/ws/telemetryWS.js";
import { getMetrics } from "./server/utils/metrics.js";
import imageProxyRoute from "./server/routes/imageProxy.js";

// MODELLER
import Profile from "./server/models/Profile.js";
import Memory from "./server/models/Memory.js";
import Order from "./server/models/Order.js";

// AI
import OpenAI from "openai";
import * as MistralPkg from "@mistralai/mistralai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// LEARNING
import { syncLearningToMongo } from "./server/core/learningSync.js";
// ==============================
//  Eksik yardımcı: isFn
// ==============================
function isFn(v) {
  return typeof v === "function";
}
function ok(res, data = {}, status = 200) {
  return res.status(status).json({ ok: true, ...data });
}

function fail(res, status = 400, data = {}) {
  return res.status(status).json({ ok: false, ...data });
}

// ===================================================
// GLOBAL HATA YAKALAMA
// ===================================================
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Promise Rejection:", { reason, promise });
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

// ===================================================
// EXPRESS
// ===================================================
const app = express();
const PORT = Number(process.env.PORT || 8080);

const FRONTEND_ORIGINS =
  (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());
	const httpServer = createServer(app);
createTelemetryWSS(httpServer);

httpServer.listen(PORT, () => {
  console.log("HTTP+WS server running on", PORT);
});

// VERİ TABANI SENK
setInterval(syncLearningToMongo, 300000);

// ===================================================
// CORS
// ===================================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "https://findalleasy.com",
  "https://www.findalleasy.com",
];

app.use(
  cors({
    origin(origin, callback) {
      // Origin yoksa (Postman / mobil uygulama) → İzin ver.
      if (!origin) return callback(null, true);

      // Tanınan bir origin ise → izin ver
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Diğer her şey engellenir
      console.warn("🚫 CORS REDDEDİLDİ:", origin);
      return callback(null, false);  // ❗ Artık hata fırlatmıyoruz
    },
    credentials: true,
  })
);

// Preflight desteği
app.options("*", cors());

// ===================================================
// HEALTH CHECK
// ===================================================
app.get("/health/raw", async (req, res) => {
  try {
    const mongoOk =
      globalThis.mongoose?.connection?.readyState === 1 || false;

    return res.json({
      ok: true,
      mongo: mongoOk,
      time: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "healthcheck error",
    });
  }
});
// ===================================================
// MIDDLEWARE
// ===================================================
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(bodyParser.json({ limit: "15mb" }));

// ===================================================
// ROUTER MOUNT
// ===================================================
app.use("/api/learn", learnRouter);

// AUTH
app.use("/api/auth", verifyRoutes);
app.use("/api/auth", authRoutes);

// VİTRİN
app.use("/api/vitrine", vitrineRoutes);   // yeni
app.use("/api/vitrin", vitrineRoutes);    // alias

// AI
app.use("/api/suggest", suggestRoutes);
app.use("/api/ai", aiRoutes);

// Barkod / ürün tanıma
app.use("/api", productInfoRoute);

// Rewards
app.use("/api/rewards", rewardsRoutes);

// Referral
app.use("/api/referral", referralRoutes);

// Click logs
app.use("/api", clickRoutes);

// Affiliate callback
app.use("/api", affiliateCallbackRoutes);

// Vitrin interactions
app.use("/api/vitrin/interactions", interactionsRouter);

// Coupons
app.use("/api/coupons", couponsRoutes);

// Order callback
app.use("/api/order", orderCallbackRoutes);

// Wallet
app.use("/api/wallet", walletRoutes);

// Orders
app.use("/api/orders", ordersRoutes);

// Affiliate
app.use("/api/affiliate", affiliateRoutes);

// Vision
app.use("/api", visionRoutes);

// Revenue (S9 memory engine)
app.use("/api/revenue", revenueRoutes);
//Redirect
app.use("/redirect", redirectRoutes);
//admin
app.use("/admin/telemetry", adminTelemetry);
//metrics
app.get("/metrics", getMetrics);
//ımage
app.use("/img", imageProxyRoute);

// ===================================================
