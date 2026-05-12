import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

const EXT_GROUPS = {
  pdf:  ['pdf'],
  image:['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
  video:['mp4', 'webm', 'ogg'],
  text: ['txt', 'md', 'csv'],
  docx: ['docx', 'doc'],
};

function getFileType(url = '') {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(EXT_GROUPS)) {
    if (exts.includes(ext)) return type;
  }
  return 'other';
}

const FileViewer = ({ file, onClose }) => {
  const url      = file?.file_url;
  const fileType = getFileType(url);
  const title    = file?.title || 'File Viewer';

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const renderContent = () => {
    if (!url) return <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No preview available.</p>;

    if (fileType === 'pdf') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      // Google Docs Viewer is much more reliable for multi-page PDFs on mobile Safari/Chrome
      const displayUrl = isMobile 
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` 
        : url;

      return (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <iframe
            src={displayUrl}
            title={title}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0 0 12px 12px' }}
          />
        </div>
      );
    }

    if (fileType === 'image') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      );
    }

    if (fileType === 'video') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: '0 0 12px 12px' }}>
          <video controls style={{ maxWidth: '100%', maxHeight: '100%' }}>
            <source src={url} />
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    if (fileType === 'docx') {
      return <DocxPreview url={url} />;
    }

    if (fileType === 'text') {
      return <TextPreview url={url} />;
    }

    // Office docs / unknown: Google Docs viewer (works if server is public; graceful fallback otherwise)
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + url)}&embedded=true`;
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px', borderRadius: '0 0 12px 12px', background: 'var(--bg-subtle)' }}>
        <div style={{ fontSize: '4rem' }}>📎</div>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', textAlign: 'center' }}>
          This file format cannot be previewed directly.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '380px' }}>
          Use the download button to open it in the appropriate application on your device.
        </p>
        <a
          href={url}
          download={title}
          style={{
            background: 'var(--primary)', color: 'white',
            padding: '12px 28px', borderRadius: '100px',
            fontWeight: 800, fontSize: '0.9rem',
            border: '2px solid var(--text)', boxShadow: '3px 3px 0 var(--text)',
            textDecoration: 'none',
          }}
        >
          ⬇ Download File
        </a>
      </div>
    );
  };

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Modal panel — stop propagation so clicking inside doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '900px', height: '85vh',
          background: 'var(--bg-white)', borderRadius: '14px',
          border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '2px solid var(--border)',
          background: 'var(--bg-white)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '1.1rem' }}>
              {fileType === 'pdf' ? '📄' : fileType === 'image' ? '🖼️' : fileType === 'video' ? '🎬' : fileType === 'docx' ? '📝' : '📎'}
            </span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <a
              href={url}
              download={title}
              style={{
                padding: '7px 16px', background: 'var(--primary)', color: 'white',
                borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem',
                border: '2px solid var(--text)', boxShadow: '2px 2px 0 var(--text)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
              }}
              onClick={e => e.stopPropagation()}
            >
              ⬇ Download
            </a>
            {fileType === 'pdf' && (
              <button
                onClick={() => window.open(url, '_blank')}
                style={{
                  padding: '7px 16px', background: 'var(--bg-subtle)', color: 'var(--text)',
                  borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem',
                  border: '2px solid var(--text)', boxShadow: '2px 2px 0 var(--text)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                📄 Open Full
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: '34px', height: '34px', borderRadius: '8px', border: '2px solid var(--border)',
                background: 'var(--bg-subtle)', cursor: 'pointer', fontWeight: 900, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-white)'; e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.color = '#DC2626'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// .docx renderer using docx-preview
const DocxPreview = ({ url }) => {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'done' | 'error'

  useEffect(() => {
    if (!containerRef.current) return;
    setStatus('loading');
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then(buffer => renderAsync(
        buffer,
        containerRef.current,
        undefined,          // styleContainer (use default)
        {
          inWrapper: false, // don't add an extra wrapper div
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: true,
        }
      ))
      .then(() => setStatus('done'))
      .catch(err => {
        console.error('docx-preview error:', err);
        setStatus('error');
      });
  }, [url]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#f3f4f6', position: 'relative' }}>
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
          Rendering document…
        </div>
      )}
      {status === 'error' && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <p style={{ fontWeight: 700 }}>Could not render this document.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>The file may be corrupted or in an unsupported format. Try downloading it instead.</p>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          padding: '32px',
          minHeight: '100%',
          visibility: status === 'done' ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
};

// Lazy text file loader
const TextPreview = ({ url }) => {
  const [text, setText] = React.useState('Loading…');
  React.useEffect(() => {
    fetch(url).then(r => r.text()).then(setText).catch(() => setText('Could not load file.'));
  }, [url]);
  return (
    <pre style={{
      width: '100%', height: '100%', margin: 0, padding: '24px',
      overflow: 'auto', fontFamily: 'monospace', fontSize: '0.85rem',
      color: 'var(--text)', background: 'var(--bg-white)', boxSizing: 'border-box',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {text}
    </pre>
  );
};

export default FileViewer;
