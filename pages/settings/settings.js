// Clear wiki toggles
// Used when switching languages
function resetOptions() {
  const toggleTableBody = document.getElementById('togglesBody');

   // Need to create a copy first, because the children change while iterating
  const toggleTableRows = [...toggleTableBody.children];
  for(el of toggleTableRows) {
    if(el.classList?.contains('site-container')) {
      el.remove();
    }
  }
}

function createRadioButton(redirectEntry, action, category) {
  const redirectID = redirectEntry.id;
  const displayText = extensionAPI.i18n.getMessage(camelCaseJoin(['settings', action, 'For']), [redirectEntry.origins_label, redirectEntry.destination]);

  const radioButton = document.createElement("input");
  radioButton.classList = camelCaseJoin(['toggle', category, action]);
  radioButton.type = "radio";
  radioButton.name = `${redirectID}-${category}-action`;
  radioButton.title = displayText;
  radioButton.lang = redirectEntry.language;
  radioButton.setAttribute('data-wiki-key', redirectID);
  
  // Add event listener for the radio button
  const settingsType = `${category}Settings`;
  radioButton.addEventListener('click', () => {
    extensionAPI.storage.sync.get(settingsType, async (response) => {
      const settings = await commonFunctionDecompressJSON(response[settingsType]);
      settings[redirectID] = action;
      extensionAPI.storage.sync.set({ [settingsType]: await commonFunctionCompressJSON(settings) });
    });
  });

  return radioButton;
}

// Bumped on each loadOptions call
// Used to ignore stale loadOptions runs
let loadOptionsGeneration = 0;

// Get site data from background
// Avoids fresh loading of storage.local, which can be slow in Firefox
function getSiteData() {
  return new Promise((resolve) => {
    extensionAPI.runtime.sendMessage({ action: 'getSiteData' }, (sites) => {
      if (extensionAPI.runtime.lastError || !sites) {
        resolve(commonFunctionGetSiteDataByDestination());
      } else {
        resolve(sites);
      }
    });
  });
}

