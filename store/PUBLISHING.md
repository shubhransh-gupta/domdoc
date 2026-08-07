# Chrome Web Store Publishing Guide

Follow these steps to publish **Page Audit** on the Chrome Web Store.

## Prerequisites

1. **Google account**
2. **Chrome Web Store Developer account** — [Register here](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
3. **Privacy policy URL** — hosted at:
   ```
   https://shubhransh-gupta.github.io/page-audit/privacy.html
   ```

---

## Step 1: Enable GitHub Pages

1. Go to https://github.com/shubhransh-gupta/page-audit/settings/pages
2. Under **Source**, select **GitHub Actions**
3. After pushing, the workflow deploys `website/` automatically
4. Site URL: **https://shubhransh-gupta.github.io/page-audit/**

After Chrome Web Store approval, update `website/script.js`:
```javascript
const CHROME_STORE_URL = "https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID";
```

---

## Step 2: Build the store ZIP

```bash
./scripts/build-store-zip.sh
```

Creates `dist/page-audit-v1.2.0.zip` — upload to the Chrome Web Store.

---

## Step 3: Upload to Chrome Web Store

1. Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New Item**
3. Upload the ZIP from `dist/`
4. Fill listing copy from `store/LISTING.md`

### Required assets

| Asset | Size |
|---|---|
| Icon | 128×128 (included) |
| Screenshots | 1280×800 — screenshot the popup on a real site |

---

## Step 4: Submit for review

Review takes 1–3 business days. Once approved, add the store URL to `website/script.js` and push.

See `store/LISTING.md` for all copy-paste text for the dashboard.
