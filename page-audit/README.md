# Page Audit — One-Click Lighthouse

A Chrome extension that instantly audits any webpage for **Performance**, **Accessibility**, **SEO**, and **UX** issues.

🌐 **Website:** https://shubhransh-gupta.github.io/page-audit/

No npm install required.

## Install options

| Method | Best for |
|---|---|
| [Download ZIP](https://github.com/shubhransh-gupta/page-audit/archive/refs/heads/main.zip) | Quickest — no git needed |
| Load unpacked | After extracting ZIP or cloning repo |
| Chrome Web Store | Coming soon — one-click install |
| Microsoft Edge | Same folder via `edge://extensions` |

### Download ZIP (easiest)

1. [Download ZIP](https://github.com/shubhransh-gupta/page-audit/archive/refs/heads/main.zip)
2. Unzip → open the inner `page-audit` folder
3. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked**
4. Select that `page-audit` folder

### Load unpacked (Chrome / Edge / Brave)

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
