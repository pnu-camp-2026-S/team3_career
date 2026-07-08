import { generateOpenAiJson, portfolioReviseSchema } from '../../../../lib/openai-portfolio';

export async function POST(request) {
  try {
    const {
      currentDraft,
      revisionRequest,
      chatHistory = [],
    } = await request.json();

    if (!currentDraft || !revisionRequest) {
      return Response.json(
        { success: false, error: '현재 초안과 수정 요청이 필요합니다.' },
        { status: 400 }
      );
    }

    const prompt = `
너는 Myfitfolio의 포트폴리오 수정 도우미다.
사용자의 대화 요청을 반영해 현재 포트폴리오 초안을 다시 작성한다.

[중요 원칙]
1. 사용자가 제공하지 않은 경험, 역할, 성과, 수치, 수상 내역은 새로 만들지 않는다.
2. 기존 초안의 근거와 구조를 유지하되, 사용자가 요청한 방향으로 문장, 강조점, 순서를 개선한다.
3. 왼쪽 미리보기 화면이 바로 바뀌어야 하므로 blocks 또는 slides 전체를 완성된 형태로 반환한다.
4. 답변은 지정된 JSON 스키마만 따른다.

[현재 초안 JSON]
${JSON.stringify(currentDraft)}

[대화 기록 JSON]
${JSON.stringify(chatHistory)}

[이번 수정 요청]
${revisionRequest}

[응답 규칙]
- assistantMessage: 사용자에게 보여줄 짧은 수정 완료 안내문
- blocks: 일반 포트폴리오 미리보기용 섹션 전체
- slides: PPT 형식 미리보기용 슬라이드 전체
- 현재 형식이 PPT가 아니어도 slides는 가능하면 blocks와 같은 핵심 내용을 발표용으로 요약해 반환한다.
- 현재 형식이 PPT라면 slides를 반드시 채우고, blocks도 동일 내용을 요약해 반환한다.
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
