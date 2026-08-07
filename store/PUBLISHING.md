# Chrome Web Store Publishing Guide

Follow these steps to publish **DOMDoc: Page Audit** on the Chrome Web Store.

## Prerequisites

1. **Google account**
2. **Chrome Web Store Developer account** — [Register here](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
3. **Privacy policy URL:**
   ```
   https://shubhransh-gupta.github.io/domdoc/privacy.html
   ```

---

## Step 1: Enable GitHub Pages

1. Go to https://github.com/shubhransh-gupta/domdoc/settings/pages
2. Under **Source**, select **GitHub Actions**
3. Site URL: **https://shubhransh-gupta.github.io/domdoc/**

---

## Step 2: Build the store ZIP

```bash
./scripts/build-store-zip.sh
```

Creates `dist/domdoc-v1.3.0.zip` — upload to the Chrome Web Store.

---

## Step 3: Upload to Chrome Web Store

1. Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New Item**
3. Upload the ZIP from `dist/`
4. Fill listing copy from `store/LISTING.md`

See `store/LISTING.md` for all copy-paste text for the dashboard.
