# ParleyMap AdSense rescue context

The current issue is that the site visually shows ad windows but crawler-visible AdSense signals are missing. The online checks reported zero `adsbygoogle`, zero `ca-pub`, zero `data-ad-slot`, zero `google-adsense-account`, and no valid root `ads.txt`.

The safest fix is AdSense-only. Do not combine this with data repair.

Use `data-validate.yml` from this package to replace `.github/workflows/data-validate.yml`. The workflow is self-contained and writes its own Node repair script.

The workflow recovers real AdSense IDs from current files and git history. It refuses fake IDs.

It repairs:
- index.html AdSense meta, loader, units
- ads.txt
- privacy.html
- impressum.html
- about.html
- contact.html
- methodology.html
- data-sources.html

It does not touch ParleyMap demo-data or map records.
