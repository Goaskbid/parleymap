ParleyMap AdSense-only repair

This package deliberately fixes only the AdSense/public-site surface. It does not touch the demo-data JSON, people, events, anchors, crawler data, or roster data.

Install:
1. Extract this ZIP.
2. Go to GitHub repo > Code > .github > workflows.
3. Upload UPLOAD_THIS_TO_GITHUB_WORKFLOWS/data-validate.yml into that folder.
4. It must replace .github/workflows/data-validate.yml.
5. Commit to main with: Replace data validation with AdSense repair.
6. Run Actions > ParleyMap data validation > Run workflow.

What it does:
- Checks out full git history.
- Recovers a full index.html from current file or git history if current index.html is thin.
- Searches current files and git history for real ca-pub and two data-ad-slot values.
- Fails without committing if it cannot find real IDs.
- Adds google-adsense-account meta.
- Adds the AdSense loader in <head>.
- Installs a runtime script that mounts real ins.adsbygoogle units into the header and sidebar ad windows.
- Creates ads.txt in the domain root.
- Replaces broken privacy/impressum pages with clean legal pages and adds about/contact/methodology/data-sources pages.
- Writes data/diagnostics/adsense-only-repair-report.json and LATEST_RUN_SUMMARY.md.

What it does not do:
- It does not repair Grossi, Pope, events, anchors, or roster.
- It does not modify the demo-data block.
- It does not invent fake AdSense IDs.
