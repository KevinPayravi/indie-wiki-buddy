import { extensionAPI, SEARCHENGINEDOMAINS, camelCaseJoin, getUserSettings, setUserSetting, setUserSettings, getSiteDataByDestination, getApiFaviconURL } from "../scripts/common-functions.js";

// Clear wiki toggles
// Used when switching languages
export function resetOptions() {
  const toggleTableBody = document.getElementById('togglesBody');

  // Need to create a copy first, because the children change while iterating
  const toggleTableRows = [...toggleTableBody.children];
  for (const el of toggleTableRows) {
    if (el.classList?.contains('site-container')) {
      el.remove();
    }
  }

  // Clone "select all" buttons to reset listeners
  const setAllButtonIds = [
    'setAllWikiDisabled', 'setAllWikiRedirect', 'setAllWikiAlert',
    'setAllSearchEngineDisabled', 'setAllSearchEngineHide', 'setAllSearchEngineReplace'
  ];
  for (const id of setAllButtonIds) {
    const el = document.getElementById(id);
    el.replaceWith(el.cloneNode(true));
  }
}

export function createRadioButton(redirectEntry, action, category) {
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
    setUserSetting(settingsType, redirectID, action);
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
        resolve(getSiteDataByDestination());
      } else {
        resolve(sites);
      }
    });
  });
}

// Populate settings and toggles
export async function loadOptions(lang, textFilter = '') {
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

  // Load all of storage.sync
  // Per-wiki settings span several keys
  const syncStorage = await extensionAPI.storage.sync.get(null);
  const wikiSettings = await getUserSettings('wikiSettings', syncStorage);
  const searchEngineSettings = await getUserSettings('searchEngineSettings', syncStorage);
  const defaultWikiAction = syncStorage.defaultWikiAction ?? null;
  const defaultSearchAction = syncStorage.defaultSearchAction ?? null;

  if (generation !== loadOptionsGeneration) {
    return;
  }

  function addGlobalButtonEventListeners(action, category) {
    const globalButtonID = camelCaseJoin(['setAll', category, action]);
    const settingsType = `${category}Settings`;

    const setAllButton = document.getElementById(globalButtonID);
    setAllButton.addEventListener('click', () => {
      const buttonClassName = camelCaseJoin(['toggle', category, action]);
      const toggles = document.querySelectorAll(`#toggles input.${buttonClassName}`);
      const entries = {};
      for (let i = 0; i < toggles.length; i++) {
        toggles[i].checked = true;
        entries[toggles[i].getAttribute('data-wiki-key')] = action;
      }
      setUserSettings(settingsType, entries);
    });
  }

  // Load defaults for newly added wikis:
  switch (syncStorage.defaultWikiAction) {
    case 'disabled':
      document.options.defaultWikiAction.value = 'disabled';
      break;
    case 'redirect':
      document.options.defaultWikiAction.value = 'redirect';
      break;
    default:
      document.options.defaultWikiAction.value = 'alert';
  }
  switch (syncStorage.defaultSearchAction) {
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

      switch (wikiAction) {
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

      switch (searchEngineAction) {
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
        icon.src = getApiFaviconURL(redirectEntry);
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
      for (const cellContent of rowCells) {
        const cell = document.createElement("td");
        cell.appendChild(cellContent);
        siteRow.appendChild(cell);
      }

      fragment.appendChild(siteRow);
    }
    toggleTableBody.appendChild(fragment);
  }

  // Add "select all" button event listeners:
  addGlobalButtonEventListeners('redirect', 'wiki');
  addGlobalButtonEventListeners('alert', 'wiki');
  addGlobalButtonEventListeners('disabled', 'wiki');

  addGlobalButtonEventListeners('disabled', 'searchEngine');
  addGlobalButtonEventListeners('hide', 'searchEngine');
  addGlobalButtonEventListeners('replace', 'searchEngine');
}

// This is due to a Firefox bug where the permissions window
// may appear behind the popup
// https://bugzilla.mozilla.org/show_bug.cgi?id=1798454
const isPopup = window.location.pathname.includes('/popup/');

// Set power setting
function setPower(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.local.set({ 'power': setting });
  }
  const powerImage = document.getElementById('powerImage');
  const powerText = document.getElementById('powerText');
  const powerIcon = document.getElementById('powerIcon');
  const powerCheckbox = document.getElementById('powerCheckbox');

  if (setting === 'on') {
    if (powerImage) {
      powerImage.src = '../../images/power-on.png';
      powerImage.alt = extensionAPI.i18n.getMessage('settingsExtensionOn');
    }
    if (powerText) {
      powerText.textContent = extensionAPI.i18n.getMessage('settingsExtensionOn');
    }
    if (powerIcon) {
      powerIcon.innerText = '🔋';
    }
    if (powerCheckbox) {
      powerCheckbox.checked = true;
    }
  } else {
    if (powerImage) {
      powerImage.src = '../../images/power-off.png';
      powerImage.alt = extensionAPI.i18n.getMessage('settingsExtensionOff');
    }
    if (powerText) {
      powerText.textContent = extensionAPI.i18n.getMessage('settingsExtensionOff');
    }
    if (powerIcon) {
      powerIcon.innerText = '🪫';
    }
    if (powerCheckbox) {
      powerCheckbox.checked = false;
    }
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
extensionAPI.storage.sync.get({ 'notifications': 'on' }, (item) => {
  setNotifications(item.notifications, false);
});
extensionAPI.storage.sync.get({ 'hiddenResultsBanner': 'on' }, (item) => {
  setHiddenResultsBanner(item.hiddenResultsBanner, false);
});
extensionAPI.storage.sync.get({ 'crossLanguage': 'off' }, (item) => {
  setCrossLanguage(item.crossLanguage, false);
});
extensionAPI.storage.sync.get({ 'reorderResults': 'on' }, (item) => {
  setReorder(item.reorderResults, false);
});
extensionAPI.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
  setOpenChangelog(item.openChangelog, false);
});
extensionAPI.storage.sync.get({ 'breezewiki': 'off' }, (item) => {
  // Account for legacy 'on' setting for BreezeWiki
  if (item.breezewiki === 'on') {
    setBreezeWiki('redirect');
  } else {
    setBreezeWiki(item.breezewiki, false);
  }

  // Load BreezeWiki options if BreezeWiki is enabled
  if (item.breezewiki !== 'off') {
    loadBreezewikiOptions();
  }
});

