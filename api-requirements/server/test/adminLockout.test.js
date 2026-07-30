import test from "node:test";
import assert from "node:assert/strict";
import { freshApp, request, ADMIN_PASSWORD } from "./helpers.js";
import { isLockedOut, recordAttempt } from "../src/adminAuth.js";

// Kept in its own file/process: the login rate limiter is keyed by IP in a
// module-level Map, and every request from supertest in this process shares
// the same source IP, so intentionally tripping the lockout here must not
// leak into admin.test.js's login assertions.
test("5 failed logins lock out the IP; the 6th attempt 429s even with the correct password", async () => {
  const app = freshApp();

  for (let i = 0; i < 5; i++) {
    const res = await request(app).post("/api/admin/login").send({ password: "wrong" });
    assert.equal(res.status, 401);
  }

  const lockedOutRes = await request(app).post("/api/admin/login").send({ password: ADMIN_PASSWORD });
  assert.equal(lockedOutRes.status, 429);
  assert.match(lockedOutRes.body.error, /too many failed attempts/);
});

test("isLockedOut/recordAttempt: lockout expires after the window", (t) => {
  const ip = "203.0.113.1";
  for (let i = 0; i < 5; i++) recordAttempt(ip, false);
  assert.equal(isLockedOut(ip), true);

  // Seed the mock clock with the real current time - recordAttempt() above
  // stamped lastAttempt using the real Date.now(), so the fake clock has to
  // start from the same point rather than its default epoch-0 origin.
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  t.mock.timers.tick(60_001);
  assert.equal(isLockedOut(ip), false);
  t.mock.timers.reset();
});

test("isLockedOut/recordAttempt: a success clears the failed-attempt counter", () => {
  const ip = "203.0.113.2";
  for (let i = 0; i < 4; i++) recordAttempt(ip, false);
  recordAttempt(ip, true);
  for (let i = 0; i < 4; i++) recordAttempt(ip, false);
  assert.equal(isLockedOut(ip), false);
});
