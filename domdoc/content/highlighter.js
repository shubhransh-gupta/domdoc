/**
 * DOMDoc: Page Audit — on-page issue highlighter.
 * Exposes window.__domDocHighlight and window.__domDocClearHighlights.
 */
(() => {
  'use strict';

  const OVERLAY_CLASS = 'domdoc-highlight-overlay';
  const BADGE_ID = 'domdoc-highlight-badge';
  const STYLE_ID = 'domdoc-highlight-styles';
  const AUDIT_ID_ATTR = 'data-domdoc-id';

  /** @type {HTMLElement[]} */
  let activeOverlays = [];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${OVERLAY_CLASS} {
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        box-sizing: border-box;
        border: 2px solid #f97316;
        border-radius: 4px;
        background: rgba(249, 115, 22, 0.12);
        box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.25), 0 4px 16px rgba(249, 115, 22, 0.2);
        animation: domdoc-pulse 1.6s ease-in-out infinite;
        transition: top 0.1s, left 0.1s, width 0.1s, height 0.1s;
      }

      @keyframes domdoc-pulse {
        0%, 100% {
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.35), 0 4px 16px rgba(249, 115, 22, 0.15);
          background: rgba(249, 115, 22, 0.10);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.2), 0 4px 24px rgba(249, 115, 22, 0.35);
          background: rgba(249, 115, 22, 0.18);
        }
      }

      #${BADGE_ID} {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: min(90vw, 560px);
        padding: 12px 16px;
        background: #1c1917;
        color: #fafaf9;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        border-radius: 10px;
        border: 1px solid #f97316;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(249, 115, 22, 0.3);
        animation: domdoc-badge-in 0.25s ease-out;
      }

      @keyframes domdoc-badge-in {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      #${BADGE_ID} .domdoc-badge-icon {
        flex-shrink: 0;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #f97316;
        animation: domdoc-pulse-dot 1.6s ease-in-out infinite;
      }

      @keyframes domdoc-pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.3); }
      }

      #${BADGE_ID} .domdoc-badge-message {
        flex: 1;
        min-width: 0;
        word-break: break-word;
      }

      #${BADGE_ID} .domdoc-badge-dismiss {
        flex-shrink: 0;
        appearance: none;
        border: none;
        background: rgba(249, 115, 22, 0.2);
        color: #fdba74;
        font-size: 13px;
        font-weight: 600;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }

      #${BADGE_ID} .domdoc-badge-dismiss:hover {
        background: #f97316;
        color: #1c1917;
      }

      #${BADGE_ID} .domdoc-badge-dismiss:focus-visible {
        outline: 2px solid #fdba74;
        outline-offset: 2px;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /** @param {Element} el */
  function getElementRect(el) {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  /** @param {HTMLElement} overlay @param {Element} target */
  function positionOverlay(overlay, target) {
    const { top, left, width, height } = getElementRect(target);
    overlay.style.top = `${Math.max(0, top)}px`;
    overlay.style.left = `${Math.max(0, left)}px`;
    overlay.style.width = `${Math.max(0, width)}px`;
    overlay.style.height = `${Math.max(0, height)}px`;
  }

  /** @param {Element} target */
  function createOverlay(target) {
    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-hidden', 'true');
    positionOverlay(overlay, target);
    document.body.appendChild(overlay);
    return overlay;
  }

  function removeBadge() {
    const existing = document.getElementById(BADGE_ID);
    if (existing) existing.remove();
  }

  /** @param {string} message */
  function showBadge(message) {
    removeBadge();
    injectStyles();

    const badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');

    const icon = document.createElement('span');
    icon.className = 'domdoc-badge-icon';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'domdoc-badge-message';
    text.textContent = message || 'Highlighted audit issue on page';

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'domdoc-badge-dismiss';
    dismiss.textContent = 'Dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss audit highlight');
    dismiss.addEventListener('click', () => {
      window.__domDocClearHighlights();
    });

    badge.appendChild(icon);
    badge.appendChild(text);
    badge.appendChild(dismiss);
    document.body.appendChild(badge);
  }

  /** @param {string|string[]} targetIds @param {string} [message] */
  function highlight(targetIds, message) {
    clearHighlights();
    injectStyles();

    const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
    const validIds = ids.filter(Boolean).map(String);

    if (validIds.length === 0) {
      if (message) showBadge(message);
      return { highlighted: 0, missing: validIds.length };
    }

    /** @type {Element[]} */
    const targets = [];

    for (const id of validIds) {
      const el = document.querySelector(`[${AUDIT_ID_ATTR}="${CSS.escape(id)}"]`);
      if (el) {
        targets.push(el);
        const overlay = createOverlay(el);
        activeOverlays.push(overlay);
      }
    }

    if (targets.length > 0) {
      targets[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    if (message || targets.length > 0) {
      showBadge(
        message ||
          (targets.length === 1
            ? '1 element highlighted'
            : `${targets.length} elements highlighted`)
      );
    }

    const reposition = () => {
      activeOverlays.forEach((overlay, index) => {
        if (targets[index]) positionOverlay(overlay, targets[index]);
      });
    };

    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    highlight._cleanup = () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };

    return {
      highlighted: targets.length,
      missing: validIds.length - targets.length,
    };
  }

  function clearHighlights() {
    if (typeof highlight._cleanup === 'function') {
      highlight._cleanup();
      highlight._cleanup = null;
    }

    for (const overlay of activeOverlays) {
      overlay.remove();
    }
    activeOverlays = [];
    removeBadge();
  }

  window.__domDocHighlight = highlight;
  window.__domDocClearHighlights = clearHighlights;
})();
