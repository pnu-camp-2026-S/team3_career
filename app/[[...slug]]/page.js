import { notFound } from 'next/navigation';
import LegacyScripts from '../LegacyScripts';
import { getLegacyPage } from '../../lib/legacy-page';

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
