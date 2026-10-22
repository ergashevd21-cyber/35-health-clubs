export function isHrAdmin(userId, allowlist) {
  const id = String(userId ?? '').trim();
  if (!/^\d+$/.test(id)) return false;
  return String(allowlist ?? '').split(',').map(value => value.trim()).filter(Boolean).includes(id);
}

export function parseHrAction(value) {
  if (value === 'hr:list') return { action: 'list' };
  const match = String(value ?? '').match(/^hr:(confirm|attended|no_show):([0-9a-f-]{36})$/i);
  if (!match) return null;
  return { action: match[1], interviewId: match[2] };
}
