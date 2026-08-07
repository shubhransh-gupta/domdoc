# Page Audit — One-Click Lighthouse

A Chrome extension that instantly audits any webpage for **Performance**, **Accessibility**, **SEO**, and **UX** issues.

🕹️ **Marketing site:** https://shubhransh-gupta.github.io/page-audit/

No npm install required. Load the folder directly in Chrome via **Load unpacked**.

## Quick start

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `page-audit` folder
5. Visit any website and click the extension icon → **Test This Page**

## Chrome Web Store

Publishing guide: [store/PUBLISHING.md](../store/PUBLISHING.md)  
Listing copy: [store/LISTING.md](../store/LISTING.md)  
Build ZIP: `./scripts/build-store-zip.sh`

## Features

- One-click audit with category scores (Performance, Accessibility, SEO, UX)
- **axe-core** bundled locally for WCAG accessibility checks
- Click any issue to highlight the element on the page
- No build step, no npm, no server — runs entirely in the browser

## Requirements

- Google Chrome or Microsoft Edge (Chromium)
- No Node.js or npm needed

All dependencies (`axe-core`) are pre-bundled in `lib/axe.min.js`.

## Project structure

```
page-audit/
├── manifest.json
├── background.js
├── lib/axe.min.js          # pre-bundled, no npm needed
├── content/
│   ├── analyzer.js
│   └── highlighter.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/
```

## License

MIT
