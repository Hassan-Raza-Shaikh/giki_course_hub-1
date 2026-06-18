import { Paperclip, FileText, Image, Film, Presentation, LineChart, Code, Book, ExternalLink, Loader, AlertTriangle, RefreshCw, Download, Copy, Check, Table2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const EXT_GROUPS = {
  pdf:  ['pdf'],
  image:['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
  video:['mp4', 'webm', 'ogg'],
  text: ['txt'],
  csv:  ['csv'],
  code: ['cpp', 'c', 'h', 'hpp', 'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'rs', 'go', 'rb', 'php', 'css', 'json', 'yaml', 'yml', 'sh'],
  markdown: ['md'],
  html: ['html', 'htm'],
  ipynb:['ipynb'],
  docx: ['docx', 'doc'],
  xlsx: ['xlsx', 'xls'],
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

    if (fileType === 'pptx' || fileType === 'xlsx') {
      return <GoogleDocPreview url={url} title={title} type={fileType} />;
    }

    if (fileType === 'text') {
      return <TextPreview url={url} />;
    }

    if (fileType === 'csv') {
      return <CsvPreview url={url} />;
    }

    if (fileType === 'markdown') {
      return <MarkdownPreview url={url} />;
    }

    if (fileType === 'html') {
      return <HtmlPreview url={url} />;
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
        <div style={{ fontSize: '4rem' }}><Paperclip size={64} color="var(--text-muted)" /></div>
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
          <Download size={18} style={{ marginRight: '6px' }} /> Download File
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
        padding: 'clamp(12px, 3vw, 24px)',
      }}
    >
      {/* Modal panel — stop propagation so clicking inside doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '900px',
          height: 'min(85vh, 85dvh)',
          background: 'var(--bg-white)', borderRadius: '14px',
          border: '2px solid var(--text)', boxShadow: '6px 6px 0 var(--text)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderBottom: '2px solid var(--border)',
          background: 'var(--bg-white)', flexShrink: 0, gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>
              {fileType === 'pdf' ? <FileText size={48}/> : fileType === 'image' ? <Image size={48}/> : fileType === 'video' ? <Film size={48}/> : fileType === 'docx' ? <FileText size={48}/> : fileType === 'pptx' ? <Presentation size={48}/> : fileType === 'xlsx' ? <LineChart size={48}/> : fileType === 'csv' ? <Table2 size={48}/> : fileType === 'markdown' ? <Book size={48}/> : fileType === 'html' ? <Code size={48}/> : fileType === 'code' ? <Code size={48}/> : fileType === 'ipynb' ? <Book size={48}/> : <Paperclip size={48}/>}
            </span>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
            <a
              href={url}
              download={title}
              style={{
                padding: '6px 12px', background: 'var(--primary)', color: 'white',
                borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem',
                border: '2px solid var(--text)', boxShadow: '2px 2px 0 var(--text)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                whiteSpace: 'nowrap',
              }}
              onClick={e => e.stopPropagation()}
            >
              <Download size={16} /> <span className="hide-mobile">Download</span>
            </a>
            {fileType === 'pdf' && (
              <button
                onClick={() => window.open(url, '_blank')}
                className="hide-mobile"
                style={{
                  padding: '6px 12px', background: 'var(--bg-subtle)', color: 'var(--text)',
                  borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem',
                  border: '2px solid var(--text)', boxShadow: '2px 2px 0 var(--text)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <ExternalLink size={16}/> Open Full
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px', border: '2px solid var(--border)',
                background: 'var(--bg-subtle)', cursor: 'pointer', fontWeight: 900, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', transition: 'all 0.15s', flexShrink: 0,
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
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}><Loader size={24} /></span>
          Rendering document…
        </div>
      )}
      {status === 'error' && (
        <div style={{ padding: '60px', textAlign: 'center', background: '#4a4a4a' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}><AlertTriangle size={48} color="var(--accent)" /></div>
          <p style={{ fontWeight: 700, color: '#f87171' }}>Could not render this document.</p>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>The file may be corrupted or in an unsupported format. Try downloading it instead.</p>
        </div>
      )}
      {/* Force light colour-scheme so docx-preview HTML always renders on white paper */}
      <div
        ref={containerRef}
        className="docx-viewer-content"
        style={{
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

// PPTX/PPT/XLSX/DOCX viewer using Microsoft Office Viewer
const GoogleDocPreview = ({ url, title, type }) => {
  const [key, setKey] = useState(0); // used to force-reload the iframe
  const [loaded, setLoaded] = useState(false);
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg-subtle)' }}>
      {/* Loading overlay — hidden once iframe fires onLoad */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '16px', background: 'var(--bg-subtle)',
        }}>
          <span style={{ fontSize: '3.5rem', animation: 'float 2s ease-in-out infinite' }}>{type === 'xlsx' ? <LineChart size={56} color="var(--primary)"/> : <Presentation size={56} color="var(--primary)"/>}</span>
          <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>Loading document…</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '340px', lineHeight: 1.5 }}>
            Powered by Microsoft Office Online Viewer. Large files may take a few seconds to render.
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
            <RefreshCw size={16}/> Retry
          </button>
          <a
            href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '2px solid var(--border)',
              background: 'var(--bg-white)', color: 'var(--text)', fontWeight: 700,
              fontSize: '0.78rem', cursor: 'pointer', boxShadow: '2px 2px 0 var(--border)',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={16} style={{ marginRight: '4px' }} /> Open in Office
          </a>
        </div>
      )}
    </div>
  );
};

