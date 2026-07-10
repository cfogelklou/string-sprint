import { useRef, useEffect, useCallback } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { HELP_SECTIONS } from '@/components/helpContent';

export default function HelpSheet() {
  const isOpen = usePianoStore((s) => s.isHelpOpen);
  const initialSection = usePianoStore((s) => s.helpInitialSection);
  const closeHelp = usePianoStore((s) => s.closeHelp);

  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to the requested section when the sheet opens with one.
  // Direct scrollTop math (not scrollIntoView): iOS Safari doesn't always treat
  // a fixed overflow:auto sheet as the scroll container, so scrollIntoView can
  // scroll the page behind the backdrop instead.
  useEffect(() => {
    if (!isOpen || !initialSection || !contentRef.current) return;
    const content = contentRef.current;
    const el = content.querySelector<HTMLElement>(`#${initialSection}`);
    if (el) {
      // Defer until the sheet has laid out.
      requestAnimationFrame(() => {
        content.scrollTop = el.offsetTop - 8;
      });
    }
  }, [isOpen, initialSection]);

  // Reset scroll to top when opened without a specific section.
  useEffect(() => {
    if (isOpen && !initialSection && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [isOpen, initialSection]);

  // Swipe down to dismiss (mirrors BCurveEditor).
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const startY = e.touches[0].clientY;
      const sheet = sheetRef.current;
      if (!sheet) return;

      const onTouchMove = (ev: TouchEvent) => {
        const dy = ev.touches[0].clientY - startY;
        if (dy > 0) {
          sheet.style.transform = `translateY(${dy}px)`;
        }
      };
      const onTouchEnd = (ev: TouchEvent) => {
        const dy = ev.changedTouches[0].clientY - startY;
        sheet.style.transform = '';
        if (dy > 80) {
          closeHelp();
        }
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    },
    [closeHelp],
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeHelp}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '80vh',
          background: 'var(--color-surface)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Drag handle + title + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Help</span>
          <button
            onClick={closeHelp}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={contentRef}
          style={{ flex: 1, overflow: 'auto', padding: 16 }}
        >
          {HELP_SECTIONS.map((s) => (
            <section
              key={s.id}
              id={s.id}
              style={{ marginBottom: 20, scrollMarginTop: 8 }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>
                {s.title}
              </h3>
              {s.body.map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    margin: '0 0 6px',
                    color: 'var(--color-text)',
                  }}
                >
                  {p}
                </p>
              ))}
              {s.steps && (
                <ol
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    margin: '4px 0 6px',
                    paddingLeft: 20,
                    color: 'var(--color-text)',
                  }}
                >
                  {s.steps.map((step, i) => (
                    <li key={i} style={{ marginBottom: 3 }}>
                      {step}
                    </li>
                  ))}
                </ol>
              )}
              {s.tip && (
                <aside
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    margin: '6px 0 0',
                    padding: '8px 10px',
                    background: 'rgba(0, 230, 118, 0.08)',
                    borderLeft: '3px solid var(--color-accent)',
                    borderRadius: 4,
                    color: 'var(--color-text)',
                  }}
                >
                  {s.tip}
                </aside>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
