require('dotenv').config({ path: 'key.env' });

const nextConfig = {
  outputFileTracingRoot: __dirname,
  // pdf-parse(pdf.js 기반)와 mammoth는 서버 번들에 포함되면 내부 워커/동적 로딩이 깨져
  // PDF·docx 텍스트 추출이 실패한다. 번들에서 제외해 런타임에 node_modules에서 직접 불러온다.
  serverExternalPackages: ['pdf-parse', 'mammoth'],
};

module.exports = nextConfig;
