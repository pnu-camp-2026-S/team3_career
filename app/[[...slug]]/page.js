import { notFound } from 'next/navigation';
import LegacyScripts from '../LegacyScripts';
import { getLegacyPage } from '../../lib/legacy-page';

// html/ 아래 실제 존재하는 레거시 화면 목록. 새 화면을 추가하면 여기도 함께 갱신해야
// 빌드 타임에 정적으로 프리렌더된다(누락되면 요청마다 서버에서 다시 렌더링됨).
const LEGACY_SLUGS = [
  [],
  ['index.html'],
  ['login.html'],
  ['main.html'],
  ['create.html'],
  ['portfolio_create.html'],
  ['portfolio_manage.html'],
  ['portfolio_viewer.html'],
  ['contest.html'],
  ['mypage.html'],
  ['withdraw.html'],
];

export function generateStaticParams() {
  return LEGACY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  try {
    const resolvedParams = await params;
    const page = getLegacyPage(resolvedParams?.slug || []);
    return {
      title: page.title || 'Myfitfolio',
    };
  } catch {
    return {
      title: 'Myfitfolio',
    };
  }
}

export default async function LegacyPage({ params }) {
  let page;

  try {
    const resolvedParams = await params;
    page = getLegacyPage(resolvedParams?.slug || []);
  } catch {
    notFound();
  }

  return (
    <>
      {page.styles.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: page.body }} />
      <LegacyScripts pageKey={page.fileName} scripts={page.scripts} />
    </>
  );
}
