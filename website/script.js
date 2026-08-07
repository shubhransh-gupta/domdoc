(function () {
  "use strict";

  const CHROME_STORE_URL = "";
  const storeBtn = document.getElementById("store-btn");

  if (CHROME_STORE_URL && storeBtn) {
    storeBtn.href = CHROME_STORE_URL;
    storeBtn.classList.remove("disabled");
    storeBtn.textContent = "Install from Chrome Web Store";
  }
})();