// Event listeners for toggling search engines
let searchEngineRequestPending = false;
const searchEngineToggles = document.querySelectorAll('.searchEngineToggles label');
searchEngineToggles.forEach((engine) => {
  let engineInput = engine.querySelector('input');
  let engineName = engineInput.getAttribute('data-search-engine');
  engine.addEventListener('change', () => {
    if (engineInput.checked) {
      if (engineName === 'google') {
        // Google is default in the manifest; no permission request needed.
        extensionAPI.storage.sync.get({'searchEngineToggles': {}}, (settings) => {
          settings.searchEngineToggles[engineName] = 'on';
          extensionAPI.storage.sync.set({
            'searchEngineToggles': settings.searchEngineToggles
          });
        });
        engineInput.checked = true;
      } else {
        if (searchEngineRequestPending) {
          engineInput.checked = false;
          return;
        }
        searchEngineRequestPending = true;
        extensionAPI.permissions.request({
          origins: SEARCHENGINEDOMAINS[engineName]
        }, (granted) => {
          searchEngineRequestPending = false;
          // The callback argument will be true if the user granted the permissions.
          if (granted) {
            extensionAPI.storage.sync.get({'searchEngineToggles': {}}, (settings) => {
              settings.searchEngineToggles[engineName] = 'on';
              extensionAPI.storage.sync.set({
                'searchEngineToggles': settings.searchEngineToggles
              });
            });
            engineInput.checked = true;
          } else {
            engineInput.checked = false;
          }
        });
        if (isPopup) window.close();
      }
    } else {
      extensionAPI.storage.sync.get({ 'searchEngineToggles': {} }, (settings) => {
        settings.searchEngineToggles[engineName] = 'off';
        extensionAPI.storage.sync.set({
          'searchEngineToggles': settings.searchEngineToggles
        });
      });
      engineInput.checked = false;
      if (engineName !== 'google') {
        extensionAPI.permissions.remove({
          origins: SEARCHENGINEDOMAINS[engineName]
        });
      }
    }
  });
});
document.querySelectorAll('.searchEngineToggles input').forEach((el) => {
  const searchEngineName = el.getAttribute('data-search-engine');
  extensionAPI.storage.sync.get({
      'searchEngineToggles': {}
  }, (settings) => {
    if (searchEngineName === 'google') {
      // Google is default in the manifest; no permission request needed.
      if (
        settings.searchEngineToggles[searchEngineName] === 'on'
        || !settings.searchEngineToggles.hasOwnProperty(searchEngineName)
      ) {
        el.checked = true;
      } else {
        el.checked = false;
      }
    } else {
      const permissionObj = { origins: SEARCHENGINEDOMAINS[searchEngineName] };
      extensionAPI.permissions.contains(permissionObj, (hasPermission) => {
        if (hasPermission) {
          if (
            settings.searchEngineToggles[searchEngineName] === 'on'
            || !settings.searchEngineToggles.hasOwnProperty(searchEngineName)
          ) {
            el.checked = true;
          } else {
            el.checked = false;
          }
        } else {
          el.checked = false;
        }
      });
    }
  });
});


