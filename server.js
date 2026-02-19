import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем CORS
app.use(cors());
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
        
        const prompt = `Ты проверяешь домашнее задание в IT-школе Kiddy.

ЗАДАНИЕ ИЗ УРОКА:
${task}

ОТВЕТ УЧЕНИКА:
${studentAnswer}

Проверь ответ ученика на соответствие заданию. Учти:
1. Правильность выполнения задания
2. Соответствие требованиям из задания
3. Качество кода/решения (если применимо)
4. Полноту ответа

Если ответ правильный и соответствует заданию, начни свой ответ с "ACCEPTED".
Если есть ошибки или несоответствия, укажи на них конструктивно.
Дай полезный совет или похвали за старание.
Стиль: поддерживающий, дружелюбный, вдохновляющий.
Язык: РУССКИЙ.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: `Ты — ИИ-тьютор Kiddy, который проверяет домашние задания. 
                Ты внимательно анализируешь ответ ученика на основе конкретного задания из урока.
                Ты поддерживающий, дружелюбный и конструктивный.
                Если ответ правильный, начинаешь с "ACCEPTED".
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