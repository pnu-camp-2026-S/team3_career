import fs from 'node:fs';
import path from 'node:path';

const htmlDir = path.join(process.cwd(), 'html');
const htmlFilePattern = /^[a-z0-9_-]+\.html$/i;

function normalizeAssetPath(assetPath) {
  if (!assetPath || /^https?:\/\//i.test(assetPath)) return assetPath;
  const normalized = assetPath.replace(/\\/g, '/').replace(/^(\.\.\/|\.\/)+/, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function resolveHtmlFile(slug) {
  const segments = Array.isArray(slug) ? slug : [];
  const relevantSegments = segments[0] === 'html' ? segments.slice(1) : segments;
  const rawFileName = relevantSegments.join('/') || 'index.html';
  const fileName = rawFileName.endsWith('.html') ? rawFileName : `${rawFileName}.html`;

  if (!htmlFilePattern.test(fileName)) {
    throw new Error(`Unsupported legacy page path: ${fileName}`);
  }

  return fileName;
}

function extractTitle(html) {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : 'Myfitfolio';
}

function extractBody(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function extractStyles(html) {
  return [...html.matchAll(/<link\b([^>]*)>/gi)]
    .filter((match) => /rel=["']stylesheet["']/i.test(match[1]))
    .map((match) => {
      const hrefMatch = match[1].match(/href=["']([^"']+)["']/i);
      return hrefMatch ? normalizeAssetPath(hrefMatch[1]) : null;
    })
    .filter(Boolean);
}

function extractScripts(body) {
  const scripts = [];
  const cleanedBody = body.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_match, attrs, content) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);

    scripts.push({
      src: srcMatch ? normalizeAssetPath(srcMatch[1]) : '',
      content: srcMatch ? '' : content,
    });

    return '';
  });

  return {
    body: cleanedBody,
    scripts,
  };
}

export function getLegacyPage(slug) {
  const fileName = resolveHtmlFile(slug);
  const filePath = path.join(htmlDir, fileName);
  const html = fs.readFileSync(filePath, 'utf8');
  const extracted = extractScripts(extractBody(html));

  return {
    fileName,
    title: extractTitle(html),
    styles: extractStyles(html),
    body: extracted.body,
    scripts: extracted.scripts,
  };
}
