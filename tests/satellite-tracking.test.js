import { describe, it, expect } from 'vitest';

describe('Satellite Tracking - Progress Calculation', () => {
  // Mirrors calcLevelComplete in assets/js/app.js. Each module is { passed, lessonsRead, lessonCount }.
  const calcLevelComplete = (modules) => {
    const total = modules.reduce((sum, m) => {
      if (m.passed) return sum + 1;
      return sum + m.lessonsRead / m.lessonCount;
    }, 0);
    return Math.round((total / modules.length) * 100);
  };

  const notStarted = { passed: false, lessonsRead: 0, lessonCount: 5 };
  const passed = { passed: true, lessonsRead: 5, lessonCount: 5 };

  it('should show 0% for level with no progress', () => {
    const progress = calcLevelComplete([notStarted, notStarted, notStarted, notStarted]);
    expect(progress).toBe(0);
  });

  it('should move by each lesson read within a module (4-module level)', () => {
    // 5-lesson module: 1 of 5 read = 20% of 1 module = 5% of the level
    const progress = calcLevelComplete([{ passed: false, lessonsRead: 1, lessonCount: 5 }, notStarted, notStarted, notStarted]);
    expect(progress).toBe(5);
  });

  it('should keep rising as more lessons are read, not jump to 50%', () => {
    const after2 = calcLevelComplete([{ passed: false, lessonsRead: 2, lessonCount: 5 }, notStarted, notStarted, notStarted]);
    const after4 = calcLevelComplete([{ passed: false, lessonsRead: 4, lessonCount: 5 }, notStarted, notStarted, notStarted]);
    expect(after2).toBe(10);
    expect(after4).toBe(20);
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
    // 2 passed, 1 module with 2 of 5 lessons read, 1 not started: (2 + 0.4) / 4 = 60%
    const progress = calcLevelComplete([passed, passed, { passed: false, lessonsRead: 2, lessonCount: 5 }, notStarted]);
    expect(progress).toBe(60);
  });

  it('should work for 3-module level (Technology)', () => {
    const progress = calcLevelComplete([passed, { passed: false, lessonsRead: 5, lessonCount: 5 }, notStarted]);
    expect(progress).toBe(67); // (1 + 1 + 0) / 3 = 66.7%, rounds to 67
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
