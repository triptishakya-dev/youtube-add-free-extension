// YouTube changes its component names regularly. Keep the stable selectors small,
// then use surrounding attributes as a fallback for newer components.
const PLAYER_AD_SELECTOR = "#movie_player.ad-showing, .html5-video-player.ad-showing, #movie_player[class*='ad-showing']";
const PROMOTIONAL_SELECTORS = [
  "ytd-ad-slot-renderer", "ytd-promoted-video-renderer", "ytd-display-ad-renderer",
  "ytd-companion-slot-renderer", "ytd-in-feed-ad-layout-renderer", "ytd-banner-promo-renderer",
  "ytd-engagement-panel-section-list-renderer[target-id*='ads']",
  ".ytd-action-companion-ad-renderer", ".ytd-player-legacy-desktop-watch-ads-renderer",
  "[data-ad-impressions]", "[data-ad-slot]"
];
const SKIP_BUTTON_SELECTOR = [
  ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern", ".ytp-ad-skip-button-slot button",
  "button[aria-label*='Skip ad' i]", "button[aria-label*='Skip Ads' i]"
].join(",");

let lastPlayerAdState;
let pendingScan;
let protectionEnabled = true;
let playerRestoreState;
let skipAttemptedForCurrentAd = false;

function increment(key, amount = 1) {
  chrome.storage.local.get({ [key]: 0 }, (state) => chrome.storage.local.set({ [key]: state[key] + amount }));
}

function applyProtectionState(enabled) {
  protectionEnabled = enabled;
  document.documentElement.classList.toggle("yag-protection-enabled", enabled);
  if (enabled) scanPage(); else restorePlayer();
}

function looksLikePromotion(element) {
  if (!(element instanceof Element)) return false;
  if (element.matches(PROMOTIONAL_SELECTORS.join(","))) return true;
  // Do not match ordinary elements merely because their name contains "ad".
  const signature = `${element.tagName} ${element.id} ${element.className || ""} ${element.getAttribute("aria-label") || ""}`.toLowerCase();
  return /(?:^|[-_\s])(promoted|promotion|advertisement|ad-slot|adunit|masthead-ad)(?:$|[-_\s])/.test(signature);
}

function hidePromotionalElements() {
  if (!protectionEnabled) return;
  let newlyHidden = 0;
  const candidates = document.querySelectorAll(`${PROMOTIONAL_SELECTORS.join(",")}, [id], [class], [aria-label]`);
  for (const element of candidates) {
    if (looksLikePromotion(element) && !element.dataset.yagHidden) {
      element.dataset.yagHidden = "true";
      element.classList.add("yag-hidden-promotion");
      newlyHidden += 1;
    }
  }
  if (newlyHidden) increment("hiddenElementCount", newlyHidden);
}

function clickSkipButton() {
  const button = document.querySelector(SKIP_BUTTON_SELECTOR);
  if (!button || button.disabled) return false;
  button.click();
  increment("skippedAdCount");
  return true;
}

function getPlayerVideo() {
  return document.querySelector("#movie_player video.html5-main-video, .html5-video-player video");
}

function handlePlayerAd(isShowing) {
  const video = getPlayerVideo();
  if (!isShowing) {
    skipAttemptedForCurrentAd = false;
    return restorePlayer();
  }
  if (!skipAttemptedForCurrentAd) {
    skipAttemptedForCurrentAd = clickSkipButton();
  }
  if (!video || playerRestoreState) return;
  playerRestoreState = { muted: video.muted, volume: video.volume, playbackRate: video.playbackRate };
  video.muted = true;
  // Server-streamed ads can be indistinguishable from the requested video.
  video.playbackRate = 16;
  video.play().catch(() => {});
}

function restorePlayer() {
  const video = getPlayerVideo();
  if (!video || !playerRestoreState) return;
  video.muted = playerRestoreState.muted;
  video.volume = playerRestoreState.volume;
  video.playbackRate = playerRestoreState.playbackRate;
  playerRestoreState = undefined;
}

function scanPage() {
  pendingScan = undefined;
  if (!protectionEnabled) return;
  hidePromotionalElements();
  const playerAdShowing = Boolean(document.querySelector(PLAYER_AD_SELECTOR));
  handlePlayerAd(playerAdShowing);
  if (playerAdShowing === lastPlayerAdState) return;
  lastPlayerAdState = playerAdShowing;
  chrome.storage.local.set({ lastAdIndicatorDetected: playerAdShowing, lastAdIndicatorCheckedAt: Date.now() });
  if (playerAdShowing) increment("adIndicatorCount");
}

function scheduleScan() {
  if (!pendingScan) pendingScan = window.setTimeout(scanPage, 100);
}

new MutationObserver(scheduleScan).observe(document.documentElement, {
  childList: true, subtree: true, attributes: true,
  attributeFilter: ["class", "id", "aria-label", "data-ad-impressions", "data-ad-slot"]
});

const style = document.createElement("style");
style.textContent = `html.yag-protection-enabled ${PROMOTIONAL_SELECTORS.join(", html.yag-protection-enabled ")}, html.yag-protection-enabled .yag-hidden-promotion { display: none !important; visibility: hidden !important; }`;
(document.head || document.documentElement).append(style);

chrome.storage.local.get({ protectionEnabled: true }, ({ protectionEnabled: enabled }) => {
  applyProtectionState(enabled);
  scheduleScan();
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.protectionEnabled) applyProtectionState(changes.protectionEnabled.newValue);
});
scheduleScan();
