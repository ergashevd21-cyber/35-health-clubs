import type { VercelRequest, VercelResponse } from '@vercel/node';

const json = (res: VercelResponse, status: number, body: unknown) => res.status(status).json(body);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !webhookSecret) return json(res, 503, { error: 'Bot is not configured' });

  const suppliedSecret = req.headers['x-telegram-bot-api-secret-token'];
  if (suppliedSecret !== webhookSecret) return json(res, 401, { error: 'Unauthorized' });

  const update = req.body as any;
  const message = update?.message;
  const callback = update?.callback_query;
  const chatId = message?.chat?.id ?? callback?.message?.chat?.id;
  if (!chatId) return json(res, 200, { ok: true });

  const text = String(message?.text ?? '').trim();
  const telegramApi = `https://api.telegram.org/bot${token}`;
  const reply = async (body: string, replyMarkup?: unknown) => {
    await fetch(`${telegramApi}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: body, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
    });
  };

  if (callback?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id }),
    });
    // Candidate intent is not proof of attendance. HR must mark actual attendance separately.
    if (String(callback.data).startsWith('confirm:')) {
      await reply('Спасибо! Ваше намерение прийти отмечено. Фактическую явку подтвердит HR после собеседования.');
    } else if (String(callback.data).startsWith('cancel:')) {
      await reply('Чтобы отменить или перенести запись, ответьте на это сообщение словом «Перенос» или «Отмена».');
    }
    return json(res, 200, { ok: true });
  }

  if (text === '/start') {
    await reply('Здравствуйте! Это бот записи на собеседование 35 Health Clubs.\n\nДля начала напишите ваше имя и фамилию. Затем бот запросит телефон, вакансию и удобное время.');
  } else if (text.toLowerCase() === 'отмена') {
    await reply('Запрос на отмену принят. HR должен подтвердить отмену записи.');
  } else if (text.toLowerCase() === 'перенос') {
    await reply('Запрос на перенос принят. HR свяжется с вами для выбора нового времени.');
  } else {
    await reply('Спасибо. Для регистрации используйте /start. Сейчас выполняется настройка регистрации и расписания.');
  }

  return json(res, 200, { ok: true });
}
