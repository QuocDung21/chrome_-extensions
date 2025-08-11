import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const JSON_PATH = path.join(PUBLIC_DIR, 'DanhSachTTHC.json');
const SOURCE_TEMPLATES_DIR = path.join(PUBLIC_DIR, 'templates');
const TARGET_BASE_DIR = path.join(PUBLIC_DIR, 'templates_by_code');

function sanitizeFolderName(name) {
  if (!name) return '';
  return String(name).replace(/[\\/]/g, '_').trim();
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function getBaseNameNoExt(fileName) {
  const base = path.basename(fileName);
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.substring(0, idx) : base;
}

async function convertDocxToHtmlBuffer(docxBuffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });
  return html;
}

async function main() {
  console.log('Reading JSON:', JSON_PATH);
  const raw = await fs.readFile(JSON_PATH, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    console.error('JSON is not an array. Abort.');
    process.exit(1);
  }

  let processed = 0;
  let copied = 0;
  let generatedHtml = 0;
  let missing = 0;

  for (const item of data) {
    const code = sanitizeFolderName(item['Mã TTHC']);
    if (!code) continue;

    // Prefer explicit file name; fallback to parse from the "Mẫu đơn, tờ khai" field if it contains a .doc path
    let fileName = item['Tên File'] || '';
    if (!fileName && item['Mẫu đơn, tờ khai']) {
      const text = String(item['Mẫu đơn, tờ khai']);
      const match = text.split(/\s|,/).find((t) => t.toLowerCase().includes('.doc'));
      if (match) fileName = path.basename(match);
    }

    if (!fileName || !fileName.toLowerCase().includes('.doc')) {
      continue;
    }

    processed++;
    const sourcePath = path.join(SOURCE_TEMPLATES_DIR, fileName);
    const exists = await fileExists(sourcePath);
    if (!exists) {
      console.warn(`[skip] Missing source docx: ${sourcePath}`);
      missing++;
      continue;
    }

    const targetDocxDir = path.join(TARGET_BASE_DIR, code, 'docx');
    const targetHtmlDir = path.join(TARGET_BASE_DIR, code, 'html');
    await ensureDir(targetDocxDir);
    await ensureDir(targetHtmlDir);

    // Copy DOCX
    const targetDocxPath = path.join(targetDocxDir, path.basename(fileName));
    try {
      await fs.copyFile(sourcePath, targetDocxPath);
      copied++;
    } catch (e) {
      console.warn(`[warn] Copy failed for ${sourcePath} -> ${targetDocxPath}:`, e.message);
    }

    // Generate HTML
    try {
      const buffer = await fs.readFile(sourcePath);
      const html = await convertDocxToHtmlBuffer(buffer);
      const htmlName = `${getBaseNameNoExt(fileName)}.html`;
      const targetHtmlPath = path.join(targetHtmlDir, htmlName);
      await fs.writeFile(targetHtmlPath, html, 'utf8');
      generatedHtml++;
    } catch (e) {
      console.warn(`[warn] HTML generation failed for ${sourcePath}:`, e.message);
    }
  }

  console.log('Done.');
  console.log({ processed, copied, generatedHtml, missing });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


