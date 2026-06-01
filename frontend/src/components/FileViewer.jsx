import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';

const EXT_GROUPS = {
  pdf:  ['pdf'],
  image:['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
  video:['mp4', 'webm', 'ogg'],
  text: ['txt', 'csv'],
  code: ['cpp', 'c', 'h', 'hpp', 'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'rs', 'go', 'rb', 'php', 'css', 'html', 'json', 'yaml', 'yml', 'sh', 'md'],
  ipynb:['ipynb'],
  docx: ['docx', 'doc'],
  pptx: ['pptx', 'ppt'],
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

    if (fileType === 'pptx') {
      return <PptxPreview url={url} title={title} />;
    }

    if (fileType === 'text') {
      return <TextPreview url={url} />;
    }

    if (fileType === 'code') {
      return <CodePreview url={url} extension={url.split('?')[0].split('.').pop().toLowerCase()} />;
    }

    if (fileType === 'ipynb') {
      return <IpynbPreview url={url} />;
    }

    // Unknown format: Google Docs viewer as best-effort fallback
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
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
              {fileType === 'pdf' ? '📄' : fileType === 'image' ? '🖼️' : fileType === 'video' ? '🎬' : fileType === 'docx' ? '📝' : fileType === 'pptx' ? '📊' : fileType === 'code' ? '💻' : fileType === 'ipynb' ? '📓' : '📎'}
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
    /* Outer scroll wrapper — neutral grey surround (dark-mode safe) */
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#4a4a4a', position: 'relative', colorScheme: 'light' }}>
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#4a4a4a', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
          Rendering document…
        </div>
      )}
      {status === 'error' && (
        <div style={{ padding: '60px', textAlign: 'center', background: '#4a4a4a' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <p style={{ fontWeight: 700, color: '#f87171' }}>Could not render this document.</p>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>The file may be corrupted or in an unsupported format. Try downloading it instead.</p>
        </div>
      )}
      {/* Force light colour-scheme so docx-preview HTML always renders on white paper */}
      <div
        ref={containerRef}
        style={{
          padding: '32px',
          minHeight: '100%',
          visibility: status === 'done' ? 'visible' : 'hidden',
          background: 'white',
          color: 'black',
          colorScheme: 'light',
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

// PPTX/PPT viewer using Google Docs Viewer
const PptxPreview = ({ url, title }) => {
  const [key, setKey] = useState(0); // used to force-reload the iframe
  const [loaded, setLoaded] = useState(false);
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg-subtle)' }}>
      {/* Loading overlay — hidden once iframe fires onLoad */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '16px', background: 'var(--bg-subtle)',
        }}>
          <span style={{ fontSize: '3.5rem', animation: 'float 2s ease-in-out infinite' }}>📊</span>
          <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>Loading presentation…</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '340px', lineHeight: 1.5 }}>
            Powered by Google Docs Viewer. Large files may take a few seconds to render.
          </p>
        </div>
      )}

      <iframe
        key={key}
        src={viewerUrl}
        title={title}
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: '100%', border: 'none', position: 'relative', zIndex: 1 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />

      {/* Reload hint shown after loading, in case Google viewer shows its own error */}
      {loaded && (
        <div style={{
          position: 'absolute', bottom: '14px', right: '14px', zIndex: 3,
          display: 'flex', gap: '8px',
        }}>
          <button
            onClick={() => { setLoaded(false); setKey(k => k + 1); }}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '2px solid var(--border)',
              background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700,
              fontSize: '0.78rem', cursor: 'pointer', boxShadow: '2px 2px 0 var(--border)',
            }}
          >
            🔄 Retry
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '2px solid var(--border)',
              background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700,
              fontSize: '0.78rem', cursor: 'pointer', boxShadow: '2px 2px 0 var(--border)',
              textDecoration: 'none',
            }}
          >
            ↗ Open in Google
          </a>
        </div>
      )}
    </div>
  );
};

