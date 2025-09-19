const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config()
const { verifyEmailConfig } = require("./utils/emailService")
const { isConfigured: isWhatsAppConfigured } = require("./utils/whatsappService")

const app = express()

// Security middleware
app.use(helmet())

// CORS configuration - uses FRONTEND_URL from .env (supports comma-separated list)
const envOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean)
// Provide sensible dev defaults if FRONTEND_URL is not set
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]
const allowedOrigins = envOrigins.length ? envOrigins : defaultDevOrigins

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`), false)
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'Cache-Control'
  ]
}

app.use(cors(corsOptions))

// Handle preflight requests for all routes
app.options('*', cors(corsOptions))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant-ordering", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/admin", require("./routes/admin"))
app.use("/api/subadmin", require("./routes/subadmin"))
app.use("/api/menu", require("./routes/menu"))
app.use("/api/categories", require("./routes/categories"))
app.use("/api/upload", require("./routes/upload"))
app.use("/api/orders", require("./routes/orders"))
app.use("/api/qr", require("./routes/qr"))

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Integrations health endpoint (email + WhatsApp)
app.get("/api/health/integrations", async (req, res) => {
  try {
    const emailStatus = await verifyEmailConfig()
    const whatsappStatus = { configured: !!isWhatsAppConfigured() }
    res.status(200).json({
      success: true,
      email: emailStatus,
      whatsapp: whatsappStatus,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || String(err) })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  // Startup integration checks (non-fatal)
  verifyEmailConfig().then((status) => {
    if (status.configured) {
      console.log("[Startup] Email transport verified: OK")
    } else {
      console.warn("[Startup] Email transport NOT configured:", status.error)
    }
  }).catch((e) => console.warn("[Startup] Email verify threw:", e?.message || e))

  const waConfigured = isWhatsAppConfigured()
  console.log(`[Startup] WhatsApp (Twilio) configured: ${waConfigured ? 'YES' : 'NO'}`)
})

module.exports = app