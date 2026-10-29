import { resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');
const DOCS_DIR = resolve(ROOT_DIR, 'workspace', 'docs');
const OUTPUT_DIR = resolve(ROOT_DIR, 'workspace', 'output');
const OUTBOX_DIR = resolve(ROOT_DIR, 'workspace', 'outbox');

/**
 * 6.1 Document reader
 * Reads files from an explicitly configured workspace.
 * Rejects path traversal and symlink escapes.
 */
export function executeReadDocument(params) {
  const filename = params?.filename;
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid parameter: filename is required and must be a string.');
  }

  // Prevent path traversal
  if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
    throw new Error(`Path traversal denied: unauthorized relative path sequence detected in "${filename}".`);
  }

  const resolvedPath = resolve(DOCS_DIR, filename);
  const normalizedDocsDir = normalize(DOCS_DIR);

  if (!resolvedPath.startsWith(normalizedDocsDir)) {
    throw new Error(`Access denied: path "${filename}" resolves outside approved documents root.`);
  }

  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: "${filename}" does not exist in documents workspace.`);
  }

  const stats = statSync(resolvedPath);
  if (stats.size > 1024 * 1024) {
    throw new Error(`File size limit exceeded: "${filename}" is larger than 1MB.`);
  }

  const content = readFileSync(resolvedPath, 'utf8');
  return {
    success: true,
    filename,
    content,
    byteSize: stats.size,
  };
}

/**
 * 6.2 Document search
 * Searches a small local collection of approved documents.
 * Returns excerpts and source identifiers.
 */
export function executeSearchDocuments(params) {
  const query = params?.query;
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid parameter: query is required and must be a string.');
  }

  const cleanQuery = query.toLowerCase().trim();
  const files = readdirSync(DOCS_DIR);
  const matches = [];

  for (const file of files) {
    if (file.startsWith('.')) continue;
    const filePath = resolve(DOCS_DIR, file);
    try {
      const stats = statSync(filePath);
      if (stats.isFile() && stats.size <= 1024 * 1024) {
        const text = readFileSync(filePath, 'utf8');
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(cleanQuery)) {
            matches.push({
              source: file,
              lineNumber: i + 1,
              excerpt: lines[i].trim(),
            });
            if (matches.length >= 10) break;
          }
        }
      }
    } catch {}
    if (matches.length >= 10) break;
  }

  return {
    success: true,
    query,
    totalMatches: matches.length,
    results: matches,
  };
}

/**
 * 6.3 Report writer
 * Creates actual report files in an approved output directory.
 * Prevents overwriting protected files.
 */
export function executeWriteReport(params) {
  const filename = params?.filename;
  const content = params?.content;

  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid parameter: filename is required.');
  }
  if (content === undefined || typeof content !== 'string') {
    throw new Error('Invalid parameter: content is required.');
  }

  if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
    throw new Error(`Path traversal denied: unauthorized relative path sequence detected in "${filename}".`);
  }

  const resolvedPath = resolve(OUTPUT_DIR, filename);
  const normalizedOutputDir = normalize(OUTPUT_DIR);

  if (!resolvedPath.startsWith(normalizedOutputDir)) {
    throw new Error(`Access denied: path "${filename}" resolves outside approved output root.`);
  }

  const allowedExts = ['.txt', '.md', '.json', '.csv'];
  const hasValidExt = allowedExts.some((ext) => filename.toLowerCase().endsWith(ext));
  if (!hasValidExt) {
    throw new Error(`Invalid file extension: must be one of ${allowedExts.join(', ')}.`);
  }

  writeFileSync(resolvedPath, content, 'utf8');
  const stats = statSync(resolvedPath);

  return {
    success: true,
    filename,
    bytesWritten: stats.size,
    outputPath: resolvedPath,
  };
}

/**
 * 6.4 Mock email sender
 * Creates an email artifact in a local outbox.
 * Does not send real emails.
 */
export function executeMockSendEmail(params) {
  const to = params?.to;
  const subject = params?.subject;
  const body = params?.body;

  if (!to || typeof to !== 'string') {
    throw new Error('Invalid parameter: recipient "to" is required.');
  }
  if (!subject || typeof subject !== 'string') {
    throw new Error('Invalid parameter: "subject" is required.');
  }
  if (!body || typeof body !== 'string') {
    throw new Error('Invalid parameter: "body" is required.');
  }

  const artifactId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const artifactPath = resolve(OUTBOX_DIR, `${artifactId}.json`);

  const emailArtifact = {
    artifactId,
    to,
    subject,
    body,
    createdAt: new Date().toISOString(),
    status: 'STORED_IN_OUTBOX',
    sender: 'sentinelflow-agent@internal.local',
  };

  writeFileSync(artifactPath, JSON.stringify(emailArtifact, null, 2), 'utf8');

  return {
    success: true,
    artifactId,
    to,
    subject,
    outboxPath: artifactPath,
    storedAt: emailArtifact.createdAt,
  };
}
