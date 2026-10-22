import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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
  const send = async (body: string, replyMarkup?: unknown) => {
    const response = await fetch(`${telegramApi}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: body, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
    });
    if (!response.ok) console.error('Telegram sendMessage failed', response.status);
  };
  const keyboard = (rows: Array<Array<{ text: string; callback_data: string }>>) => ({
    inline_keyboard: rows,
  });

  if (callback?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id }),
    });
    const data = String(callback.data ?? '');
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
      location: 'Уточняется HR',
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