// Populate settings and toggles
async function loadOptions(lang, textFilter = '') {
  const generation = ++loadOptionsGeneration;
  const siteData = await getSiteData();
  textFilter = textFilter.toLocaleLowerCase();

  // Sort sites alphabetically by destination
  let sites = [...siteData].sort((a, b) => {
    a = a.destination.toLowerCase().replace(' ', '');
    b = b.destination.toLowerCase().replace(' ', '');
    return a < b ? -1 : (a > b ? 1 : 0);
  });

  // The language column is hidden when filtered to a specific language
  const langCol = document.getElementById("lang-col");
  if (lang === 'ALL') {
    langCol.classList.remove("hidden-col");
  } else {
    langCol.classList.add("hidden-col");
  }

  // Filter wikis by provided language and text filter
  sites = sites.filter((site) => (
    (lang === 'ALL' || site.language === lang) &&
    (site.origins_label.toLowerCase().includes(textFilter) ||
      site.destination.toLowerCase().includes(textFilter) ||
      site.destination_base_url.toLowerCase().includes(textFilter))
  ));

  // Load keys from storage.sync
  const syncStorage = await new Promise((resolve) => {
    extensionAPI.storage.sync.get(['wikiSettings', 'searchEngineSettings', 'defaultWikiAction', 'defaultSearchAction'], resolve);
  });
  const wikiSettings = await commonFunctionDecompressJSON(syncStorage.wikiSettings ?? {});
  const searchEngineSettings = await commonFunctionDecompressJSON(syncStorage.searchEngineSettings ?? {});
  const defaultWikiAction = syncStorage.defaultWikiAction ?? null;
  const defaultSearchAction = syncStorage.defaultSearchAction ?? null;

  if (generation !== loadOptionsGeneration) {
    return;
  }

  // Load defaults for newly added wikis:
  switch(syncStorage.defaultWikiAction) {
    case 'disabled':
      document.options.defaultWikiAction.value = 'disabled';
      break;
    case 'redirect':
      document.options.defaultWikiAction.value = 'redirect';
      break;
    default:
      document.options.defaultWikiAction.value = 'alert';
  }
  switch(syncStorage.defaultSearchAction) {
    case 'disabled':
      document.options.defaultSearchAction.value = 'disabled';
      break;
    case 'hide':
      document.options.defaultSearchAction.value = 'hide';
      break;
    default:
      document.options.defaultSearchAction.value = 'replace';
  }

  // Reset toggles:
  resetOptions();

  // Populate individual wiki settings
  // Build rows in small batches for page responsiveness
  const toggleTableBody = document.getElementById('togglesBody');
  const chunkSize = 100;
  for (let chunkStart = 0; chunkStart < sites.length; chunkStart += chunkSize) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (generation !== loadOptionsGeneration) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const chunkEnd = Math.min(chunkStart + chunkSize, sites.length);
    for (let i = chunkStart; i < chunkEnd; i++) {
      const redirectEntry = sites[i];

      // Create radio buttons for wiki & search engine options
      const inputWikiDisabled = createRadioButton(redirectEntry, 'disabled', 'wiki');
      const inputWikiAlert = createRadioButton(redirectEntry, 'alert', 'wiki');
      const inputWikiRedirect = createRadioButton(redirectEntry, 'redirect', 'wiki');
      const inputSearchEngineDisabled = createRadioButton(redirectEntry, 'disabled', 'searchEngine');
      const inputSearchEngineReplace = createRadioButton(redirectEntry, 'replace', 'searchEngine');
      const inputSearchEngineHide = createRadioButton(redirectEntry, 'hide', 'searchEngine');

      // Set wiki radio buttons based on user's settings
      const wikiAction = wikiSettings[redirectEntry.id] ?? defaultWikiAction ?? 'alert';

      switch(wikiAction) {
        case 'disabled':
          inputWikiDisabled.checked = true;
          break;
        case 'redirect':
          inputWikiRedirect.checked = true;
          break;
        default:
          inputWikiAlert.checked = true;
      }

      // Set search engine radio buttons based on user's settings
      const searchEngineAction = searchEngineSettings[redirectEntry.id] ?? defaultSearchAction ?? 'replace';

      switch(searchEngineAction) {
        case 'true':
        case 'replace':
          inputSearchEngineReplace.checked = true;
          break;
        case 'false':
        case 'disabled':
          inputSearchEngineDisabled.checked = true;
          break;
        default:
          inputSearchEngineHide.checked = true;
      }

      // Output wiki info:
      const destinationSiteURL = `https://${redirectEntry.destination_base_url}`;
      const visitDestinationText = extensionAPI.i18n.getMessage('bannerVisit', [redirectEntry.destination]);

      // Create row container
      const siteRow = document.createElement("tr");
      siteRow.classList.add('site-container');

      // Create icon for the destination wiki
      const icon = document.createElement("img");
      // Lazy-load icons
      icon.loading = 'lazy';
      icon.src = `../../favicons/${redirectEntry.language.toLowerCase()}/${redirectEntry.destination_icon}`;
      // If favicon is not bundled, load it from the API
      icon.onerror = () => {
        icon.onerror = null;
        icon.src = commonFunctionGetApiFaviconURL(redirectEntry);
      };
      icon.alt = visitDestinationText;
      icon.style.width = '16px';

      const linkedIcon = document.createElement("a");
      linkedIcon.href = destinationSiteURL;
      linkedIcon.title = visitDestinationText;
      linkedIcon.target = '_blank';
      linkedIcon.appendChild(icon);

      const iconCell = document.createElement("td");
      iconCell.appendChild(linkedIcon);
      siteRow.appendChild(iconCell);

      // Create language tag (hidden unless filter is set to "All languages")
      const languageSpan = document.createElement('td');
      languageSpan.classList.add('text-sm');
      languageSpan.innerText = `[${redirectEntry.language}]`;
      siteRow.appendChild(languageSpan);

      // Create text description of the redirect
      const wikiLink = document.createElement("a");
      wikiLink.href = destinationSiteURL;
      wikiLink.title = visitDestinationText;
      wikiLink.target = '_blank';
      wikiLink.appendChild(document.createTextNode(redirectEntry.destination));

      const wikiInfo = document.createElement('td');
      wikiInfo.classList.add('wiki-description');
      wikiInfo.appendChild(wikiLink);
      wikiInfo.appendChild(document.createTextNode(extensionAPI.i18n.getMessage('settingsWikiFrom', [redirectEntry.origins_label])));

      siteRow.appendChild(wikiInfo);

      // Wrap each of the buttons and add them to the container
      const rowCells = [
        inputWikiDisabled,
        inputWikiAlert,
        inputWikiRedirect,
        inputSearchEngineDisabled,
        inputSearchEngineReplace,
        inputSearchEngineHide
      ];
      for(cellContent of rowCells) {
        const cell = document.createElement("td");
        cell.appendChild(cellContent);
        siteRow.appendChild(cell);
      }

      fragment.appendChild(siteRow);
    }
    toggleTableBody.appendChild(fragment);
  }
}

