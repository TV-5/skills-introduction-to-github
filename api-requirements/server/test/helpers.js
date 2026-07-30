import request from "supertest";
import { createApp } from "../src/app.js";
import { db } from "../src/db.js";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function freshApp() {
  return createApp();
}

// All test cases in one file share the same in-memory DB (one process per
// test file under `node --test`) - call this between cases that shouldn't
// see each other's data. Section definitions are reseeded on every
// createApp()/db import and are left alone.
export function resetDb() {
  db.exec("DELETE FROM section_assignments; DELETE FROM api_requirements;");
}

export async function loginAgent(app) {
  const agent = request.agent(app);
  await agent.post("/api/admin/login").send({ password: ADMIN_PASSWORD });
  return agent;
}

export { request, db };
