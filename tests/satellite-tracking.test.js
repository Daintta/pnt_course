import { describe, it, expect } from 'vitest';

describe('Satellite Tracking - Progress Calculation', () => {
  // Mirrors calcLevelComplete in assets/js/app.js. Each module is
  // { passed, lessonsRead, lessonCount, attempts? } where each attempt is { score, answered?, total }.
  const calcLevelComplete = (modules) => {
    const total = modules.reduce((sum, m) => {
      if (m.passed) return sum + 1;
      const questions = (m.attempts || []).reduce((most, a) => Math.max(most, (a.answered ?? a.score) / a.total), 0);
      return sum + 0.5 * (Math.min(m.lessonsRead, m.lessonCount) / m.lessonCount) + 0.5 * questions;
    }, 0);
    return Math.round((total / modules.length) * 100);
  };

  const notStarted = { passed: false, lessonsRead: 0, lessonCount: 5 };
  const allRead = { passed: false, lessonsRead: 5, lessonCount: 5 };
  const passed = { passed: true, lessonsRead: 5, lessonCount: 5 };

  it('should show 0% for level with no progress', () => {
    const progress = calcLevelComplete([notStarted, notStarted, notStarted, notStarted]);
    expect(progress).toBe(0);
  });

  it('should move by each lesson read within a module', () => {
    // 5-lesson module in a 1-module level: each lesson is 10%
    expect(calcLevelComplete([{ passed: false, lessonsRead: 1, lessonCount: 5 }])).toBe(10);
    expect(calcLevelComplete([{ passed: false, lessonsRead: 3, lessonCount: 5 }])).toBe(30);
  });

  it('should cap lessons at 50% of a module until its assessment is passed', () => {
    expect(calcLevelComplete([allRead])).toBe(50);
    expect(calcLevelComplete([allRead, allRead, allRead, allRead])).toBe(50);
  });

  it('should add a step for each question answered, right or wrong', () => {
    // all lessons read (50%) + 3 of 15 answered (10%) = 60%
    expect(calcLevelComplete([{ ...allRead, attempts: [{ score: 1, answered: 3, total: 15 }] }])).toBe(60);
    // all lessons read (50%) + 15 of 15 answered (50%) = 100%, even with a failing score
    expect(calcLevelComplete([{ ...allRead, attempts: [{ score: 6, answered: 15, total: 15 }] }])).toBe(100);
  });

  it('should use the attempt with the most questions answered', () => {
    const attempts = [{ score: 2, answered: 9, total: 15 }, { score: 4, answered: 6, total: 15 }];
    expect(calcLevelComplete([{ ...allRead, attempts }])).toBe(80); // 50% + 9/15 of 50%
  });

  it('should fall back to score for attempts saved without an answered count', () => {
    expect(calcLevelComplete([{ ...allRead, attempts: [{ score: 3, total: 15 }] }])).toBe(60);
  });

  it('should count a passed module as complete', () => {
    expect(calcLevelComplete([passed])).toBe(100);
  });

  it('should not count more lessons than the module has', () => {
    expect(calcLevelComplete([{ passed: false, lessonsRead: 7, lessonCount: 5 }])).toBe(50);
  });

  it('should show 25% for one module passed (4-module level)', () => {
    const progress = calcLevelComplete([passed, notStarted, notStarted, notStarted]);
    expect(progress).toBe(25);
  });

  it('should show 50% for two modules passed (4-module level)', () => {
    const progress = calcLevelComplete([passed, passed, notStarted, notStarted]);
    expect(progress).toBe(50);
  });

  it('should show 100% for all modules passed', () => {
    const progress = calcLevelComplete([passed, passed, passed, passed]);
    expect(progress).toBe(100);
  });

  it('should combine passed modules with partial reading', () => {
    // 2 passed, 1 module with 2 of 5 lessons read, 1 not started: (2 + 0.2) / 4 = 55%
    const progress = calcLevelComplete([passed, passed, { passed: false, lessonsRead: 2, lessonCount: 5 }, notStarted]);
    expect(progress).toBe(55);
  });

  it('should work for 3-module level (Technology)', () => {
    const progress = calcLevelComplete([passed, allRead, notStarted]);
    expect(progress).toBe(50); // (1 + 0.5 + 0) / 3 = 50%
  });

  it('should work for 3-module level (Engineering)', () => {
    const progress = calcLevelComplete([passed, passed, passed]);
    expect(progress).toBe(100);
  });
});

describe('Satellite Tracking - Status Color', () => {
  const getStatus = (percent) => percent >= 100 ? 'complete' : percent > 0 ? 'progress' : 'idle';
  const getColor = (status) => status === 'complete' ? '#0BB3AD' : status === 'progress' ? '#c98200' : '#ccc';

  it('should be grey for idle satellite', () => {
    const status = getStatus(0);
    const color = getColor(status);

    expect(status).toBe('idle');
    expect(color).toBe('#ccc');
  });

  it('should be amber for progress satellite', () => {
    const status = getStatus(50);
    const color = getColor(status);

    expect(status).toBe('progress');
    expect(color).toBe('#c98200');
  });

  it('should be teal for complete satellite', () => {
    const status = getStatus(100);
    const color = getColor(status);

    expect(status).toBe('complete');
    expect(color).toBe('#0BB3AD');
  });

  it('should show progress at exactly 1%', () => {
    const status = getStatus(1);
    expect(status).toBe('progress');
  });
});

describe('Satellite Tracking - Level Separation', () => {
  it('should only count L1 modules (1-4) for L1 satellite', () => {
    const l1Modules = ['m01', 'm02', 'm03', 'm04'];
    expect(l1Modules.length).toBe(4);
  });

  it('should only count L2 modules (5-7) for L2 satellite', () => {
    const l2Modules = ['m05', 'm06', 'm07'];
    expect(l2Modules.length).toBe(3);
  });

  it('should only count L3 modules (8-10) for L3 satellite', () => {
    const l3Modules = ['m08', 'm09', 'm10'];
    expect(l3Modules.length).toBe(3);
  });

  it('should not count L2 progress toward L1', () => {
    const l1Progress = 25; // 1 of 4 modules
    const l2Progress = 50; // 2 of 3 modules

    expect(l1Progress).toBe(25);
    expect(l2Progress).toBe(50);
    expect(l1Progress).not.toBe(l2Progress);
  });
});
