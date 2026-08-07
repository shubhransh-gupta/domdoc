# DomDoc: Page Audit

**DomDoc** is a browser extension that instantly audits any webpage for **Performance**, **Accessibility**, **SEO**, and **UX** issues — one-click Lighthouse for developers.

🌐 **Website:** https://shubhransh-gupta.github.io/domdoc/

No npm install required.

## Install options

| Method | Best for |
|---|---|
| [Download ZIP](https://github.com/shubhransh-gupta/domdoc/archive/refs/heads/main.zip) | Quickest — no git needed |
| Load unpacked | After extracting ZIP or cloning repo |
| Chrome Web Store | Coming soon — one-click install |
| Microsoft Edge | Same folder via `edge://extensions` |

### Download ZIP (easiest)

1. [Download ZIP](https://github.com/shubhransh-gupta/domdoc/archive/refs/heads/main.zip)
2. Unzip → open the inner `domdoc` folder
3. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked**
4. Select that `domdoc` folder

### Load unpacked (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions` for Edge)
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `domdoc` folder (must contain `manifest.json`)
5. Visit any website → click the extension → **Test This Page**

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
domdoc/
├── manifest.json
├── background.js
├── lib/axe.min.js
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
