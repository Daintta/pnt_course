# Test Suite

Automated tests for the PNT Learning App using Vitest.

## Running Tests

```bash
npm install          # Install dependencies first
npm test             # Run all tests
npm run test:ui      # View tests with UI
npm run test:coverage # Generate coverage report
```

## Test Coverage

**store.test.js** — 15 tests
- Profile loading and persistence
- Lesson tracking
- Practice scores
- Assessment attempts
- Module status calculation
- Certificate management

**progress.test.js** — 18 tests
- Lesson read tracking and percentages
- Assessment unlock logic
- Multiple attempt tracking
- Module dependencies and locking
- Programme completion tracking

**satellite-tracking.test.js** — 14 tests
- Level progress calculation (0-100%)
- Status color mapping (idle, progress, complete)
- Level separation (L1, L2, L3 don't overlap)
- Orbit positioning math

**Total: 47 tests** covering core logic paths

## Not Yet Tested

- Auth module (sign-in, sign-up, session)
- Supabase RLS policies
- Form validation
- Certificate PDF generation
- End-to-end user flows

These can be added with Playwright for browser-based E2E tests.
