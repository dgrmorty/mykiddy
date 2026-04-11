import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Лимиты ИИ в день на пользователя (тьютор и проверка ДЗ отдельно)
const DAILY_TUTOR_LIMIT = parseInt(process.env.AI_DAILY_TUTOR_LIMIT || '25', 10);
const DAILY_HOMEWORK_LIMIT = parseInt(process.env.AI_DAILY_HOMEWORK_LIMIT || '15', 10);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const hasSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Создаёт Supabase-клиент от имени пользователя (JWT) для RLS */
function supabaseForUser(accessToken) {
    if (!hasSupabase || !accessToken) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });
}

/** Текущая дата в формате YYYY-MM-DD по UTC */
function todayUtc() {
    return new Date().toISOString().slice(0, 10);
}

/** Проверить лимит тьютора (без инкремента). */
async function checkTutorLimit(accessToken) {
    const supabase = supabaseForUser(accessToken);
    if (!supabase) return { allowed: true, remaining: DAILY_TUTOR_LIMIT };

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) return { allowed: false, error: 'auth' };

    const date = todayUtc();
    const { data: row, error: fetchError } = await supabase
        .from('ai_usage')
        .select('tutor_count')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

    if (fetchError) {
        console.error('AI usage fetch error:', fetchError);
        return { allowed: true, remaining: DAILY_TUTOR_LIMIT };
    }

    const current = row?.tutor_count ?? 0;
    const remaining = Math.max(0, DAILY_TUTOR_LIMIT - current);
    return { allowed: current < DAILY_TUTOR_LIMIT, remaining, userId: user.id };
}

/** Увеличить счётчик тьютора на 1 (вызывать после успешного ответа Gemini). */
async function incrementTutorUsage(accessToken, userId) {
    const supabase = supabaseForUser(accessToken);
    if (!supabase || !userId) return;

    const date = todayUtc();
    const { data: row } = await supabase
        .from('ai_usage')
        .select('tutor_count')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

    const next = (row?.tutor_count ?? 0) + 1;
    await supabase.from('ai_usage').upsert(
        { user_id: userId, date, tutor_count: next },
        { onConflict: 'user_id,date' }
    );
}

/** Проверить лимит проверки ДЗ (без инкремента). */
async function checkHomeworkLimit(accessToken) {
    const supabase = supabaseForUser(accessToken);
    if (!supabase) return { allowed: true, remaining: DAILY_HOMEWORK_LIMIT };

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) return { allowed: false, error: 'auth' };

    const date = todayUtc();
    const { data: row, error: fetchError } = await supabase
        .from('ai_usage')
        .select('homework_count')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

    if (fetchError) {
        console.error('AI usage fetch error:', fetchError);
        return { allowed: true, remaining: DAILY_HOMEWORK_LIMIT };
    }

    const current = row?.homework_count ?? 0;
    const remaining = Math.max(0, DAILY_HOMEWORK_LIMIT - current);
    return { allowed: current < DAILY_HOMEWORK_LIMIT, remaining, userId: user.id };
}

/** Увеличить счётчик проверки ДЗ на 1 (после успешной проверки). */
async function incrementHomeworkUsage(accessToken, userId) {
    const supabase = supabaseForUser(accessToken);
    if (!supabase || !userId) return;

    const date = todayUtc();
    const { data: row } = await supabase
        .from('ai_usage')
        .select('homework_count')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

    const next = (row?.homework_count ?? 0) + 1;
    await supabase.from('ai_usage').upsert(
        { user_id: userId, date, homework_count: next },
        { onConflict: 'user_id,date' }
    );
}

// Разрешаем CORS для веба и для приложения в телефоне/планшете (Capacitor)
const allowedOrigins = [
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://mykiddy-production.up.railway.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'capacitor://localhost',
    'ionic://localhost',
    'https://localhost',
    'http://localhost'
];
// Дополнительные origin из переменной (через запятую), например для кастомного домена
const extraOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

function isOriginAllowed(origin) {
    if (!origin) return true; // мобильные webview (Origin часто пустой)
    if (allowedOrigins.includes(origin) || extraOrigins.includes(origin)) return true;
    if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return true;
    if (origin === 'https://localhost' || origin === 'http://localhost') return true;
    // Любой поддомен Railway (разные деплои/регионы)
    try {
        const u = new URL(origin);
        if (u.hostname.endsWith('.railway.app') && (u.protocol === 'https:' || u.protocol === 'http:')) return true;
    } catch (_) {}
    return false;
}

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        console.warn('[CORS] Blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    }
}));
// Проверка ДЗ может включать base64 фото/короткое видео
app.use(express.json({ limit: '14mb' }));

