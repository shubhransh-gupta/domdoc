/**
 * Page Audit — content-script audit engine.
 * Async IIFE; call runAudit() to produce a full report.
 */
(async () => {
  'use strict';

  const AUDIT_ID_ATTR = 'data-page-audit-id';
  let nextElementId = 1;
  const idToElement = new Map();

  /** @returns {string} Stable audit id for an element. */
  function tagElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    let id = el.getAttribute(AUDIT_ID_ATTR);
    if (!id) {
      id = String(nextElementId++);
      el.setAttribute(AUDIT_ID_ATTR, id);
    }
    idToElement.set(id, el);
    return id;
  }

  /** @param {Element[]} elements */
  function tagElements(elements) {
    return elements
      .filter((el) => el && el.nodeType === Node.ELEMENT_NODE)
      .map((el) => tagElement(el))
      .filter(Boolean);
  }

  /**
   * @param {'error'|'warning'|'info'} type
   * @param {string} message
   * @param {'performance'|'accessibility'|'seo'|'ux'} category
   * @param {Element[]} [elements]
   * @param {Record<string, unknown>} [extra]
   */
  function createIssue(type, message, category, elements = [], extra = {}) {
    const tagged = tagElements(elements);
    const highlightable = tagged.length > 0;
    return {
      type,
      message,
      category,
      targets: tagged,
      highlightable,
      ...extra,
    };
  }

  // ── Performance heuristics ──────────────────────────────────────────────

  function auditPerformance() {
    const issues = [];

    const scripts = [...document.querySelectorAll('script[src]')];
    const blockingScripts = scripts.filter((s) => !s.async && !s.defer && !s.type?.includes('module'));
    if (blockingScripts.length > 3) {
      issues.push(
        createIssue(
          'warning',
          `${blockingScripts.length} render-blocking scripts detected (no async/defer). Consider deferring non-critical JS.`,
          'performance',
          blockingScripts.slice(0, 5),
          { count: blockingScripts.length }
        )
      );
    }

    const images = [...document.querySelectorAll('img')];
    const missingLazy = images.filter(
      (img) => !img.loading && !img.hasAttribute('loading') && img.getBoundingClientRect().top > window.innerHeight
    );
    if (missingLazy.length > 0) {
      issues.push(
        createIssue(
          'info',
          `${missingLazy.length} below-the-fold image(s) without loading="lazy".`,
          'performance',
          missingLazy.slice(0, 5),
          { count: missingLazy.length }
        )
      );
    }

    const oversizedImages = images.filter((img) => {
      const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0', 10);
      const h = img.naturalHeight || parseInt(img.getAttribute('height') || '0', 10);
      return w > 2000 || h > 2000;
    });
    if (oversizedImages.length > 0) {
      issues.push(
        createIssue(
          'warning',
          `${oversizedImages.length} very large image(s) may slow page load. Consider responsive sizes.`,
          'performance',
          oversizedImages.slice(0, 5),
          { count: oversizedImages.length }
        )
      );
    }

    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    if (stylesheets.length > 8) {
      issues.push(
        createIssue(
          'warning',
          `${stylesheets.length} external stylesheets detected. Bundling may improve load time.`,
          'performance',
          [...stylesheets].slice(0, 3),
          { count: stylesheets.length }
        )
      );
    }

    if (document.querySelectorAll('iframe').length > 5) {
      const iframes = [...document.querySelectorAll('iframe')].slice(0, 3);
      issues.push(
        createIssue(
          'info',
          'Many iframes increase memory and layout cost.',
          'performance',
          iframes
        )
      );
    }

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      if (nav.domContentLoadedEventEnd > 3000) {
        issues.push(
          createIssue(
            'warning',
            `DOMContentLoaded took ${Math.round(nav.domContentLoadedEventEnd)}ms (> 3s).`,
            'performance',
            [],
            { domContentLoaded: Math.round(nav.domContentLoadedEventEnd) }
          )
        );
      }
      if (nav.loadEventEnd > 5000) {
        issues.push(
          createIssue(
            'warning',
            `Full page load took ${Math.round(nav.loadEventEnd)}ms (> 5s).`,
            'performance',
            [],
            { loadTime: Math.round(nav.loadEventEnd) }
          )
        );
      }
    }

    const resources = performance.getEntriesByType('resource');
    const largeResources = resources.filter((r) => r.transferSize > 500_000);
    if (largeResources.length > 0) {
      issues.push(
        createIssue(
          'warning',
          `${largeResources.length} resource(s) exceed 500KB transfer size.`,
          'performance',
          [],
          {
            resources: largeResources.slice(0, 5).map((r) => ({
              name: r.name,
              size: r.transferSize,
            })),
          }
        )
      );
    }

    return issues;
  }

  // ── Accessibility heuristics ────────────────────────────────────────────

  function auditAccessibilityCustom() {
    const issues = [];

    const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')];
    if (imgsNoAlt.length > 0) {
      issues.push(
        createIssue(
          'error',
          `${imgsNoAlt.length} image(s) missing alt attribute.`,
          'accessibility',
          imgsNoAlt.slice(0, 8),
          { count: imgsNoAlt.length }
        )
      );
    }

    const imgsEmptyAlt = [...document.querySelectorAll('img[alt=""]')].filter(
      (img) => !img.getAttribute('role') && !img.getAttribute('aria-hidden')
    );
    if (imgsEmptyAlt.length > 0) {
      issues.push(
        createIssue(
          'warning',
          `${imgsEmptyAlt.length} image(s) have empty alt — ensure they are decorative or add descriptive text.`,
          'accessibility',
          imgsEmptyAlt.slice(0, 5),
          { count: imgsEmptyAlt.length }
        )
      );
    }

    const inputsNoLabel = [...document.querySelectorAll('input, select, textarea')].filter((input) => {
      const type = (input.getAttribute('type') || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return false;
      if (input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')) return false;
      if (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) return false;
      if (input.closest('label')) return false;
      return true;
    });
    if (inputsNoLabel.length > 0) {
      issues.push(
        createIssue(
          'error',
          `${inputsNoLabel.length} form field(s) lack an associated label.`,
          'accessibility',
          inputsNoLabel.slice(0, 8),
          { count: inputsNoLabel.length }
        )
      );
    }

    const buttonsNoName = [...document.querySelectorAll('button, [role="button"]')].filter((btn) => {
      const text = (btn.textContent || '').trim();
      const aria = btn.getAttribute('aria-label') || btn.getAttribute('title');
      return !text && !aria;
    });
    if (buttonsNoName.length > 0) {
      issues.push(
        createIssue(
          'error',
          `${buttonsNoName.length} button(s) have no accessible name.`,
          'accessibility',
          buttonsNoName.slice(0, 8),
          { count: buttonsNoName.length }
        )
      );
    }

    const linksNoText = [...document.querySelectorAll('a[href]')].filter((a) => {
      const text = (a.textContent || '').trim();
      const aria = a.getAttribute('aria-label') || a.getAttribute('title');
      const hasImgAlt = a.querySelector('img[alt]:not([alt=""])');
      return !text && !aria && !hasImgAlt;
    });
    if (linksNoText.length > 0) {
      issues.push(
        createIssue(
          'error',
          `${linksNoText.length} link(s) have no discernible text.`,
          'accessibility',
          linksNoText.slice(0, 8),
          { count: linksNoText.length }
        )
      );
    }

    const badContrastCandidates = [...document.querySelectorAll('*')].filter((el) => {
      if (el.children.length > 0) return false;
      const text = (el.textContent || '').trim();
      if (!text || text.length < 2) return false;
      const style = window.getComputedStyle(el);
      const fg = style.color;
      const bg = style.backgroundColor;
      if (!fg || !bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return false;
      const ratio = estimateContrastRatio(fg, bg);
      const fontSize = parseFloat(style.fontSize) || 16;
      const isLarge = fontSize >= 18 || (fontSize >= 14 && parseInt(style.fontWeight, 10) >= 700);
      const minRatio = isLarge ? 3 : 4.5;
      return ratio > 0 && ratio < minRatio;
    });
    if (badContrastCandidates.length > 0) {
      issues.push(
        createIssue(
          'warning',
          `${badContrastCandidates.length} text node(s) may have insufficient color contrast.`,
          'accessibility',
          badContrastCandidates.slice(0, 5),
          { count: badContrastCandidates.length }
        )
      );
    }

    const missingLang = !document.documentElement.getAttribute('lang');
    if (missingLang) {
      issues.push(
        createIssue(
          'error',
          '<html> element is missing a lang attribute.',
          'accessibility',
          [document.documentElement]
        )
      );
    }

    const skipLink = document.querySelector('a[href="#main"], a[href="#content"], .skip-link, [class*="skip"]');
    if (!skipLink) {
      issues.push(
        createIssue(
          'info',
          'No skip-to-content link detected.',
          'accessibility',
          []
        )
      );
    }

    const focusableNoOutline = [...document.querySelectorAll('a, button, input, select, textarea, [tabindex]')].filter(
      (el) => {
        const style = window.getComputedStyle(el);
        return style.outlineStyle === 'none' && style.outlineWidth === '0px' && !el.getAttribute('aria-hidden');
      }
    );
    if (focusableNoOutline.length > 5) {
      issues.push(
        createIssue(
          'warning',
          'Many focusable elements have outline removed — ensure visible focus indicators exist.',
          'accessibility',
          focusableNoOutline.slice(0, 5),
          { count: focusableNoOutline.length }
        )
      );
    }

    return issues;
  }

  /** Rough sRGB contrast estimate for heuristic checks. */
  function estimateContrastRatio(fg, bg) {
    const parse = (c) => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      const [r, g, b] = m.slice(1, 4).map(Number);
      const lin = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const l1 = parse(fg);
    const l2 = parse(bg);
    if (l1 == null || l2 == null) return -1;
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // ── axe-core integration ──────────────────────────────────────────────────

  async function runAxe() {
    if (typeof axe === 'undefined' || !axe.run) {
      return [];
    }

    try {
      const results = await axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'best-practice'],
        },
        elementRef: true,
      });

      return results.violations.map((violation) => {
        const elements = violation.nodes
          .map((node) => {
            if (node.element) return node.element;
            if (node.target && node.target.length) {
              try {
                return document.querySelector(node.target[0]);
              } catch {
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);

        const impactMap = { critical: 'error', serious: 'error', moderate: 'warning', minor: 'info' };
        const type = impactMap[violation.impact] || 'warning';
        const help = violation.help || violation.description || violation.id;

        return createIssue(type, help, 'accessibility', elements, {
          source: 'axe',
          axeId: violation.id,
          impact: violation.impact,
          helpUrl: violation.helpUrl,
          wcagTags: violation.tags?.filter((t) => t.startsWith('wcag')) || [],
        });
      });
    } catch (err) {
      return [
        createIssue('warning', `axe-core scan failed: ${err.message}`, 'accessibility', [], {
          source: 'axe',
          error: true,
        }),
      ];
    }
  }

  /** Merge custom accessibility checks with axe results, deduplicating by message + targets. */
  function mergeAccessibility(customIssues, axeIssues) {
    const merged = [...customIssues];
    const seen = new Set(
      customIssues.map((issue) => `${issue.message}|${issue.targets.sort().join(',')}`)
    );

    for (const axeIssue of axeIssues) {
      const key = `${axeIssue.message}|${axeIssue.targets.sort().join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(axeIssue);
      }
    }

    return merged;
  }

  // ── SEO heuristics ──────────────────────────────────────────────────────

  function auditSeo() {
    const issues = [];

    const title = document.querySelector('title');
    const titleText = title ? (title.textContent || '').trim() : '';
    if (!titleText) {
      issues.push(createIssue('error', 'Page is missing a <title> element.', 'seo', []));
    } else if (titleText.length < 10) {
      issues.push(createIssue('warning', 'Title is very short (< 10 characters).', 'seo', title ? [title] : []));
    } else if (titleText.length > 60) {
      issues.push(createIssue('warning', 'Title exceeds 60 characters and may be truncated in search results.', 'seo', title ? [title] : []));
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    const descContent = metaDesc ? (metaDesc.getAttribute('content') || '').trim() : '';
    if (!descContent) {
      issues.push(createIssue('error', 'Missing meta description.', 'seo', metaDesc ? [metaDesc] : []));
    } else if (descContent.length < 50) {
      issues.push(createIssue('warning', 'Meta description is short (< 50 characters).', 'seo', metaDesc ? [metaDesc] : []));
    } else if (descContent.length > 160) {
      issues.push(createIssue('warning', 'Meta description exceeds 160 characters.', 'seo', metaDesc ? [metaDesc] : []));
    }

    const h1s = [...document.querySelectorAll('h1')];
    if (h1s.length === 0) {
      issues.push(createIssue('error', 'Page has no H1 heading.', 'seo', []));
    } else if (h1s.length > 1) {
      issues.push(
        createIssue(
          'warning',
          `Page has ${h1s.length} H1 headings; one primary H1 is recommended.`,
          'seo',
          h1s.slice(0, 3),
          { count: h1s.length }
        )
      );
    }

    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    let lastLevel = 0;
    const skipped = [];
    for (const h of headings) {
      const level = parseInt(h.tagName.charAt(1), 10);
      if (lastLevel > 0 && level > lastLevel + 1) {
        skipped.push(h);
      }
      lastLevel = level;
    }
    if (skipped.length > 0) {
      issues.push(
        createIssue(
          'warning',
          'Heading levels skip (e.g. H2 → H4). Use sequential hierarchy.',
          'seo',
          skipped.slice(0, 5),
          { count: skipped.length }
        )
      );
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      issues.push(createIssue('info', 'No canonical link tag found.', 'seo', []));
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogTitle || !ogDesc) {
      issues.push(createIssue('info', 'Open Graph meta tags (og:title / og:description) are incomplete.', 'seo', []));
    }

    const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')];
    if (imgsNoAlt.length > 0) {
      issues.push(
        createIssue(
          'warning',
          `${imgsNoAlt.length} image(s) without alt text hurt SEO and accessibility.`,
          'seo',
          imgsNoAlt.slice(0, 5),
          { count: imgsNoAlt.length }
        )
      );
    }

    const noindex = document.querySelector('meta[name="robots"][content*="noindex"]');
    if (noindex) {
      issues.push(
        createIssue(
          'warning',
          'Page is marked noindex — it will not appear in search results.',
          'seo',
          [noindex]
        )
      );
    }

    return issues;
  }

  // ── UX heuristics ───────────────────────────────────────────────────────

  function auditUx() {
    const issues = [];

    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      issues.push(createIssue('error', 'Missing viewport meta tag — page may not be mobile-friendly.', 'ux', []));
    }

    const smallTapTargets = [...document.querySelectorAll('a, button, input, [role="button"]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    });
    if (smallTapTargets.length > 0) {
      issues.push(
        createIssue(
          'warning',
          `${smallTapTargets.length} interactive element(s) are smaller than 44×44px (recommended tap target).`,
          'ux',
          smallTapTargets.slice(0, 8),
          { count: smallTapTargets.length }
        )
      );
    }

    const fixedElements = [...document.querySelectorAll('*')].filter((el) => {
      const pos = window.getComputedStyle(el).position;
      return pos === 'fixed' || pos === 'sticky';
    });
    if (fixedElements.length > 6) {
      issues.push(
        createIssue(
          'info',
          `${fixedElements.length} fixed/sticky elements may obstruct content on small screens.`,
          'ux',
          fixedElements.slice(0, 3),
          { count: fixedElements.length }
        )
      );
    }

    const textInputsNoAutocomplete = [...document.querySelectorAll('input[type="email"], input[type="password"], input[name*="email"], input[name*="password"]')].filter(
      (input) => !input.getAttribute('autocomplete')
    );
    if (textInputsNoAutocomplete.length > 0) {
      issues.push(
        createIssue(
          'info',
          `${textInputsNoAutocomplete.length} credential/email field(s) lack autocomplete attribute.`,
          'ux',
          textInputsNoAutocomplete.slice(0, 5),
          { count: textInputsNoAutocomplete.length }
        )
      );
    }

    const linksNewTab = [...document.querySelectorAll('a[target="_blank"]')].filter(
      (a) => !a.getAttribute('rel')?.includes('noopener')
    );
    if (linksNewTab.length > 0) {
      issues.push(
        createIssue(
          'warning',
          `${linksNewTab.length} link(s) open in a new tab without rel="noopener" (security/UX).`,
          'ux',
          linksNewTab.slice(0, 5),
          { count: linksNewTab.length }
        )
      );
    }

    const fontSizeSmall = [...document.querySelectorAll('p, span, li, td, label, a')].filter((el) => {
      const size = parseFloat(window.getComputedStyle(el).fontSize) || 16;
      const text = (el.textContent || '').trim();
      return text.length > 10 && size < 12;
    });
    if (fontSizeSmall.length > 3) {
      issues.push(
        createIssue(
          'warning',
          'Multiple text elements use font-size below 12px — may be hard to read.',
          'ux',
          fontSizeSmall.slice(0, 5),
          { count: fontSizeSmall.length }
        )
      );
    }

    const modals = document.querySelectorAll('[role="dialog"], dialog, .modal');
    for (const modal of modals) {
      const visible = modal.offsetParent !== null || window.getComputedStyle(modal).display !== 'none';
      if (visible) {
        const hasClose = modal.querySelector('[aria-label*="close" i], [aria-label*="dismiss" i], button.close, .close-button');
        if (!hasClose) {
          issues.push(
            createIssue(
              'warning',
              'Visible dialog/modal lacks an obvious close control.',
              'ux',
              [modal]
            )
          );
        }
      }
    }

    return issues;
  }

  // ── Scoring ───────────────────────────────────────────────────────────────

  function scoreCategory(issues) {
    let score = 100;
    for (const issue of issues) {
      if (issue.type === 'error') score -= 12;
      else if (issue.type === 'warning') score -= 5;
      else if (issue.type === 'info') score -= 2;
    }
    return Math.max(0, Math.min(100, score));
  }

  function buildCategorySummary(name, issues) {
    const errors = issues.filter((i) => i.type === 'error').length;
    const warnings = issues.filter((i) => i.type === 'warning').length;
    const infos = issues.filter((i) => i.type === 'info').length;
    return {
      name,
      score: scoreCategory(issues),
      issueCount: issues.length,
      errors,
      warnings,
      infos,
      issues,
    };
  }

  // ── Main audit runner ─────────────────────────────────────────────────────

  async function runAudit() {
    const performanceIssues = auditPerformance();
    const customA11yIssues = auditAccessibilityCustom();
    const axeIssues = await runAxe();
    const accessibilityIssues = mergeAccessibility(customA11yIssues, axeIssues);
    const seoIssues = auditSeo();
    const uxIssues = auditUx();

    const categories = {
      performance: buildCategorySummary('performance', performanceIssues),
      accessibility: buildCategorySummary('accessibility', accessibilityIssues),
      seo: buildCategorySummary('seo', seoIssues),
      ux: buildCategorySummary('ux', uxIssues),
    };

    const allIssues = [
      ...performanceIssues,
      ...accessibilityIssues,
      ...seoIssues,
      ...uxIssues,
    ];

    const weights = { performance: 0.25, accessibility: 0.3, seo: 0.25, ux: 0.2 };
    const overallScore = Math.round(
      Object.entries(weights).reduce((sum, [key, weight]) => sum + categories[key].score * weight, 0)
    );

    return {
      url: location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      overallScore,
      categories,
      issues: allIssues,
      summary: {
        total: allIssues.length,
        errors: allIssues.filter((i) => i.type === 'error').length,
        warnings: allIssues.filter((i) => i.type === 'warning').length,
        infos: allIssues.filter((i) => i.type === 'info').length,
        highlightable: allIssues.filter((i) => i.highlightable).length,
      },
      elementRegistry: Object.fromEntries(idToElement.entries()),
    };
  }

  window.__pageAuditRun = runAudit;
  return runAudit();
})();
