import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const reply = (res: VercelResponse, status: number, body: unknown) => res.status(status).json(body);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed' });

  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  if (!secret || authorization !== `Bearer ${secret}`) {
    return reply(res, secret ? 401 : 503, { error: 'Cron is not authorized or configured' });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!url || !serviceKey || !botToken) return reply(res, 503, { error: 'Reminder service is not configured' });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  // Ensure reminder jobs exist for each enabled rule and upcoming interview.
  const [{ data: interviews, error: interviewError }, { data: rules, error: rulesError }] = await Promise.all([
    supabase.from('interviews').select('id,application_id,scheduled_at,reminder_generation,status')
      .in('status', ['confirmed', 'scheduled', 'rescheduled'])
      .gt('scheduled_at', now.toISOString()).lte('scheduled_at', horizon).limit(200),
    supabase.from('reminder_rules').select('id,minutes_before,enabled').eq('enabled', true),
  ]);
  if (interviewError || rulesError) {
    console.error('Reminder preparation query failed', interviewError?.message, rulesError?.message);
    return reply(res, 500, { error: 'Could not prepare reminders' });
  }

  let jobsCreated = 0;
  const jobs: Array<Record<string, unknown>> = [];
  for (const interview of interviews ?? []) {
    for (const rule of rules ?? []) {
      const runAt = new Date(new Date(interview.scheduled_at).getTime() - rule.minutes_before * 60_000);
      // Do not send several stale reminders at once when a cron run was missed.
      if (runAt.getTime() < now.getTime() - 5 * 60_000) continue;
      if (runAt.getTime() > now.getTime() + 48 * 60 * 60 * 1000) continue;
      jobs.push({
        interview_id: interview.id,
        rule_id: rule.id,
        generation: interview.reminder_generation,
        run_at: runAt.toISOString(),
        idempotency_key: `${interview.id}:${interview.reminder_generation}:${rule.id}`,
      });
    }
  }
  if (jobs.length) {
    const { data, error } = await supabase.from('reminder_jobs')
      .upsert(jobs, { onConflict: 'idempotency_key', ignoreDuplicates: true }).select('id');
    if (error) {
      console.error('Reminder job creation failed', error.message);
      return reply(res, 500, { error: 'Could not create reminder jobs' });
    }
    jobsCreated = data?.length ?? 0;
  }

  const { data: dueJobs, error: dueError } = await supabase.from('reminder_jobs')
    .select('id,interview_id,rule_id,attempts,max_attempts')
    .eq('status', 'pending').lte('run_at', now.toISOString())
    .order('run_at', { ascending: true }).limit(50);
  if (dueError) {
    console.error('Due reminder lookup failed', dueError.message);
    return reply(res, 500, { error: 'Could not load due reminders' });
  }

  let sent = 0;
  let failed = 0;
  for (const job of dueJobs ?? []) {
    // Claim the job atomically so concurrent cron invocations do not send it twice.
    const { data: claimed, error: claimError } = await supabase.from('reminder_jobs')
      .update({ status: 'processing', locked_at: now.toISOString(), attempts: job.attempts + 1, updated_at: now.toISOString() })
      .eq('id', job.id).eq('status', 'pending').select('id').maybeSingle();
    if (claimError || !claimed) continue;

    const { data: interview } = await supabase.from('interviews')
      .select('id,application_id,scheduled_at,status,reminder_generation')
      .eq('id', job.interview_id).maybeSingle();
    if (!interview || !['confirmed', 'scheduled', 'rescheduled'].includes(interview.status) ||
        interview.reminder_generation !== (await supabase.from('reminder_jobs').select('generation').eq('id', job.id).maybeSingle()).data?.generation) {
      await supabase.from('reminder_jobs').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', job.id);
      continue;
    }
    const { data: application } = await supabase.from('applications').select('candidate_id,vacancy_id').eq('id', interview.application_id).maybeSingle();
    const [{ data: candidate }, { data: vacancy }, { data: rule }] = await Promise.all([
      application ? supabase.from('candidates').select('full_name,telegram_chat_id').eq('id', application.candidate_id).maybeSingle() : Promise.resolve({ data: null }),
      application ? supabase.from('vacancies').select('title').eq('id', application.vacancy_id).maybeSingle() : Promise.resolve({ data: null }),
      job.rule_id ? supabase.from('reminder_rules').select('label,message_template,minutes_before').eq('id', job.rule_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (!candidate?.telegram_chat_id || !rule) {
      failed++;
      await supabase.from('reminder_jobs').update({
        status: job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending',
        last_error: !candidate?.telegram_chat_id ? 'Candidate has no Telegram chat ID' : 'Reminder rule not found',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id);
      continue;
    }

    const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', dateStyle: 'long', timeStyle: 'short' }).format(new Date(interview.scheduled_at));
    const lead = rule.minutes_before >= 60 ? `${Math.round(rule.minutes_before / 60)} ч.` : `${rule.minutes_before} мин.`;
    const message = `Здравствуйте, ${candidate.full_name}! Напоминаем о собеседовании 35 Health Clubs за ${lead}.\nВакансия: ${vacancy?.title ?? 'уточняется'}.\nВремя: ${date} (Ташкент).\nЕсли планы изменились, пожалуйста, ответьте на это сообщение и свяжитесь с HR.`;
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: candidate.telegram_chat_id, text: message }),
      });
      const payload = await response.json() as { ok?: boolean; description?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.description ?? `Telegram HTTP ${response.status}`);
      await supabase.from('reminder_jobs').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', job.id);
      sent++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : 'Unknown Telegram error';
      await supabase.from('reminder_jobs').update({
        status: job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending',
        last_error: message.slice(0, 1000), updated_at: new Date().toISOString(),
      }).eq('id', job.id);
    }
  }

  return reply(res, 200, { ok: true, jobsCreated, due: dueJobs?.length ?? 0, sent, failed });
}