// Set notifications setting
function setNotifications(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'notifications': setting });
  }
  const notificationsIcon = document.getElementById('notificationsIcon');
  if (notificationsIcon) {
    if (setting === 'on') {
      document.getElementById('notificationsCheckbox').checked = true;
      notificationsIcon.innerText = '🔔';
    } else {
      document.getElementById('notificationsCheckbox').checked = false;
      notificationsIcon.innerText = '🔕';
    }
  }
}

// Set search results hidden banner setting
function setHiddenResultsBanner(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'hiddenResultsBanner': setting });
  }
  const hiddenResultsBannerCheckbox = document.getElementById('hiddenResultsBannerCheckbox');
  if (hiddenResultsBannerCheckbox) {
    if (setting === 'on') {
      hiddenResultsBannerCheckbox.checked = true;
    } else {
      hiddenResultsBannerCheckbox.checked = false;
    }
  }
}

// Set cross-language setting
function setCrossLanguage(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'crossLanguage': setting });
  }

  const crossLanguageIcon = document.getElementById('crossLanguageIcon');
  if (crossLanguageIcon) {
    if (setting === 'on') {
      document.getElementById('crossLanguageCheckbox').checked = true;
      crossLanguageIcon.innerText = '🌐';
    } else {
      document.getElementById('crossLanguageCheckbox').checked = false;
      crossLanguageIcon.innerText = '⚪️';
    }
  }
}

// Set re-order setting
function setReorder(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'reorderResults': setting });
  }

  const reorderResultsCheckbox = document.getElementById('reorderResultsCheckbox');
  if (reorderResultsCheckbox) {
    if (setting === 'on') {
      reorderResultsCheckbox.checked = true;
    } else {
      reorderResultsCheckbox.checked = false;
    }
  }
}

// Set open changelog setting
function setOpenChangelog(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'openChangelog': setting });
  }

  const openChangelogIcon = document.getElementById('openChangelogIcon');
  if (openChangelogIcon) {
    if (setting === 'on') {
      document.getElementById('openChangelogCheckbox').checked = true;
      openChangelogIcon.innerText = '📂';
    } else {
      document.getElementById('openChangelogCheckbox').checked = false;
      openChangelogIcon.innerText = '📁';
    }
  }
}

