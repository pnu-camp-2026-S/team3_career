import {
  buildMockPortfolioResponse,
  buildPortfolioPrompt,
  generateOpenAiJson,
  getPortfolioSchema,
  isAnalysisMockEnabled,
  normalizePortfolioResponse,
} from '../../../../lib/openai-portfolio';

export async function POST(request) {
  try {
    const {
      format,
      purpose,
      major,
      experiences = [],
      keywords = [],
      myPageInfo = {},
    } = await request.json();

    if (!format || !purpose || !major) {
      return Response.json(
        { success: false, error: '포트폴리오 형식, 목적, 전공 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    const context = { format, purpose, major, experiences, keywords, myPageInfo };
    if (isAnalysisMockEnabled()) {
      return Response.json({
        success: true,
        data: buildMockPortfolioResponse(format, context),
        provider: 'mock',
      });
    }

    const prompt = buildPortfolioPrompt(context);
    const rawData = await generateOpenAiJson(prompt, getPortfolioSchema(format));
    const data = normalizePortfolioResponse(format, rawData, context);

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('OpenAI portfolio generate error:', error);
    return Response.json(
      { success: false, error: error.message || '포트폴리오 생성 중 오류가 발생했습니다.' },
      { status: error.statusCode || 500 }
    );
  }
}
