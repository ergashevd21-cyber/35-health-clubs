/**
 * Return the requested survey run when it is still open, or the newest eligible
 * active run when an older public link does not include a run id.
 */
export function selectActiveSurveyRun(runs, { requestedRunId = null, now = Date.now() } = {}) {
  const eligible = (Array.isArray(runs) ? runs : []).filter((run) => {
    if (!run || run.status !== "active" || !run.id) return false;

    if (run.starts_at) {
      const startsAt = Date.parse(run.starts_at);
      if (!Number.isFinite(startsAt) || startsAt > now) return false;
    }

    if (run.ends_at) {
      const endsAt = Date.parse(run.ends_at);
      if (!Number.isFinite(endsAt) || endsAt < now) return false;
    }

    return true;
  });

  if (requestedRunId) {
    return eligible.find((run) => String(run.id) === String(requestedRunId)) ?? null;
  }

  return eligible.sort((a, b) => Number(b.run_number ?? 0) - Number(a.run_number ?? 0))[0] ?? null;
}
