(function () {
  "use strict";

  // Chrome Web Store URL — update after publishing
  const CHROME_STORE_URL = ""; // e.g. "https://chrome.google.com/webstore/detail/page-audit/EXTENSION_ID"

  const storeBtns = [document.getElementById("store-btn"), document.getElementById("store-btn-2")];
  const storeNote = document.getElementById("store-note");

  function setupStoreButtons() {
    storeBtns.forEach((btn) => {
      if (!btn) return;

      if (CHROME_STORE_URL) {
        btn.href = CHROME_STORE_URL;
        btn.target = "_blank";
        btn.rel = "noopener";
        if (storeNote) {
          storeNote.innerHTML = "Available on the Chrome Web Store. <a href='" + CHROME_STORE_URL + "'>Install now</a>";
        }
      } else {
        btn.href = "https://github.com/shubhransh-gupta/page-audit#quick-start";
        btn.title = "Chrome Web Store coming soon — install via GitHub for now";
      }
    });
  }

  // Animated coin counter
  function animateCoins() {
    const el = document.getElementById("coin-count");
    if (!el) return;

    let count = 0;
    const target = 999999;
    const duration = 8000;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      count = Math.floor(progress * target);
      el.textContent = String(count).padStart(6, "0");
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // Spawn floating coins on click
  function spawnCoin(x, y) {
    const coin = document.createElement("div");
    coin.textContent = "🪙";
    coin.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      font-size: 20px;
      pointer-events: none;
      z-index: 10000;
      animation: coin-float 1s ease-out forwards;
    `;
    document.body.appendChild(coin);
    setTimeout(() => coin.remove(), 1000);
  }

  const coinStyle = document.createElement("style");
  coinStyle.textContent = `
    @keyframes coin-float {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-80px) scale(0.5); opacity: 0; }
    }
  `;
  document.head.appendChild(coinStyle);

  document.addEventListener("click", (e) => {
    if (e.target.closest(".btn")) {
      spawnCoin(e.clientX, e.clientY);
    }
  });

  // Animate score bars on scroll into view
  function animateScores() {
    const fills = document.querySelectorAll(".score-fill");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const width = entry.target.style.width;
            entry.target.style.width = "0";
            requestAnimationFrame(() => {
              entry.target.style.width = width;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    fills.forEach((fill) => observer.observe(fill));
  }

  // Question block hit effect
  document.querySelectorAll(".question-block").forEach((block) => {
    block.addEventListener("click", () => {
      block.style.transform = "translateY(-8px) scale(1.02)";
      setTimeout(() => {
        block.style.transform = "";
      }, 150);
    });
  });

  // Arcade button press sound effect (visual only — no audio to avoid annoyance)
  document.querySelectorAll(".arcade-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.style.transform = "translateY(4px)";
      btn.style.boxShadow = "none";
      setTimeout(() => {
        btn.style.transform = "";
        btn.style.boxShadow = "";
      }, 100);
    });
  });

  setupStoreButtons();
  animateCoins();
  animateScores();
})();