// Event listeners for general setting toggles
document.getElementById('powerCheckbox')?.addEventListener('change', () => {
  extensionAPI.storage.local.get({ 'power': 'on' }, (item) => {
    if (item.power === 'on') {
      setPower('off');
    } else {
      setPower('on');
    }
  });
});
document.getElementById('notificationsCheckbox')?.addEventListener('change', () => {
  extensionAPI.storage.sync.get({ 'notifications': 'on' }, (item) => {
    if (item.notifications === 'on') {
      setNotifications('off');
    } else {
      setNotifications('on');
    }
  });
});
document.getElementById('hiddenResultsBannerCheckbox')?.addEventListener('change', () => {
  extensionAPI.storage.sync.get({ 'hiddenResultsBanner': 'on' }, (item) => {
    if (item.hiddenResultsBanner === 'on') {
      setHiddenResultsBanner('off');
    } else {
      setHiddenResultsBanner('on');
    }
  });
});
document.getElementById('crossLanguageCheckbox')?.addEventListener('change', () => {
  extensionAPI.storage.sync.get({ 'crossLanguage': 'off' }, (item) => {
    if (item.crossLanguage === 'on') {
      setCrossLanguage('off');
    } else {
      setCrossLanguage('on');
    }
  });
});
document.getElementById('reorderResultsCheckbox')?.addEventListener('change', () => {
  extensionAPI.storage.sync.get({ 'reorderResults': 'on' }, (item) => {
    if (item.reorderResults === 'on') {
      setReorder('off');
    } else {
      setReorder('on');
    }
  });
});
document.getElementById('openChangelogCheckbox')?.addEventListener('change', () => {
  extensionAPI.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
    if (item.openChangelog === 'on') {
      setOpenChangelog('off');
    } else {
      setOpenChangelog('on');
    }
  });
});
document.querySelectorAll('[name="breezewikiSetting"]').forEach((el) => {
  el.addEventListener('change', async () => {
    const settingValue = document.options.breezewikiSetting.value;
    extensionAPI.storage.sync.set({ 'breezewiki': settingValue });
    setBreezeWiki(settingValue);
    if (settingValue !== 'off') {
      loadBreezewikiOptions();
    }
  });
});

// Add event listener for BreezeWiki host select
const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
const breezewikiHostApply = document.getElementById('breezewikiHostApply');
breezewikiHostSelect.addEventListener('change', () => {
  if (breezewikiHostSelect.value === 'CUSTOM') {
    document.getElementById('breezewikiCustomHost').style.display = 'block';
    document.getElementById('breezewikiCustomHostStatus').innerText = '';
    if (breezewikiHostApply) breezewikiHostApply.style.display = 'none';
  } else {
    document.getElementById('breezewikiCustomHost').style.display = 'none';
    if (breezewikiHostApply) breezewikiHostApply.style.display = 'inline';
  }
});
if (breezewikiHostApply) {
  breezewikiHostApply.addEventListener('click', () => {
    const selectedHost = breezewikiHostSelect.value;
    // Disable to prevent multiple requests from rapid/double clicks
    breezewikiHostApply.disabled = true;
    
    // Store pending intent so background script can save it if popup closes
    extensionAPI.storage.local.set({ 'pendingBreezeWikiHost': selectedHost });

    extensionAPI.permissions.request({
      origins: [selectedHost + '/*']
    }, (granted) => {
      breezewikiHostApply.disabled = false;
      // The callback argument will be true if the user granted the permissions.
      if (granted) {
        extensionAPI.storage.sync.set({ 'breezewikiHost': selectedHost });
        breezewikiHostApply.style.display = 'none';
      } else {
        breezewikiHostSelect.value = 'https://breezewiki.com';
        breezewikiHostApply.style.display = 'none';
      }
    });
    if (isPopup) window.close();
  });
}

