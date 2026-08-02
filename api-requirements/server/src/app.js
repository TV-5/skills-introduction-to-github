import express from "express";
import cors from "cors";
import session from "express-session";
import "./db.js";
import { SESSION_SECRET } from "./adminAuth.js";
import { requirementsRouter } from "./routes/requirements.js";
import { assignmentsRouter } from "./routes/assignments.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  app.set("trust proxy", 1);
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
  app.use(express.json());
  app.use(
    session({
      name: "api_requirements_sid",
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 8 * 60 * 60 * 1000,
      },
    })
  );

  app.use("/api", adminRouter);
  app.use("/api", requirementsRouter);
  app.use("/api", assignmentsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "not found" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = status < 500 ? err.message : "unexpected error";
    res.status(status).json({ error: message });
  });

  return app;
}
