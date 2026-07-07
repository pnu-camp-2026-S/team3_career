import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config({ path: 'key.env' });

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return Response.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
    return Response.json({ reply: aiReply });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return Response.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