// Set BreezeWiki settings
function setBreezeWiki(setting, storeSetting = true) {
  // Account for legacy BreezeWiki setting ('on' is now 'redirect')
  if (setting === 'on') {
    setting = 'redirect';
  }

  // Store BreezeWiki setting
  if (storeSetting) {
    extensionAPI.storage.sync.set({ 'breezewiki': setting });
  }

  // Set BreezeWiki value on radio group
  if (document.options.breezewikiSetting) {
    document.options.breezewikiSetting.value = setting;
  }

  // Toggle/update host display
  const breezewikiHost = document.getElementById('breezewikiHost');
  if (breezewikiHost && setting !== 'off') {
    breezewikiHost.style.display = 'block';
    extensionAPI.storage.sync.get({ 'breezewikiHost': null }, (host) => {
      if (!host.breezewikiHost) {
        fetch('https://bw.getindie.wiki/instances.json')
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Indie Wiki Buddy failed to get BreezeWiki data.');
          }).then((breezewikiHosts) => {
            breezewikiHosts = breezewikiHosts.filter(host =>
              extensionAPI.runtime.getManifest().version.localeCompare(host.iwb_version,
                undefined,
                { numeric: true, sensitivity: 'base' }
              ) >= 0
            );
            // Check if BreezeWiki's main site is available
            let breezewikiMain = breezewikiHosts.filter(host => host.instance === 'https://breezewiki.com');
            if (breezewikiMain.length > 0) {
              host.breezewikiHost = breezewikiMain[0].instance;
            } else {
              // If BreezeWiki.com is not available, set to a random mirror
              try {
                host.breezewikiHost = breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance;
              } catch (e) {
                console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
              }
            }
            extensionAPI.storage.sync.set({ 'breezewikiHost': host.breezewikiHost });
            extensionAPI.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
            extensionAPI.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
            document.getElementById('breezewikiHostSelect').value = host.breezewikiHost;
          }).catch((e) => {
            console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);

            // If fetch fails and no host is set, default to breezewiki.com:
            if (!host) {
              extensionAPI.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
            }
          });
      } else {
        document.getElementById('breezewikiHostSelect').value = host.breezewikiHost;
      }
    });
  } else {
    if (breezewikiHost) {
      breezewikiHost.style.display = 'none';
    }
  }
}

