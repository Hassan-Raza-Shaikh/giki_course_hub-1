import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from './cx';

/**
 * Accessible modal: portal to <body>, closes on Escape and backdrop click,
 * locks page scroll, and moves focus into the dialog.
 *   <Modal open={!!item} onClose={close} title="Reject file" icon={<XCircle size={22} />}
 *          footer={<><Button onClick={close}>Cancel</Button><Button variant="danger">Reject</Button></>}>
 *     …body…
 *   </Modal>
 * size: 'sm' | 'md' | 'lg'
 */
const Modal = ({ open, onClose, title, subtitle, icon, footer, size = 'md', className, children }) => {
  const boxRef = useRef(null);
  // Keep the latest onClose without re-running the open/close effect, so an
  // inline handler doesn't steal focus back from inputs on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement;
    boxRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cx('ui-modal', size !== 'md' && `ui-modal--${size}`, className)}
        style={{ outline: 'none' }}
      >
        {(title || onClose) && (
          <div className="ui-modal__header">
            <div>
              {title && <h3 className="ui-modal__title">{icon}{title}</h3>}
              {subtitle && <p className="ui-modal__subtitle">{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" className="ui-icon-btn" aria-label="Close" onClick={onClose}>
                <X size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
