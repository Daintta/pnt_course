# Regression checklist — v0.9.6

Run in headless Chromium against a fresh browser profile, 5 October 2026. Modules 1 and 10 were completed through the user interface (reading every lesson, a failed attempt on module 1, then a passing attempt); modules 2–9 were passed through the app's own store so the run fits in time. Certificate PDFs were extracted and their text checked.

**Result: 53/53 passed**

## Start-up and profile

- [x] First visit redirects to Welcome
- [x] Short name rejected
- [x] Valid name goes to Modules page
- [x] Footer shows app version — App v0.9.6 · Content version 0.1
- [x] PDF library loaded locally (no CDN)

## Modules page and satellites

- [x] Satellite tracker on Modules page
- [x] Tracker core shows 0/10
- [x] L1 satellite orbit animation running — orbit-l1
- [x] All 10 module rows listed
- [x] Tracker core shows 10/10

## Lessons and assessments

- [x] All 10 module overviews and first lessons render
- [x] Lesson images load — 0 broken
- [x] Assessment locked before lessons read
- [x] Read all module 1 lessons via UI — 13 lessons
- [x] Failed attempt gives no certificate
- [x] Passing attempt via UI scores 100% — Module 1 / Assessment result 100% You passed You answered 15 of 15 correctly. The pass mark is 80% (12 correct). View 
- [x] Module 1 certificate issued
- [x] Module 10 passed via UI
- [x] Result page links to Applied Engineering cert

## Certificates

- [x] Module 1 PDF shows learner name — re-checked after fixing test wait
- [x] Foundation pathway shown after modules 1-4
- [x] Practitioner card shows 4 of 7
- [x] Applied card shows 4 of 10
- [x] Foundation PDF shows learner name (not 'Learner')
- [x] Foundation PDF title correct
- [x] Foundation ID stable across reloads — PNT-FOUND-3YGC-S4Q6
- [x] Renamed learner appears on pathway PDF
- [x] Foundation award date = date last required module passed — 20 September 2026
- [x] Certificates page shows same award date
- [x] Certificates earned = 13 (10 modules + 3 pathways) — 13 certificates earned
- [x] Dashboard button goes to Applied Engineering cert
- [x] All three pathway certificates awarded
- [x] Practitioner PDF generated with name
- [x] Applied PDF generated with name
- [x] Old programme link redirects to Applied Engineering
- [x] Download PDF works — Certificate-applied-eng-PNT-APPL-RQD7-4ZYR.pdf

## Resources

- [x] Resources page renders — 60 cards
- [x] All 10 SharePoint module links present — 10
- [x] Suggest a Resource points at Daintta repo
- [x] Resources nav item highlighted

## Glossary, mobile, reset

- [x] Glossary lists terms and search filters — 147 terms, 1 hits
- [x] No sideways scroll on mobile — scrollWidth 390
- [x] Reset clears module and pathway certificates

## Errors and network

- [x] No JavaScript errors (phase A)
- [x] No external requests except Google Fonts (phase A)
- [x] No JavaScript errors (phase B)
- [x] No external requests except Google Fonts (phase B)
- [x] No JavaScript errors (phase C)
- [x] No external requests except Google Fonts (phase C)
- [x] No JavaScript errors (phase D)
- [x] No external requests except Google Fonts (phase D)
- [x] No JavaScript errors (phase E)
- [x] No external requests except Google Fonts (phase E)

## Manual checks before each release

- [ ] Open a module and a pathway certificate in Chrome, Edge and Safari and check the PDF displays
- [ ] SharePoint links open for a signed-in Daintta user
- [ ] Footer shows the new version number
- [ ] Deployed GitHub Pages site loads over HTTPS
