import React, { useEffect, useRef, useState } from 'react';
import { FolderDown, Loader, X } from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';
import { downloadSectionsAsZip } from '../utils/zipDownload';

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * Downloads `sections` ({ name, files }[]) as one zip laid out as
 * <rootFolder>/<section>/<file>. Clicking again while it runs cancels.
 *
 * variant: 'primary' for the course header, 'compact' for section headers.
 */
const DownloadZipButton = ({ sections, rootFolder, zipName, label, user, variant = 'compact' }) => {
  const toast = useToast();
  const [progress, setProgress] = useState(null); // { done, total } while zipping
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const files = sections.flatMap(s => s.files).filter(f => f.file_url);
  const totalSize = files.reduce((sum, f) => sum + (Number(f.file_size) || 0), 0);
  const busy = progress !== null;

  if (files.length === 0) return null;

  const run = async () => {
    if (busy) { abortRef.current?.abort(); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ done: 0, total: files.length });
    try {
      const { added, failed } = await downloadSectionsAsZip({
        rootFolder, sections, zipName, signal: controller.signal, onProgress: setProgress,
      });
      if (added.length === 0) {
        toast.error('Could not download any of these files. Please try again later.');
      } else if (failed.length > 0) {
        toast.info(`Downloaded ${added.length} of ${added.length + failed.length} files. The zip lists the ones that failed.`, 6000);
      } else {
        toast.success(`Downloaded ${added.length} ${added.length === 1 ? 'file' : 'files'} as a zip.`);
      }
      if (user && added.length > 0) api.post('/files/downloads', { file_ids: added }).catch(() => {});
    } catch (err) {
      if (err?.name === 'AbortError') toast.info('Download cancelled.');
      else toast.error('Something went wrong while building the zip. Please try again.');
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const sizeText = formatSize(totalSize);
  const title = busy
    ? 'Click to cancel'
    : `${files.length} ${files.length === 1 ? 'file' : 'files'}${sizeText ? ` · ${sizeText}` : ''}, zipped by section`;

  const icon = busy
    ? <Loader size={variant === 'primary' ? 18 : 14} className="spin" />
    : <FolderDown size={variant === 'primary' ? 18 : 14} />;

  const text = busy
    ? `Zipping ${progress.done}/${progress.total}`
    : label;

  return (
    <button
      type="button"
      onClick={run}
      title={title}
      aria-live="polite"
      className={`zip-download-btn zip-download-btn--${variant}${busy ? ' is-busy' : ''}`}
    >
      {icon}
      <span>{text}</span>
      {busy
        ? <X size={variant === 'primary' ? 16 : 12} className="zip-download-cancel" />
        : sizeText && <span className="zip-download-size">{sizeText}</span>}
    </button>
  );
};

export default DownloadZipButton;
