document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);

function saveOptions() {
  const config = {
    enabled: document.getElementById('enabled').checked,
    time: parseInt(document.getElementById('timeCheck').value),
    checkInterval: parseInt(document.getElementById('checkInterval').value) || 5,
    unloadPinned: document.getElementById('unloadPinned').checked,
    unloadEssential: document.getElementById('unloadEssential').checked,
    unloadAudible: document.getElementById('unloadAudible').checked,
    unloadHidden: document.getElementById('unloadHidden').checked
  };

  browser.storage.local.set({ unloaderSettings: config }).then(() => {
    const status = document.getElementById('status');
    status.textContent = 'Configuration Saved!';
    setTimeout(() => status.textContent = '', 1500);
    browser.runtime.sendMessage({ command: "updateSettings" });
  });
}

function restoreOptions() {
  browser.storage.local.get("unloaderSettings").then((res) => {
    // Defaults
    const settings = res.unloaderSettings || { 
      enabled: true, 
      time: 30, 
      checkInterval: 5,
      unloadPinned: false, 
      unloadEssential: false, 
      unloadAudible: false,
      unloadHidden: true 
    };

    document.getElementById('enabled').checked = settings.enabled;
    document.getElementById('timeCheck').value = settings.time;
    document.getElementById('checkInterval').value = settings.checkInterval || 5;
    document.getElementById('unloadPinned').checked = settings.unloadPinned;
    document.getElementById('unloadEssential').checked = settings.unloadEssential;
    document.getElementById('unloadAudible').checked = settings.unloadAudible;
    document.getElementById('unloadHidden').checked = settings.unloadHidden;
  });
}