// Builds zips of course files in the browser.
//
// Files are fetched straight from R2 and streamed into the zip by client-zip,
// so nothing passes through the backend. Entries are stored, not compressed:
// PDFs, slides and images are already compressed and stay fast to zip.
import { downloadZip } from 'client-zip';

const PREFETCH = 3; // files fetched ahead of the one being written

// Characters Windows, macOS or Linux refuse in a file or folder name.
const cleanName = (name, fallback) => {
  const cleaned = String(name || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return (cleaned || fallback).slice(0, 150);
};

const extensionOf = (url) => {
  try {
    const last = new URL(url).pathname.split('/').pop() || '';
    const dot = last.lastIndexOf('.');
    return dot > 0 ? last.slice(dot + 1).toLowerCase() : '';
  } catch {
    return '';
  }
};

const fileNameFor = (file) => {
  const ext = extensionOf(file.file_url);
  const base = cleanName(file.title, `file-${file.file_id ?? file.id}`);
  if (!ext || base.toLowerCase().endsWith(`.${ext}`)) return base;
  return `${base}.${ext}`;
};

// "notes.pdf" twice in one folder becomes "notes.pdf" and "notes (2).pdf".
const uniquePath = (path, used) => {
  if (!used.has(path.toLowerCase())) {
    used.add(path.toLowerCase());
    return path;
  }
  const dot = path.lastIndexOf('.');
  const slash = path.lastIndexOf('/');
  const hasExt = dot > slash + 1;
  const stem = hasExt ? path.slice(0, dot) : path;
  const ext = hasExt ? path.slice(dot) : '';
  for (let n = 2; ; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase());
      return candidate;
    }
  }
};

export const courseFolderName = (course) =>
  cleanName(course.code && course.code !== course.name ? `${course.code} - ${course.name}` : course.name, 'Course');

export const sectionFolderName = (section) => cleanName(section, 'Files');

/**
 * Zip `sections` ({ name, files }[]) as <rootFolder>/<section>/<file> and save
 * it as `zipName`.
 *
 * onProgress({ done, total }) runs after each file. Returns
 * { added: file_id[], failed: title[] }. Throws an AbortError when `signal`
 * is aborted.
 */
export async function downloadSectionsAsZip({ rootFolder, sections, zipName, signal, onProgress }) {
  const used = new Set();
  const entries = [];
  for (const section of sections) {
    const folder = `${rootFolder}/${sectionFolderName(section.name)}`;
    for (const file of section.files) {
      if (!file.file_url) continue;
      entries.push({ file, path: uniquePath(`${folder}/${fileNameFor(file)}`, used) });
    }
  }
  if (entries.length === 0) return { added: [], failed: [] };

  const added = [];
  const failed = [];
  let done = 0;

  const start = (entry) => {
    const p = fetch(entry.file.file_url, { signal }).then(
      (res) => (res.ok ? res : Promise.reject(new Error(`HTTP ${res.status}`))),
    );
    p.catch(() => {}); // handled when its turn comes; avoids unhandled-rejection noise
    return p;
  };

  async function* files() {
    const pending = entries.slice(0, PREFETCH).map(start);
    for (let i = 0; i < entries.length; i++) {
      if (i + PREFETCH < entries.length) pending.push(start(entries[i + PREFETCH]));
      const entry = entries[i];
      try {
        const res = await pending[i];
        pending[i] = null; // let finished responses be collected
        yield { name: entry.path, input: res, lastModified: entry.file.date ? new Date(entry.file.date) : undefined };
        added.push(entry.file.file_id ?? entry.file.id);
      } catch (err) {
        if (signal?.aborted) throw err;
        failed.push(entry.file.title || entry.path);
      }
      done += 1;
      onProgress?.({ done, total: entries.length });
    }
    if (failed.length > 0) {
      yield {
        name: `${rootFolder}/MISSING FILES.txt`,
        input: `These files could not be downloaded and are not in this zip:\n\n${failed.map((t) => `- ${t}`).join('\n')}\n`,
      };
    }
  }

  const blob = await downloadZip(files()).blob();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (added.length === 0) return { added, failed };

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { added, failed };
}
