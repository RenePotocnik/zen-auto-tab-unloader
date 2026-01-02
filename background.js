let config = {
  enabled: true,
  time: 30,
  unloadPinned: false,
  unloadEssential: false,
  unloadAudible: false,
  unloadHidden: true
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
      checkAndUnloadTabs(); // Force check immediately on save
    });
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkTabs" && config.enabled) {
    checkAndUnloadTabs();
  }
});

function setupAlarm() {
  browser.alarms.clearAll();

  if (config.enabled) {
    browser.alarms.create("checkTabs", { periodInMinutes: 1.0 });
  }
}

async function checkAndUnloadTabs() {
  const thresholdTime = Date.now() - (config.time * 60 * 1000);
  
  // Query ALL tabs (Manually filtering is more robust than API filtering)
  const tabs = await browser.tabs.query({});

  for (const tab of tabs) {
    // Skip if already unloaded
    if (tab.discarded) continue;
    
    // Skip the user's current focused tab
    if (tab.active && tab.windowId === browser.windows.WINDOW_ID_CURRENT) continue;
    
    // Skip if playing/using audio
    if (tab.audible && !config.unloadAudible) continue;

    if (tab.pinned) {
      if (tab.hidden) {
        // Workspace Pin (Hidden) -> Unload if allowed
        if (!config.unloadPinned) continue;
      } else {
        // Global Essential (Visible) -> Unload if allowed
        if (!config.unloadEssential) continue;
      }
    }

    // Different workspace
    if (!tab.pinned && tab.hidden) {
       if (!config.unloadHidden) continue;
    }

    if (tab.lastAccessed < thresholdTime) {
      console.log(`[Zen Unloader] Discarding: ${tab.title}`);
      try {
          await browser.tabs.discard(tab.id);
      } catch (err) {
          console.error(`Skipped active tab: ${tab.title}`);
      }
    }
  }
}