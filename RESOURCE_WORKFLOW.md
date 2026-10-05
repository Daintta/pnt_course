# Resource Suggestion Workflow

This guide explains how the resource suggestion system works.

## For Users

1. Click "Suggest a Resource" on the Resources page
2. Fill in the form with:
   - Resource title
   - URL
   - Which module(s) it's relevant to
   - Category
   - Brief description
3. Submit → Issue created on GitHub
4. Our team reviews it
5. ✅ Once approved, the resource is automatically added to the learning programme

## For Maintainers

### Workflow Overview

```
User submits form
     ↓
Issue created automatically
     ↓
You receive email notification
     ↓
Review the suggestion
     ↓
Add "approved" label (if good)
     ↓
GitHub Actions creates a pull request
     ↓
Review PR + merge
     ↓
Page updates live automatically
```

### To Approve a Resource Suggestion

1. Receive email with new issue
2. Open the GitHub issue
3. Review the resource details
4. If it's good: Add the `approved` label
5. GitHub Actions will:
   - Create a pull request with the resource added
   - Comment on the issue with a link
6. Review the PR (optional - it's usually auto-generated)
7. Merge the PR
8. ✅ Page updates live within minutes

### To Reject a Resource Suggestion

Simply close the issue with a comment explaining why it wasn't suitable. The automation won't trigger.

### Manual Addition (if needed)

If automation fails or you want to add a resource directly:

1. Edit `assets/js/app.js`
2. Find the `furtherLearning` array
3. Add resource entry to relevant module(s):
   ```js
   { title: "Resource Title", url: "https://..." }
   ```
4. Commit and push
5. GitHub Pages rebuilds automatically

## Setup Checklist

- [ ] Update GitHub URLs in:
  - `assets/js/app.js` — "Suggest a Resource" button
  - This document — any references to your repo URL
  
- [ ] Verify GitHub Actions is enabled in repo settings
  - Go to repo → Settings → Actions → General
  - Ensure "Actions permissions" allows workflows to run

- [ ] Test workflow with a test issue labeled `approved`

- [ ] Update repository URL in `assets/js/app.js` to point to your actual repo

## Troubleshooting

**PR not created after adding `approved` label?**
- Check GitHub Actions tab → Workflows → "Add Approved Resource"
- Check for errors in the workflow run
- Ensure issue body has the required fields

**Resource not appearing on page after PR merge?**
- GitHub Pages rebuilds can take 2-5 minutes
- Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check that the resource was correctly added to `furtherLearning` array

**Need to edit a resource after it's added?**
- Edit directly in `assets/js/app.js`
- Commit and push
- Page updates automatically
