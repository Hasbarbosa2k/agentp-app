import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
  const chunks: string[] = [];
  let idx = 0;
  while (idx < text.length) {
    const end = Math.min(idx + chunkSize, text.length);
    chunks.push(text.slice(idx, end));
    idx = end - overlap;
    if (idx <= 0) idx = end;
  }
  return chunks.map(c => c.trim()).filter(Boolean);
}

export function* chunkTextIter(text: string, chunkSize = 1200, overlap = 150): Generator<string> {
  let idx = 0;
  while (idx < text.length) {
    const end = Math.min(idx + chunkSize, text.length);
    const piece = text.slice(idx, end).trim();
    if (piece) yield piece;
    const next = end - overlap;
    idx = next <= idx ? end : next;
  }
}

const TEXT_EXTS = new Set(['.txt', '.md', '.markdown']);
const PDF_EXTS = new Set(['.pdf']);

export async function loadFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTS.has(ext)) {
    return await fs.readFile(filePath, 'utf-8');
  }
  if (PDF_EXTS.has(ext)) {
    const buf = await fs.readFile(filePath);
    const out = await pdfParse(buf);
    return out.text;
  }
  return '';
}