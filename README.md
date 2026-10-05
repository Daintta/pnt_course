# Daintta PNT Engineering: learning app (standalone)

A self-paced web learning app for the Daintta PNT Engineering *Foundation & Practitioner Learning Programme*. It contains 10 modules built from the programme's Word documents. Each module ends with a 15-question assessment. Learners who score 80% or more get a printable certificate, and passing all 10 modules earns a programme certificate.

This is the **standalone** version. It needs no server or database: each learner's progress is saved in their own browser. If you need a central record of every employee's progress, use the **admin version** (`pnt-learning-admin`) instead.

## What's included

| | |
|---|---|
| Lessons | 202 lessons, one per section of the source documents, with all 62 diagrams (click to enlarge) |
| Practice questions | The 98 Knowledge Check questions from the documents, with instant feedback and your rationale text |
| Assessments | 150 questions (15 per module): single choice, multi-select, true/false, matching and ordering. Questions and options are shuffled on every attempt |
| Rules | Pass mark 80%; the assessment unlocks when every lesson in the module has been read; unlimited retakes; correct answers are revealed only after passing |
| Certificates | One per module plus a programme certificate, A4 landscape, printable or saved as PDF. Each shows the learner's name, email, score, date, a certificate ID and the content version |
| Glossary | 147 key terms collected from the Key Terms sections, searchable |
| Accessibility | Keyboard operable, screen-reader labels, visible focus, light and dark modes, works on mobile |

## Try it locally

The app is plain HTML, CSS and JavaScript, with no build step. Serve the folder with any static web server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a repository and push this folder to the `main` branch.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) publishes the site on every push to `main`. The site address appears on the Actions run and on the Pages settings screen.

The workflow publishes only `index.html`, `assets/` and `content/`. The editable question files in `assessments/` and the `tools/` scripts stay in the repository and are not put on the website.

> **Visibility:** on GitHub Free, Pages sites are public, and Pages from a private repository needs GitHub Pro, Team or Enterprise. Enterprise can also restrict a Pages site to members of your organisation. If the training material should not be publicly reachable, check your plan before deploying.

## Configuration

Edit `assets/js/config.js`:

| Setting | Default | Purpose |
|---|---|---|
| `passMark` | `80` | Percentage needed to pass each assessment |
| `requireAllLessonsRead` | `true` | Unlock the assessment only after every lesson is marked as read |
| `revealAnswersOnFail` | `false` | Show correct answers and explanations after a failed attempt |
| `certificate.signatoryName` / `signatoryTitle` | empty | Adds a signature block to certificates when set |
| `organisation`, `programmeTitle`, `programmeSubtitle` | Daintta values | Text used across the app and certificates |

## Updating the course content

When the Word documents change (for example from version 0.1 to 1.0), regenerate the content instead of editing it by hand:

```bash
pip install beautifulsoup4 pillow      # also needs pandoc installed
python3 tools/build_content.py --src path/to/folder-with-docx --out .
python3 tools/build_assessments.py --mode local
```

The documents must keep their `..._Module_NN_....docx` file names. The script:

- splits each module into lessons at every Heading 1
- turns single-cell tables into call-out boxes
- resizes the images and converts them to WebP
- turns the Knowledge Check section and its answer key into practice questions
- rebuilds the glossary from the Key Terms tables
- reads the version number from each document's title page, which is then printed on new certificates

Diagrams get alt text taken from their lesson title, because the source documents do not include image descriptions. For better screen-reader support, add Alt Text to the images in Word and extend the script to use it.

## Editing assessments

Each module's questions are in `assessments/mNN.md`, written so that a subject-matter expert can review and edit them in any text editor. After editing, run `python3 tools/build_assessments.py --mode local`. It checks the format and reports any mistakes.

```markdown
## single
Question text.
- A wrong option
* The correct option (marked with *)
- Another wrong option
> Explanation shown after the learner passes.

## multi
Question text. Mark every correct option with *.
* Correct
* Also correct
- Wrong
> Explanation.

## truefalse
A statement.
= false
> Explanation.

## match
Instruction text.
- Left item = Its matching right item
- Another left item = Its match
> Explanation. (Right-hand items are shuffled; each must be unique.)

## order
Instruction text. List the items in the CORRECT order; they are shuffled on screen.
1. First
2. Second
3. Third
> Explanation.
```

The pass mark applies to the number of questions in each file, so modules can have different question counts.

**Please have a PNT subject-matter expert review the assessment questions before rollout.** They were written from the module content, and a reviewer should confirm the wording and answers.

## Limitations of the standalone version

- **Progress is per browser.** Learners who clear their browser data, or switch device or browser, start again. Certificates should be saved as PDFs to keep a permanent copy.
- **It is not tamper-proof.** Scoring happens in the learner's browser, so the answer key is present in the page's JavaScript and a determined person could find it. Certificate IDs cannot be verified centrally.
- **There is no central reporting.** Learners send their certificate PDFs to show completion.

The admin version addresses all three: server-side scoring with hidden answer keys, central records, an admin dashboard and a public certificate-verification page.

## Folder structure

```
index.html                  the app
assets/css/app.css          styles
assets/js/config.js         settings
assets/js/app.js            app logic (shared with the admin version)
assets/js/store-local.js    browser storage and scoring
assets/img/                 logo, favicon, module diagrams (WebP)
content/                    generated lesson, practice, glossary and assessment data
assessments/mNN.md          editable assessment questions (not published)
tools/                      content and assessment build scripts (not published)
.github/workflows/pages.yml GitHub Pages deployment
```
