import { describe, it, expect } from 'vitest';
import { HELP_SECTIONS, HELP_SECTION_IDS } from '@/components/helpContent';

describe('helpContent', () => {
  it('every declared section id has exactly one section', () => {
    for (const id of HELP_SECTION_IDS) {
      const matches = HELP_SECTIONS.filter((s) => s.id === id);
      expect(matches.length, `section ${id}`).toBe(1);
    }
  });

  it('has no undeclared (orphan) sections', () => {
    const declared = new Set<string>(HELP_SECTION_IDS);
    for (const s of HELP_SECTIONS) {
      expect(declared.has(s.id), `orphan section ${s.id}`).toBe(true);
    }
  });

  it('section ids are unique', () => {
    const ids = HELP_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every section has a title and at least one body paragraph', () => {
    for (const s of HELP_SECTIONS) {
      expect(s.title.length > 0, `title for ${s.id}`).toBe(true);
      expect(s.body.length >= 1, `body for ${s.id}`).toBe(true);
    }
  });
});
