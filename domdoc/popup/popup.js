const CATEGORIES = [
  { key: "performance", label: "Performance" },
  { key: "accessibility", label: "Accessibility" },
  { key: "seo", label: "SEO" },
  { key: "ux", label: "UX" },
];

const ISSUE_ICONS = {
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const states = {
  idle: document.getElementById("state-idle"),
  loading: document.getElementById("state-loading"),
  error: document.getElementById("state-error"),
  results: document.getElementById("state-results"),
};

let currentTabId = null;
let currentIssues = [];

function showState(name) {
  Object.entries(states).forEach(([key, el]) => {
    el.classList.toggle("hidden", key !== name);
  });
}

function scoreClass(score) {
  if (score >= 80) return "good";
  if (score >= 50) return "ok";
  return "poor";
}

function scoreGrade(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs Work";
  if (score >= 40) return "Poor";
  return "Critical";
}

function scoreColor(score) {
  if (score >= 80) return "var(--green)";
  if (score >= 50) return "var(--yellow)";
  return "var(--red)";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function normalizeAudit(data) {
  return {
    ...data,
    overall: data.overall ?? data.overallScore ?? 0,
    issueCount: data.issueCount ?? {
      highlightable: data.summary?.highlightable ?? 0,
    },
    categories: Object.fromEntries(
      Object.entries(data.categories || {}).map(([key, cat]) => [
        key,
        {
          ...cat,
          axeViolationCount:
            cat.axeViolationCount ??
            cat.issues?.filter((issue) => issue.source === "axe").length ??
            0,
        },
      ])
    ),
  };
}

function renderResults(rawData) {
  const data = normalizeAudit(rawData);
  const overallEl = document.getElementById("overall-number");
  const gradeEl = document.getElementById("overall-grade");
  const ringEl = document.querySelector(".overall-ring");

  overallEl.textContent = data.overall;
  gradeEl.textContent = scoreGrade(data.overall);
  ringEl.style.borderColor = scoreColor(data.overall);

  const scoresEl = document.getElementById("scores");
  scoresEl.innerHTML = CATEGORIES.map(({ key, label }) => {
    const cat = data.categories[key];
    const cls = scoreClass(cat.score);
    const axeNote =
      key === "accessibility" && cat.axeViolationCount
        ? `<span class="axe-badge">${cat.axeViolationCount} axe</span>`
        : "";
    return `
      <div class="score-row">
        <div class="score-header">
          <span class="score-label">${label}${axeNote}</span>
          <span class="score-value" style="color: ${scoreColor(cat.score)}">${cat.score}</span>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill ${cls}" style="width: ${cat.score}%"></div>
        </div>
      </div>
    `;
  }).join("");

  const issuesList = document.getElementById("issues-list");
  const issueCount = document.getElementById("issue-count");
  const issuesHint = document.getElementById("issues-hint");

  issueCount.textContent = data.issues.length;
  const highlightable = data.issueCount?.highlightable || 0;
  issuesHint.textContent =
    highlightable > 0
      ? `Click an issue to highlight it on the page (${highlightable} locatable)`
      : "No element-level issues to highlight";

  if (data.issues.length === 0) {
    issuesList.innerHTML = `<li class="no-issues">✓ No issues found — great job!</li>`;
    currentIssues = [];
  } else {
    const sorted = [...data.issues].sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      if (a.highlightable !== b.highlightable) return a.highlightable ? -1 : 1;
      return 0;
    });

    issuesList.innerHTML = sorted
      .map((issue, index) => {
        const sourceBadge = issue.source === "axe" ? '<span class="source-badge">axe</span>' : "";
        const clickable = issue.highlightable ? "clickable" : "";
        const hint = issue.highlightable ? '<span class="issue-locate">Click to locate →</span>' : "";

        return `
          <li class="issue-item ${clickable}" data-index="${index}">
            <span class="issue-icon ${issue.type}">${ISSUE_ICONS[issue.type]}</span>
            <div class="issue-text">
              ${escapeHtml(issue.message)}
              <span class="issue-category">${issue.category}${sourceBadge}</span>
              ${hint}
            </div>
          </li>
        `;
      })
      .join("");

    currentIssues = sorted;

    issuesList.querySelectorAll(".issue-item.clickable").forEach((item) => {
      item.addEventListener("click", () => highlightIssue(item));
    });
  }

  showState("results");
}

async function highlightIssue(item) {
  if (!currentTabId) return;

  const issue = currentIssues[Number(item.dataset.index)];
  if (!issue?.highlightable) return;

  const targets = issue.targets;
  const message = issue.message;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      files: ["content/highlighter.js"],
    });

    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: (ids, msg) => {
        if (typeof window.__domDocHighlight === "function") {
          return window.__domDocHighlight(ids, msg);
        }
      },
      args: [targets, message],
    });

    window.close();
  } catch (err) {
    console.error("Highlight failed:", err);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runAudit() {
  showState("loading");

  try {
    const tab = await getActiveTab();
    currentTabId = tab?.id ?? null;

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const restricted = ["chrome:", "chrome-extension:", "edge:", "about:", "devtools:"];
    if (restricted.some((p) => tab.url?.startsWith(p))) {
      throw new Error("Cannot audit browser internal pages. Navigate to a regular website first.");
    }

    document.getElementById("page-url").textContent = tab.url || "—";
    document.getElementById("page-url").title = tab.url || "";

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/axe.min.js", "content/analyzer.js"],
    });

    if (!result?.result) {
      throw new Error("Audit returned no data. The page may have blocked script injection.");
    }

    renderResults(result.result);
  } catch (err) {
    document.getElementById("error-message").textContent =
      err.message || "Something went wrong while auditing this page.";
    showState("error");
  }
}

document.getElementById("btn-audit").addEventListener("click", runAudit);
document.getElementById("btn-retry").addEventListener("click", runAudit);
document.getElementById("btn-rerun").addEventListener("click", runAudit);

(async () => {
  try {
    const tab = await getActiveTab();
    currentTabId = tab?.id ?? null;
    if (tab?.url) {
      document.getElementById("page-url").textContent = tab.url;
      document.getElementById("page-url").title = tab.url;
    }
  } catch {
    // ignore
  }
})();
