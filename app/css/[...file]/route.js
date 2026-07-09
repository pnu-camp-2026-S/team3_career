import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
};

export async function GET(_request, context) {
  const params = await context.params;
  const cssDir = path.join(process.cwd(), 'css');
  const filePath = path.resolve(cssDir, ...(params.file || []));

  if (!filePath.startsWith(`${cssDir}${path.sep}`)) {
    notFound();
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    return new Response(body, {
      headers: {
        'content-type': contentTypes[extension] || 'text/plain; charset=utf-8',
        'cache-control': 'no-cache, must-revalidate',
      },
    });
  } catch {
    notFound();
  }
}
