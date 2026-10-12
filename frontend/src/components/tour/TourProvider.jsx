import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, X } from 'lucide-react';
import { TOURS } from './tours';
import TourOverlay from './TourOverlay';
import { Button, IconButton } from '../ui';
import './tour.css';

const TourContext = createContext({ startTour: () => {}, isTourActive: false });

export const useTour = () => useContext(TourContext);

const STORAGE_PREFIX = 'giki-tour-';
const TARGET_TIMEOUT_MS = 6000;
const FALLBACK_AFTER_MS = 1500; // wait this long for the first selector before using the others

// localStorage can throw (private mode, blocked storage) — treat as "not seen"
const getSeenVersion = (tourId) => {
  try { return Number(localStorage.getItem(STORAGE_PREFIX + tourId)) || 0; } catch { return 0; }
};
const markSeen = (tourId) => {
  try { localStorage.setItem(STORAGE_PREFIX + tourId, String(TOURS[tourId].version)); } catch { /* ignore */ }
};

const isVisible = (el) => {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
};

// First visible match, in selector order. While the first selector has not
// rendered at all (its data is still loading), wait a moment before settling
// for a fallback; if it rendered but is hidden (e.g. desktop-only), fall back
// straight away.
const findTarget = (selectors = [], waitedMs = Infinity) => {
  const [first, ...fallbacks] = selectors;
  const preferred = first && Array.from(document.querySelectorAll(first)).find(isVisible);
  if (preferred) return preferred;
  if (first && !document.querySelector(first) && waitedMs < FALLBACK_AFTER_MS) return null;
  for (const sel of fallbacks) {
    const match = Array.from(document.querySelectorAll(sel)).find(isVisible);
    if (match) return match;
  }
  return null;
};

/**
 * Runs guided tours (see tours.js) and shows the first-visit prompt.
 * Must live inside <Router>.
 */
export const TourProvider = ({ user, blocked, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [run, setRun] = useState(null);        // { tourId, steps, index, origin }
  const [target, setTarget] = useState(null);  // resolved DOM element, or null for a centred card
  const [resolving, setResolving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const startTour = useCallback((tourId = 'main') => {
    const tour = TOURS[tourId];
    if (!tour) return;
    const ctx = { user, width: window.innerWidth };
    const steps = tour.steps.filter(s => !s.when || s.when(ctx));
    if (!steps.length) return;
    setShowPrompt(false);
    setTarget(null);
    setRun({
      tourId,
      steps,
      index: 0,
      origin: window.location.pathname + window.location.search + window.location.hash,
    });
  }, [user]);

  const runRef = useRef(run);
  runRef.current = run;

  const endTour = useCallback(() => {
    const current = runRef.current;
    if (!current) return;
    markSeen(current.tourId);
    setRun(null);
    setTarget(null);
    setResolving(false);
    const here = window.location.pathname + window.location.search + window.location.hash;
    if (current.origin && current.origin !== here) navigate(current.origin);
  }, [navigate]);

  const goTo = useCallback((index) => {
    setRun(current => {
      if (!current) return current;
      if (index < 0) return current;
      if (index >= current.steps.length) return current; // caller handles finish
      return { ...current, index };
    });
  }, []);

  const next = useCallback(() => {
    if (!run) return;
    if (run.index >= run.steps.length - 1) endTour();
    else goTo(run.index + 1);
  }, [run, goTo, endTour]);

  const back = useCallback(() => {
    if (run) goTo(run.index - 1);
  }, [run, goTo]);

  // Open the step's page, then wait for its target to render
  const step = run ? run.steps[run.index] : null;
  useEffect(() => {
    if (!step) return undefined;
    let cancelled = false;
    let pollTimer;
    setResolving(true);
    setTarget(null);

    const resolve = async () => {
      if (step.route) {
        const dest = typeof step.route === 'function'
          ? await step.route({ pathname: pathnameRef.current, user })
          : step.route;
        if (cancelled) return;
        if (dest && dest !== pathnameRef.current) navigate(dest);
      }

      if (!step.target) {
        setResolving(false);
        return;
      }

      const started = Date.now();
      const poll = () => {
        if (cancelled) return;
        const el = findTarget(step.target, Date.now() - started);
        if (el) {
          setTarget(el);
          setResolving(false);
        } else if (Date.now() - started > TARGET_TIMEOUT_MS) {
          setResolving(false); // fall back to a centred card
        } else {
          pollTimer = setTimeout(poll, 150);
        }
      };
      poll();
    };

    resolve();
    return () => { cancelled = true; clearTimeout(pollTimer); };
  }, [step, user, navigate]);

  // First-visit prompt for the main tour
  useEffect(() => {
    if (run || blocked) { setShowPrompt(false); return undefined; }
    if (getSeenVersion('main') >= TOURS.main.version) return undefined;
    const t = setTimeout(() => setShowPrompt(true), 1200);
    return () => clearTimeout(t);
  }, [run, blocked]);

  const dismissPrompt = () => {
    markSeen('main');
    setShowPrompt(false);
  };

  const value = useMemo(() => ({ startTour, isTourActive: !!run }), [startTour, run]);

  return (
    <TourContext.Provider value={value}>
      {children}

      {run && (
        <TourOverlay
          step={step}
          index={run.index}
          total={run.steps.length}
          target={target}
          resolving={resolving}
          onNext={next}
          onBack={back}
          onClose={endTour}
        />
      )}

      {showPrompt && !run && (
        <div className="tour-prompt" role="dialog" aria-labelledby="tour-prompt-title">
          <div className="tour-accent" />
          <div style={{ padding: '18px 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div className="ui-icon-tile ui-icon-tile--sm"><Compass size={20} strokeWidth={2.5} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div id="tour-prompt-title" className="tour-title" style={{ fontSize: '1.05rem' }}>New here?</div>
                <p className="tour-body" style={{ marginTop: '4px' }}>
                  Take a one-minute tour of GIKI Course Hub.
                </p>
              </div>
              <IconButton label="Dismiss" onClick={dismissPrompt}><X size={16} /></IconButton>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <Button size="sm" onClick={dismissPrompt}>Not now</Button>
              <Button size="sm" variant="primary" onClick={() => startTour('main')} icon={<Compass size={14} />}>
                Start tour
              </Button>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
};

export default TourProvider;
