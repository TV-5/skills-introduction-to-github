import { Router } from "express";
import { passwordMatches, isLockedOut, recordAttempt } from "../adminAuth.js";

export const adminRouter = Router();

adminRouter.get("/admin/session", (req, res) => {
  res.json({ authenticated: Boolean(req.session?.isAdmin) });
});

adminRouter.post("/admin/login", (req, res) => {
  const ip = req.ip;
  if (isLockedOut(ip)) {
    return res.status(429).json({ error: "too many failed attempts - try again in a minute" });
  }

  const { password } = req.body ?? {};
  const ok = passwordMatches(password);
  recordAttempt(ip, ok);

  if (!ok) {
    return res.status(401).json({ error: "incorrect password" });
  }

  req.session.isAdmin = true;
  res.json({ authenticated: true });
});

adminRouter.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});
