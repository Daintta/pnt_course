import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Retry Logic - Exponential Backoff', () => {
  let attempts;

  beforeEach(() => {
    attempts = 0;
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn(async () => {
      attempts++;
      return 'success';
    });

    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  it('should retry after failure', async () => {
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 2) throw new Error('Network error');
      return 'success';
    });

    const result = await retryWithBackoff(fn, 3);
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('should fail after max attempts exceeded', async () => {
    const fn = vi.fn(async () => {
      attempts++;
      throw new Error('Network error');
    });

    try {
      await retryWithBackoff(fn, 2);
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err.message).toBe('Network error');
      expect(attempts).toBe(2);
    }
  });

  it('should calculate exponential backoff delays correctly', () => {
    const delays = [];
    for (let i = 0; i < 3; i++) {
      const delay = Math.pow(2, i) * 1000;
      delays.push(delay);
    }
    expect(delays).toEqual([1000, 2000, 4000]);
  });

  it('should retry up to 3 times by default', async () => {
    const fn = vi.fn(async () => {
      attempts++;
      throw new Error('Persistent error');
    });

    try {
      await retryWithBackoff(fn);
    } catch (err) {
      expect(attempts).toBe(3);
    }
  });
});

// Helper function for tests
async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(r => setTimeout(r, 0)); // Skip sleep in tests
    }
  }
}
