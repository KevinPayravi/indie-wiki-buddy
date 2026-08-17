import { extensionAPI, refreshSiteData } from "../../scripts/common-functions.js";
import { loadOptions } from "../common-page-functions.js";

function displayCustomSearchEngine(customSearchEngineDomain, customSearchEnginePreset) {
  let customSearchEnginesList = document.getElementById('customSearchEnginesList');

  let listItem = document.createElement('div');
  listItem.classList.add('customSearchEngine');

  let customSearchEngineDomainLabel = document.createElement('span');
  customSearchEngineDomainLabel.classList.add('customSearchEngineDomain');
  customSearchEngineDomainLabel.innerText = customSearchEngineDomain;

  let customSearchEnginePresetLabel = document.createElement('span');
  customSearchEnginePresetLabel.classList.add('customSearchEnginePreset');
  customSearchEnginePresetLabel.innerText = document.getElementById('newCustomSearchEnginePreset')
    .querySelector(`option[value="${customSearchEnginePreset}"]`).innerText;

  let customSearchEngineDeleteButton = document.createElement('button');
  customSearchEngineDeleteButton.type = 'button';
  customSearchEngineDeleteButton.classList.add('negative');
  customSearchEngineDeleteButton.classList.add('customSearchEngineDelete');
  customSearchEngineDeleteButton.innerText = extensionAPI.i18n.getMessage('settingsCustomWikiDelete');
  customSearchEngineDeleteButton.addEventListener('click', () => {
    listItem.remove();

    extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
      let customSearchEngines = item.customSearchEngines;
      const index = customSearchEngines[customSearchEnginePreset].indexOf(customSearchEngineDomain);
      if (index > -1) {
        customSearchEngines[customSearchEnginePreset].splice(index, 1);
        extensionAPI.storage.sync.set({ 'customSearchEngines': customSearchEngines });
      }
    });

    extensionAPI.permissions.remove({
      origins: [ customSearchEngineDomain ]
    });
  });

  listItem.appendChild(customSearchEngineDomainLabel);
  listItem.appendChild(customSearchEnginePresetLabel);
  listItem.appendChild(customSearchEngineDeleteButton);

  customSearchEnginesList.appendChild(listItem);
}

// Get local storage data from background
// Avoids fresh loading of storage.local, which can be slow in Firefox
const backgroundStoragePromise = new Promise((resolve) => {
  extensionAPI.runtime.sendMessage({ action: 'getStorage' }, (storage) => {
    if (extensionAPI.runtime.lastError || !storage) {
      extensionAPI.storage.local.get(['power', 'countSettingsOpened', 'hideReviewReminder'], resolve);
    } else {
      resolve(storage);
    }
  });
});

// Set API data setting
function setApiData(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'apiData': setting }, () => {
      if (setting === 'on') {
        // Fetch fresh data right away
        refreshSiteData(true);
      } else {
        // Drop the cached data so the bundled data takes over
        extensionAPI.storage.local.remove(['remoteSiteData', 'remoteSiteDataTimestamp']);
      }
    });
  }

  const apiDataIcon = document.getElementById('apiDataIcon');
  if (setting === 'on') {
    document.getElementById('apiDataCheckbox').checked = true;
    apiDataIcon.innerText = '🔄';
  } else {
    document.getElementById('apiDataCheckbox').checked = false;
    apiDataIcon.innerText = '📦';
  }
}

extensionAPI.storage.sync.get({ 'apiData': 'on' }, (item) => {
  setApiData(item.apiData, false);
});

document.getElementById('apiDataCheckbox').addEventListener('change', (e) => {
  setApiData(e.target.checked ? 'on' : 'off');
});

