import React, { useEffect, useRef } from 'react';

/**
 * Wraps children in a div that animates in when scrolled into view.
 * className: extra CSS classes
 * delay: 'reveal-delay-1' | 'reveal-delay-2' | 'reveal-delay-3'
 */
const ScrollReveal = ({ children, className = '', delay = '' }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${delay} ${className}`}>
      {children}
    </div>
  );
};

export default ScrollReveal;
