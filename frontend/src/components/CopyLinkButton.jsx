import { Link, ClipboardCheck, Scissors, Rocket, Target, Zap, Wand2 } from 'lucide-react';
import React, { useState, useCallback } from 'react';

// Fun messages that rotate on each copy
const COPY_MESSAGES = [
  { icon: <Link size={14} />, text: 'Link snatched!' },
  { icon: <ClipboardCheck size={14} />, text: 'Copied to clipboard!' },
  { icon: <Scissors size={14} />,  text: 'Clipped & ready!' },
  { icon: <Rocket size={14} />, text: 'Link launched!' },
  { icon: <Target size={14} />, text: 'Got it!' },
  { icon: <Zap size={14} />, text: 'Zapped to clipboard!' },
  { icon: <Wand2 size={14} />, text: 'Poof! Link copied!' },
];

/**
 * useCopyLink — returns { copiedId, copyLink }
 * copyLink(id, url) copies the url and tracks which id is in "copied" state.
 */
export const useCopyLink = () => {
  const [copiedId, setCopiedId] = useState(null);
  const [msg, setMsg] = useState(COPY_MESSAGES[0]);

  const copyLink = useCallback((id, url) => {
    navigator.clipboard.writeText(url).then(() => {
      const random = COPY_MESSAGES[Math.floor(Math.random() * COPY_MESSAGES.length)];
      setMsg(random);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      const random = COPY_MESSAGES[Math.floor(Math.random() * COPY_MESSAGES.length)];
      setMsg(random);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return { copiedId, msg, copyLink };
};

/**
 * CopyLinkButton — drop-in button component.
 * Props: id, url, style (optional extra style overrides)
 */
const CopyLinkButton = ({ id, url, copyLink, copiedId, msg, style = {} }) => {
  const isCopied = copiedId === id;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        copyLink(id, url);
      }}
      title="Copy link"
      style={{
        position: 'relative',
        background: isCopied ? 'var(--electric, #7C3AED)' : 'var(--bg-white)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '0.75rem',
        fontWeight: 800,
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: isCopied ? 'white' : 'var(--text)',
        boxShadow: isCopied ? 'inset 1px 1px 3px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
        outline: 'none',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        minWidth: '90px',
        overflow: 'hidden',
        ...style,
      }}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        transform: isCopied ? 'translateY(0)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {isCopied ? (
          <>
            <span style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              {msg.icon}
            </span>
            <span style={{ animation: 'slideIn 0.25s ease' }}>{msg.text}</span>
          </>
        ) : (
          <><Link size={14} /> Copy Link</>
        )}
      </span>

      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0.5) rotate(-15deg); }
          70%  { transform: scale(1.3) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </button>
  );
};

export default CopyLinkButton;
