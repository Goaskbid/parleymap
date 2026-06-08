ParleyMap canonical truth fix

This package changes the architecture of the repair process.

It no longer assumes that patching one row in index.html is enough.
It locates the best valid dataset from:
- current index.html demo-data
- current data/demo.json
- git history of index.html and data/demo.json

Then it chooses a valid full app shell from current index.html or git history.
It repairs the canonical dataset, writes it to both index.html demo-data and data/demo.json, and runs hard audits before commit.

Core guarantees:
- No blind data/demo.json injection into index.html.
- No synthetic watch cards as dated events.
- No mass automatic people replacement.
- Rafael Grossi is anchored to Vienna / AT and duplicate helper copies are hidden or removed.
- Pope Leo XIV is anchored to Vatican City / VA.
- Claudia Sheinbaum is anchored to Mexico City / MX.
- Prabowo Subianto is anchored to Jakarta / ID.
- Existing recoverable AdSense IDs are preserved.
- ads.txt is generated only from a recovered real publisher ID.
- Legal pages are replaced with clean human pages.

First run:
Actions > ParleyMap data validation > Run workflow

After run:
- Wait for pages-build-deployment.
- Hard refresh the site.
- Check data/diagnostics/LATEST_RUN_SUMMARY.md.