// Rate limit: общий для API (120 запросов в минуту с IP)
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { error: 'Слишком много запросов. Подождите минуту.', code: 'RATE_LIMIT' },
    standardHeaders: true
});
app.use('/api', apiLimiter);

// Жёстче лимит для ИИ-эндпоинтов (40 запросов за 15 мин с IP)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    message: { error: 'Слишком много запросов к ИИ. Попробуйте позже.', code: 'AI_RATE_LIMIT' },
    standardHeaders: true
});

// ВАЖНО: В продакшене мы отдаем файлы из папки dist (сборка Vite)
// Это заставляет сервер искать index.html и JS файлы именно там
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Нормализация ключа из Railway / .env: BOM, кавычки, пробелы и переносы **внутри** строки
 * (в UI ключ часто ломается на две строки — trim() этого не убирает).
 */
function normalizeGeminiKeyFromEnv(raw) {
    if (raw == null) return '';
    let s = String(raw).trim().replace(/^\uFEFF/, '');
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    const before = s;
    s = s.replace(/\s+/g, '');
    if (before !== s && before.length > 0) {
        console.warn('[AI] В значении ключа были пробелы/переносы — удалены для запроса к Gemini.');
    }
    return s;
}

/** Ключ Gemini: GEMINI_API_KEY, API_KEY, GOOGLE_* (порядок — от более явного к общему). */
function resolveGeminiApiKey() {
    const sources = [
        ['GEMINI_API_KEY', process.env.GEMINI_API_KEY],
        ['API_KEY', process.env.API_KEY],
        ['GOOGLE_API_KEY', process.env.GOOGLE_API_KEY],
        ['GOOGLE_GENERATIVE_AI_API_KEY', process.env.GOOGLE_GENERATIVE_AI_API_KEY],
    ];
    for (const [name, raw] of sources) {
        const key = normalizeGeminiKeyFromEnv(raw);
        if (key.length >= 30) {
            if (name !== 'API_KEY') console.log(`[AI] Ключ взят из переменной ${name} (длина ${key.length}).`);
            return key;
        }
    }
    return null;
}

const initAI = () => {
    const key = resolveGeminiApiKey();
    if (!key) {
        console.warn(
            "⚠️ API_KEY (или GEMINI_API_KEY) не задан. ИИ не будет работать. Укажи переменную в Railway → Variables сервиса, где выполняется node server.js (не только у build-стадии), затем redeploy.",
        );
        return null;
    }
    try {
        const client = new GoogleGenAI({ apiKey: key });
        console.log(`[AI] Gemini клиент инициализирован (длина ключа: ${key.length} символов).`);
        return client;
    } catch (e) {
        console.error("AI Init Error:", e);
        return null;
    }
};

const ai = initAI();
if (!ai) console.warn("Запуск без ИИ: проверьте API_KEY / GEMINI_API_KEY и перезапустите сервер.");

/** Ошибка от Google из‑за ключа/доступа (не путать с пустым message от других сбоев). */
function isLikelyGeminiAuthError(error) {
    const msg = String(error?.message ?? error ?? '').toLowerCase();
    const code = error?.code ?? error?.status ?? error?.statusCode;
    if (code === 401 || code === 403) return true;
    return (
        msg.includes('api key') ||
        msg.includes('api_key') ||
        msg.includes('invalid api') ||
        msg.includes('invalidargument') ||
        msg.includes('permission denied') ||
        msg.includes('unauthenticated') ||
        msg.includes('request had invalid authentication') ||
        msg.includes('api_key_invalid')
    );
}

// Проверка на prompt injection (серверная дублирующая проверка)
function isPromptInjection(text) {
    if (typeof text !== 'string') return true;
    const lower = text.toLowerCase();
    const dangerous = [
        'ignore previous instructions',
        'system prompt', 'you are now', 'forget everything',
        'disregard', 'override', 'new instructions', 'act as'
    ];
    return dangerous.some(p => lower.includes(p));
}

