import { useRef, useState, useCallback } from 'react';
import { usePTAStore } from '@/store/ptaStore';
import PTASetupStep from './PTASetupStep';
import PTABridgeBreakStep from './PTABridgeBreakStep';
import PTAMeasureStep from './PTAMeasureStep';
import PTAReviewStep from './PTAReviewStep';
import PTAResultsStep from './PTAResultsStep';

const STEPS = ['setup', 'bridge-break', 'measure', 'review', 'results'] as const;

export default function PTAWizard() {
  const { ptaState, stopPTAMode, ptaGoToStep } = usePTAStore();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragY > 80) {
      stopPTAMode();
    }
    setDragY(0);
  }, [dragY, stopPTAMode]);

  const currentIdx = STEPS.indexOf(ptaState.step as typeof STEPS[number]);
  const showNav = ptaState.step !== 'results';

  const canGoBack = ptaState.step !== 'setup';
  const canGoNext = (() => {
    switch (ptaState.step) {
      case 'setup': return true;
      case 'bridge-break': return true;
      case 'measure':
        return ptaState.samples.filter((s) => s.captured).length >= 3;
      case 'review': return ptaState.grade !== null;
      default: return false;
    }
  })();

  const handleNext = () => {
    const idx = STEPS.indexOf(ptaState.step as typeof STEPS[number]);
    if (ptaState.step === 'review') {
      // Generate curve before showing results
      usePTAStore.getState().ptaGenerateCurve();
      ptaGoToStep('results');
    } else if (idx < STEPS.length - 1) {
      ptaGoToStep(STEPS[idx + 1]);
    }
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(ptaState.step as typeof STEPS[number]);
    if (idx > 0) {
      ptaGoToStep(STEPS[idx - 1]);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={stopPTAMode}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 200,
        }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '85vh',
          background: 'var(--color-surface)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          zIndex: 201,
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragY > 0 ? 'none' : 'transform 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-text-dim)',
          flexShrink: 0,
          position: 'relative',
        }}>
          {/* Drag handle */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 32,
            height: 4,
            borderRadius: 2,
            background: 'var(--color-text-dim)',
          }} />

          <div style={{ flex: 1, fontWeight: 600, fontSize: 16 }}>
            Calibration Test
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginRight: 12 }}>
            {STEPS.map((step, i) => (
              <div
                key={step}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i <= currentIdx
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)',
                }}
              />
            ))}
          </div>

          <button
            onClick={stopPTAMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: 24,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Step content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
        }}>
          {ptaState.step === 'setup' && <PTASetupStep />}
          {ptaState.step === 'bridge-break' && <PTABridgeBreakStep />}
          {ptaState.step === 'measure' && <PTAMeasureStep />}
          {ptaState.step === 'review' && <PTAReviewStep />}
          {ptaState.step === 'results' && <PTAResultsStep />}
        </div>

        {/* Navigation */}
        {showNav && ptaState.step !== 'results' && (
          <div style={{
            display: 'flex',
            gap: 12,
            padding: '12px 16px',
            borderTop: '1px solid var(--color-text-dim)',
            flexShrink: 0,
            paddingBottom: `calc(12px + var(--safe-area-bottom))`,
          }}>
            {canGoBack && (
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid var(--color-text-dim)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 8,
                border: 'none',
                background: canGoNext ? 'var(--color-primary)' : 'var(--color-text-dim)',
                color: canGoNext ? '#fff' : 'var(--color-text)',
                fontSize: 14,
                fontWeight: 600,
                cursor: canGoNext ? 'pointer' : 'default',
              }}
            >
              {ptaState.step === 'review' ? 'See Results' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
