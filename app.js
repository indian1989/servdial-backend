// backend/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

// ================= SECURITY =================
app.use(helmet());

// ================= CORS =================
// 🔥 keep flexible now, but NOT broken for auth later
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ================= BODY PARSER =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= LOGGING =================
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ================= ROOT =================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🔥 ServDial API Running",
  });
});

// ================= 404 HANDLER =================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message || err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;