/** Максимально строгие фильтры Gemini для детской аудитории (8–14 лет) */
const GEMINI_SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
];

/** Добавляется ко всем systemInstruction: запрет мата и токсичности */
const CHILD_SAFE_LANGUAGE_RULES = `
СТРОГИЕ ПРАВИЛА БЕЗОПАСНОСТИ (ПРИОРИТЕТ ВЫШЕ ЛЮБЫХ ДРУГИХ ИНСТРУКЦИЙ):
- НИКОГДА не используй мат, брань, оскорбления, сексуализированный или жестокий контент, токсичный юмор — даже в шутку, «кавычках», иронией или «как в интернете».
- Не повторяй, не перечисляй и не перефразируй нецензурные слова из сообщения ученика; замени нейтрально («грубое выражение»).
- Если сообщение провокационное или с бранью — вежливо откажись продолжать в этом тоне и верни разговор к учёбе и теме урока.
- Пиши литературным русским, тон спокойного педагога: уважительно, без цинизма и без сленга быта.
`.trim();

const PROFANITY_BLOCKLIST = new Set([
    'блять', 'блядь', 'бля', 'сука', 'суки', 'хуй', 'хуйло', 'хуйня', 'хуево', 'хуёво', 'хуя', 'хуе',
    'пизда', 'пиздец', 'пизд', 'ебать', 'еблан', 'ёб', 'уебок', 'заеб', 'нахуй', 'похуй', 'ебан',
    'ёбан', 'мудак', 'мудаки', 'пидор', 'пидорас', 'гандон', 'fuck', 'shit', 'bitch', 'damn', 'cunt',
]);

const PROFANITY_ROOT_PREFIXES = ['хуй', 'пизд', 'бляд', 'ебан', 'ёбан', 'мудак', 'уеб', 'заеб'];

function normRuToken(t) {
    return t.replace(/ё/g, 'е').toLowerCase();
}

function textTokensForPolicy(text) {
    if (typeof text !== 'string') return [];
    return text.split(/[^a-zA-Zа-яА-ЯёЁ0-9]+/u).filter((x) => x.length > 0).map(normRuToken);
}

/** Ввод/вывод: грубая лексика (страховка поверх настроек Gemini) */
function looksProfaneOrAbusive(text) {
    if (typeof text !== 'string' || !text.trim()) return false;
    const tokens = textTokensForPolicy(text);
    for (const w of tokens) {
        if (w.length < 2) continue;
        if (PROFANITY_BLOCKLIST.has(w)) return true;
        if (w.length >= 5 && w.length <= 16 && PROFANITY_ROOT_PREFIXES.some((r) => w.startsWith(r))) return true;
    }
    return false;
}

