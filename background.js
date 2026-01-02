let config = {
  enabled: true,
  time: 30,
  unloadPinned: false,    // Workspace specific pins
  unloadEssential: false, // Global essentials
  unloadAudible: false,   // Playing media
  unloadHidden: true      // Other workspaces
};

browser.storage.local.get("unloaderSettings").then((res) => {
  if (res.unloaderSettings) config = res.unloaderSettings;
  setupAlarm();
});

browser.runtime.onMessage.addListener((message) => {
  if (message.command === "updateSettings") {
    browser.storage.local.get("unloaderSettings").then((res) => {
      if (res.unloaderSettings) config = res.unloaderSettings;
      setupAlarm();
    });
  }
});

function setupAlarm() {
  browser.alarms.clearAll();
  if (config.enabled) {
    browser.alarms.create("checkTabs", { periodInMinutes: 1.0 });
  }
}

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkTabs" && config.enabled) {
    checkAndUnloadTabs();
  }
});

async function checkAndUnloadTabs() {
  const thresholdTime = Date.now() - (config.time * 60 * 1000);
  
  // Get ALL tabs (active: false ensures we don't kill the one you are looking at)
  const tabs = await browser.tabs.query({ active: false });

  for (const tab of tabs) {
    if (tab.discarded) continue; // Already unloaded

    // --- CHECK 1: AUDIO / VIDEO ---
    // tab.audible is true if music/video is playing.
    // If config.unloadAudible is FALSE, we SAVE this tab.
    if (tab.audible && !config.unloadAudible) continue;


    // --- CHECK 2: PINNED VS ESSENTIALS ---
    if (tab.pinned) {
      // Heuristic: 
      // Zen Essentials are global, so they are effectively "visible" in all workspaces (hidden=false).
      // Workspace Pins are hidden when you are in a different workspace (hidden=true).
      
      if (tab.hidden) {
        // This is likely a Pinned tab in a DIFFERENT workspace
        if (!config.unloadPinned) continue;
      } else {
        // This is either an Essential tab OR a Pinned tab in the CURRENT workspace.
        // Since we can't easily distinguish current-workspace-pin from essential via API,
        // we treat visible pins as "Essential/Active Pins".
        if (!config.unloadEssential) continue;
      }
    }


    // --- CHECK 3: OTHER WORKSPACES (HIDDEN TABS) ---
    // If it's not pinned, but it is hidden, it's in another workspace.
    if (!tab.pinned && tab.hidden) {
      if (!config.unloadHidden) continue;
    }


    // --- CHECK 4: TIME THRESHOLD ---
    if (tab.lastAccessed < thresholdTime) {
      console.log(`[Zen Unloader] Discarding: ${tab.title} | Hidden: ${tab.hidden} | Pinned: ${tab.pinned}`);
      browser.tabs.discard(tab.id).catch(e => console.error(e));
    }
  }
}