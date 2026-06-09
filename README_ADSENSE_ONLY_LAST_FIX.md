# ParleyMap AdSense-only last fix

This package intentionally fixes only AdSense and public review pages.

It does not touch demo-data, people, events, Grossi, Pope, roster, crawler output, or map anchors.

## Install

Upload `data-validate.yml` directly into:

`.github/workflows/data-validate.yml`

It must replace the existing workflow file.

Commit message:

`Replace data validation with AdSense repair`

Then run:

`Actions > ParleyMap data validation > Run workflow`

There are no input fields.

## What it does

- Recovers existing AdSense IDs from current files and git history.
- Refuses to inject fake IDs.
- Restores a full index.html from git history if the current file is thin.
- Adds `google-adsense-account` meta.
- Adds the AdSense loader in `<head>`.
- Adds two `adsbygoogle` units using the recovered two slot IDs.
- Creates `ads.txt` from the recovered publisher ID.
- Replaces broken privacy and impressum pages with clean pages.
- Adds about, contact, methodology and data-sources pages.
- Writes `data/diagnostics/adsense-only-repair-report.json`.
- Commits only if the AdSense audit passes.

## Success report

Open:

`data/diagnostics/adsense-only-repair-report.json`

You want:

`status: adsense_repair_applied`

The report names:

- client
- publisherId
- headerSlot
- sidebarSlot

## Public checks after deployment

Open:

`https://parleymap.com/ads.txt`

It should show one plain text line.

Open source:

`view-source:https://parleymap.com/`

Search for:

- google-adsense-account
- pagead2.googlesyndication.com
- adsbygoogle
- data-ad-slot