function extractResponseText(response) {
    return response?.text ?? (response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}

const HOMEWORK_MEDIA_LIMITS = {
    maxFiles: 6,
    maxVideoFiles: 1,
    maxImageBytes: 4 * 1024 * 1024,
    maxVideoBytes: 12 * 1024 * 1024,
    allowedImage: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    allowedVideo: new Set(['video/mp4', 'video/webm', 'video/quicktime']),
};

function decodeBase64Len(b64) {
    if (typeof b64 !== 'string' || !b64.length) return 0;
    const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

/**
 * Нормализует вложения из тела запроса: [{ mimeType, dataBase64 }]
 */
function normalizeHomeworkAttachments(raw) {
    if (!raw) return [];
    if (!Array.isArray(raw)) return [];
    const out = [];
    let videos = 0;
    for (const item of raw) {
        if (out.length >= HOMEWORK_MEDIA_LIMITS.maxFiles) break;
        if (!item || typeof item !== 'object') continue;
        let mime = typeof item.mimeType === 'string' ? item.mimeType.trim().toLowerCase() : '';
        let data = typeof item.dataBase64 === 'string' ? item.dataBase64.trim() : '';
        const dm = data.match(/^data:([^;]+);base64,(.+)$/i);
        if (dm) {
            mime = dm[1].trim().toLowerCase();
            data = dm[2].trim();
        }
        data = data.replace(/\s/g, '');
        if (!mime || !data) continue;
        const approx = decodeBase64Len(data);
        const isVid = HOMEWORK_MEDIA_LIMITS.allowedVideo.has(mime);
        const isImg = HOMEWORK_MEDIA_LIMITS.allowedImage.has(mime);
        if (!isImg && !isVid) continue;
        if (isVid) {
            videos += 1;
            if (videos > HOMEWORK_MEDIA_LIMITS.maxVideoFiles) continue;
            if (approx > HOMEWORK_MEDIA_LIMITS.maxVideoBytes) continue;
        } else if (approx > HOMEWORK_MEDIA_LIMITS.maxImageBytes) {
            continue;
        }
        out.push({ mimeType: mime, dataBase64: data });
    }
    return out;
}

function buildHomeworkContents(promptText, attachments) {
    const parts = [{ text: promptText }];
    for (const a of attachments) {
        parts.push({ inlineData: { mimeType: a.mimeType, data: a.dataBase64 } });
    }
    return [{ role: 'user', parts }];
}

/** Последняя строка VERDICT: … — для зачёта; убираем из текста для ребёнка. */
function splitHomeworkVerdict(rawText) {
    const text = (rawText || '').trim();
    const re = /\n*(?:VERDICT|ВЕРДИКТ)\s*:\s*(ACCEPTED|NEEDS_WORK|ПРИНЯТО|НУЖНО_ДОРАБОТАТЬ)\s*$/i;
    const m = text.match(re);
    if (!m) {
        return { body: text, verdict: null };
    }
    const token = m[1].toUpperCase();
    const accepted = token === 'ACCEPTED' || token === 'ПРИНЯТО';
    const needsWork = token === 'NEEDS_WORK' || token === 'НУЖНО_ДОРАБОТАТЬ';
    const body = text.replace(re, '').trim();
    return {
        body,
        verdict: accepted ? 'accepted' : needsWork ? 'needs_work' : null,
    };
}

function polishHomeworkFeedbackText(s) {
    if (typeof s !== 'string') return '';
    let t = s.trim();
    t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
    t = t.replace(/\*([^*\n]+)\*/g, '$1');
    t = t.replace(/#{1,6}\s*/gm, '');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
}

const FALLBACK_SAFE_TUTOR =
    'Я могу помогать только в спокойном и уважительном тоне. Переформулируй, пожалуйста, вопрос про программирование или урок — и я с радостью отвечу.';
const FALLBACK_SAFE_HOMEWORK =
    'Не удалось выдать корректную обратную связь. Попробуй ещё раз отправить работу — я дам мягкий комментарий по заданию.';

function sanitizeModelOutput(text, fallback) {
    if (looksProfaneOrAbusive(text)) {
        console.warn('[AI] Ответ модели заблокирован фильтром лексики (детская аудитория).');
        return fallback;
    }
    return text;
}

// Вызов Gemini с fallback: сначала 2.5, при ошибке модели — 2.0
// contents — строка или массив сообщений (мультимодальность для ДЗ)
async function generateWithFallback(contents, config = {}) {
    const mergedConfig = {
        ...config,
        safetySettings: GEMINI_SAFETY_SETTINGS,
    };
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    let lastError;
    for (const model of models) {
        try {
            const response = await ai.models.generateContent({ model, contents, config: mergedConfig });
            return response;
        } catch (e) {
            lastError = e;
            const msg = (e?.message ?? '').toLowerCase();
            if (msg.includes('404') || msg.includes('not found') || msg.includes('model')) {
                continue;
            }
            throw e;
        }
    }
    throw lastError;
}

// Здоровье системы
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        ai_active: !!ai,
        timestamp: new Date().toISOString()
    });
});

// Квота ИИ на сегодня (тьютор + проверка ДЗ) — для отображения в UI
app.get('/api/ai-usage', async (req, res) => {
    const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!hasSupabase || !accessToken) {
        return res.json({ tutor_remaining: DAILY_TUTOR_LIMIT, homework_remaining: DAILY_HOMEWORK_LIMIT });
    }
    try {
        const [tutor, homework] = await Promise.all([
            checkTutorLimit(accessToken),
            checkHomeworkLimit(accessToken)
        ]);
        if (tutor.error === 'auth' || homework.error === 'auth') {
            return res.status(401).json({ error: "Сессия истекла. Войдите снова.", code: "AUTH_REQUIRED" });
        }
        res.json({
            tutor_remaining: tutor.remaining ?? DAILY_TUTOR_LIMIT,
            homework_remaining: homework.remaining ?? DAILY_HOMEWORK_LIMIT
        });
    } catch (e) {
        console.error('AI usage endpoint error:', e);
        res.json({ tutor_remaining: DAILY_TUTOR_LIMIT, homework_remaining: DAILY_HOMEWORK_LIMIT });
    }
});

