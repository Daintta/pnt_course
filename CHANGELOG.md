# Changelog

## v0.9.11 — 5 October 2026
Accessibility and colour pass following a WCAG 2.2 AA audit (axe-core 4.13, light and dark mode, 15 page types).
### Changed
- Certificates: every "Open" button (module and pathway) now uses the same teal button.
- The app's "passed" teal (`--lock`) darkened slightly from #0B8A7A to #097D6F so white button text meets 4.5:1. In dark mode, teal buttons use navy text (7.1:1).
### Fixed (accessibility)
- "Passed" label text contrast (was 2.25:1 after v0.9.10) — now dark text on the green chip.
- "In progress" label contrast (was 1.89:1) — darker amber text.
- Certificates level headings were near-invisible in dark mode (1.15:1).
- Not-yet-earned certificate cards were faded with opacity (2.8–4.4:1); they are now shown with a dashed border at full text contrast.
- Resources "Source document" label (2.85:1) and Suggest a Resource panel now follow the light/dark theme.
- Link colour darkened from #2F6FDE to #2A62C9 (4.35:1 → 5.3:1).
- Certificate PDF viewer frame now has a title for screen readers.
- Resource cards no longer overflow at 320px width.
- Answer review headings on the assessment result page use the correct heading level.
- Satellite tracker animation stops when the device's "reduce motion" setting is on; its screen-reader label now includes each level's progress and modules passed.
- Links that open in a new tab now tell screen-reader users so.
### Tidied
- Satellite panel no longer shows an inner square background.
- Removed the unused sky-plot code and styles.

## v0.9.10 — 5 October 2026
### Fixed
- The colour variable `--primary-teal` was used but never defined, so four elements showed no teal. It is now defined once in `app.css` as the Daintta brand teal `#0BB3AD`. This affects:
  - the "+ Suggest a Resource" button (previously near-invisible white text on a pale box), which now has a teal background with dark navy text for readability;
  - the teal left border on stage headings on the Modules page;
  - the "Passed" status text colour on the Modules page;
  - the highlight border on earned pathway cards on the Certificates page.
- No other changes.

## v0.9.9 — 5 October 2026
### Changed
- Resources: "Suggest a Resource" moved from the bottom of the page to the top, directly under the page introduction and above External References. Wording, button and link unchanged; the gap above its heading is now 32px to match the other section headings.
- No other changes.

## v0.9.8 — 5 October 2026
### Fixed
- Resources → Further Learning by Module listed only a hand-typed subset of each module's further learning (47 links), so it did not match the modules' Further Learning lessons (79 links). It is now built from each module's Further Learning lesson when the page opens, showing the title, description and link of every resource, so the two always match.
- Module 10's lesson has no clickable links, so it keeps its existing three hand-maintained links until its source document gains links.
- No other changes.

## v0.9.7 — 5 October 2026
### Fixed
- Resources, top three reference cards: the two DHS cards linked to PDF files that no longer exist. They now link to the official DHS publication pages for the Resilient PNT Conformance Framework and the Resilient PNT Reference Architecture. The NIST TN 2187 link is unchanged.
- The button on those three cards now reads "Read Document" instead of "Read (PDF)".
- No other changes.

## v0.9.6 — 5 October 2026
Baseline: `pnt-learning-enhanced 16.02.39.zip` (2 October 2026). Builds made after 16:02 on
2 October were rollbacks to an early version and must not be used. The 15.59.44 build does
not start (duplicate `pad` declaration in app.js).

### Fixed
- Pathway certificates printed "Learner" instead of the learner's name. They now use the saved profile, and a name change is reflected on them.
- Pathway certificates were recreated on every page load with a new random ID and today's date. They are now derived from the module certificates: the ID is stable and the award date is the date the last required module was passed.
- Pathway cards on the Certificates page showed "0 of 3 modules passed". They now show cumulative progress against the real requirement (e.g. "4 of 7 modules passed (modules 1–7)") and the average score once awarded.
- "Suggest a Resource" linked to a placeholder repository. It now opens an issue on `Daintta/pnt_course`.
- Links to the programme certificate (Modules page button, assessment result page) opened a certificate that could not be generated. They now open the PNT Applied Engineering certificate, which covers the same 10 modules. Old `#/certificate/programme` links redirect there.
- "Certificates earned" no longer double counts the programme record.
- Pathway PDFs were generated in the background on every page load; they are now generated only when opened.

### Changed
- pdf-lib 1.17.1 and @pdf-lib/fontkit 1.1.1 are bundled in `assets/vendor/` (MIT, see NOTICE.txt) instead of loading from the jsdelivr CDN, so certificates work on networks that block CDNs. Adds about 1.3 MB.
- App version shown in the footer ("App v0.9.6 · Content version 0.1"), set in `config.js` → `appVersion`.

### Confirmed present (unchanged from 16.02.39)
- Animated satellite tracker on the Modules page (three orbits, L1 pulse, progress %).
- Resources page: source documents on SharePoint (10), external references, Further Learning by module, Suggest a Resource.
