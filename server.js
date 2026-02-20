import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем CORS только для доверенных источников
const allowedOrigins = [
    'https://mykiddy-production.up.railway.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'capacitor://localhost',
    'ionic://localhost'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // мобильные webview / curl
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn('[CORS] Blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    }
}));
app.use(express.json());

// ВАЖНО: В продакшене мы отдаем файлы из папки dist (сборка Vite)
// Это заставляет сервер искать index.html и JS файлы именно там
app.use(express.static(path.join(__dirname, 'dist')));

const initAI = () => {
    const key = process.env.API_KEY;
    if (!key) {
        console.warn("⚠️ API Key is missing in server environment variables!");
        return null;
    }
    try {
        return new GoogleGenAI({ apiKey: key });
    } catch (e) {
        console.error("AI Init Error:", e);
        return null;
    }
};

const ai = initAI();

// Здоровье системы
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        ai_active: !!ai,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/ai-tutor', async (req, res) => {
    if (!ai) return res.status(503).json({ error: "Сервис временно недоступен" });
    try {
        const { question, context } = req.body;

        // Базовая валидация входных данных
        if (typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ error: "Вопрос не должен быть пустым" });
        }
        if (question.length > 4000) {
            return res.status(400).json({ error: "Вопрос слишком длинный. Попробуйте сократить формулировку." });
        }
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: question,
            config: {
                systemInstruction: `Ты — ИИ-тьютор Kiddy. Помогаешь детям (8-14 лет) осваивать программирование и 3D. 
                Твой стиль: дружелюбный эксперт, вдохновляющий на созидание. 
                Язык: РУССКИЙ. 
                Кратко, по делу, без лишней воды.
                Контекст: ${context}.`
            },
        });
        res.json({ text: response.text });
    } catch (error) {
        console.error("AI Request Failed:", error);
        res.status(500).json({ error: "Сервис временно недоступен. Попробуйте позже" });
    }
});

app.post('/api/check-homework', async (req, res) => {
    if (!ai) return res.status(503).json({ error: "Сервис временно недоступен" });
    try {
        const { task, studentAnswer } = req.body;
        
        if (!task || !studentAnswer) {
            return res.status(400).json({ error: "Task and student answer are required" });
        }

        const taskStr = String(task);
        const answerStr = String(studentAnswer);

        if (taskStr.length > 4000 || answerStr.length > 8000) {
            return res.status(400).json({ error: "Ответ или задание слишком длинные. Попробуйте сократить текст." });
        }
        
        const prompt = `Ты проверяешь домашнее задание в IT-школе Kiddy для детей 8-14 лет.

ЗАДАНИЕ ИЗ УРОКА:
${taskStr}

ОТВЕТ УЧЕНИКА:
${answerStr}

ВАЖНО: Ты работаешь с детьми! Будь максимально поддерживающим и добрым.

Проверь ответ ученика на соответствие заданию. Учти:
1. Правильность выполнения задания
2. Соответствие требованиям из задания
3. Качество кода/решения (если применимо)
4. Полноту ответа
5. Старание ученика (даже если есть ошибки)

ПРАВИЛА ОЦЕНКИ:
- Если ответ правильный и соответствует заданию → похвали и подтверди правильность
- Если ученик старался, но есть небольшие ошибки → похвали за старание и укажи на ошибки мягко
- Если ответ частично правильный, но видно старание → похвали и предложи улучшения
- Только если ответ совсем не по теме, пустой или явно случайный → мягко объясни, что нужно переделать

ВАЖНО: НЕ используй слова "ACCEPTED" или "NEEDS_WORK" в начале ответа. Просто давай дружелюбную обратную связь.

Стиль: максимально поддерживающий, дружелюбный, вдохновляющий. Хвали за старание!
Язык: РУССКИЙ.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: `Ты — ИИ-тьютор Kiddy, который проверяет домашние задания для детей 8-14 лет. 
                Ты внимательно анализируешь ответ ученика на основе конкретного задания из урока.
                Ты МАКСИМАЛЬНО поддерживающий, дружелюбный и конструктивный.
                Ты работаешь с детьми - будь добрым и терпеливым!
                НЕ используй технические слова типа "ACCEPTED" или "NEEDS_WORK" - просто давай дружелюбную обратную связь.
                Если ответ правильный - похвали и подтверди правильность.
                Если есть ошибки - мягко укажи на них и предложи как исправить.
                Всегда хвали за старание и мотивируй продолжать учиться!
                Язык: РУССКИЙ.`
            }
        });
        res.json({ text: response.text });
    } catch (error) {
        console.error("Homework Check Failed:", error);
        res.status(500).json({ error: "Не удалось проверить задание. Попробуйте позже" });
    }
});

// Любой другой запрос отправляем на index.html в папке dist (SPA Routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Kiddy OS: Port ${PORT} | AI: ${!!ai ? 'Active' : 'Inactive'}`);
});