function populateBreezewikiHosts(breezewikiHosts, selectedHost, customHostName) {
  // Populate dropdown selection of hosts
  const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
  while (breezewikiHostSelect.firstChild) {
    // Remove any existing options
    breezewikiHostSelect.removeChild(breezewikiHostSelect.firstChild);
  }
  document.getElementById('breezewikiHostSelectLoading').style.display = 'none';

  // Add known BreezeWiki domains:
  for (var i = 0; i < breezewikiHosts.length; i++) {
    let option = document.createElement('option');
    option.value = breezewikiHosts[i].instance;
    let textContent = breezewikiHosts[i].instance.replace('https://', '');
    const numberOfPeriods = (textContent.match(/\./g) || []).length;
    if (numberOfPeriods > 1) {
      textContent = textContent.substring(textContent.indexOf('.') + 1);
    }
    option.textContent = textContent;
    breezewikiHostSelect.appendChild(option);
  }

  // Add custom BreezeWiki host option:
  let customOption = document.createElement('option');
  customOption.value = 'CUSTOM';
  customOption.textContent = extensionAPI.i18n.getMessage('settingsBreezeWikiCustomHostOption');
  breezewikiHostSelect.appendChild(customOption);
  breezewikiHostSelect.value = selectedHost;

  // Set up custom domain input:
  if (breezewikiHostSelect.value === 'CUSTOM') {
    document.getElementById('breezewikiCustomHost').style.display = 'block';
  } else {
    document.getElementById('breezewikiCustomHost').style.display = 'none';
  }
  document.getElementById('customBreezewikiHost').value = customHostName.replace(/^https?:\/\//i, '');
}

// Populate BreezeWiki dropdown when enabled
async function loadBreezewikiOptions() {
  // Load BreezeWiki options:
  extensionAPI.storage.sync.get(['breezewikiHostOptions', 'breezewikiHostFetchTimestamp', 'breezewikiHost', 'breezewikiCustomHost'], (item) => {
    let hostOptions = item.breezewikiHostOptions;
    let hostFetchTimestamp = item.breezewikiHostFetchTimestamp;
    let host = item.breezewikiHost;
    let customHost = item.breezewikiCustomHost || '';

    // Fetch and cache list of BreezeWiki hosts if first time,
    // or if it has been 24 hrs since last refresh
    if (!host || !hostOptions || !hostFetchTimestamp || (Date.now() - 86400000 > hostFetchTimestamp)) {
      fetch('https://bw.getindie.wiki/instances.json')
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Indie Wiki Buddy failed to get BreezeWiki data.');
        }).then((breezewikiHosts) => {
          breezewikiHosts = breezewikiHosts.filter(host =>
            extensionAPI.runtime.getManifest().version.localeCompare(host.iwb_version,
              undefined,
              { numeric: true, sensitivity: 'base' }
            ) >= 0
          );
          // If host isn't set, or currently selected host is no longer available, select random host:
          if (!host || !breezewikiHosts.some(item => item.instance === host)) {
            // Check if BreezeWiki's main site is available
            let breezewikiMain = breezewikiHosts.filter(host => host.instance === 'https://breezewiki.com');
            if (breezewikiMain.length > 0) {
              host = breezewikiMain[0].instance;
            } else {
              // If BreezeWiki.com is not available, set to a random mirror
              try {
                host = breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance;
              } catch (e) {
                console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
              }
            }
          }
          // Store BreezeWiki host options and timestamp
          extensionAPI.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
          extensionAPI.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });

          // Verify we still have permission for the selected host; if not, fall back to breezewiki.com
          if (host !== 'https://breezewiki.com') {
            extensionAPI.permissions.contains({ origins: [host + '/*'] }, (hasPermission) => {
              if (!hasPermission) {
                host = 'https://breezewiki.com';
              }
              populateBreezewikiHosts(breezewikiHosts, host, customHost);
              extensionAPI.storage.sync.set({ 'breezewikiHost': host });
            });
          } else {
            populateBreezewikiHosts(breezewikiHosts, host, customHost);
            extensionAPI.storage.sync.set({ 'breezewikiHost': host });
          }
        }).catch((e) => {
          console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);

          // If fetch fails and no host is set, default to breezewiki.com:
          if (!host) {
            extensionAPI.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
          }
        });
    } else {
      // If currently selected host is no longer available, select random host:
      if (host !== 'CUSTOM' && !hostOptions.some(item => item.instance === host)) {
        host = hostOptions[Math.floor(Math.random() * hostOptions.length)].instance;
      }

      // Verify we still have permission for the selected host; if not, fall back to breezewiki.com
      const hostToVerify = (host === 'CUSTOM') ? customHost : host;
      if (hostToVerify && hostToVerify !== 'https://breezewiki.com') {
        extensionAPI.permissions.contains({ origins: [hostToVerify + '/*'] }, (hasPermission) => {
          if (!hasPermission) {
            host = 'https://breezewiki.com';
          }
          populateBreezewikiHosts(hostOptions, host, customHost);
          // Store BreezeWiki host details
          extensionAPI.storage.sync.set({ 'breezewikiHost': host });
        });
      } else {
        populateBreezewikiHosts(hostOptions, host, customHost);
        // Store BreezeWiki host details
        extensionAPI.storage.sync.set({ 'breezewikiHost': host });
      }
    }
  });
}

let customDomainRequestPending = false;
function setCustomBreezewikiDomain() {
  if (customDomainRequestPending) return;
  customDomainRequestPending = true;
  let breezewikiCustomDomain = document.getElementById('customBreezewikiHost').value;
  // Add "https://" if not already present
  if (!/^https?:\/\//i.test(breezewikiCustomDomain)) {
    breezewikiCustomDomain = 'https://' + breezewikiCustomDomain;
  }
  // Reduce to just protocol + hostname
  breezewikiCustomDomain = new URL(breezewikiCustomDomain);
  breezewikiCustomDomain = breezewikiCustomDomain.protocol + "//" + breezewikiCustomDomain.hostname;
  breezewikiCustomDomain = breezewikiCustomDomain.toString();

  extensionAPI.storage.local.set({ 'pendingCustomBreezeWikiHost': breezewikiCustomDomain });
  extensionAPI.permissions.request({
    origins: [breezewikiCustomDomain + '/*']
  }, (granted) => {
    customDomainRequestPending = false;
    // The callback argument will be true if the user granted the permissions.
    if (granted) {
      extensionAPI.storage.sync.set({ 'breezewikiCustomHost': breezewikiCustomDomain });
      extensionAPI.storage.sync.set({ 'breezewikiHost': 'CUSTOM' });
      if (document.getElementById('breezewikiCustomHostStatus')) {
        document.getElementById('breezewikiCustomHostStatus').innerText = extensionAPI.i18n.getMessage('settingsBreezeWikiCustomHostSetSuccessful');
      }
    } else {
      if (document.getElementById('breezewikiCustomHostStatus')) {
        document.getElementById('breezewikiCustomHostStatus').innerText = extensionAPI.i18n.getMessage('settingsBreezeWikiCustomHostSetFailed');
      }
    }
  });

  if (isPopup) {
    window.close();
  }
}

