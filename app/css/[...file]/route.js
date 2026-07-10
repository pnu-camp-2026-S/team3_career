import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const runtime = 'nodejs';

const cssDir = path.join(process.cwd(), 'css');

async function collectCssFiles(directory = cssDir, segments = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const nextSegments = [...segments, entry.name];

    if (entry.isDirectory()) {
      files.push(...(await collectCssFiles(path.join(directory, entry.name), nextSegments)));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.css') {
      files.push(nextSegments);
    }
  }

  return files;
}

export async function generateStaticParams() {
  const files = await collectCssFiles();
  return files.map((file) => ({ file }));
}

export async function GET(_request, context) {
  const params = await context.params;
  const segments = Array.isArray(params.file) ? params.file : [];
  const filePath = path.resolve(cssDir, ...segments);

  if (!segments.length || !filePath.startsWith(`${path.resolve(cssDir)}${path.sep}`)) {
    notFound();
  }

  try {
    const body = await readFile(filePath);

    return new Response(body, {
      headers: {
        'content-type': 'text/css; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=31536000, must-revalidate',
      },
    });
  } catch {
    notFound();
  }
}