// Main function that runs on-load
document.addEventListener('DOMContentLoaded', () => {
  // Count number of times settings have been opened
  // Purposefully using local storage instead of sync
  backgroundStoragePromise.then((storage) => {
    const countSettingsOpened = storage.countSettingsOpened ?? 0;
    extensionAPI.storage.local.set({ 'countSettingsOpened': countSettingsOpened + 1 });

    // Show review reminder every 5 opens,
    // and if the banner hasn't been previously dismissed
    if (!(storage.hideReviewReminder ?? false) && ((countSettingsOpened - 1) % 5 === 0)) {
      const notificationBannerReview = document.getElementById('notificationBannerReview');

      notificationBannerReview.style.display = 'block';

      // Disable future review reminders if user clicks links:
      document.getElementById('reviewReminderChromeLink').addEventListener('click', () => {
        extensionAPI.storage.local.set({ 'hideReviewReminder': true });
      });
      document.getElementById('reviewReminderFirefoxLink').addEventListener('click', () => {
        extensionAPI.storage.local.set({ 'hideReviewReminder': true });
      });
      document.getElementById('reviewReminderHideLink').addEventListener('click', () => {
        extensionAPI.storage.local.set({ 'hideReviewReminder': true });
        notificationBannerReview.style.display = 'none';
      });
    }
  });

  // Get user's last set language
  extensionAPI.storage.sync.get({ 'lang': 'EN' }, (item) => {
    langSelect.value = item.lang;
    const filterInput = document.getElementById('filterInput').value;
    loadOptions(item.lang, filterInput);
  });
  // Add event listener for language select
  const langSelect = document.getElementById("langSelect");
  langSelect.addEventListener('change', () => {
    extensionAPI.storage.sync.set({ 'lang': langSelect.value });
    const filterInput = document.getElementById('filterInput').value;
    loadOptions(langSelect.value, filterInput);
  });

  // Add event listener for adding custom search engine
  let customSERequestPending = false;
  function addCustomSearchEngine() {
    if (customSERequestPending) return;
    let customSearchEngine = document.getElementById('newCustomSearchEngineDomain').value;

    // Add "https://" if not already present
    if (!customSearchEngine.includes('://')) {
      customSearchEngine = 'https://' + customSearchEngine;
    }
    customSearchEngine = new URL(customSearchEngine);

    // Check not already added
    let hostnames = document.querySelectorAll('.customSearchEngineDomain');
    for (let i = 0; i < hostnames.length; i++) {
      if (hostnames[i].innerText === customSearchEngine.hostname) {
        return;
      }
    }

    customSearchEngine = String(customSearchEngine) + '*';

    customSERequestPending = true;
    extensionAPI.permissions.request({
      origins: [ customSearchEngine ]
    }, (granted) => {
      customSERequestPending = false;
      // Callback is true if the user granted the permissions.
      if (!granted) return;

      let customSearchEnginePreset = document.getElementById('newCustomSearchEnginePreset').value;

      extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
        let customSearchEngines = item.customSearchEngines;
        if (!customSearchEngines[customSearchEnginePreset]) {
          customSearchEngines[customSearchEnginePreset] = [];
        }
        if (!customSearchEngines[customSearchEnginePreset].includes(customSearchEngine)) {
          customSearchEngines[customSearchEnginePreset].push(customSearchEngine);
          extensionAPI.storage.sync.set({ 'customSearchEngines': customSearchEngines });

          displayCustomSearchEngine(customSearchEngine, customSearchEnginePreset);
        }
      });
      document.getElementById('newCustomSearchEngineDomain').value = '';
    });
  }

  document.getElementById('addCustomSearchEngine').addEventListener('click', () => {
    addCustomSearchEngine();
  });
  document.getElementById('newCustomSearchEngineDomain').onkeyup = function(e) {
    if (e.key === 'Enter') {
      addCustomSearchEngine();
    }
  }

  extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
    Object.keys(item.customSearchEngines).forEach((engine) => {
      item.customSearchEngines[engine].forEach((hostname) => {
        displayCustomSearchEngine(hostname, engine);
      })
    });
  });

  // Add event listeners for default action selections
  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', () => {
      extensionAPI.storage.sync.set({ 'defaultWikiAction': document.options.defaultWikiAction.value })
    });
  });
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', () => {
      extensionAPI.storage.sync.set({ 'defaultSearchAction': document.options.defaultSearchAction.value })
    });
  });

  // Add event listener for filtering by text
  // Waits for typing to pause, so each keystroke doesn't rebuild the table
  let filterDebounce = null;
  document.getElementById('filterInput').addEventListener('input', (e) => {
    clearTimeout(filterDebounce);
    filterDebounce = setTimeout(() => {
      const langSelect = document.getElementById("langSelect");
      loadOptions(langSelect.value, e.target.value);
    }, 200);
  });

  // Get and display stat counts
  extensionAPI.storage.sync.get({ 'countAlerts': 0 }, (item) => {
    const key = Object.keys(item)[0];
    document.getElementById('countAlerts').textContent = item[key];
  });
  extensionAPI.storage.sync.get({ 'countRedirects': 0 }, (item) => {
    const key = Object.keys(item)[0];
    document.getElementById('countRedirects').textContent = item[key];
  });
  extensionAPI.storage.sync.get({ 'countSearchFilters': 0 }, (item) => {
    const key = Object.keys(item)[0];
    document.getElementById('countSearchFilters').textContent = item[key];
  });
  extensionAPI.storage.sync.get({ 'countBreezeWiki': 0 }, (item) => {
    const key = Object.keys(item)[0];
    document.getElementById('countBreezeWiki').textContent = item[key];
  });
});