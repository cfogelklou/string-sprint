// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import React, { useRef } from 'react';
import HelpSheet from './HelpSheet';
import PTAWizard from './PTAWizard';
import { usePianoStore } from '@/store/pianoStore';
import { usePTAStore } from '@/store/ptaStore';

beforeEach(() => {
  usePianoStore.getState().closeHelp();
  usePTAStore.getState().stopPTAMode();
});

describe('Modal dialogs accessibility (HelpSheet and PTAWizard)', () => {
  describe('HelpSheet dialog', () => {
    it('behaves as modal dialog: aria attributes, Escape key close, and close button', () => {
      act(() => {
        usePianoStore.getState().openHelp();
      });

      render(<HelpSheet />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('help-sheet-title');

      const closeBtn = screen.getByRole('button', { name: 'Close Help' });
      expect(closeBtn).toBeInTheDocument();

      // Escape closes the dialog
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(usePianoStore.getState().isHelpOpen).toBe(false);
    });

    it('closes on clicking close button', () => {
      act(() => {
        usePianoStore.getState().openHelp();
      });

      render(<HelpSheet />);
      const closeBtn = screen.getByRole('button', { name: 'Close Help' });
      fireEvent.click(closeBtn);
      expect(usePianoStore.getState().isHelpOpen).toBe(false);
    });
  });

  describe('PTAWizard dialog', () => {
    it('behaves as modal dialog: aria attributes, Escape key close, and close button', () => {
      act(() => {
        usePTAStore.getState().startPTAMode();
      });

      render(<PTAWizard />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('pta-wizard-title');

      const closeBtn = screen.getByRole('button', { name: 'Close Calibration Test' });
      expect(closeBtn).toBeInTheDocument();

      // Escape closes the PTA wizard
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(usePTAStore.getState().ptaActive).toBe(false);
    });

    it('closes on clicking close button', () => {
      act(() => {
        usePTAStore.getState().startPTAMode();
      });

      render(<PTAWizard />);
      const closeBtn = screen.getByRole('button', { name: 'Close Calibration Test' });
      fireEvent.click(closeBtn);
      expect(usePTAStore.getState().ptaActive).toBe(false);
    });
  });

  describe('Focus restoration to opener', () => {
    function HostWithOpener() {
      const isHelpOpen = usePianoStore((s) => s.isHelpOpen);
      const openHelp = usePianoStore((s) => s.openHelp);
      const btnRef = useRef<HTMLButtonElement>(null);

      return (
        <div>
          <button ref={btnRef} onClick={() => openHelp()}>Open Help</button>
          {isHelpOpen && <HelpSheet />}
        </div>
      );
    }

    it('restores focus to opener button when sheet closes', () => {
      render(<HostWithOpener />);
      const openBtn = screen.getByRole('button', { name: 'Open Help' });
      openBtn.focus();
      expect(document.activeElement).toBe(openBtn);

      // Open sheet
      fireEvent.click(openBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close sheet via Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(openBtn);
    });
  });
});
