import { generateOpenAiJson, portfolioReviseSchema } from '../../../../lib/openai-portfolio';

export async function POST(request) {
  try {
    const {
      currentDraft,
      revisionRequest,
      chatHistory = [],
    } = await request.json();

    if (!currentDraft || !revisionRequest) {
      return Response.json({ success: false, error: '현재 초안과 수정 요청이 필요합니다.' }, { status: 400 });
    }

    const prompt = `
너는 Myfitfolio의 포트폴리오 수정 도우미다.
현재 초안을 사용자의 수정 요청에 맞게 다듬되, 사용자가 제공하지 않은 경험, 성과, 수치를 새로 만들지 마라.
기존 구조를 크게 깨지 말고 한국어 문장을 더 명확하게 수정하라.

[현재 초안 JSON]
${JSON.stringify(currentDraft)}

[대화 기록 JSON]
${JSON.stringify(chatHistory)}

[이번 수정 요청]
${revisionRequest}

[응답 규칙]
- blocks는 수정된 일반 포트폴리오 섹션 전체다.
- slides는 수정된 PPT 슬라이드 전체다.
- assistantMessage는 사용자에게 보여줄 짧은 수정 완료 안내다.
- 응답은 지정된 JSON 스키마만 따른다.
`;

    const data = await generateOpenAiJson(prompt, portfolioReviseSchema);
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('OpenAI portfolio revise error:', error);
    return Response.json(
      { success: false, error: error.message || '포트폴리오 수정 중 오류가 발생했습니다.' },
      { status: error.statusCode || 500 }
    );
  }
}
