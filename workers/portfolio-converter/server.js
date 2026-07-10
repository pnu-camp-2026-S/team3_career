import express from 'express';
import multer from 'multer';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const app = express();
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
  },
});

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.CONVERTER_TOKEN || '';
const SOFFICE_BIN = process.env.SOFFICE_BIN || 'soffice';

function normalizeFileStem(value) {
  return String(value || 'portfolio')
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 90) || 'portfolio';
}

function requireAuth(request, response, next) {
  if (!TOKEN) {
    next();
    return;
  }

  const bearerToken = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (bearerToken !== TOKEN) {
    response.status(401).json({ message: 'Unauthorized converter request.' });
    return;
  }

  next();
}

function runLibreOffice(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    execFile(
      SOFFICE_BIN,
      [
        '--headless',
        '--nologo',
        '--nofirststartwizard',
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        inputPath,
      ],
      { timeout: Number(process.env.CONVERT_TIMEOUT_MS || 40_000) },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }
        resolve();
      }
    );
  });
}

app.get('/health', (request, response) => {
  response.json({ ok: true, service: 'myfitfolio-portfolio-converter' });
});

app.post('/convert/pptx-to-pdf', requireAuth, upload.single('file'), async (request, response) => {
  const uploadedFile = request.file;
  if (!uploadedFile) {
    response.status(400).json({ message: 'PPTX file is required.' });
    return;
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), 'myfitfolio-pdf-'));
  const fileStem = normalizeFileStem(uploadedFile.originalname);

  try {
    await runLibreOffice(uploadedFile.path, workDir);

    const pdfPath = path.join(workDir, `${fileStem}.pdf`);
    const pdfBuffer = await readFile(pdfPath);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline; filename="myfitfolio-portfolio.pdf"');
    response.setHeader('Cache-Control', 'no-store');
    response.send(pdfBuffer);
  } catch (error) {
    console.error('PPTX to PDF conversion failed:', error);
    response.status(500).json({
      message: error.message || 'PPTX to PDF conversion failed.',
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
    await rm(uploadedFile.path, { force: true });
  }
});

app.use((error, request, response, next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({ message: error.message });
    return;
  }
  next(error);
});

app.listen(PORT, () => {
  console.log(`portfolio converter worker listening on ${PORT}`);
});
