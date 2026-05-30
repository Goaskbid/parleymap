# ParleyMap GitHub Pages hotfix

This hotfix fixes the blank GitHub Pages site by replacing the root `index.html` with the real ParleyMap v3.7.0 standalone build.

Upload these files to the repository root on the `main` branch:

- `index.html`
- `.nojekyll`
- `CNAME`

The current public repository showed `index.html` as 0 bytes, which makes the custom domain render a blank page.

After upload:

1. Wait for the GitHub Pages build to finish.
2. Visit `http://parleymap.com/` first.
3. When GitHub has issued the certificate, enable **Enforce HTTPS** in Settings → Pages.
4. Then use `https://parleymap.com/`.