const setCustomBreezewikiDomainButton = document.getElementById('setCustomBreezewikiDomain');
if (setCustomBreezewikiDomainButton) {
  setCustomBreezewikiDomainButton.addEventListener('click', () => {
    setCustomBreezewikiDomain();
  });
}
const customBreezewikiHostInput = document.getElementById('customBreezewikiHost');
if (customBreezewikiHostInput) {
  customBreezewikiHostInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      setCustomBreezewikiDomain();
    }
  });
}

if (document.options) {
  document.options.addEventListener("submit", function (e) {
    e.preventDefault();
    return false;
  });
}

// If running Opera, show note about search engine access
if (navigator.userAgent.match(/OPR\//)) {
  const notificationBannerOpera = document.getElementById('notificationBannerOpera');
  if (notificationBannerOpera) {
    extensionAPI.storage.local.get({ 'hideOperaPermissionsNote': false }, (item) => {
      if (!item.hideOperaPermissionsNote) {
        notificationBannerOpera.style.display = 'block';

        const operaPermsHideLink = document.getElementById('operaPermsHideLink');
        if (operaPermsHideLink) {
          operaPermsHideLink.addEventListener('click', () => {
            extensionAPI.storage.local.set({ 'hideOperaPermissionsNote': true });
            notificationBannerOpera.style.display = 'none';
          });
        }
      }
    });
  }
}

if (document.options && document.options.defaultWikiAction) {
  // Set default action setting
  extensionAPI.storage.sync.get(['defaultWikiAction'], (item) => {
    if (item.defaultWikiAction === 'disabled') {
      document.options.defaultWikiAction.value = 'disabled';
    } else if (item.defaultWikiAction === 'redirect') {
      document.options.defaultWikiAction.value = 'redirect';
    } else {
      document.options.defaultWikiAction.value = 'alert';
    }
  });
}

if (document.options && document.options.defaultSearchAction) {
  // Set default search engine setting
  extensionAPI.storage.sync.get(['defaultSearchAction'], (item) => {
    if (item.defaultSearchAction === 'disabled') {
      document.options.defaultSearchAction.value = 'disabled';
    } else if (item.defaultSearchAction === 'hide') {
      document.options.defaultSearchAction.value = 'hide';
    } else {
      document.options.defaultSearchAction.value = 'replace';
    }
  });
}

const versionElement = document.getElementById('version');
if (versionElement) {
  const version = extensionAPI.runtime.getManifest().version;
  versionElement.textContent = 'v' + version;
}

// Somehow this has to be done manually
document.querySelectorAll('[data-msg]').forEach(element => {
  // Check data-msg-ph-* attributes for placeholder text
  // iterate
  const placeholders = [];
  for (let i = 1; i <= 9; i++) {
    let ph = element.getAttribute(`data-msg-ph-${i}`);
    if (ph) {
      placeholders.push(ph);
    }
  }

  // Usage of innerHTML below is safe,
  // as we are displaying literals from the extension's localization files,
  // populated with placeholder HTML from elsewhere in the code.
  element.innerHTML = extensionAPI.i18n.getMessage(element.dataset.msg, placeholders);
});

document.querySelectorAll('[data-msg-attr]').forEach(element => {
  const attrs = element.dataset.msgAttr.split(',');
  attrs.forEach(attr => {
    const [key, value] = attr.split('=');
    element.setAttribute(key, extensionAPI.i18n.getMessage(value));
  });
});
