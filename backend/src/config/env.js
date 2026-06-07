import dotenv from "dotenv";

dotenv.config();

const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

const corsOrigin = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173,https://safe-497123.web.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  port: Number(process.env.PORT || 8080),
  corsOrigin,
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_API,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  groqApiKey: process.env.GROQ_API_KEY || process.env.GROK_API_KEY || null,
  emailFrom: process.env.EMAIL_FROM || "SAFE <no-reply@safe.local>",
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};
