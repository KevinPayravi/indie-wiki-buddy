var sites = [];

// Clear wiki toggles
// Used when switching languages
function resetOptions() {
  const toggleContainer = document.getElementById('toggles');
  toggleContainer.textContent = "";

  // Clone "select all" buttons to reset listeners
  document.getElementById('setAllDisabled').cloneNode(true);
  document.getElementById('setAllRedirect').cloneNode(true);
  document.getElementById('setAllAlert').cloneNode(true);
  document.getElementById('setAllSearchEngineDisabled').cloneNode(true);
  document.getElementById('setAllSearchEngineHide').cloneNode(true);
  document.getElementById('setAllSearchEngineReplace').cloneNode(true);
}

// Populate settings and toggles
async function loadOptions(lang, textFilter = '') {
  sites = await commonFunctionGetSiteDataByDestination();
  textFilter = textFilter.toLocaleLowerCase();

  // Sort sites alphabetically by destination
  sites.sort((a, b) => {
    a = a.destination.toLowerCase().replace(' ', '');
    b = b.destination.toLowerCase().replace(' ', '');
    return a < b ? -1 : (a > b ? 1 : 0);
  });

  // Filter wikis by provided language and text filter
  sites = sites.filter((site) => (
    (lang === 'ALL' || site.language === lang) &&
    (site.origins_label.toLowerCase().includes(textFilter) ||
      site.destination.toLowerCase().includes(textFilter) ||
      site.destination_base_url.toLowerCase().includes(textFilter))
  ));

  extensionAPI.storage.local.get((localStorage) => {
    extensionAPI.storage.sync.get(async (syncStorage) => {
      const storage = { ...syncStorage, ...localStorage };
      let wikiSettings = await commonFunctionDecompressJSON(storage.wikiSettings || {});
      let searchEngineSettings = await commonFunctionDecompressJSON(storage.searchEngineSettings || {});
      let defaultWikiAction = storage.defaultWikiAction || null;
      let defaultSearchAction = storage.defaultSearchAction || null;

      // Load defaults for newly added wikis:
      extensionAPI.storage.sync.get(['defaultWikiAction'], (item) => {
        if (item.defaultWikiAction === 'disabled') {
          document.options.defaultWikiAction.value = 'disabled';
        } else if (item.defaultWikiAction === 'redirect') {
          document.options.defaultWikiAction.value = 'redirect';
        } else {
          document.options.defaultWikiAction.value = 'alert';
        }
      });
      extensionAPI.storage.sync.get(['defaultSearchAction'], (item) => {
        if (item.defaultSearchAction === 'disabled') {
          document.options.defaultSearchAction.value = 'disabled';
        } else if (item.defaultSearchAction === 'hide') {
          document.options.defaultSearchAction.value = 'hide';
        } else {
          document.options.defaultSearchAction.value = 'replace';
        }
      });

      // Reset toggles:
      resetOptions();

      // Populate individual wiki settings:
      const toggleContainer = document.getElementById('toggles');
      for (var i = 0; i < sites.length; i++) {
        var key = sites[i].id;

        // Create radio for disabling action on wiki:
        let labelDisabled = document.createElement("label");
        let inputDisabled = document.createElement("input");
        inputDisabled.classList = 'toggleDisable';
        inputDisabled.type = "radio";
        inputDisabled.name = key + '-wiki-action';
        inputDisabled.title = extensionAPI.i18n.getMessage('settingsDisableFor', [sites[i].origins_label]);
        inputDisabled.lang = sites[i].language;
        inputDisabled.setAttribute('data-wiki-key', key);

        // Create radio for inserting banner on wiki:
        let labelAlert = document.createElement("label");
        let inputAlert = document.createElement("input");
        inputAlert.classList = 'toggleAlert';
        inputAlert.type = "radio";
        inputAlert.name = key + '-wiki-action';
        inputAlert.title = extensionAPI.i18n.getMessage('settingsAlertFor', [sites[i].origins_label, sites[i].destination]);
        inputAlert.lang = sites[i].language;
        inputAlert.setAttribute('data-wiki-key', key);

        // Create radio for redirecting wiki:
        let labelRedirect = document.createElement("label");
        let inputRedirect = document.createElement("input");
        inputRedirect.classList = 'toggleRedirect';
        inputRedirect.type = "radio";
        inputRedirect.name = key + '-wiki-action';
        inputRedirect.title = extensionAPI.i18n.getMessage('settingsRedirectFor', [sites[i].origins_label, sites[i].destination]);
        inputRedirect.lang = sites[i].language;
        inputRedirect.setAttribute('data-wiki-key', key);

        // Create radio for disabling action on search engines:
        let labelSearchEngineDisabled = document.createElement("label");
        let inputSearchEngineDisabled = document.createElement("input");
        inputSearchEngineDisabled.classList = 'toggleSearchEngineDisabled';
        inputSearchEngineDisabled.type = "radio";
        inputSearchEngineDisabled.name = key + '-search-engine-action';
        inputSearchEngineDisabled.title = extensionAPI.i18n.getMessage('settingsDisableFor', [sites[i].origins_label]);
        inputSearchEngineDisabled.lang = sites[i].language;
        inputSearchEngineDisabled.setAttribute('data-wiki-key', key);

        // Create radio for replacing results on search engines:
        let labelSearchEngineReplace = document.createElement("label");
        let inputSearchEngineReplace = document.createElement("input");
        inputSearchEngineReplace.classList = 'toggleSearchEngineReplace';
        inputSearchEngineReplace.type = "radio";
        inputSearchEngineReplace.name = key + '-search-engine-action';
        inputSearchEngineReplace.title = extensionAPI.i18n.getMessage('settingsReplaceFor', [sites[i].origins_label, sites[i].destination]);
        inputSearchEngineReplace.lang = sites[i].language;
        inputSearchEngineReplace.setAttribute('data-wiki-key', key);

        // Create radio for hiding results on search engines:
        let labelSearchEngineHide = document.createElement("label");
        let inputSearchEngineHide = document.createElement("input");
        inputSearchEngineHide.classList = 'toggleSearchEngineHide';
        inputSearchEngineHide.type = "radio";
        inputSearchEngineHide.name = key + '-search-engine-action';
        inputSearchEngineHide.title = extensionAPI.i18n.getMessage('settingsHideFor', [sites[i].origins_label]);
        inputSearchEngineHide.lang = sites[i].language;
        inputSearchEngineHide.setAttribute('data-wiki-key', key);

        // Set wiki radio buttons based on user's settings
        const wikiAction = wikiSettings[key] ?? defaultWikiAction ?? 'alert';
        
        switch(wikiAction) {
          case 'disabled':
            inputDisabled.checked = true;
            break;
          case 'redirect':
            inputRedirect.checked = true;
            break;
          default:
            inputAlert.checked = true;
        }

        // Set search engine radio buttons based on user's settings
        const searchEngineAction = searchEngineSettings[key] ?? defaultSearchAction ?? 'replace';

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

        // Add listeners for when user clicks control:
        inputDisabled.addEventListener('click', (input) => {
          extensionAPI.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
            let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
            var key = input.target.getAttribute('data-wiki-key');
            wikiSettings[key] = 'disabled';
            extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
          });
        });
        inputAlert.addEventListener('click', (input) => {
          extensionAPI.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
            let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
            var key = input.target.getAttribute('data-wiki-key');
            wikiSettings[key] = 'alert';
            extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
          });
        });
        inputRedirect.addEventListener('click', (input) => {
          extensionAPI.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
            let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
            var key = input.target.getAttribute('data-wiki-key');
            wikiSettings[key] = 'redirect';
            extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
          });
        });
        inputSearchEngineDisabled.addEventListener('click', (input) => {
          extensionAPI.storage.sync.get({ 'searchEngineSettings': {} }, async (response) => {
            let searchEngineSettings = await commonFunctionDecompressJSON(response.searchEngineSettings);
            var key = input.target.getAttribute('data-wiki-key');
            searchEngineSettings[key] = 'disabled';
            extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
          });
        });
        inputSearchEngineReplace.addEventListener('click', (input) => {
          extensionAPI.storage.sync.get({ 'searchEngineSettings': {} }, async (response) => {
            let searchEngineSettings = await commonFunctionDecompressJSON(response.searchEngineSettings);
            var key = input.target.getAttribute('data-wiki-key');
            searchEngineSettings[key] = 'replace';
            extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
          });
        });
        inputSearchEngineHide.addEventListener('click', (input) => {
          extensionAPI.storage.sync.get({ 'searchEngineSettings': {} }, async (response) => {
            let searchEngineSettings = await commonFunctionDecompressJSON(response.searchEngineSettings);
            var key = input.target.getAttribute('data-wiki-key');
            searchEngineSettings[key] = 'hide';
            extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
          });
        });

        // Output wiki disable radio button:
        let inputDisabledText = document.createElement('span');
        inputDisabledText.classList.add('visuallyHidden');
        inputDisabledText.textContent = extensionAPI.i18n.getMessage('settingsDisableFor', [sites[i].origins_label]);
        labelDisabled.appendChild(inputDisabled);
        labelDisabled.appendChild(inputDisabledText);

        // Output wiki alert radio button:
        let inputAlertText = document.createElement('span');
        inputAlertText.classList.add('visuallyHidden');
        inputAlertText.textContent = extensionAPI.i18n.getMessage('settingsAlertFor', [sites[i].origins_label, sites[i].destination]);
        labelAlert.appendChild(inputAlert);
        labelAlert.appendChild(inputAlertText);

        // Output wiki redirect radio button:
        let inputRedirectText = document.createElement('span');
        inputRedirectText.classList.add('visuallyHidden');
        inputRedirectText.textContent = extensionAPI.i18n.getMessage('settingsRedirectFor', [sites[i].origins_label, sites[i].destination]);
        labelRedirect.appendChild(inputRedirect);
        labelRedirect.appendChild(inputRedirectText);

        // Output search engine disable radio button:
        let inputSearchEngineDisabledText = document.createElement('span');
        inputSearchEngineDisabledText.classList.add('visuallyHidden');
        inputSearchEngineDisabledText.textContent = extensionAPI.i18n.getMessage('settingsDisableFor', [sites[i].origins_label]);
        labelSearchEngineDisabled.appendChild(inputSearchEngineDisabled);
        labelSearchEngineDisabled.appendChild(inputSearchEngineDisabledText);

        // Output search engine replace radio button:
        let inputSearchEngineReplaceText = document.createElement('span');
        inputSearchEngineReplaceText.classList.add('visuallyHidden');
        inputSearchEngineReplaceText.textContent = extensionAPI.i18n.getMessage('settingsReplaceFor', [sites[i].origins_label, sites[i].destination]);
        labelSearchEngineReplace.appendChild(inputSearchEngineReplace);
        labelSearchEngineReplace.appendChild(inputSearchEngineReplaceText);

        // Output search engine hide radio button:
        let inputSearchEngineHideText = document.createElement('span');
        inputSearchEngineHideText.classList.add('visuallyHidden');
        inputSearchEngineHideText.textContent = extensionAPI.i18n.getMessage('settingsHideFor', [sites[i].origins_label]);
        labelSearchEngineHide.appendChild(inputSearchEngineHide);
        labelSearchEngineHide.appendChild(inputSearchEngineHideText);

        // Output wiki info:
        let wikiInfo = document.createElement('span');
        let iconLink = document.createElement("a");
        iconLink.href = 'https://' + sites[i].destination_base_url;
        iconLink.title = 'Visit ' + sites[i].destination;
        iconLink.target = '_blank';
        let icon = document.createElement("img");
        icon.src = '../../favicons/' + sites[i].language.toLowerCase() + '/' + sites[i].destination_icon;
        icon.alt = 'Visit ' + sites[i].destination;
        icon.width = '16';
        iconLink.appendChild(icon);
        wikiInfo.appendChild(iconLink);
        if (lang === 'ALL') {
          const languageSpan = document.createElement('span');
          languageSpan.classList.add('text-sm');
          languageSpan.innerText = ' [' + sites[i].language + '] ';
          wikiInfo.appendChild(languageSpan);
        }
        let wikiLink = document.createElement("a");
        wikiLink.href = 'https://' + sites[i].destination_base_url;
        wikiLink.title = 'Visit ' + sites[i].destination;
        wikiLink.target = '_blank';
        wikiLink.appendChild(document.createTextNode(sites[i].destination));
        wikiInfo.appendChild(wikiLink);
        wikiInfo.appendChild(document.createTextNode(extensionAPI.i18n.getMessage('settingsWikiFrom', [sites[i].origins_label])));
        let siteContainer = document.createElement("div");
        siteContainer.classList.add('site-container')

        // Output inputs container:
        let inputsContainer = document.createElement('div');
        inputsContainer.appendChild(labelDisabled);
        inputsContainer.appendChild(labelAlert);
        inputsContainer.appendChild(labelRedirect);
        inputsContainer.appendChild(labelSearchEngineDisabled);
        inputsContainer.appendChild(labelSearchEngineReplace);
        inputsContainer.appendChild(labelSearchEngineHide);
        inputsContainer.classList = 'inputsContainer';
        siteContainer.appendChild(wikiInfo);
        siteContainer.appendChild(inputsContainer);
        toggleContainer.appendChild(siteContainer);
      }

      // Add "select all" button event listeners:
      const setAllRedirect = document.getElementById('setAllRedirect');
      setAllRedirect.addEventListener('click', async () => {
        const toggles = document.querySelectorAll('#toggles input.toggleRedirect');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          wikiSettings[toggles[i].getAttribute('data-wiki-key')] = 'redirect';
        }
        extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      });

      const setAllAlert = document.getElementById('setAllAlert');
      setAllAlert.addEventListener('click', async () => {
        const toggles = document.querySelectorAll('#toggles input.toggleAlert');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          wikiSettings[toggles[i].getAttribute('data-wiki-key')] = 'alert';
        }
        extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      });

      const setAllDisabled = document.getElementById('setAllDisabled');
      setAllDisabled.addEventListener('click', async () => {
        const toggles = document.querySelectorAll('#toggles input.toggleDisable');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          wikiSettings[toggles[i].getAttribute('data-wiki-key')] = 'disabled';
        }
        extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      });

      const setAllSearchEngineDisabled = document.getElementById('setAllSearchEngineDisabled');
      setAllSearchEngineDisabled.addEventListener('click', async () => {
        const toggles = document.querySelectorAll('#toggles input.toggleSearchEngineDisabled');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          searchEngineSettings[toggles[i].getAttribute('data-wiki-key')] = 'disabled';
        }
        extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
      });

      const setAllSearchEngineHide = document.getElementById('setAllSearchEngineHide');
      setAllSearchEngineHide.addEventListener('click', async () => {
        const toggles = document.querySelectorAll('#toggles input.toggleSearchEngineHide');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          searchEngineSettings[toggles[i].getAttribute('data-wiki-key')] = 'hide';
        }
        extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
      });

      const setAllSearchEngineReplace = document.getElementById('setAllSearchEngineReplace');
      setAllSearchEngineReplace.addEventListener('click', async () => {
        const toggles = document.querySelectorAll('#toggles input.toggleSearchEngineReplace');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          searchEngineSettings[toggles[i].getAttribute('data-wiki-key')] = 'replace';
        }
        extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
      });
    });
  });
}

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

