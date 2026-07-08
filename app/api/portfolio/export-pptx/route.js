import pptxgen from 'pptxgenjs';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeBlocks(portfolio) {
  const source = portfolio.format === 'PPT 발표 스펙'
    ? portfolio.slides
    : portfolio.blocks;
  const blocks = Array.isArray(source) ? source : [];

  if (blocks.length) {
    return blocks.map((block, index) => ({
      title: normalizeText(block.title) || `섹션 ${index + 1}`,
      body: normalizeText(block.body || block.description),
    }));
  }

  return [{
    title: normalizeText(portfolio.title || portfolio.format || '포트폴리오 초안'),
    body: normalizeText(portfolio.summary || '생성된 포트폴리오 초안입니다.'),
  }];
}

function splitBodyLines(body) {
  return normalizeText(body)
    .split(/(?:\n|•|ㆍ| - )+/)
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .slice(0, 6);
}

function addTitle(slide, text, y = 0.55) {
  slide.addText(text, {
    x: 0.65,
    y,
    w: 11.0,
    h: 0.55,
    fontFace: 'Malgun Gothic',
    fontSize: 25,
    bold: true,
    color: '101828',
    margin: 0,
    fit: 'shrink',
  });
}

function addSubText(slide, text, y = 1.18) {
  slide.addText(text, {
    x: 0.67,
    y,
    w: 11.0,
    h: 0.35,
    fontFace: 'Malgun Gothic',
    fontSize: 12,
    color: '667085',
    margin: 0,
    fit: 'shrink',
  });
}

function addPill(slide, text, x, y, w) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h: 0.36,
    rectRadius: 0.08,
    fill: { color: 'EEF4FF' },
    line: { color: 'D6E4FF' },
  });
  slide.addText(text, {
    x: x + 0.12,
    y: y + 0.08,
    w: w - 0.24,
    h: 0.16,
    fontFace: 'Malgun Gothic',
    fontSize: 9,
    bold: true,
    color: '3156E8',
    margin: 0,
    fit: 'shrink',
  });
}

function addCard(slide, block, x, y, w, h) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'D8E2F5', width: 1 },
  });
  slide.addText(block.title, {
    x: x + 0.22,
    y: y + 0.22,
    w: w - 0.44,
    h: 0.28,
    fontFace: 'Malgun Gothic',
    fontSize: 14,
    bold: true,
    color: '101828',
    margin: 0,
    fit: 'shrink',
  });

  const lines = splitBodyLines(block.body);
  const bulletText = lines.length ? lines.map((line) => ({ text: line, options: { bullet: { type: 'bullet' } } })) : [{ text: '내용 보완 필요' }];
  slide.addText(bulletText, {
    x: x + 0.26,
    y: y + 0.72,
    w: w - 0.52,
    h: h - 0.92,
    fontFace: 'Malgun Gothic',
    fontSize: 10.5,
    color: '344054',
    breakLine: false,
    fit: 'shrink',
    paraSpaceAfterPt: 4,
    margin: 0,
  });
}

function addOverviewSlide(pptx, portfolio, blocks) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F7FB' };
  slide.addShape('roundRect', {
    x: 0.28,
    y: 0.25,
    w: 12.75,
    h: 7.0,
    rectRadius: 0.12,
    fill: { color: 'FFFFFF' },
    line: { color: 'DBE4F4' },
  });

  addPill(slide, normalizeText(portfolio.format || 'Portfolio'), 0.65, 0.62, 1.65);
  addTitle(slide, normalizeText(portfolio.title || `${portfolio.format || '포트폴리오'} - ${portfolio.purpose || ''}`));
  addSubText(slide, `${normalizeText(portfolio.major || '전공 정보')} / ${normalizeText(portfolio.purpose || '생성 목적')}`);

  slide.addShape('line', {
    x: 0.65,
    y: 1.75,
    w: 11.55,
    h: 0,
    line: { color: '101828', width: 2 },
  });

  const keywords = Array.isArray(portfolio.keywords) ? portfolio.keywords.slice(0, 3) : [];
  [
    ['형식', portfolio.format],
    ['전공', portfolio.major],
    ['키워드', keywords.join(', ')],
  ].filter(([, value]) => value).forEach(([label, value], index) => {
    const x = 0.68 + index * 3.95;
    slide.addShape('roundRect', {
      x,
      y: 2.05,
      w: 3.45,
      h: 0.64,
      rectRadius: 0.08,
      fill: { color: 'F7F9FF' },
      line: { color: 'DCE6FF' },
    });
    slide.addText(label, {
      x: x + 0.18,
      y: 2.18,
      w: 0.7,
      h: 0.18,
      fontFace: 'Malgun Gothic',
      fontSize: 9,
      bold: true,
      color: '3156E8',
      margin: 0,
    });
    slide.addText(normalizeText(value), {
      x: x + 0.9,
      y: 2.16,
      w: 2.35,
      h: 0.24,
      fontFace: 'Malgun Gothic',
      fontSize: 10,
      color: '101828',
      margin: 0,
      fit: 'shrink',
    });
  });

  const positions = [
    [0.68, 3.0, 5.85, 1.55],
    [6.72, 3.0, 5.85, 1.55],
    [0.68, 4.82, 5.85, 1.55],
    [6.72, 4.82, 5.85, 1.55],
  ];
  blocks.slice(0, 4).forEach((block, index) => addCard(slide, block, ...positions[index]));
}

function addDetailSlides(pptx, portfolio, blocks) {
  blocks.forEach((block, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };
    addPill(slide, `Slide ${index + 2}`, 0.65, 0.55, 1.1);
    addTitle(slide, block.title, 1.05);
    addSubText(slide, normalizeText(portfolio.title || `${portfolio.format || '포트폴리오'} 초안`), 1.6);

    slide.addShape('roundRect', {
      x: 0.75,
      y: 2.15,
      w: 11.85,
      h: 4.35,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'D8E2F5' },
    });

    const lines = splitBodyLines(block.body);
    const bulletText = lines.length ? lines.map((line) => ({ text: line, options: { bullet: { type: 'bullet' } } })) : [{ text: block.body || '내용 보완 필요' }];
    slide.addText(bulletText, {
      x: 1.12,
      y: 2.58,
      w: 10.95,
      h: 3.55,
      fontFace: 'Malgun Gothic',
      fontSize: 18,
      color: '263244',
      breakLine: false,
      fit: 'shrink',
      paraSpaceAfterPt: 8,
      margin: 0,
    });
  });
}

export async function POST(request) {
  try {
    const portfolio = await request.json();
    if (!portfolio || typeof portfolio !== 'object') {
      return Response.json({ message: '포트폴리오 데이터가 필요합니다.' }, { status: 400 });
    }

    const blocks = normalizeBlocks(portfolio);
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Myfitfolio';
    pptx.subject = normalizeText(portfolio.purpose || '포트폴리오 생성');
    pptx.title = normalizeText(portfolio.title || portfolio.format || 'Myfitfolio Portfolio');
    pptx.company = 'Myfitfolio';
    pptx.lang = 'ko-KR';
    pptx.theme = {
      headFontFace: 'Malgun Gothic',
      bodyFontFace: 'Malgun Gothic',
      lang: 'ko-KR',
    };

    addOverviewSlide(pptx, portfolio, blocks);
    addDetailSlides(pptx, portfolio, blocks.slice(0, 5));

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="myfitfolio-portfolio.pptx"',
      },
    });
  } catch (error) {
    console.error('PPTX export error:', error);
    return Response.json({ message: error.message || 'PPTX 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