// Code Preview using react-syntax-highlighter + copy button
const CodePreview = ({ url, extension }) => {
  const [code, setCode] = useState('Loading…');
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(url).then(r => r.text()).then(text => { setCode(text); setError(false); }).catch(() => { setCode('Could not load file.'); setError(true); });
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Map common extensions to prism languages
  const langMap = {
    py: 'python', js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    cpp: 'cpp', c: 'c', h: 'cpp', hpp: 'cpp', java: 'java', rs: 'rust',
    go: 'go', rb: 'ruby', php: 'php', html: 'html', css: 'css',
    json: 'json', yaml: 'yaml', yml: 'yaml', sh: 'bash', md: 'markdown'
  };
  const language = langMap[extension] || 'text';

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#1d1f21', position: 'relative', boxSizing: 'border-box' }}>
      {/* Copy button */}
      {!error && code !== 'Loading…' && (
        <button
          onClick={handleCopy}
          style={{
            position: 'sticky', top: '10px', float: 'right', marginRight: '10px', zIndex: 2,
            padding: '5px 12px', borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.2)',
            background: copied ? '#22c55e' : 'rgba(255,255,255,0.1)',
            color: copied ? 'white' : '#e5e7eb',
            fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
            transition: 'all 0.2s',
            backdropFilter: 'blur(8px)',
          }}
        >
          {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
        </button>
      )}
      <div style={{ padding: 'clamp(8px, 2vw, 16px)' }}>
        {error ? (
          <div style={{ color: '#f87171', fontWeight: 'bold' }}>{code}</div>
        ) : (
          <SyntaxHighlighter language={language} style={atomDark} customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)' }} showLineNumbers={true}>
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
};

// CSV Preview — renders CSV as a styled table
const CsvPreview = ({ url }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(text => {
        // Simple CSV parser: handles quoted fields with commas inside
        const parseCSV = (str) => {
          const result = [];
          let row = [];
          let field = '';
          let inQuotes = false;
          for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inQuotes) {
              if (ch === '"' && str[i + 1] === '"') {
                field += '"'; i++;
              } else if (ch === '"') {
                inQuotes = false;
              } else {
                field += ch;
              }
            } else {
              if (ch === '"') {
                inQuotes = true;
              } else if (ch === ',') {
                row.push(field.trim()); field = '';
              } else if (ch === '\n' || (ch === '\r' && str[i + 1] === '\n')) {
                row.push(field.trim()); field = '';
                if (row.some(c => c !== '')) result.push(row);
                row = [];
                if (ch === '\r') i++;
              } else {
                field += ch;
              }
            }
          }
          row.push(field.trim());
          if (row.some(c => c !== '')) result.push(row);
          return result;
        };
        const parsed = parseCSV(text);
        setRows(parsed);
      })
      .catch(() => setError(true));
  }, [url]);

  if (error) return <div style={{ padding: '24px', color: '#f87171', fontWeight: 700 }}>Could not load CSV file.</div>;
  if (!rows) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}><Loader size={24} /></span>
      Loading spreadsheet…
    </div>
  );

  const header = rows[0] || [];
  const body = rows.slice(1);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--bg-subtle)', padding: 'clamp(8px, 2vw, 16px)', boxSizing: 'border-box' }}>
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '2px solid var(--border)', boxShadow: '3px 3px 0 var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(0.72rem, 2.2vw, 0.85rem)', fontFamily: 'inherit', background: 'var(--bg-white)' }}>
          <thead>
            <tr>
              <th style={{
                padding: '10px 14px', background: 'var(--primary)', color: 'white',
                fontWeight: 800, fontSize: '0.78rem', textAlign: 'left',
                borderBottom: '2px solid var(--text)', position: 'sticky', top: 0, zIndex: 1,
                whiteSpace: 'nowrap',
              }}>#</th>
              {header.map((h, i) => (
                <th key={i} style={{
                  padding: '10px 14px', background: 'var(--primary)', color: 'white',
                  fontWeight: 800, fontSize: '0.78rem', textAlign: 'left',
                  borderBottom: '2px solid var(--text)', position: 'sticky', top: 0, zIndex: 1,
                  whiteSpace: 'nowrap',
                }}>{h || `Col ${i + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rIdx) => (
              <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'var(--bg-white)' : 'var(--bg-subtle)', transition: 'background 0.1s' }}
                onMouseOver={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 8%, var(--bg-white))'}
                onMouseOut={e => e.currentTarget.style.background = rIdx % 2 === 0 ? 'var(--bg-white)' : 'var(--bg-subtle)'}
              >
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>{rIdx + 1}</td>
                {header.map((_, cIdx) => (
                  <td key={cIdx} style={{
                    padding: '8px 14px', borderBottom: '1px solid var(--border)',
                    color: 'var(--text)', maxWidth: '300px', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{row[cIdx] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        {body.length} row{body.length !== 1 ? 's' : ''} × {header.length} column{header.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

// Markdown Preview — rendered with toggle for raw source
const MarkdownPreview = ({ url }) => {
  const [mode, setMode] = useState('rendered'); // 'rendered' | 'raw'
  const [md, setMd] = useState(null);

  useEffect(() => {
    fetch(url).then(r => r.text()).then(setMd).catch(() => setMd(null));
  }, [url]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toggle bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 14px', background: 'var(--bg-subtle)',
        borderBottom: '2px solid var(--border)', flexShrink: 0, gap: '4px',
      }}>
        <button
          onClick={() => setMode('rendered')}
          style={{
            padding: '5px 16px', borderRadius: '8px 0 0 8px',
            border: '2px solid var(--text)',
            background: mode === 'rendered' ? 'var(--primary)' : 'var(--bg-white)',
            color: mode === 'rendered' ? 'white' : 'var(--text)',
            fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: mode === 'rendered' ? '2px 2px 0 var(--text)' : 'none',
          }}
        >
          Rendered
        </button>
        <button
          onClick={() => setMode('raw')}
          style={{
            padding: '5px 16px', borderRadius: '0 8px 8px 0',
            border: '2px solid var(--text)', borderLeft: 'none',
            background: mode === 'raw' ? 'var(--primary)' : 'var(--bg-white)',
            color: mode === 'raw' ? 'white' : 'var(--text)',
            fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: mode === 'raw' ? '2px 2px 0 var(--text)' : 'none',
          }}
        >
          Raw Markdown
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === 'rendered' ? (
          md !== null ? (
            <div style={{
              width: '100%', height: '100%', overflow: 'auto',
              padding: 'clamp(16px, 4vw, 40px)', boxSizing: 'border-box',
              color: 'var(--text)', lineHeight: 1.7, fontSize: '0.95rem',
            }}>
              <div style={{ maxWidth: '760px', margin: '0 auto' }}>
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{md}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}><Loader size={24} /></span>
              Loading document…
            </div>
          )
        ) : (
          <CodePreview url={url} extension="md" />
        )}
      </div>
    </div>
  );
};

// HTML Preview — rendered iframe with toggle for raw source
const HtmlPreview = ({ url }) => {
  const [mode, setMode] = useState('rendered'); // 'rendered' | 'raw'
  const [html, setHtml] = useState(null);

  useEffect(() => {
    fetch(url).then(r => r.text()).then(setHtml).catch(() => setHtml(null));
  }, [url]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toggle bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 14px', background: 'var(--bg-subtle)',
        borderBottom: '2px solid var(--border)', flexShrink: 0, gap: '4px',
      }}>
        <button
          onClick={() => setMode('rendered')}
          style={{
            padding: '5px 16px', borderRadius: '8px 0 0 8px',
            border: '2px solid var(--text)',
            background: mode === 'rendered' ? 'var(--primary)' : 'var(--bg-white)',
            color: mode === 'rendered' ? 'white' : 'var(--text)',
            fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: mode === 'rendered' ? '2px 2px 0 var(--text)' : 'none',
          }}
        >
          Rendered
        </button>
        <button
          onClick={() => setMode('raw')}
          style={{
            padding: '5px 16px', borderRadius: '0 8px 8px 0',
            border: '2px solid var(--text)', borderLeft: 'none',
            background: mode === 'raw' ? 'var(--primary)' : 'var(--bg-white)',
            color: mode === 'raw' ? 'white' : 'var(--text)',
            fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: mode === 'raw' ? '2px 2px 0 var(--text)' : 'none',
          }}
        >
          Raw HTML
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === 'rendered' ? (
          html !== null ? (
            <iframe
              srcDoc={html}
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin"
              style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}><Loader size={24} /></span>
              Loading page…
            </div>
          )
        ) : (
          <CodePreview url={url} extension="html" />
        )}
      </div>
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
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--bg-subtle)', padding: 'clamp(12px, 3vw, 24px)', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--bg-white)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {notebook.cells && notebook.cells.map((cell, idx) => {
          const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || '';
          
          if (cell.cell_type === 'markdown') {
            return (
              <div key={idx} style={{ padding: '16px 32px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{source}</ReactMarkdown>
              </div>
            );
          }
          
          if (cell.cell_type === 'code') {
            return (
              <div key={idx} style={{ padding: 'clamp(12px, 3vw, 24px)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ background: '#f6f8fa', borderRadius: '8px', border: '1px solid #d0d7de', overflow: 'hidden', marginBottom: cell.outputs?.length ? '12px' : 0 }}>
                  <SyntaxHighlighter language="python" style={atomDark} customStyle={{ margin: 0, padding: 'clamp(10px, 3vw, 16px)', fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)' }}>
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
