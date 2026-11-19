import test from "node:test";
import assert from "node:assert/strict";
import { selectActiveSurveyRun } from "../survey-run-resolution.mjs";

const now = Date.parse("2026-11-19T10:00:00.000Z");

const run = (overrides = {}) => ({
  id: "run-1",
  run_number: 1,
  status: "active",
  starts_at: "2026-11-19T09:00:00.000Z",
  ends_at: null,
  ...overrides,
});

test("selects the newest active run when an old link has no run id", () => {
  const selected = selectActiveSurveyRun([
    run({ id: "old", run_number: 1 }),
    run({ id: "new", run_number: 2 }),
  ], { now });

  assert.equal(selected.id, "new");
});

test("preserves the requested run when a shared link contains its id", () => {
  const selected = selectActiveSurveyRun([
    run({ id: "new", run_number: 2 }),
    run({ id: "shared", run_number: 1 }),
  ], { requestedRunId: "shared", now });

  assert.equal(selected.id, "shared");
});

test("rejects closed, future, and expired runs", () => {
  const runs = [
    run({ id: "closed", status: "closed" }),
    run({ id: "future", starts_at: "2026-11-19T11:00:00.000Z" }),
    run({ id: "expired", ends_at: "2026-11-19T09:59:59.000Z" }),
  ];

  for (const requestedRunId of ["closed", "future", "expired"]) {
    assert.equal(selectActiveSurveyRun(runs, { requestedRunId, now }), null);
  }
});

test("allows a run at the exact start and end boundary", () => {
  const selected = selectActiveSurveyRun([
    run({ starts_at: new Date(now).toISOString(), ends_at: new Date(now).toISOString() }),
  ], { now });

  assert.equal(selected.id, "run-1");
});

test("returns null when no eligible run exists", () => {
  assert.equal(selectActiveSurveyRun([], { now }), null);
  assert.equal(selectActiveSurveyRun(null, { now }), null);
});

