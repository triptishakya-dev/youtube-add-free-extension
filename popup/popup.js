const RULESET_ID = "youtube_ad_rules";
const toggle = document.querySelector("#protection-toggle");
const statusDot = document.querySelector("#status-dot");
const statusMessage = document.querySelector("#status-message");

function setStatus(message, type = "neutral") {
  statusMessage.textContent = message;
  statusDot.className = `status-dot ${type === "active" ? "active" : type === "warning" ? "warning" : ""}`;
}

async function readStatus() {
  const [rulesetState, storedState, tabs] = await Promise.all([
    chrome.declarativeNetRequest.getEnabledRulesets(),
    chrome.storage.local.get(["lastAdIndicatorDetected", "hiddenElementCount", "adIndicatorCount", "skippedAdCount"]),
    chrome.tabs.query({ active: true, currentWindow: true })
  ]);

  const enabled = rulesetState.includes(RULESET_ID);
  const activeTab = tabs[0];
  const isYouTube = activeTab?.url?.includes("youtube.com");
  const hiddenCount = storedState.hiddenElementCount || 0;
  const detectedCount = (storedState.adIndicatorCount || 0) + (storedState.skippedAdCount || 0);
  document.querySelector("#hidden-count").textContent = hiddenCount;
  document.querySelector("#summary-hidden-count").textContent = hiddenCount;
  document.querySelector("#summary-detected-count").textContent = detectedCount;
  document.querySelector("#total-count").textContent = hiddenCount + detectedCount;
  toggle.checked = enabled;
  await chrome.storage.local.set({ protectionEnabled: enabled });

  if (!enabled) {
    setStatus("Protection is paused.", "warning");
  } else if (!isYouTube) {
    setStatus("Protection is enabled. Open YouTube to test it.", "active");
  } else if (storedState.lastAdIndicatorDetected) {
    setStatus("YouTube ad indicator detected.", "warning");
  } else {
    setStatus("Protection is enabled on YouTube.", "active");
  }
}

toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: toggle.checked ? [RULESET_ID] : [],
      disableRulesetIds: toggle.checked ? [] : [RULESET_ID]
    });
    await chrome.storage.local.set({ protectionEnabled: toggle.checked });
    await readStatus();
  } catch (error) {
    console.error("Unable to update protection:", error);
    setStatus("Unable to update protection. Reload the extension.", "warning");
  } finally {
    toggle.disabled = false;
  }
});

readStatus().catch((error) => {
  console.error("Unable to read extension status:", error);
  setStatus("Unable to read status. Reload the extension.", "warning");
});