// Set setting toggle values on-load:
extensionAPI.storage.local.get({ 'power': 'on' }, (item) => {
  setPower(item.power, false);
});

// Add event listener for power toggle
document.getElementById('powerCheckbox').addEventListener('change', () => {
  extensionAPI.storage.local.get({ 'power': 'on' }, (item) => {
    if (item.power === 'on') {
      setPower('off');
    } else {
      setPower('on');
    }
  });
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
  extensionAPI.storage.local.get({ 'countSettingsOpened': 0 }, (item) => {
    const countSettingsOpened = item.countSettingsOpened;
    extensionAPI.storage.local.set({ 'countSettingsOpened': countSettingsOpened + 1 });

    // Show review reminder every 5 opens,
    // and if the banner hasn't been previously dismissed
    extensionAPI.storage.local.get({ 'hideReviewReminder': false }, (item) => {
      if (!item.hideReviewReminder && ((countSettingsOpened - 1) % 5 === 0)) {
        const notificationBannerReview = document.getElementById('notificationBannerReview');

        notificationBannerReview.style.display = 'block';
        document.getElementById('notificationBannerReview').style.display = ' block';

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
  document.getElementById('filterInput').addEventListener('input', (e) => {
    const langSelect = document.getElementById("langSelect");
    loadOptions(langSelect.value, e.target.value);
  });

  // Get and display stat counts
  extensionAPI.storage.sync.get({ 'countAlerts': 0 }, (item) => {
    var key = Object.keys(item)[0];
    document.getElementById('countAlerts').textContent = item[key];
  });
  extensionAPI.storage.sync.get({ 'countRedirects': 0 }, (item) => {
    var key = Object.keys(item)[0];
    document.getElementById('countRedirects').textContent = item[key];
  });
  extensionAPI.storage.sync.get({ 'countSearchFilters': 0 }, (item) => {
    var key = Object.keys(item)[0];
    document.getElementById('countSearchFilters').textContent = item[key];
  });
  extensionAPI.storage.sync.get({ 'countBreezeWiki': 0 }, (item) => {
    var key = Object.keys(item)[0];
    document.getElementById('countBreezeWiki').textContent = item[key];
  });
});

// Run v3 data migration:
migrateData();