// "Set all" button applies action to all listed wikis
function addGlobalButtonEventListeners(action, category) {
  const settingsType = `${category}Settings`;

  document.getElementById(camelCaseJoin(['setAll', category, action])).addEventListener('click', () => {
    extensionAPI.storage.sync.get(settingsType, async (response) => {
      const settings = await commonFunctionDecompressJSON(response[settingsType] ?? {});
      const buttonClassName = camelCaseJoin(['toggle', category, action]);
      const toggles = document.querySelectorAll(`#toggles input.${buttonClassName}`);
      for (let i = 0; i < toggles.length; i++) {
        toggles[i].checked = true;
        settings[toggles[i].getAttribute('data-wiki-key')] = action;
      }
      extensionAPI.storage.sync.set({ [settingsType]: await commonFunctionCompressJSON(settings) });
    });
  });
}

addGlobalButtonEventListeners('redirect', 'wiki');
addGlobalButtonEventListeners('alert', 'wiki');
addGlobalButtonEventListeners('disabled', 'wiki');
addGlobalButtonEventListeners('disabled', 'searchEngine');
addGlobalButtonEventListeners('hide', 'searchEngine');
addGlobalButtonEventListeners('replace', 'searchEngine');

function displayCustomSearchEngine(customSearchEngineHostname, customSearchEnginePreset) {
  let customSearchEnginesList = document.getElementById('customSearchEnginesList');

  let listItem = document.createElement('div');
  listItem.classList.add('customSearchEngine');

  let customSearchEngineHostnameLabel = document.createElement('span');
  customSearchEngineHostnameLabel.classList.add('customSearchEngineHostname');
  customSearchEngineHostnameLabel.innerText = customSearchEngineHostname;

  let customSearchEnginePresetLabel = document.createElement('span');
  customSearchEnginePresetLabel.classList.add('customSearchEnginePreset');
  customSearchEnginePresetLabel.innerText = document.getElementById('newCustomSearchEnginePreset')
    .querySelector(`option[value="${customSearchEnginePreset}"]`).innerText;

  let customSearchEngineDeleteButton = document.createElement('button');
  customSearchEngineDeleteButton.classList.add('customSearchEngineDelete');
  customSearchEngineDeleteButton.innerText = extensionAPI.i18n.getMessage('settingsCustomWikiDelete');
  customSearchEngineDeleteButton.addEventListener('click', () => {
    listItem.remove();

    extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
      let customSearchEngines = item.customSearchEngines;
      delete customSearchEngines[customSearchEngineHostname];
      extensionAPI.storage.sync.set({ 'customSearchEngines': customSearchEngines });
    });

    let customSearchEngine = customSearchEngineHostname;
    // Add "https://" if not already present
    if (!customSearchEngine.includes('://')) {
      customSearchEngine = 'https://' + customSearchEngine;
    }
    customSearchEngine = new URL(customSearchEngine);
    extensionAPI.permissions.remove({
      origins: [ `${customSearchEngine}*` ]
    });

    extensionAPI.scripting.unregisterContentScripts({ ids: [`content-search-filtering-${customSearchEngineHostname}`] });
  });

  listItem.appendChild(customSearchEngineHostnameLabel);
  listItem.appendChild(customSearchEnginePresetLabel);
  listItem.appendChild(customSearchEngineDeleteButton);

  customSearchEnginesList.appendChild(listItem);
}

