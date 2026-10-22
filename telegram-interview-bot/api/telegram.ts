import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { isHrAdmin, parseCandidateAction, parseHrAction } from '../lib/hr-admin.mjs';

const json = (res: VercelResponse, status: number, body: unknown) => res.status(status).json(body);
const TASHKENT_OFFSET = '+05:00';

function parseTashkentDateTime(input: string): string | null {
  const match = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const year = Number(y), month = Number(mo), day = Number(d), hour = Number(h), minute = Number(mi);
  const localCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const instant = new Date(Date.UTC(year, month - 1, day, hour - 5, minute));
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  if (localCalendarDate.getUTCFullYear() !== year || localCalendarDate.getUTCMonth() !== month - 1 || localCalendarDate.getUTCDate() !== day) return null;
  if (instant.getTime() <= Date.now()) return null;
  return `${y}-${mo}-${d}T${h}:${mi}:00${TASHKENT_OFFSET}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !webhookSecret || !supabaseUrl || !serviceKey) {
    return json(res, 503, { error: 'Bot is not configured' });
  }
  if (req.headers['x-telegram-bot-api-secret-token'] !== webhookSecret) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const update = req.body as any;
  const message = update?.message;
  const callback = update?.callback_query;
  const chatId = message?.chat?.id ?? callback?.message?.chat?.id;
  const userId = message?.from?.id ?? callback?.from?.id;
  if (!chatId || !userId) return json(res, 200, { ok: true });

  const telegramApi = `https://api.telegram.org/bot${token}`;
  const sendTo = async (targetChatId: number | string, body: string, replyMarkup?: unknown) => {
    const response = await fetch(`${telegramApi}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: targetChatId, text: body, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
    });
    if (!response.ok) console.error('Telegram sendMessage failed', response.status);
  };
  const send = (body: string, replyMarkup?: unknown) => sendTo(chatId, body, replyMarkup);
  const keyboard = (rows: Array<Array<{ text: string; callback_data: string }>>) => ({ inline_keyboard: rows });
  const hrAdminIds = process.env.HR_TELEGRAM_IDS ?? '';
  const audit = async (action: string, entityId: string, details: Record<string, unknown> = {}) => {
    const { error } = await supabase.from('audit_logs').insert({
      actor_type: 'system', action, entity_type: 'interview', entity_id: entityId,
      details: { telegram_user_id: String(userId), ...details },
    });
    if (error) console.error('HR audit log failed', error.message);
  };
  const showHrQueue = async () => {
    if (!isHrAdmin(userId, hrAdminIds)) {
      await send('Доступ к HR-панели не предоставлен.');
      return;
    }
    const { data: items, error } = await supabase.from('interviews')
      .select('id,scheduled_at,status,application_id')
      .in('status', ['pending_confirmation', 'confirmed', 'scheduled', 'rescheduled'])
      .gte('scheduled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('scheduled_at', { ascending: true }).limit(10);
    if (error) {
      console.error('HR queue lookup failed', error.message);
      await send('Не удалось загрузить список собеседований. Попробуйте позже.');
      return;
    }
    if (!items?.length) {
      await send('Очередь собеседований пуста.', keyboard([[{ text: 'Обновить', callback_data: 'hr:list' }]]));
      return;
    }
    const lines: string[] = ['HR-панель · ближайшие собеседования'];
    const rows: Array<Array<{ text: string; callback_data: string }>> = [];
    for (const item of items) {
      const { data: app } = await supabase.from('applications').select('candidate_id,vacancy_id').eq('id', item.application_id).maybeSingle();
      if (!app) continue;
      const [{ data: candidate }, { data: vacancy }] = await Promise.all([
        supabase.from('candidates').select('full_name,phone').eq('id', app.candidate_id).maybeSingle(),
        supabase.from('vacancies').select('title').eq('id', app.vacancy_id).maybeSingle(),
      ]);
      const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.scheduled_at));
      lines.push('', `• ${candidate?.full_name ?? 'Кандидат'} · ${vacancy?.title ?? 'Вакансия'}`, `  ${date} · ${item.status}`, `  Телефон: ${candidate?.phone ?? 'не указан'}`);
      if (item.status === 'pending_confirmation') {
        rows.push([{ text: 'Подтвердить ' + date, callback_data: 'hr:confirm:' + item.id }]);
      } else {
        rows.push([{ text: 'Был(а): ' + (candidate?.full_name ?? date), callback_data: 'hr:attended:' + item.id },
          { text: 'Не явился', callback_data: 'hr:no_show:' + item.id }]);
      }
    }
    rows.push([{ text: 'Обновить список', callback_data: 'hr:list' }]);
    await send(lines.join('\n'), keyboard(rows));
  };

  if (callback?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id }),
    });
    const data = String(callback.data ?? '');
    const candidateAction = parseCandidateAction(data);
    if (candidateAction) {
      const { data: interview, error: interviewLookupError } = await supabase.from('interviews')
        .select('id,application_id,scheduled_at,status,reminder_generation')
        .eq('id', candidateAction.interviewId).maybeSingle();
      if (interviewLookupError || !interview) {
        await send('Собеседование не найдено. Обратитесь к HR.');
        return json(res, 200, { ok: true });
      }
      const { data: application } = await supabase.from('applications')
        .select('id,candidate_id,vacancy_id').eq('id', interview.application_id).maybeSingle();
      const { data: candidate } = application
        ? await supabase.from('candidates').select('id,telegram_user_id,telegram_chat_id,full_name,phone')
            .eq('id', application.candidate_id).maybeSingle()
        : { data: null };
      if (!candidate || String(candidate.telegram_user_id) !== String(userId)) {
        await send('Эта кнопка предназначена для кандидата, которому принадлежит запись.');
        return json(res, 200, { ok: true });
      }

      if (candidateAction.action === 'confirm') {
        if (interview.status !== 'confirmed') {
          await send('Подтверждение HR ещё не получено или запись уже изменена. При необходимости свяжитесь с HR.');
          return json(res, 200, { ok: true });
        }
        const confirmedAt = new Date().toISOString();
        const { error } = await supabase.from('interviews').update({
          candidate_confirmation_at: confirmedAt, updated_at: confirmedAt,
        }).eq('id', interview.id).eq('status', 'confirmed');
        if (error) {
          console.error('Candidate confirmation failed', error.message);
          await send('Не удалось сохранить подтверждение. Попробуйте позже.');
          return json(res, 200, { ok: true });
        }
        await supabase.from('interview_events').insert({
          interview_id: interview.id, actor_type: 'candidate', event_type: 'candidate_confirmed',
          old_values: { candidate_confirmation_at: null }, new_values: { candidate_confirmation_at: confirmedAt },
        });
        await send('Спасибо! Ваше участие в собеседовании подтверждено.');
        return json(res, 200, { ok: true });
      }

      if (candidateAction.action === 'cancel') {
        if (!['pending_confirmation', 'confirmed', 'scheduled', 'rescheduled'].includes(interview.status)) {
          await send('Эту запись уже нельзя отменить через бота. Обратитесь к HR.');
          return json(res, 200, { ok: true });
        }
        const cancelledAt = new Date().toISOString();
        const { error } = await supabase.from('interviews').update({
          status: 'cancelled', updated_at: cancelledAt, completed_at: cancelledAt,
        }).eq('id', interview.id);
        if (error) {
          console.error('Candidate cancellation failed', error.message);
          await send('Не удалось отменить запись. Свяжитесь с HR.');
          return json(res, 200, { ok: true });
        }
        await supabase.from('applications').update({ status: 'withdrawn', updated_at: cancelledAt }).eq('id', interview.application_id);
        await supabase.from('reminder_jobs').update({ status: 'cancelled', updated_at: cancelledAt })
          .eq('interview_id', interview.id).in('status', ['pending', 'processing']);
        await supabase.from('interview_events').insert({
          interview_id: interview.id, actor_type: 'candidate', event_type: 'candidate_cancelled',
          old_values: { status: interview.status }, new_values: { status: 'cancelled' },
        });
        await send('Ваша запись отменена. Если захотите записаться снова, отправьте /start.');
        return json(res, 200, { ok: true });
      }

      if (!['confirmed', 'scheduled', 'rescheduled'].includes(interview.status) || !application) {
        await send('Сначала дождитесь подтверждения HR. Если нужно изменить время, обратитесь к HR.');
        return json(res, 200, { ok: true });
      }
      const { data: vacancy } = await supabase.from('vacancies').select('title')
        .eq('id', application.vacancy_id).maybeSingle();
      await supabase.from('registration_sessions').upsert({
        telegram_user_id: userId, telegram_chat_id: chatId, step: 'time',
        payload: {
          full_name: candidate.full_name, phone: candidate.phone,
          reschedule_interview_id: interview.id, vacancy_id: application.vacancy_id,
          vacancy_title: vacancy?.title ?? 'Вакансия',
        },
        updated_at: new Date().toISOString(),
      });
      await send('Напишите новую желаемую дату и время в формате ГГГГ-ММ-ДД ЧЧ:ММ (время Ташкента). Текущее время собеседования сохранится, пока HR не подтвердит новый запрос.');
      return json(res, 200, { ok: true });
    }

    const hrAction = parseHrAction(data);
    if (hrAction) {
      if (!isHrAdmin(userId, hrAdminIds)) {
        await send('Доступ к HR-панели не предоставлен.');
        return json(res, 200, { ok: true });
      }
      if (hrAction.action === 'list') {
        await showHrQueue();
        return json(res, 200, { ok: true });
      }
      const { data: interview, error: lookupError } = await supabase.from('interviews')
        .select('id,application_id,status,scheduled_at').eq('id', hrAction.interviewId).maybeSingle();
      if (lookupError || !interview) {
        await send('Собеседование не найдено. Обновите список.');
        return json(res, 200, { ok: true });
      }
      let update: Record<string, unknown> = {};
      let applicationStatus: string | null = null;
      if (hrAction.action === 'confirm' && interview.status === 'pending_confirmation') {
        update = { status: 'confirmed', updated_at: new Date().toISOString() };
        applicationStatus = 'confirmed';
      } else if (hrAction.action === 'attended' && ['confirmed', 'scheduled', 'rescheduled'].includes(interview.status)) {
        update = { status: 'completed', actual_attendance: true, attendance_marked_at: new Date().toISOString(), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        applicationStatus = 'attended';
      } else if (hrAction.action === 'no_show' && ['confirmed', 'scheduled', 'rescheduled'].includes(interview.status)) {
        update = { status: 'no_show', actual_attendance: false, attendance_marked_at: new Date().toISOString(), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        applicationStatus = 'no_show';
      } else {
        await send('Это действие уже выполнено или недоступно для текущего статуса.');
        return json(res, 200, { ok: true });
      }
      const { error: updateError } = await supabase.from('interviews').update(update).eq('id', interview.id);
      if (updateError) {
        console.error('HR interview update failed', updateError.message);
        await send('Не удалось обновить собеседование. Попробуйте ещё раз.');
        return json(res, 200, { ok: true });
      }
      if (applicationStatus) {
        const { error } = await supabase.from('applications').update({ status: applicationStatus, updated_at: new Date().toISOString() }).eq('id', interview.application_id);
        if (error) console.error('HR application update failed', error.message);
      }
      if (hrAction.action === 'confirm') {
        const { data: app } = await supabase.from('applications').select('candidate_id,vacancy_id')
          .eq('id', interview.application_id).maybeSingle();
        const [{ data: candidate }, { data: vacancy }] = await Promise.all([
          app ? supabase.from('candidates').select('full_name,telegram_chat_id').eq('id', app.candidate_id).maybeSingle() : Promise.resolve({ data: null }),
          app ? supabase.from('vacancies').select('title').eq('id', app.vacancy_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        if (candidate?.telegram_chat_id) {
          const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', dateStyle: 'long', timeStyle: 'short' }).format(new Date(interview.scheduled_at));
          await sendTo(candidate.telegram_chat_id,
            `Здравствуйте, ${candidate.full_name}! HR подтвердил собеседование в 35 Health Clubs.\nВакансия: ${vacancy?.title ?? 'уточняется'}.\nВремя: ${date} (Ташкент).\nПожалуйста, подтвердите участие или выберите другое действие.`,
            keyboard([
              [{ text: 'Подтверждаю участие', callback_data: 'candidate:confirm:' + interview.id }],
              [{ text: 'Попросить другое время', callback_data: 'candidate:reschedule:' + interview.id }],
              [{ text: 'Отменить запись', callback_data: 'candidate:cancel:' + interview.id }],
            ]));
        }
      }
      await audit('interview_' + hrAction.action, interview.id, { previous_status: interview.status, new_status: update.status });
      await send(hrAction.action === 'confirm' ? 'Собеседование подтверждено.' : hrAction.action === 'attended' ? 'Явка отмечена: кандидат пришёл.' : 'Отмечена неявка кандидата.');
      await showHrQueue();
      return json(res, 200, { ok: true });
    }
    if (data === 'registration:cancel') {
      await supabase.from('registration_sessions').delete().eq('telegram_user_id', userId);
      await send('Регистрация остановлена. Чтобы начать заново, отправьте /start.');
      return json(res, 200, { ok: true });
    }
    if (data.startsWith('vacancy:')) {
      const vacancyId = data.slice('vacancy:'.length);
      const { data: vacancy, error } = await supabase.from('vacancies')
        .select('id,title').eq('id', vacancyId).eq('is_open', true).maybeSingle();
      if (error || !vacancy) {
        await send('Эта вакансия уже недоступна. Отправьте /start, чтобы начать заново.');
        return json(res, 200, { ok: true });
      }
      const { data: session } = await supabase.from('registration_sessions')
        .select('payload').eq('telegram_user_id', userId).maybeSingle();
      const payload = { ...(session?.payload ?? {}), vacancy_id: vacancy.id, vacancy_title: vacancy.title };
      await supabase.from('registration_sessions').upsert({
        telegram_user_id: userId, telegram_chat_id: chatId, step: 'time', payload, updated_at: new Date().toISOString(),
      });
      await send(`Вы выбрали: ${vacancy.title}.\n\nНапишите желаемую дату и время в формате ГГГГ-ММ-ДД ЧЧ:ММ (время Ташкента). Например: 2026-10-23 15:00. HR подтвердит доступность времени.`,
        keyboard([[{ text: 'Отменить регистрацию', callback_data: 'registration:cancel' }]]));
    }
    return json(res, 200, { ok: true });
  }

  const text = String(message?.text ?? '').trim();
  if (text === '/myid') {
    await send(`Ваш Telegram ID: ${userId}\nПередайте этот номер ответственному за настройку HR-доступа. Не отправляйте токены бота или ключи Supabase.`);
    return json(res, 200, { ok: true });
  }

  if (text === '/hr' || text === '/admin') {
    await showHrQueue();
    return json(res, 200, { ok: true });
  }

  if (text === '/start' || text === '/restart') {
    await supabase.from('registration_sessions').upsert({
      telegram_user_id: userId, telegram_chat_id: chatId, step: 'name', payload: {}, updated_at: new Date().toISOString(),
    });
    await send('Здравствуйте! Это бот записи на собеседование 35 Health Clubs.\n\nДля регистрации напишите имя и фамилию.',
      keyboard([[{ text: 'Отменить регистрацию', callback_data: 'registration:cancel' }]]));
    return json(res, 200, { ok: true });
  }

  const { data: session, error: sessionError } = await supabase.from('registration_sessions')
    .select('step,payload').eq('telegram_user_id', userId).maybeSingle();
  if (sessionError) {
    console.error('Registration session lookup failed', sessionError.message);
    await send('Не удалось обработать сообщение. Попробуйте ещё раз чуть позже.');
    return json(res, 200, { ok: true });
  }
  if (!session) {
    await send('Чтобы записаться на собеседование, отправьте /start.');
    return json(res, 200, { ok: true });
  }

  const payload = session.payload ?? {};
  if (session.step === 'name') {
    if (text.length < 3 || text.length > 120 || text.startsWith('/')) {
      await send('Напишите, пожалуйста, имя и фамилию (от 3 до 120 символов).');
      return json(res, 200, { ok: true });
    }
    await supabase.from('registration_sessions').update({
      step: 'phone', payload: { full_name: text }, updated_at: new Date().toISOString(),
    }).eq('telegram_user_id', userId);
    await send('Спасибо! Теперь отправьте номер телефона в международном формате, например +998901234567.');
    return json(res, 200, { ok: true });
  }

  if (session.step === 'phone') {
    const phone = text.replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{9,15}$/.test(phone)) {
      await send('Не удалось распознать номер. Отправьте номер в формате +998901234567.');
      return json(res, 200, { ok: true });
    }
    await supabase.from('registration_sessions').update({
      step: 'vacancy', payload: { ...payload, phone }, updated_at: new Date().toISOString(),
    }).eq('telegram_user_id', userId);
    const { data: vacancies, error } = await supabase.from('vacancies')
      .select('id,title,department').eq('is_open', true).order('title');
    if (error) {
      console.error('Vacancy lookup failed', error.message);
      await send('Не удалось загрузить вакансии. Попробуйте позже, отправив /start.');
      return json(res, 200, { ok: true });
    }
    if (!vacancies?.length) {
      await send('Сейчас открытых вакансий нет. Пожалуйста, свяжитесь с HR 35 Health Clubs.');
      return json(res, 200, { ok: true });
    }
    const rows = vacancies.map((v: { id: string; title: string; department?: string | null }) => [{
      text: v.department ? `${v.title} — ${v.department}` : v.title,
      callback_data: `vacancy:${v.id}`,
    }]);
    rows.push([{ text: 'Отменить регистрацию', callback_data: 'registration:cancel' }]);
    await send('Выберите вакансию:', keyboard(rows));
    return json(res, 200, { ok: true });
  }

  if (session.step === 'time') {
    const scheduledAt = parseTashkentDateTime(text);
    if (!scheduledAt) {
      await send('Проверьте дату и время. Нужен формат ГГГГ-ММ-ДД ЧЧ:ММ, будущая дата по времени Ташкента. Например: 2026-10-23 15:00.');
      return json(res, 200, { ok: true });
    }
    const { data: existing } = await supabase.from('candidates').select('id')
      .eq('telegram_user_id', userId).maybeSingle();
    let candidateId = existing?.id;
    if (candidateId) {
      const { error } = await supabase.from('candidates').update({
        full_name: payload.full_name, phone: payload.phone, telegram_chat_id: chatId, updated_at: new Date().toISOString(),
      }).eq('id', candidateId);
      if (error) {
        console.error('Candidate update failed', error.message);
        await send('Не удалось сохранить данные. Попробуйте позже или обратитесь к HR.');
        return json(res, 200, { ok: true });
      }
    } else {
      const { data: candidate, error } = await supabase.from('candidates').insert({
        telegram_user_id: userId, telegram_chat_id: chatId, full_name: payload.full_name, phone: payload.phone,
      }).select('id').single();
      if (error || !candidate) {
        console.error('Candidate insert failed', error?.message);
        await send('Не удалось сохранить данные. Попробуйте позже или обратитесь к HR.');
        return json(res, 200, { ok: true });
      }
      candidateId = candidate.id;
    }
    if (payload.reschedule_interview_id) {
      const { data: oldInterview, error: oldInterviewError } = await supabase.from('interviews')
        .select('id,application_id,scheduled_at,status,reminder_generation')
        .eq('id', payload.reschedule_interview_id).maybeSingle();
      if (oldInterviewError || !oldInterview || oldInterview.application_id == null ||
          !['confirmed', 'scheduled', 'rescheduled'].includes(oldInterview.status)) {
        await send('Не удалось изменить время: запись уже изменилась. Обратитесь к HR.');
        return json(res, 200, { ok: true });
      }
      const changedAt = new Date().toISOString();
      const { error: rescheduleError } = await supabase.from('interviews').update({
        scheduled_at: scheduledAt, status: 'pending_confirmation',
        reminder_generation: oldInterview.reminder_generation + 1,
        candidate_confirmation_at: null, updated_at: changedAt,
      }).eq('id', oldInterview.id);
      if (rescheduleError) {
        console.error('Interview reschedule request failed', rescheduleError.message);
        await send('Не удалось сохранить запрос на новое время. Попробуйте позже.');
        return json(res, 200, { ok: true });
      }
      await supabase.from('reminder_jobs').update({ status: 'cancelled', updated_at: changedAt })
        .eq('interview_id', oldInterview.id).in('status', ['pending', 'processing']);
      await supabase.from('interview_events').insert({
        interview_id: oldInterview.id, actor_type: 'candidate', event_type: 'reschedule_requested',
        old_values: { scheduled_at: oldInterview.scheduled_at, status: oldInterview.status },
        new_values: { scheduled_at: scheduledAt, status: 'pending_confirmation' },
      });
      await supabase.from('registration_sessions').delete().eq('telegram_user_id', userId);
      await send(`Спасибо, ${payload.full_name}! Запрос на перенос собеседования сохранён.\nНовое желаемое время: ${text} (Ташкент).\nHR должен подтвердить новое время; прежнее время пока не считается подтверждённым.`);
      return json(res, 200, { ok: true });
    }

    const { data: application, error: applicationError } = await supabase.from('applications').insert({
      candidate_id: candidateId, vacancy_id: payload.vacancy_id, source: 'telegram',
      notes: 'Кандидат самостоятельно выбрал желаемое время; требуется подтверждение HR.',
    }).select('id').single();
    if (applicationError || !application) {
      console.error('Application insert failed', applicationError?.message);
      await send('Данные кандидата сохранены, но создать заявку не удалось. HR сможет проверить запись; попробуйте позже.');
      return json(res, 200, { ok: true });
    }
    const { error: interviewError } = await supabase.from('interviews').insert({
      application_id: application.id, scheduled_at: scheduledAt, timezone: 'Asia/Tashkent',
      location: 'Уточняется HR', status: 'pending_confirmation',
    });
    if (interviewError) {
      console.error('Interview insert failed', interviewError.message);
      await send('Заявка сохранена, но время нужно подтвердить с HR. Мы не считаем выбранное время подтверждённой записью.');
      return json(res, 200, { ok: true });
    }
    await supabase.from('registration_sessions').delete().eq('telegram_user_id', userId);
    await send(`Спасибо, ${payload.full_name}! Ваша заявка на вакансию «${payload.vacancy_title}» сохранена.\nЖелаемое время: ${text} (Ташкент).\n\nВажно: это запрос на время, а не окончательное подтверждение. HR свяжется с вами для подтверждения собеседования.`);
    return json(res, 200, { ok: true });
  }

  await send('Отправьте /start, чтобы начать регистрацию заново.');
  return json(res, 200, { ok: true });
}
