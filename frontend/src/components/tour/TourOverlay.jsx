import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Loader, X } from 'lucide-react';
import { Button, IconButton } from '../ui';

const SPOT_PAD = 8;     // breathing room around the highlighted element
const GAP = 14;         // distance between spotlight and card
const EDGE = 16;        // minimum distance from the viewport edge
const NAV_HEIGHT = 80;  // fixed navbar + a little margin
const MOBILE_BP = 640;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const sameRect = (a, b) =>
  a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

// Bring the target into view unless it already is (fixed navbar items always are)
const scrollToTarget = (el) => {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const bottomLimit = window.innerWidth <= 768 ? vh - 100 : vh - EDGE; // mobile tab bar
  if (r.top >= NAV_HEIGHT && r.bottom <= bottomLimit) return;
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  const top = r.height > vh * 0.55
    ? window.scrollY + r.top - NAV_HEIGHT - 12
    : window.scrollY + r.top - (vh - r.height) / 2;
  window.scrollTo({ top: Math.max(0, top), behavior });
};

const placeCard = (spot, card, vw, vh) => {
  // No target: centre it
  if (!spot) return { top: (vh - card.height) / 2, left: (vw - card.width) / 2 };

  // Phones: dock the card to whichever half of the screen the target isn't in
  if (vw <= MOBILE_BP) {
    const left = (vw - card.width) / 2;
    const targetCentre = spot.top + spot.height / 2;
    return targetCentre > vh / 2
      ? { top: Math.max(70, spot.top - GAP - card.height), left }
      : { top: Math.min(spot.top + spot.height + GAP, vh - card.height - 110), left };
  }

  const clampX = x => Math.min(Math.max(x, EDGE), vw - card.width - EDGE);
  const clampY = y => Math.min(Math.max(y, EDGE), vh - card.height - EDGE);
  const centreX = clampX(spot.left + spot.width / 2 - card.width / 2);
  const centreY = clampY(spot.top + spot.height / 2 - card.height / 2);

  const below = spot.top + spot.height + GAP;
  if (below + card.height <= vh - EDGE) return { top: below, left: centreX };

  const above = spot.top - GAP - card.height;
  if (above >= EDGE) return { top: above, left: centreX };

  const right = spot.left + spot.width + GAP;
  if (right + card.width <= vw - EDGE) return { top: centreY, left: right };

  const leftSide = spot.left - GAP - card.width;
  if (leftSide >= EDGE) return { top: centreY, left: leftSide };

  // Target fills the screen: float over its bottom edge
  return { top: vh - card.height - EDGE, left: centreX };
};

const TourOverlay = ({ step, index, total, target, resolving, onNext, onBack, onClose }) => {
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [cardPos, setCardPos] = useState(null);
  const [animate, setAnimate] = useState(false);

  // Scroll the target in and follow it while the page moves
  useEffect(() => {
    if (!target) { setRect(null); return undefined; }
    scrollToTarget(target);
    setAnimate(true);
    const animTimer = setTimeout(() => setAnimate(false), 350);

    let frame;
    let last = null;
    const track = () => {
      if (!target.isConnected) { setRect(null); return; }
      const r = target.getBoundingClientRect();
      const next = { top: r.top, left: r.left, width: r.width, height: r.height };
      if (!sameRect(next, last)) { last = next; setRect(next); }
      frame = requestAnimationFrame(track);
    };
    track();
    return () => { cancelAnimationFrame(frame); clearTimeout(animTimer); };
  }, [target]);

  const spot = rect && {
    top: rect.top - SPOT_PAD,
    left: rect.left - SPOT_PAD,
    width: rect.width + SPOT_PAD * 2,
    height: rect.height + SPOT_PAD * 2,
  };

  // Position the card once we know its size
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || resolving) return;
    const size = { width: card.offsetWidth, height: card.offsetHeight };
    setCardPos(placeCard(spot, size, window.innerWidth, window.innerHeight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect, resolving, index]);

  useEffect(() => {
    const onResize = () => setRect(r => (r ? { ...r } : r));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keyboard: ← → to move, Esc to leave
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onBack(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onNext, onBack, onClose]);

  useEffect(() => {
    if (!resolving) nextRef.current?.focus({ preventScroll: true });
  }, [resolving, index]);

  const isLast = index === total - 1;
  const progress = ((index + 1) / total) * 100;

  return createPortal(
    <div className="tour-root">
      {/* Swallows clicks so the page can't be used mid-tour; scrolling still works */}
      <div className="tour-blocker" onClick={e => e.stopPropagation()} />

      <div
        className={`tour-spotlight ${spot ? 'has-target' : ''} ${animate ? 'is-moving' : ''}`}
        style={spot
          ? { top: spot.top, left: spot.left, width: spot.width, height: spot.height }
          : { top: '50%', left: '50%', width: 0, height: 0 }}
      />

      {resolving ? (
        <div className="tour-loading" role="status">
          <Loader size={16} className="spin" /> Loading…
        </div>
      ) : (
        <div
          ref={cardRef}
          className="tour-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          aria-describedby="tour-step-body"
          style={cardPos
            ? { top: cardPos.top, left: cardPos.left }
            : { top: 0, left: 0, visibility: 'hidden' }}
        >
          <div className="tour-accent" />
          <div style={{ padding: '16px 20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="tour-counter">{index + 1} of {total}</span>
              <IconButton label="Close tour" onClick={onClose}><X size={16} /></IconButton>
            </div>

            <h3 id="tour-step-title" className="tour-title">{step.title}</h3>
            <p id="tour-step-body" className="tour-body">{step.body}</p>

            <div className="ui-progress tour-progress" aria-hidden="true">
              <div className="ui-progress__bar" style={{ width: `${progress}%` }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              {!isLast && (
                <button className="tour-skip" onClick={onClose}>Skip tour</button>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                {index > 0 && (
                  <Button size="sm" onClick={onBack} icon={<ArrowLeft size={14} />}>Back</Button>
                )}
                <Button ref={nextRef} size="sm" variant="primary" onClick={onNext}>
                  {isLast
                    ? <><Check size={14} /> Finish</>
                    : <>{index === 0 ? "Let's go" : 'Next'} <ArrowRight size={14} /></>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default TourOverlay;
