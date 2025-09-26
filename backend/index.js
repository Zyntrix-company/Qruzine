const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const { verifyEmailConfig } = require("./utils/emailService");
const { isConfigured: isWhatsAppConfigured } = require("./utils/whatsappService");

const app = express();

// ---- Security middleware ----
app.use(helmet());

// ---- CORS Setup ----
const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const allowedOrigins = frontendUrl ? [frontendUrl] : [];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g., curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn("[CORS] Blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Handle preflight requests globally
app.options("*", cors(corsOptions));

// ---- Rate limiting ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use(limiter);

// ---- Body parsing middleware ----
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- MongoDB connection ----
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant-ordering", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---- Log incoming origins for debugging ----
app.use((req, res, next) => {
  console.log("[Incoming request] Origin:", req.headers.origin);
  next();
});

// ---- Routes ----
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/subadmin", require("./routes/subadmin"));
app.use("/api/menu", require("./routes/menu"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/qr", require("./routes/qr"));
app.use("/api/banner", require("./routes/banner"));

// ---- Health check endpoint ----
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ---- Integrations health endpoint ----
app.get("/api/health/integrations", async (req, res) => {
  try {
    const emailStatus = await verifyEmailConfig();
    const whatsappStatus = { configured: !!isWhatsAppConfigured() };
    res.status(200).json({
      success: true,
      email: emailStatus,
      whatsapp: whatsappStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// ---- Error handling middleware ----
app.use((err, req, res, next) => {
  console.error("[Error handler]", err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// ---- 404 handler ----
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ---- Server Startup ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("[Startup] CORS allowed origins:", allowedOrigins);

  verifyEmailConfig()
    .then((status) => {
      if (status.configured) {
        console.log("[Startup] Email transport verified: OK");
      } else {
        console.warn("[Startup] Email transport NOT configured:", status.error);
      }
    })
    .catch((e) => console.warn("[Startup] Email verify threw:", e?.message || e));

  const waConfigured = isWhatsAppConfigured();
  console.log(`[Startup] WhatsApp (Twilio) configured: ${waConfigured ? "YES" : "NO"}`);
});

module.exports = app;