// Code Preview using react-syntax-highlighter
const CodePreview = ({ url, extension }) => {
  const [code, setCode] = useState('Loading…');
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url).then(r => r.text()).then(text => { setCode(text); setError(false); }).catch(() => { setCode('Could not load file.'); setError(true); });
  }, [url]);

  // Map common extensions to prism languages
  const langMap = {
    py: 'python', js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    cpp: 'cpp', c: 'c', h: 'cpp', hpp: 'cpp', java: 'java', rs: 'rust',
    go: 'go', rb: 'ruby', php: 'php', html: 'html', css: 'css',
    json: 'json', yaml: 'yaml', yml: 'yaml', sh: 'bash', md: 'markdown'
  };
  const language = langMap[extension] || 'text';

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#1d1f21', padding: '16px', boxSizing: 'border-box' }}>
      {error ? (
        <div style={{ color: '#f87171', fontWeight: 'bold' }}>{code}</div>
      ) : (
        <SyntaxHighlighter language={language} style={atomDark} customStyle={{ margin: 0, padding: 0, background: 'transparent' }} showLineNumbers={true}>
          {code}
        </SyntaxHighlighter>
      )}
    </div>
  );
};

// Jupyter Notebook Preview (.ipynb)
const IpynbPreview = ({ url }) => {
  const [notebook, setNotebook] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(data => { setNotebook(data); setError(false); })
      .catch(err => { console.error('Failed to parse ipynb:', err); setError(true); });
  }, [url]);

  if (error) return <div style={{ padding: '24px', color: '#f87171' }}>Could not parse Jupyter Notebook.</div>;
  if (!notebook) return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Loading notebook…</div>;

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--bg-subtle)', padding: '24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--bg-white)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {notebook.cells && notebook.cells.map((cell, idx) => {
          const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || '';
          
          if (cell.cell_type === 'markdown') {
            return (
              <div key={idx} style={{ padding: '16px 32px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                <ReactMarkdown>{source}</ReactMarkdown>
              </div>
            );
          }
          
          if (cell.cell_type === 'code') {
            return (
              <div key={idx} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ background: '#f6f8fa', borderRadius: '8px', border: '1px solid #d0d7de', overflow: 'hidden', marginBottom: cell.outputs?.length ? '12px' : 0 }}>
                  <SyntaxHighlighter language="python" style={atomDark} customStyle={{ margin: 0, padding: '16px', fontSize: '0.9rem' }}>
                    {source}
                  </SyntaxHighlighter>
                </div>
                {cell.outputs && cell.outputs.length > 0 && (
                  <div style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '8px', borderLeft: '4px solid #0969da' }}>
                    {cell.outputs.map((out, oIdx) => {
                      if (out.output_type === 'stream') {
                        return <pre key={oIdx} style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem', color: '#24292f' }}>{Array.isArray(out.text) ? out.text.join('') : out.text}</pre>;
                      }
                      if (out.output_type === 'error') {
                        return <pre key={oIdx} style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem', color: '#cf222e' }}>{out.traceback?.join('\n') || out.ename + ': ' + out.evalue}</pre>;
                      }
                      if (out.output_type === 'execute_result' || out.output_type === 'display_data') {
                        const html = out.data?.['text/html'];
                        if (html) {
                          const htmlStr = Array.isArray(html) ? html.join('') : html;
                          return <div key={oIdx} dangerouslySetInnerHTML={{ __html: htmlStr }} style={{ margin: '8px 0', overflow: 'auto' }} />;
                        }
                        const img = out.data?.['image/png'];
                        if (img) {
                          return <img key={oIdx} src={`data:image/png;base64,${img.replace(/\n/g, '')}`} alt="output" style={{ maxWidth: '100%', height: 'auto', margin: '8px 0' }} />;
                        }
                        const text = out.data?.['text/plain'];
                        if (text) {
                          return <pre key={oIdx} style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem', color: '#24292f' }}>{Array.isArray(text) ? text.join('') : text}</pre>;
                        }
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default FileViewer;
