import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

const contentTypes = {
  '.js': 'text/javascript; charset=utf-8',
};

export async function GET(_request, context) {
  const params = await context.params;
  const filePath = path.join(process.cwd(), 'js', ...(params.file || []));

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
