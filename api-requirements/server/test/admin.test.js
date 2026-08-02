import test from "node:test";
import assert from "node:assert/strict";
import { freshApp, request, ADMIN_PASSWORD } from "./helpers.js";

const app = freshApp();

test("GET /api/admin/session with no cookie -> not authenticated", async () => {
  const res = await request(app).get("/api/admin/session");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { authenticated: false });
});

test("correct password logs in and the session sticks", async () => {
  const agent = request.agent(app);

  const loginRes = await agent.post("/api/admin/login").send({ password: ADMIN_PASSWORD });
  assert.equal(loginRes.status, 200);
  assert.deepEqual(loginRes.body, { authenticated: true });

  const sessionRes = await agent.get("/api/admin/session");
  assert.deepEqual(sessionRes.body, { authenticated: true });
});

test("wrong password -> 401 with an error message", async () => {
  const res = await request(app).post("/api/admin/login").send({ password: "definitely-wrong" });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "incorrect password");
});

test("missing password field -> 401, not a crash", async () => {
  const res = await request(app).post("/api/admin/login").send({});
  assert.equal(res.status, 401);
});

test("non-string password (number) -> 401, not a crash", async () => {
  const res = await request(app).post("/api/admin/login").send({ password: 123456 });
  assert.equal(res.status, 401);
});

test("logout while authenticated ends the session", async () => {
  const agent = request.agent(app);
  await agent.post("/api/admin/login").send({ password: ADMIN_PASSWORD });

  const logoutRes = await agent.post("/api/admin/logout");
  assert.equal(logoutRes.status, 200);
  assert.deepEqual(logoutRes.body, { authenticated: false });

  const sessionRes = await agent.get("/api/admin/session");
  assert.deepEqual(sessionRes.body, { authenticated: false });
});

test("logout while never logged in does not throw", async () => {
  const res = await request(app).post("/api/admin/logout");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { authenticated: false });
});

test("an admin-only route without a session -> 401", async () => {
  const res = await request(app).get("/api/requirements");
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "admin authentication required");
});
