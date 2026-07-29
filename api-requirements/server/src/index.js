import express from "express";
import cors from "cors";
import session from "express-session";
import "./db.js";
import { SESSION_SECRET } from "./adminAuth.js";
import { requirementsRouter } from "./routes/requirements.js";
import { assignmentsRouter } from "./routes/assignments.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
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

app.listen(PORT, () => {
  console.log(`API requirements server listening on http://localhost:${PORT}`);
});
