import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../lib/supabase-server';
import { deriveFolderTree } from '../../../lib/folder-tree';
import { inflateRawSync } from 'node:zlib';

const ACTIVITY_FILE_BUCKET = 'activity-files';
const ACTIVITY_FILE_COLUMNS = 'id, folder_id, folder_group, folder_type, folder_label, project_id, parent_folder_id, folder_path, folder_level, file_name, mime_type, size_bytes, storage_bucket, storage_path, created_at, file_analyses(status, summary_md, index_draft, log_md)';
const TEXT_PREVIEW_EXTENSIONS = new Set(['txt', 'md', 'csv']);
const TEXT_PREVIEW_MIME_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv']);
const OFFICE_PREVIEW_EXTENSIONS = new Set(['docx', 'pptx', 'xlsx']);
const OFFICE_PREVIEW_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 10;
const TEXT_PREVIEW_MAX_BYTES = 512 * 1024;
const OFFICE_PREVIEW_MAX_BYTES = 10 * 1024 * 1024;
const OFFICE_XML_TEXT_LIMIT = 4000;

function getStorageClient(supabase) {
  return createSupabaseAdminClient() || supabase;
}

function sanitizePathSegment(value) {
  return String(value || 'file')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function getSafeStorageFileName(fileName) {
  const normalized = String(fileName || 'file').normalize('NFKC');
  const extensionMatch = normalized.match(/\.([A-Za-z0-9]{1,12})$/);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : '';

  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

// file_analyses는 activity_file_id unique 제약 때문에 배열/단일 객체 어느 쪽으로도 올 수 있다.
function embeddedAnalysis(embedded) {
  if (!embedded) return null;
  const row = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!row) return null;
  return {
    status: row.status || null,
    summaryMd: row.summary_md || '',
    indexDraft: row.index_draft || null,
    logMd: row.log_md || '',
  };
}

function mapActivityFile(row) {
  const analysis = embeddedAnalysis(row.file_analyses);
  return {
    id: row.id,
    name: row.file_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    folderId: row.folder_id,
    folderGroup: row.folder_group,
    folderType: row.folder_type,
    folderLabel: row.folder_label,
    projectId: row.project_id,
    parentFolderId: row.parent_folder_id,
    folderPath: row.folder_path,
    folderLevel: row.folder_level,
    analysisStatus: analysis?.status || null,
    analysis,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

function getFileExtension(fileName) {
  return String(fileName || '').split('.').pop()?.toLowerCase() || '';
}

function getPreviewKind(fileName, mimeType) {
  const extension = getFileExtension(fileName);
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  if (normalizedMimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (normalizedMimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
  if (TEXT_PREVIEW_MIME_TYPES.has(normalizedMimeType) || TEXT_PREVIEW_EXTENSIONS.has(extension)) return 'text';
  if (OFFICE_PREVIEW_MIME_TYPES.has(normalizedMimeType) || OFFICE_PREVIEW_EXTENSIONS.has(extension)) return 'office';
  return 'unsupported';
}

function stripXmlTags(xml = '') {
  return String(xml)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlText(xml = '') {
  const textNodes = [...String(xml).matchAll(/<[^:>]*:?t\b[^>]*>([\s\S]*?)<\/[^:>]*:?t>/g)]
    .map((match) => stripXmlTags(match[1]))
    .filter(Boolean);
  return textNodes.join(' ').replace(/\s+/g, ' ').trim();
}

function readUInt(buffer, offset, byteLength) {
  let value = 0;
  for (let index = 0; index < byteLength; index += 1) {
    value += buffer[offset + index] << (index * 8);
  }
  return value;
}

function parseZipEntries(arrayBuffer) {
  const buffer = Buffer.from(arrayBuffer);
  const entries = {};
  let offset = 0;

  while (offset < buffer.length - 30) {
    if (readUInt(buffer, offset, 4) !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const compressionMethod = readUInt(buffer, offset + 8, 2);
    const compressedSize = readUInt(buffer, offset + 18, 4);
    const fileNameLength = readUInt(buffer, offset + 26, 2);
    const extraLength = readUInt(buffer, offset + 28, 2);
    const fileNameStart = offset + 30;
    const dataStart = fileNameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    const fileName = buffer.subarray(fileNameStart, fileNameStart + fileNameLength).toString('utf8');
    const compressed = buffer.subarray(dataStart, dataEnd);

    if (compressionMethod === 0) {
      entries[fileName] = compressed.toString('utf8');
    } else if (compressionMethod === 8) {
      entries[fileName] = inflateRawSync(compressed).toString('utf8');
    }

    offset = dataEnd;
  }

  return entries;
}

async function extractDocxPreview(arrayBuffer) {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = String(result.value || '').trim();
  return {
    officeType: 'docx',
    sections: [
      {
        title: '문서 텍스트',
        text: text.slice(0, OFFICE_XML_TEXT_LIMIT) || '추출 가능한 문단 텍스트가 없습니다.',
      },
    ],
    notice: text.length > OFFICE_XML_TEXT_LIMIT ? '문서가 길어 앞부분만 미리보기로 표시합니다.' : '',
  };
}

function extractPptxPreview(arrayBuffer) {
  const entries = parseZipEntries(arrayBuffer);
  const slides = Object.entries(entries)
    .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(([left], [right]) => Number(left.match(/slide(\d+)\.xml/)?.[1] || 0) - Number(right.match(/slide(\d+)\.xml/)?.[1] || 0))
    .slice(0, 12)
    .map(([name, xml]) => {
      const slideNumber = name.match(/slide(\d+)\.xml/)?.[1] || '';
      const text = extractXmlText(xml);
      return {
        title: `슬라이드 ${slideNumber}`,
        text: text.slice(0, OFFICE_XML_TEXT_LIMIT) || '추출 가능한 슬라이드 텍스트가 없습니다.',
      };
    });

  return {
    officeType: 'pptx',
    sections: slides.length ? slides : [{ title: '슬라이드', text: '추출 가능한 슬라이드 텍스트가 없습니다.' }],
    notice: '슬라이드 텍스트만 추출한 구조화 미리보기입니다.',
  };
}

function extractSharedStrings(entries) {
  const sharedXml = entries['xl/sharedStrings.xml'];
  if (!sharedXml) return [];
  return [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => extractXmlText(match[1]));
}

function extractXlsxPreview(arrayBuffer) {
  const entries = parseZipEntries(arrayBuffer);
  const sharedStrings = extractSharedStrings(entries);
  const sheets = Object.entries(entries)
    .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort(([left], [right]) => Number(left.match(/sheet(\d+)\.xml/)?.[1] || 0) - Number(right.match(/sheet(\d+)\.xml/)?.[1] || 0))
    .slice(0, 6)
    .map(([name, xml]) => {
      const sheetNumber = name.match(/sheet(\d+)\.xml/)?.[1] || '';
      const rows = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)]
        .slice(0, 10)
        .map((rowMatch) => [...rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)]
          .slice(0, 8)
          .map((cellMatch) => {
            const cellAttrs = cellMatch[1] || '';
            const rawValue = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] || '';
            if (cellAttrs.includes('t="s"')) return sharedStrings[Number(rawValue)] || '';
            return stripXmlTags(rawValue);
          }));
      return {
        title: `시트 ${sheetNumber}`,
        rows,
        text: rows.length ? '' : '추출 가능한 시트 데이터가 없습니다.',
      };
    });

  return {
    officeType: 'xlsx',
    sections: sheets.length ? sheets : [{ title: '시트', text: '추출 가능한 시트 데이터가 없습니다.' }],
    notice: '시트별 앞부분 행과 열만 미리보기로 표시합니다.',
  };
}

async function extractOfficePreview(arrayBuffer, fileName) {
  const extension = getFileExtension(fileName);
  if (extension === 'docx') return extractDocxPreview(arrayBuffer);
  if (extension === 'pptx') return extractPptxPreview(arrayBuffer);
  if (extension === 'xlsx') return extractXlsxPreview(arrayBuffer);
  return {
    officeType: extension || 'office',
    sections: [{ title: '미지원 문서', text: '이 오피스 문서는 아직 구조화 미리보기를 지원하지 않습니다.' }],
  };
}

async function createStorageSignedUrl(storage, bucket, path) {
  const { data, error } = await storage
    .from(bucket || ACTIVITY_FILE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error) throw error;
  return data?.signedUrl || '';
}

async function buildActivityFilePreview({ storage, fileRow }) {
  const kind = getPreviewKind(fileRow.file_name, fileRow.mime_type);
  const bucket = fileRow.storage_bucket || ACTIVITY_FILE_BUCKET;
  const path = fileRow.storage_path;
  const basePreview = {
    id: fileRow.id,
    name: fileRow.file_name,
    mimeType: fileRow.mime_type,
    size: fileRow.size_bytes,
    kind,
  };

  if (!path) {
    return {
      ...basePreview,
      kind: 'unavailable',
      message: '미리보기에 사용할 원본 파일 경로가 없습니다.',
    };
  }

  if (kind === 'image' || kind === 'pdf') {
    return {
      ...basePreview,
      signedUrl: await createStorageSignedUrl(storage, bucket, path),
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    };
  }

  if (kind === 'text') {
    if (Number(fileRow.size_bytes || 0) > TEXT_PREVIEW_MAX_BYTES) {
      return {
        ...basePreview,
        signedUrl: await createStorageSignedUrl(storage, bucket, path),
        message: '파일이 커서 일부 내용을 바로 표시하지 않고 새 탭 열기로 안내합니다.',
      };
    }

    const { data, error } = await storage.from(bucket).download(path);
    if (error) throw error;

    return {
      ...basePreview,
      text: await data.text(),
    };
  }

  if (kind === 'office') {
    if (Number(fileRow.size_bytes || 0) > OFFICE_PREVIEW_MAX_BYTES) {
      return {
        ...basePreview,
        signedUrl: await createStorageSignedUrl(storage, bucket, path),
        message: '문서가 커서 구조화 미리보기 대신 원본 파일 열기로 안내합니다.',
      };
    }

    const { data, error } = await storage.from(bucket).download(path);
    if (error) throw error;
    return {
      ...basePreview,
      ...(await extractOfficePreview(await data.arrayBuffer(), fileRow.file_name)),
    };
  }

  return {
    ...basePreview,
    signedUrl: await createStorageSignedUrl(storage, bucket, path),
    message: '이 파일 형식은 아직 직접 미리보기를 지원하지 않습니다. 원본 파일을 새 탭에서 확인해 주세요.',
  };
}

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function GET(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const searchParams = new URL(request.url).searchParams;
    const previewId = searchParams.get('previewId');
    const projectId = searchParams.get('projectId');

    if (previewId) {
      const { data: fileRow, error: previewReadError } = await supabase
        .from('activity_files')
        .select('id, file_name, mime_type, size_bytes, storage_bucket, storage_path')
        .eq('id', previewId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (previewReadError) return Response.json({ message: previewReadError.message }, { status: 500 });
      if (!fileRow) return Response.json({ message: 'File not found' }, { status: 404 });

      const storage = getStorageClient(supabase).storage;
      const preview = await buildActivityFilePreview({ storage, fileRow });
      return Response.json({ preview });
    }

    let query = supabase
      .from('activity_files')
      .select(ACTIVITY_FILE_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ files: (data || []).map(mapActivityFile) });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to load activity files' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const formData = await request.formData();
    const files = formData.getAll('files').filter((file) => file && typeof file.name === 'string');
    const folderId = String(formData.get('folderId') || '');
    const folderGroup = String(formData.get('folderGroup') || '');
    const folderType = String(formData.get('folderType') || '');
    const folderLabel = String(formData.get('folderLabel') || '');
    const projectIdHint = String(formData.get('projectId') || '');

    if (!folderId || !files.length) {
      return Response.json({ message: 'folderId and files are required' }, { status: 400 });
    }

    // 'AI 요약' 세부 폴더에는 원본 자료를 올릴 수 없다(요약 산출물 전용).
    if (folderId.endsWith('::ai-summary')) {
      return Response.json(
        { message: 'AI 요약 폴더에는 자료를 직접 올릴 수 없습니다.' },
        { status: 400 }
      );
    }

    const tree = deriveFolderTree(folderId, projectIdHint || null);
    const storage = getStorageClient(supabase).storage;
    const savedRows = [];

    for (const file of files) {
      const fileName = file.name;
      // storage_path는 folder_path를 그대로 미러링한다(#167): uid/프로젝트/하위폴더/파일
      const storagePath = [
        user.id,
        ...tree.folderPath.split('/').map(sanitizePathSegment),
        getSafeStorageFileName(fileName),
      ].join('/');

      const { error: uploadError } = await storage.from(ACTIVITY_FILE_BUCKET).upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) return Response.json({ message: uploadError.message }, { status: 500 });

      const { data, error: insertError } = await supabase
        .from('activity_files')
        .insert({
          user_id: user.id,
          folder_id: folderId,
          folder_group: folderGroup,
          folder_type: folderType,
          folder_label: folderLabel,
          project_id: tree.projectId,
          parent_folder_id: tree.parentFolderId,
          folder_path: tree.folderPath,
          folder_level: tree.folderLevel,
          file_name: fileName,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size || 0,
          storage_bucket: ACTIVITY_FILE_BUCKET,
          storage_path: storagePath,
        })
        .select(ACTIVITY_FILE_COLUMNS)
        .single();

      if (insertError) {
        await storage.from(ACTIVITY_FILE_BUCKET).remove([storagePath]);
        return Response.json({ message: insertError.message }, { status: 500 });
      }

      savedRows.push(data);
    }

    return Response.json({ files: savedRows.map(mapActivityFile) }, { status: 201 });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to upload activity files' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const { id, storagePath } = await request.json();
    const { data: fileRow, error: readError } = await supabase
      .from('activity_files')
      .select('id, storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (readError) return Response.json({ message: readError.message }, { status: 500 });
    if (!fileRow) return Response.json({ message: 'File not found' }, { status: 404 });

    const pathToRemove = fileRow.storage_path || storagePath;
    const storage = getStorageClient(supabase).storage;
    if (pathToRemove) await storage.from(ACTIVITY_FILE_BUCKET).remove([pathToRemove]);

    const { error: deleteError } = await supabase
      .from('activity_files')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) return Response.json({ message: deleteError.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to delete activity file' }, { status: 500 });
  }
}
