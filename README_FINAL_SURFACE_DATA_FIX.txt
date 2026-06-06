ParleyMap final surface and data repair

What this package fixes:

1. Restores a real crawler-visible index.html from git history if the current root index.html is only a thin placeholder or file-listing text.
2. Repairs only the embedded demo-data JSON block inside index.html. It does not blindly inject data/demo.json.
3. Removes fake dated/watch records such as:
   - IAEA nuclear diplomacy watch
   - City of London finance diplomacy watch
   - Think-tank leadership events watch
   - Royal diaries and state-visit watch
4. Repairs critical institutional anchors and faces, including:
   - Claudia Sheinbaum -> Mexico City / MX
   - Pope Leo XIV -> Vatican City / VA
   - Prabowo Subianto -> Jakarta / ID
   - Rafael Grossi -> Vienna / AT
5. Suppresses duplicate-prone Rafael Grossi visible helper rows.
6. Installs a runtime data/Leaflet guard so visible profile markers are corrected even if the app reads another coordinate alias.
7. Preserves existing AdSense IDs and slot IDs from current files or git history. It does not invent dummy IDs.
8. Creates root ads.txt from the preserved publisher ID.
9. Replaces broken privacy.html and impressum.html with clean human-readable pages and adds contact/about/methodology/data-sources pages.
10. Replaces workflows with valid multiline YAML.

How to install:

Upload the contents of this folder to the repo root:

.github
scripts
data
FALLBACK_WORKFLOW_FILES
AUDIT_RESULTS.txt
README_FINAL_SURFACE_DATA_FIX.txt
THREAD_RESCUE_PROMPT.txt

Commit directly to main.

Suggested commit message:

Install ParleyMap surface and data repair

How to run:

Actions > ParleyMap data validation > Run workflow

Leave the AdSense inputs blank first. The workflow will search current files and git history for existing AdSense IDs and preserve them.

If it fails only because it cannot find the AdSense IDs, rerun the same workflow with:

publisher_id = your ca-pub-... or pub-...
header_slot_id = your header data-ad-slot
sidebar_slot_id = your sidebar data-ad-slot

The workflow refuses to inject fake IDs.

After success:

Wait for pages-build-deployment.
Hard refresh the site.
Check:

https://parleymap.com/ads.txt
view-source:https://parleymap.com/

Expected source markers:

adsbygoogle
google-adsense-account
pagead2.googlesyndication.com
data-ad-slot

Key reports:

data/diagnostics/data-integrity-repair-report.json
data/diagnostics/final-hard-audit-report.json
data/diagnostics/adsense-legal-repair-report.json
data/diagnostics/adsense-preserve-audit-report.json
data/diagnostics/LATEST_RUN_SUMMARY.md
