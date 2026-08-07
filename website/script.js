(function () {
  "use strict";

  const CHROME_STORE_URL = "";

  const storeBtn = document.getElementById("store-btn");
  const storeStatus = document.getElementById("store-status");
  const storeCard = document.getElementById("store-card");

  if (CHROME_STORE_URL && storeBtn) {
    storeBtn.href = CHROME_STORE_URL;
    storeBtn.classList.remove("disabled");
    storeBtn.removeAttribute("aria-disabled");
    storeBtn.textContent = "Install from Chrome Web Store";

    const badge = storeCard?.querySelector(".install-badge-soon");
    if (badge) {
      badge.textContent = "Recommended";
      badge.classList.remove("install-badge-soon");
      badge.classList.add("install-badge");
    }

    if (storeStatus) {
      storeStatus.textContent = "One-click install with automatic updates.";
    }
  }

  document.querySelectorAll(".bar i").forEach((bar) => {
    const width = bar.style.width;
    bar.style.width = "0";
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => {
              bar.style.transition = "width 1s ease";
              bar.style.width = width;
            });
            observer.unobserve(bar);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(bar);
  });
})();
