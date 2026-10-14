const AD_SELECTOR = "#movie_player.ad-showing, .html5-video-player.ad-showing";
const PROMOTIONAL_SELECTORS = [
  "ytd-ad-slot-renderer",
  "ytd-promoted-video-renderer",
  "ytd-display-ad-renderer",
  "ytd-companion-slot-renderer",
  "ytd-in-feed-ad-layout-renderer",
  ".ytd-action-companion-ad-renderer",
  ".ytd-player-legacy-desktop-watch-ads-renderer"
];

let lastDetectedState;
let pendingCheck;
let protectionEnabled = true;

function applyProtectionState(enabled) {
  protectionEnabled = enabled;
  document.documentElement.classList.toggle("yag-protection-enabled", enabled);
  if (enabled) {
    hidePromotionalElements();
  }
}

function hidePromotionalElements() {
  if (!protectionEnabled) {
    return;
  }
  const elements = document.querySelectorAll(PROMOTIONAL_SELECTORS.join(","));
  let newlyHidden = 0;

  for (const element of elements) {
    if (!element.dataset.yagHidden) {
      element.dataset.yagHidden = "true";
      newlyHidden += 1;
    }
  }

  if (newlyHidden > 0) {
    chrome.storage.local.get({ hiddenElementCount: 0 }, ({ hiddenElementCount }) => {
      chrome.storage.local.set({ hiddenElementCount: hiddenElementCount + newlyHidden });
    });
  }
}

function checkForAdIndicator() {
  pendingCheck = undefined;
  const adIndicatorDetected = Boolean(document.querySelector(AD_SELECTOR));

  if (adIndicatorDetected === lastDetectedState) {
    hidePromotionalElements();
    return;
  }

  lastDetectedState = adIndicatorDetected;
  chrome.storage.local.get({ adIndicatorCount: 0 }, ({ adIndicatorCount }) => {
    chrome.storage.local.set({
      lastAdIndicatorDetected: adIndicatorDetected,
      lastAdIndicatorCheckedAt: Date.now(),
      adIndicatorCount: adIndicatorDetected ? adIndicatorCount + 1 : adIndicatorCount
    });
  });
  hidePromotionalElements();
}

function scheduleCheck() {
  if (!pendingCheck) {
    pendingCheck = window.setTimeout(checkForAdIndicator, 150);
  }
}

new MutationObserver(scheduleCheck).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class"]
});

const style = document.createElement("style");
style.textContent = PROMOTIONAL_SELECTORS.map((selector) =>
  `html.yag-protection-enabled ${selector}`
).join(",") + " { display: none !important; }";
(document.head || document.documentElement).append(style);

chrome.storage.local.get({ protectionEnabled: true }, ({ protectionEnabled: enabled }) => {
  applyProtectionState(enabled);
  scheduleCheck();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.protectionEnabled) {
    applyProtectionState(changes.protectionEnabled.newValue);
  }
});

scheduleCheck();
