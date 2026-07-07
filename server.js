require('dotenv').config({ path: 'key.env' });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'html')));

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 임시 데이터베이스
// 실제 서비스에서는 MySQL, PostgreSQL, MongoDB 같은 DB로 교체하세요.
const usersDB = [];

// 회원가입 엔드포인트
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    const existingUser = usersDB.find(user => user.email === email);
    if (existingUser) {
        return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = {
            id: usersDB.length + 1,
            name,
            email,
            password: hashedPassword,
            createdAt: new Date(),
        };

        usersDB.push(newUser);
        console.log('새로운 회원 가입:', { ...newUser, password: '[hidden]' });

        res.status(201).json({ message: '회원가입 성공', userId: newUser.id });
    } catch (error) {
        console.error('비밀번호 암호화 오류:', error);
        res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
    }
});

// AI 채팅 엔드포인트
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: '메시지를 입력해주세요.' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' });
        }

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant for this service. Answer clearly and concisely in Korean unless the user asks otherwise.',
                },
                { role: 'user', content: message },
            ],
        });

        const aiReply = completion.choices[0]?.message?.content || '';
        res.json({ reply: aiReply });
    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