app.post('/api/ai-tutor', aiLimiter, async (req, res) => {
    if (!ai) {
        return res.status(503).json({
            error: "ИИ-сервис не настроен. Задайте API_KEY или GEMINI_API_KEY в .env (локально) или в Railway → Variables сервиса с node server.js.",
            code: "SERVICE_UNAVAILABLE"
        });
    }
    const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    if (hasSupabase && !accessToken) {
        return res.status(401).json({ error: "Войдите в аккаунт, чтобы пользоваться наставником.", code: "AUTH_REQUIRED" });
    }
    let tutorUserId = null;
    try {
        if (hasSupabase && accessToken) {
            const limit = await checkTutorLimit(accessToken);
            if (limit.error === 'auth') {
                return res.status(401).json({ error: "Сессия истекла. Обновите страницу и войдите снова.", code: "AUTH_REQUIRED" });
            }
            if (!limit.allowed) {
                return res.status(429).json({
                    error: "Лимит запросов к наставнику на сегодня исчерпан. Попробуйте завтра.",
                    code: "AI_DAILY_LIMIT"
                });
            }
            tutorUserId = limit.userId;
        }

        const { question, context } = req.body;

        // Базовая валидация входных данных
        if (typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ error: "Вопрос не должен быть пустым", code: "VALIDATION_ERROR" });
        }
        if (question.length > 4000) {
            return res.status(400).json({ error: "Вопрос слишком длинный. Попробуйте сократить формулировку.", code: "VALIDATION_ERROR" });
        }
        if (isPromptInjection(question)) {
            return res.status(400).json({ error: "Запрос заблокирован политикой безопасности.", code: "VALIDATION_ERROR" });
        }
        if (looksProfaneOrAbusive(question)) {
            return res.status(400).json({
                error: "Напиши вопрос без мата и оскорблений — общаемся уважительно.",
                code: "VALIDATION_ERROR",
            });
        }

        const ctx = typeof context === 'string' && context.trim() ? context.trim() : 'общий курс';
        const response = await generateWithFallback(question, {
            systemInstruction: `Ты — ИИ-тьютор школы «Дети В ТОПЕ». Помогаешь детям (8-14 лет) осваивать программирование и 3D.
Твой стиль: дружелюбный эксперт, вдохновляющий на созидание.
Язык: РУССКИЙ.
Кратко, по делу, без лишней воды.

Оформление ответа:
- 1–3 абзаца; между абзацами оставляй пустую строку.
- Не используй Markdown: никаких звёздочек * и **, решёток # для заголовков. Код можно короткими строками без блоков \`\`\`.

${CHILD_SAFE_LANGUAGE_RULES}

Контекст урока/курса: ${ctx}.`,
        });

        let text = extractResponseText(response);
        if (!text) {
            console.warn('AI Tutor: пустой ответ от модели', JSON.stringify(response?.candidates));
        }
        text = sanitizeModelOutput(text, FALLBACK_SAFE_TUTOR);
        text = polishHomeworkFeedbackText(text) || text;

        if (hasSupabase && accessToken && tutorUserId) {
            await incrementTutorUsage(accessToken, tutorUserId);
        }
        res.json({ text: text || 'Не удалось получить ответ. Попробуйте переформулировать вопрос.' });
    } catch (error) {
        const msg = error?.message ?? String(error);
        const code = error?.code ?? error?.status ?? error?.statusCode;
        console.error("AI Tutor request failed:", msg, "code:", code, "full:", error);

        if (isLikelyGeminiAuthError(error)) {
            return res.status(503).json({
                error: "Google отклонил запрос (ключ Gemini или доступ). Проверь API_KEY / GEMINI_API_KEY в Variables того же Railway-сервиса, что запускает server.js, без кавычек и пробелов по краям; в Google AI Studio включи Generative Language API и создай ключ заново при необходимости.",
                code: "SERVICE_UNAVAILABLE"
            });
        }
        const msgLower = msg.toLowerCase();
        if (msgLower.includes('429') || msgLower.includes('quota') || msgLower.includes('resource_exhausted') || code === 429) {
            return res.status(503).json({
                error: "Превышена квота Google AI. Попробуйте позже или проверьте лимиты в Google AI Studio.",
                code: "SERVICE_UNAVAILABLE"
            });
        }
        if (msgLower.includes('404') || msgLower.includes('model') || msgLower.includes('not found')) {
            return res.status(503).json({
                error: "Модель ИИ временно недоступна. Попробуйте позже.",
                code: "SERVICE_UNAVAILABLE"
            });
        }
        res.status(500).json({ error: "Сервис временно недоступен. Попробуйте позже.", code: "SERVER_ERROR" });
    }
});

