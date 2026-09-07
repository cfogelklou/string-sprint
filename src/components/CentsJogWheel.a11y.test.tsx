// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import React from 'react';
import CentsJogWheel from './CentsJogWheel';
import { usePianoStore } from '@/store/pianoStore';
import { keyIndexOf } from '@/model/pianoNotes';

beforeEach(() => {
  usePianoStore.getState().stopAll();
  usePianoStore.getState().stopTuningSim();
  usePianoStore.getState().resetTuning();
  usePianoStore.getState().selectKey(69); // A4 selected
});

describe('CentsJogWheel accessibility and interaction', () => {
  it('renders wheel structure and prompt when no key is selected', () => {
    act(() => {
      usePianoStore.getState().selectKey(null);
    });
    render(<CentsJogWheel />);
    expect(screen.getByText('Select a piano key to tune it')).toBeInTheDocument();
    // Dial and buttons remain mounted to prevent layout shift
    expect(screen.getByRole('slider', { name: 'Cents jog wheel (no key selected)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+0.01¢' })).toBeDisabled();
  });

  it('exposes slider role and numeric aria properties in normal mode', () => {
    render(<CentsJogWheel />);
    const dial = screen.getByRole('slider', { name: 'Cents jog wheel' });
    expect(dial).toBeInTheDocument();
    expect(dial.getAttribute('aria-valuemin')).toBe('-100');
    expect(dial.getAttribute('aria-valuemax')).toBe('100');
    expect(dial.getAttribute('aria-valuenow')).toBe('0');
    expect(dial.getAttribute('aria-valuetext')).toBe('plus 0.00 cents');
  });

  it('adjusts cents offset via keyboard arrow keys and bounds on dial', () => {
    render(<CentsJogWheel />);
    const dial = screen.getByRole('slider', { name: 'Cents jog wheel' });

    // ArrowUp nudges +0.1¢
    fireEvent.keyDown(dial, { key: 'ArrowUp' });
    let key = usePianoStore.getState().keys[keyIndexOf(69)];
    expect(key.centsOffset).toBeCloseTo(0.1, 2);

    // Shift + ArrowUp nudges +1.0¢
    fireEvent.keyDown(dial, { key: 'ArrowUp', shiftKey: true });
    key = usePianoStore.getState().keys[keyIndexOf(69)];
    expect(key.centsOffset).toBeCloseTo(1.1, 2);

    // PageDown nudges -5.0¢
    fireEvent.keyDown(dial, { key: 'PageDown' });
    key = usePianoStore.getState().keys[keyIndexOf(69)];
    expect(key.centsOffset).toBeCloseTo(-3.9, 2);

    // Home jumps to -100¢
    fireEvent.keyDown(dial, { key: 'Home' });
    key = usePianoStore.getState().keys[keyIndexOf(69)];
    expect(key.centsOffset).toBe(-100);

    // End jumps to +100¢
    fireEvent.keyDown(dial, { key: 'End' });
    key = usePianoStore.getState().keys[keyIndexOf(69)];
    expect(key.centsOffset).toBe(100);
  });

  it('renders all 8 precision buttons including 0.01 brag mode and reset button in normal mode', () => {
    render(<CentsJogWheel />);
    const labels = ['−5¢', '−1¢', '−0.1¢', '−0.01¢', '+0.01¢', '+0.1¢', '+1¢', '+5¢'];
    for (const label of labels) {
      const btn = screen.getByRole('button', { name: label });
      expect(btn).toBeInTheDocument();
    }

    const resetBtn = screen.getByRole('button', { name: 'Reset to 0¢' });
    expect(resetBtn).toBeInTheDocument();

    // Clicking +0.01¢ button nudges offset by 0.01
    const plus001Btn = screen.getByRole('button', { name: '+0.01¢' });
    fireEvent.click(plus001Btn);
    expect(usePianoStore.getState().keys[keyIndexOf(69)].centsOffset).toBe(0.01);

    // Clicking −0.01¢ button nudges offset by -0.01
    const minus001Btn = screen.getByRole('button', { name: '−0.01¢' });
    fireEvent.click(minus001Btn);
    expect(usePianoStore.getState().keys[keyIndexOf(69)].centsOffset).toBe(0);

    // Clicking +5¢ button nudges offset
    const plus5Btn = screen.getByRole('button', { name: '+5¢' });
    fireEvent.click(plus5Btn);
    expect(usePianoStore.getState().keys[keyIndexOf(69)].centsOffset).toBe(5);

    // Clicking Reset button restores 0¢
    fireEvent.click(resetBtn);
    expect(usePianoStore.getState().keys[keyIndexOf(69)].centsOffset).toBe(0);
  });

  it('omits numeric value and reset button in Tuning Practice mode', () => {
    act(() => {
      usePianoStore.getState().startTuningSim();
      usePianoStore.getState().selectKey(69);
    });

    render(<CentsJogWheel />);

    // In practice mode, dial has group role with descriptive guidance instead of slider with exact numbers
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    const group = screen.getByRole('group', {
      name: 'Cents jog wheel. Use arrow keys or precision buttons to tune the selected note.',
    });
    expect(group).toBeInTheDocument();
    expect(group.getAttribute('aria-valuenow')).toBeNull();

    // Reset button is hidden
    expect(screen.queryByRole('button', { name: 'Reset to 0¢' })).not.toBeInTheDocument();

    // Precision buttons remain available
    expect(screen.getByRole('button', { name: '+1¢' })).toBeInTheDocument();
  });
});
