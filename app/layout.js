import LegacyNavigation from './LegacyNavigation';

export const metadata = {
  title: 'Myfitfolio',
  description: '취업 준비생을 위한 포트폴리오 생성 서비스',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>
        <LegacyNavigation />
        {children}
      </body>
    </html>
  );
}
