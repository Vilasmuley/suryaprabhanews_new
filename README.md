# SuryaPrabha e-paper

This is a static e-paper website. The current issue is the first entry in
`data/issues.json`; every issue is preserved under `issues/YYYY-MM-DD/`.

## Publish the daily eight pages

1. Put the eight page images into one folder and name them in page order (for example, `page1.jpg` … `page8.jpg`). WebP is strongly recommended for smaller, faster files.
2. Open PowerShell in this project folder.
3. Run:

   ```powershell
   .\scripts\publish-issue.ps1 -SourceFolder "C:\path\to\today-pages" -IssueDate "2026-11-20" -Edition "वर्ष १७ · अंक ८८"
   ```

4. Preview locally if desired, then commit and push the changes to GitHub:

   ```powershell
   git add .
   git commit -m "Publish 2026-11-20 issue"
   git push
   ```

Cloudflare Pages will deploy the pushed version automatically. Its deployment typically takes a minute or two.

## Hosting setup

1. Create a GitHub repository and push this folder to it.
2. In Cloudflare Pages, choose **Create application → Pages → Connect to Git** and select the repository. Set the build command to blank and the output directory to `/`.
3. Add `suryaprabhanews.com` as the custom domain in the Pages project.
4. At GoDaddy, change the domain nameservers to the two nameservers Cloudflare supplies. Do not transfer or cancel the GoDaddy domain registration.

The `/admin` screen is a preview-only page. A static website cannot safely accept uploads by itself: an actual upload screen would need authenticated storage or GitHub OAuth. The PowerShell publishing command above is the safe, free workflow.