// Set power setting
function setPower(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.local.set({ 'power': setting });
  }
  const powerText = document.getElementById('powerText');
  const powerIcon = document.getElementById('powerIcon');
  if (setting === 'on') {
    powerText.textContent = extensionAPI.i18n.getMessage('settingsExtensionOn');
    document.getElementById('powerCheckbox').checked = true;
    powerIcon.innerText = '🔋';
  } else {
    powerText.textContent = extensionAPI.i18n.getMessage('settingsExtensionOff');
    document.getElementById('powerCheckbox').checked = false;
    powerIcon.innerText = '🪫';
  }

  extensionAPI.runtime.sendMessage({
    action: 'updateIcon',
    value: setting
  });
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

// Set setting toggle values on-load:
backgroundStoragePromise.then((storage) => {
  setPower(storage.power ?? 'on', false);
});

// Add event listener for power toggle
document.getElementById('powerCheckbox').addEventListener('change', (e) => {
  setPower(e.target.checked ? 'on' : 'off');
});

// Set API data setting
function setApiData(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'apiData': setting }, () => {
      if (setting === 'on') {
        // Fetch fresh data right away
        commonFunctionRefreshSiteData(true);
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

async function migrateData() {
  commonFunctionMigrateToV3();
}

// Main function that runs on-load
document.addEventListener('DOMContentLoaded', () => {
  // If newly installed, show initial install guide
  if (new URLSearchParams(window.location.search).get('newinstall')) {
    document.getElementById('firstInstallInfo').style.display = 'block';
  }

  // If running Opera, show note about search engine access
  if (navigator.userAgent.match(/OPR\//)) {
    const notificationBannerOpera = document.getElementById('notificationBannerOpera');
    extensionAPI.storage.local.get({ 'hideOperaPermissionsNote': false }, (item) => {
      if (!item.hideOperaPermissionsNote) {
        notificationBannerOpera.style.display = 'block';

        document.getElementById('operaPermsHideLink').addEventListener('click', () => {
          extensionAPI.storage.local.set({ 'hideOperaPermissionsNote': true });
          notificationBannerOpera.style.display = 'none';
        });
      }
    });
  }

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

  // Adding version to popup:
  const version = extensionAPI.runtime.getManifest().version;
  document.getElementById('version').textContent = 'v' + version;

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

  // Add event listener for BreezeWiki host select
  const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
  breezewikiHostSelect.addEventListener('change', () => {
    if (breezewikiHostSelect.value === 'CUSTOM') {
      document.getElementById('breezewikiCustomHost').style.display = 'block';
      document.getElementById('breezewikiCustomHostStatus').innerText = '';
    } else {
      document.getElementById('breezewikiCustomHost').style.display = 'none';
    }
    extensionAPI.storage.sync.set({ 'breezewikiHost': breezewikiHostSelect.value });
  });

  function setCustomBreezewikiDomain() {
    let breezewikiCustomDomain = document.getElementById('customBreezewikiHost').value;
    // Add "https://" if not already present
    if (!/^https?:\/\//i.test(breezewikiCustomDomain)) {
      breezewikiCustomDomain = 'https://' + breezewikiCustomDomain;
    }
    // Reduce to just protocal + hostname
    breezewikiCustomDomain = new URL(breezewikiCustomDomain);
    breezewikiCustomDomain = breezewikiCustomDomain.protocol + "//" + breezewikiCustomDomain.hostname
    breezewikiCustomDomain = breezewikiCustomDomain.toString();

    extensionAPI.permissions.request({
      origins: [breezewikiCustomDomain + '/*']
    }, (granted) => {
      // The callback argument will be true if the user granted the permissions.
      if (granted) {
        extensionAPI.scripting.registerContentScripts([{
          id: 'content-banners',
          matches: [breezewikiCustomDomain + '/*'],
          js: ['/scripts/common-functions.js', '/scripts/content-banners.js', '/scripts/content-breezewiki.js'],
          runAt: "document_idle"
        }]);
        extensionAPI.storage.sync.set({ 'breezewikiCustomHost': breezewikiCustomDomain });
        document.getElementById('breezewikiCustomHostStatus').innerText = extensionAPI.i18n.getMessage('settingsBreezeWikiCustomHostSetSuccessful');
      } else {
        document.getElementById('breezewikiCustomHostStatus').innerText = extensionAPI.i18n.getMessage('settingsBreezeWikiCustomHostSetFailed');
      }
    });
  }

  document.getElementById('setCustomBreezewikiDomain').addEventListener('click', () => {
    setCustomBreezewikiDomain();
  });
  document.getElementById('customBreezewikiHost').onkeyup = function (e) {
    if (e.key === 'Enter') {
      setCustomBreezewikiDomain();
    }
  }
  document.options.addEventListener("submit", function (e) {
    e.preventDefault();
    return false;
  });

  // Add event listener for adding custom search engine
  function addCustomSearchEngine() {
    let customSearchEngine = document.getElementById('newCustomSearchEngineDomain').value;

    // Add "https://" if not already present
    if (!customSearchEngine.includes('://')) {
      customSearchEngine = 'https://' + customSearchEngine;
    }
    customSearchEngine = new URL(customSearchEngine);

    // Check not already added
    let hostnames = document.querySelectorAll('.customSearchEngineHostname');
    for (let i = 0; i < hostnames.length; i++) {
      if (hostnames[i].innerText === customSearchEngine.hostname) {
        return;
      }
    }

    extensionAPI.permissions.request({
      origins: [ `${customSearchEngine}*` ]
    }, (granted) => {
      // Callback is true if the user granted the permissions.
      if (!granted) return;

      try {
        extensionAPI.scripting.registerContentScripts([{
          id: `content-search-filtering-${customSearchEngine.hostname}`,
          matches: [customSearchEngine + '*'],
          js: [ '/scripts/common-functions.js', '/scripts/content-search-filtering.js' ],
          runAt: "document_start"
        }]);
      } catch(e) {
        (`Could not register content script for ${customSearchEngine}.`)
      }

      let customSearchEnginePreset = document.getElementById('newCustomSearchEnginePreset').value;

      extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
        let customSearchEngines = item.customSearchEngines;
        customSearchEngines[customSearchEngine.hostname] = customSearchEnginePreset;
        extensionAPI.storage.sync.set({ 'customSearchEngines': customSearchEngines });
      });

      displayCustomSearchEngine(customSearchEngine.hostname, customSearchEnginePreset);

      document.getElementById('newCustomSearchEngineDomain').value = '';
    });
  }

  ///////////////////////////////////////////////////////////////
  // Custom search engines are currently disabled
  // due to content scripts being unregistered on-update.
  ///////////////////////////////////////////////////////////////
  // document.getElementById('addCustomSearchEngine').addEventListener('click', () => {
  //   addCustomSearchEngine();
  // });
  // document.getElementById('newCustomSearchEngineDomain').onkeyup = function(e) {
  //   if (e.key === 'Enter') {
  //     addCustomSearchEngine();
  //   }
  // }

  extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
    Object.keys(item.customSearchEngines).forEach((key) => {
      displayCustomSearchEngine(key, item.customSearchEngines[key]);
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

// Run v3 data migration:
migrateData();
