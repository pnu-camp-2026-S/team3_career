import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const contentTypes = {
  '.js': 'text/javascript; charset=utf-8',
};

export async function GET(request, context) {
  const params = await context.params;
  const jsDir = path.join(process.cwd(), 'js');
  const filePath = path.resolve(jsDir, ...(params.file || []));

  if (!filePath.startsWith(`${jsDir}${path.sep}`)) {
    notFound();
  }

  try {
    const fileStat = await stat(filePath);
    const etag = `"${fileStat.mtimeMs.toString(16)}-${fileStat.size.toString(16)}"`;

    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, {
        status: 304,
        headers: { etag, 'cache-control': 'public, max-age=0, must-revalidate' },
      });
    }

    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    return new Response(body, {
      headers: {
        'content-type': contentTypes[extension] || 'text/plain; charset=utf-8',
        etag,
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch {
    notFound();
  }
}
