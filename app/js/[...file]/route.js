import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const contentTypes = {
  '.js': 'text/javascript; charset=utf-8',
};

export async function GET(_request, context) {
  const params = await context.params;
  const jsDir = path.join(process.cwd(), 'js');
  const filePath = path.resolve(jsDir, ...(params.file || []));

  if (!filePath.startsWith(`${jsDir}${path.sep}`)) {
    notFound();
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    return new Response(body, {
      headers: {
        'content-type': contentTypes[extension] || 'text/plain; charset=utf-8',
      },
    });
  } catch {
    notFound();
  }
}