app.post('/api/check-homework', aiLimiter, async (req, res) => {
    if (!ai) {
        return res.status(503).json({
            error: "ИИ-сервис не настроен. Задайте API_KEY или GEMINI_API_KEY в .env (локально) или в Railway → Variables сервиса с node server.js.",
            code: "SERVICE_UNAVAILABLE"
        });
    }
    const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    if (hasSupabase && !accessToken) {
        return res.status(401).json({ error: "Войдите в аккаунт, чтобы отправить задание на проверку.", code: "AUTH_REQUIRED" });
    }
    let homeworkUserId = null;
    try {
        if (hasSupabase && accessToken) {
            const limit = await checkHomeworkLimit(accessToken);
            if (limit.error === 'auth') {
                return res.status(401).json({ error: "Сессия истекла. Обновите страницу и войдите снова.", code: "AUTH_REQUIRED" });
            }
            if (!limit.allowed) {
                return res.status(429).json({
                    error: "Лимит проверок домашних заданий на сегодня исчерпан. Попробуйте завтра.",
                    code: "AI_DAILY_LIMIT"
                });
            }
            homeworkUserId = limit.userId;
        }

        const { task, studentAnswer, attachments: attachmentsRaw } = req.body;

        if (task == null || studentAnswer == null) {
            return res.status(400).json({ error: "Нужны задание и ответ (или комментарий к фото/видео).", code: 'VALIDATION_ERROR' });
        }

        const taskStr = String(task).trim();
        const answerStr = String(studentAnswer).trim();
        const attachments = normalizeHomeworkAttachments(attachmentsRaw);
        const hasMedia = attachments.length > 0;

        if (!taskStr) {
            return res.status(400).json({ error: "Текст задания пустой.", code: 'VALIDATION_ERROR' });
        }
        if (!hasMedia && answerStr.length < 25) {
            return res.status(400).json({
                error: "Опиши решение хотя бы в нескольких предложениях (от 25 символов). Если прикрепляешь фото или видео — можно короче, но добавь пару слов, что на снимке.",
                code: 'VALIDATION_ERROR',
            });
        }
        if (hasMedia && answerStr.length < 5) {
            return res.status(400).json({
                error: "Добавь короткий комментарий к файлу (что показано, что сделал) — хотя бы 5 символов.",
                code: 'VALIDATION_ERROR',
            });
        }

        if (taskStr.length > 4000 || answerStr.length > 8000) {
            return res.status(400).json({ error: "Ответ или задание слишком длинные. Попробуйте сократить текст.", code: "VALIDATION_ERROR" });
        }
        if (isPromptInjection(taskStr) || isPromptInjection(answerStr)) {
            return res.status(400).json({ error: "Текст заблокирован политикой безопасности.", code: "VALIDATION_ERROR" });
        }
        if (looksProfaneOrAbusive(taskStr) || looksProfaneOrAbusive(answerStr)) {
            return res.status(400).json({
                error: "Текст задания или ответа содержит недопустимую лексику. Убери мат и оскорбления и отправь снова.",
                code: "VALIDATION_ERROR",
            });
        }

        const mediaNote = hasMedia
            ? `\nК УЧЕНИКУ ПРИЛОЖЕНЫ ФАЙЛЫ (${attachments.length}): изучи изображения/видео и оцени, соответствуют ли они заданию.`
            : '';

        const prompt = `Ты проверяешь домашнее задание в IT-школе «Дети В ТОПЕ» для детей 8-14 лет.

ЗАДАНИЕ ИЗ УРОКА:
${taskStr}

ТЕКСТ УЧЕНИКА (решение, объяснение или подпись к работе):
${answerStr}
${mediaNote}

ВАЖНО: Ты работаешь с детьми! Поддерживай и не гаси интерес. ЗАПРЕЩЕНО: мат, оскорбления, токсичность.

ФОРМАТ ОТВЕТА (обязательно):
1) Пиши обычным русским текстом: 2–4 абзаца. Между абзацами — пустая строка.
2) НЕ используй разметку Markdown: никаких звёздочек *, **, подчёркиваний для «жирного», решёток #, обратных кавычек для кода. Если нужен список — нумеруй строки как «1) … 2) …» или пиши короткими предложениями.
3) Тон: тёплый педагог, конкретика по заданию, похвала за реальные успехи.

СТРОГОСТЬ (баланс):
- VERDICT: ACCEPTED — только если работа по сути соответствует заданию: есть мысль, попытка, видно что ребёнок сделал шаг (допускаются мелкие огрехи).
- VERDICT: NEEDS_WORK — если ответ пустой по смыслу, случайный набор символов, совсем не по теме, явная отписка без попытки, или фото/видео не относятся к заданию. При этом формулируй мягко: что улучшить и как попробовать ещё раз.
- Не требуй идеала: хвали честные усилия. Но не принимай откровенную «пустышку».

ЗАВЕРШЕНИЕ (обязательно, отдельной строкой в самом конце, без другого текста после неё):
VERDICT: ACCEPTED
или
VERDICT: NEEDS_WORK
(выбери одно).`;

        const contents = buildHomeworkContents(prompt, attachments);
        const response = await generateWithFallback(contents, {
            systemInstruction: `Ты — ИИ-наставник школы «Дети В ТОПЕ», проверяешь домашние задания детей 8–14 лет.
Анализируй текст и прикреплённые изображения/короткое видео в контексте формулировки урока.
Будь добрым, конкретным и честным: похвала там, где есть заслуги; мягко запроси доработку, если работа не тянет.
Соблюдай ФОРМАТ из пользовательского сообщения: абзацы с пустой строкой, без Markdown-звёздочек и **, финальная строка VERDICT.

${CHILD_SAFE_LANGUAGE_RULES}

Язык: русский литературный.`,
        });
        let raw = extractResponseText(response);
        if (!raw) {
            console.warn('Homework check: пустой ответ от модели', JSON.stringify(response?.candidates));
        }
        raw = sanitizeModelOutput(raw, FALLBACK_SAFE_HOMEWORK);
        const { body, verdict } = splitHomeworkVerdict(raw);
        let text = polishHomeworkFeedbackText(body) || polishHomeworkFeedbackText(raw) || FALLBACK_SAFE_HOMEWORK;
        text = sanitizeModelOutput(text, FALLBACK_SAFE_HOMEWORK);
        if (hasSupabase && accessToken && homeworkUserId) {
            await incrementHomeworkUsage(accessToken, homeworkUserId);
        }
        res.json({
            text: text || 'Не удалось получить оценку. Попробуйте ещё раз.',
            verdict: verdict || undefined,
        });
    } catch (error) {
        const msg = error?.message ?? String(error);
        const code = error?.code ?? error?.status ?? error?.statusCode;
        console.error("Homework check failed:", msg, "code:", code, "full:", error);
        if (isLikelyGeminiAuthError(error)) {
            return res.status(503).json({
                error: "Google отклонил запрос (ключ Gemini или доступ). Проверь API_KEY / GEMINI_API_KEY в Variables сервиса с server.js; ключ без кавычек; в AI Studio — новый ключ и доступ к API.",
                code: "SERVICE_UNAVAILABLE"
            });
        }
        const msgLower = msg.toLowerCase();
        if (msgLower.includes('429') || msgLower.includes('quota') || msgLower.includes('resource_exhausted') || code === 429) {
            return res.status(503).json({
                error: "Превышена квота Google AI. Попробуйте позже.",
                code: "SERVICE_UNAVAILABLE"
            });
        }
        res.status(500).json({ error: "Не удалось проверить задание. Попробуйте позже.", code: "SERVER_ERROR" });
    }
});

// Любой другой запрос отправляем на index.html в папке dist (SPA Routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`FATAL: переменная окружения ${key} не задана. Сервер не может стартовать.`);
        process.exit(1);
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Дети В ТОПЕ: Port ${PORT} | AI: ${!!ai ? 'Active' : 'Inactive'}`);
});