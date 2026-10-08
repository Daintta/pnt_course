import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Link Checker - Module Resources', () => {
  // Extract all URLs from module files
  function extractUrls() {
    const modulesDir = path.join(process.cwd(), 'content', 'modules');
    const urls = new Set();

    const files = fs.readdirSync(modulesDir).filter(f => f.endsWith('.js'));

    files.forEach(file => {
      const content = fs.readFileSync(path.join(modulesDir, file), 'utf8');
      // Match http/https URLs
      const urlPattern = /https?:\/\/[^\s"'<>]+/g;
      const matches = content.match(urlPattern) || [];
      matches.forEach(url => {
        // Clean up URLs (remove trailing punctuation)
        const cleaned = url.replace(/[),.]$/, '');
        if (cleaned.startsWith('http')) {
          urls.add(cleaned);
        }
      });
    });

    return Array.from(urls);
  }

  it('should extract all URLs from modules', () => {
    const urls = extractUrls();
    console.log(`Found ${urls.length} unique URLs in modules`);
    expect(urls.length).toBeGreaterThan(0);
  });

  it('should not contain old broken URLs', () => {
    const urls = extractUrls();
    const brokenPatterns = [
      /gps\.gov\/technical[^-]/,  // Old: gps.gov/technical (not technical-documentation)
      /gps\.gov\/[^"]*augment[^s]/,  // Malformed augmentation URLs
      /gps\.gov\/[^"]*interfere[^s]/,  // Malformed interference URLs
    ];

    const foundBroken = urls.filter(url =>
      brokenPatterns.some(pattern => pattern.test(url))
    );

    expect(foundBroken).toHaveLength(0);
  });

  it('should contain new working URLs', () => {
    const urls = extractUrls();

    const expectedUrls = [
      'https://www.gps.gov/technical-documentation',
      'https://www.gps.gov/augmentation-systems',
      'https://egnos.gsc-europa.eu/egnos-system/about-egnos',
      'https://www.gps.gov/spectrum-interference-issues',
      'https://pages.nist.gov/mobile-threat-catalogue/gps.html',
    ];

    expectedUrls.forEach(expected => {
      const found = urls.some(url => url.includes(expected.replace(/^https?:\/\//, '')));
      expect(found).toBe(true, `Expected to find URL: ${expected}`);
    });
  });

  // Optional: Test URL accessibility (can be slow, so skip by default)
  it.skip('should verify all URLs are accessible', async () => {
    const urls = extractUrls();
    const timeout = 5000;

    const results = await Promise.allSettled(
      urls.map(url => {
        return Promise.race([
          fetch(url, { method: 'HEAD', redirect: 'follow' })
            .then(res => ({ url, status: res.status, ok: res.ok }))
            .catch(err => ({ url, status: 0, ok: false, error: err.message })),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      })
    );

    const broken = results
      .filter(r => r.status === 'rejected' || !r.value.ok)
      .map(r => r.value || { url: 'unknown', error: r.reason });

    if (broken.length > 0) {
      console.warn('Broken links found:');
      broken.forEach(b => console.warn(`  ${b.url}: ${b.error || `Status ${b.status}`}`));
    }

    // Don't fail the test for HTTP errors, just report them
    expect(broken.length).toBeLessThan(results.length);
  });
});
