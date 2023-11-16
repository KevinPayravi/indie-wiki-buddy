const LANGS = ["DE", "EN", "ES", "FR", "IT", "PL", "TOK"];
var sites = [];

// Create object prototypes for getting and setting attributes:
Object.prototype.get = function (prop) {
  this[prop] = this[prop] || {};
  return this[prop];
};
Object.prototype.set = function (prop, value) {
  this[prop] = value;
}

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

// Get wiki data from data folder
async function getData() {
  let sites = [];
  let promises = [];
  for (let i = 0; i < LANGS.length; i++) {
    promises.push(fetch(chrome.runtime.getURL('data/sites' + LANGS[i] + '.json'))
      .then((resp) => resp.json())
      .then(function (jsonData) {
        jsonData.forEach((site) => site.language = LANGS[i]);
        sites = sites.concat(jsonData);
      }));
  }
  await Promise.all(promises);
  return sites;
}

// Populate BreezeWiki dropdown when enabled
async function loadBreezeWikiOptions() {
  // Load BreezeWiki options:
  chrome.storage.sync.get(['breezewikiHostOptions', 'breezewikiHostFetchTimestamp', 'breezewikiHost'], function (item) {
    let hostOptions = item.breezewikiHostOptions;
    let hostFetchTimestamp = item.breezewikiHostFetchTimestamp;
    let host = item.breezewikiHost;
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
            chrome.runtime.getManifest().version.localeCompare(host.iwb_version,
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
          // Populate dropdown selection of hosts
          const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
          while (breezewikiHostSelect.firstChild) {
            // Remove any existing options
            breezewikiHostSelect.removeChild(breezewikiHostSelect.lastChild);
          }
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
            if (option.value === host) {
              breezewikiHostSelect.value = host;
            }
          }
          // Store BreezeWiki host details
          chrome.storage.sync.set({ 'breezewikiHost': host });
          chrome.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
          chrome.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
        }).catch((e) => {
          console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);

          // If fetch fails and no host is set, default to breezewiki.com:
          if (!host) {
            chrome.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
          }
        });
    } else {
      // If currently selected host is no longer available, select random host:
      if (!hostOptions.some(item => item.instance === host)) {
        host = hostOptions[Math.floor(Math.random() * hostOptions.length)].instance;
      }
      // Populate dropdown selection of hosts
      const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
      while (breezewikiHostSelect.firstChild) {
        // Remove any existing options
        breezewikiHostSelect.removeChild(breezewikiHostSelect.lastChild);
      }
      for (var i = 0; i < hostOptions.length; i++) {
        let option = document.createElement('option');
        option.value = hostOptions[i].instance;
        let textContent = hostOptions[i].instance.replace('https://', '');
        const numberOfPeriods = (textContent.match(/\./g) || []).length;
        if (numberOfPeriods > 1) {
          textContent = textContent.substring(textContent.indexOf('.') + 1);
        }
        option.textContent = textContent;
        breezewikiHostSelect.appendChild(option);
        if (option.value === host) {
          breezewikiHostSelect.value = host;
        }
      }
      // Store BreezeWiki host details
      chrome.storage.sync.set({ 'breezewikiHost': host });
    }
  });
}

// Populate popup settings and toggles
async function loadOptions(lang) {
  sites = await getData();

  // Sort sites alphabetically by destination
  sites.sort((a, b) => {
    a = a.destination.toLowerCase().replace(' ', '');
    b = b.destination.toLowerCase().replace(' ', '');
    return a < b ? -1 : (a > b ? 1 : 0);
  });

  chrome.storage.local.get(function (localStorage) {
    chrome.storage.sync.get(function (syncStorage) {
      const storage = { ...syncStorage, ...localStorage };
      let wikiSettings = storage.wikiSettings || {};
      let searchEngineSettings = storage.searchEngineSettings || {};
      let defaultWikiAction = storage.defaultWikiAction || null;
      let defaultSearchAction = storage.defaultSearchAction || null;

      // Load BreezeWiki options:
      chrome.storage.sync.get(['breezewiki'], function (item) {
        if (item.breezewiki === 'on') {
          loadBreezeWikiOptions();
        }
      });

      // Load defaults for newly added wikis:
      chrome.storage.sync.get(['defaultWikiAction'], function (item) {
        if (item.defaultWikiAction === 'disabled') {
          document.options.defaultWikiAction.value = 'disabled';
        } else if (item.defaultWikiAction === 'redirect') {
          document.options.defaultWikiAction.value = 'redirect';
        } else {
          document.options.defaultWikiAction.value = 'alert';
        }
      });
      chrome.storage.sync.get(['defaultSearchAction'], function (item) {
        if (item.defaultSearchAction === 'disabled') {
          document.options.defaultSearchAction.value = 'disabled';
        } else if (item.defaultSearchAction === 'hide') {
          document.options.defaultSearchAction.value = 'hide';
        } else {
          document.options.defaultSearchAction.value = 'replace';
        }
      });

      // Populate individual wiki settings:
      const toggleContainer = document.getElementById('toggles');
      for (var i = 0; i < sites.length; i++) {
        if ((lang === 'ALL') || (sites[i].language === lang)) {
          var key = sites[i].id;

          // Create radio for disabling action on wiki:
          let labelDisabled = document.createElement("label");
          let inputDisabled = document.createElement("input");
          inputDisabled.classList = 'toggleDisable';
          inputDisabled.type = "radio";
          inputDisabled.name = key + '-wiki-action';
          inputDisabled.title = 'Do nothing for ' + sites[i].origins_label + ' on search engines';
          inputDisabled.lang = sites[i].language;
          inputDisabled.setAttribute('data-wiki-key', key);

          // Create radio for inserting banner on wiki:
          let labelAlert = document.createElement("label");
          let inputAlert = document.createElement("input");
          inputAlert.classList = 'toggleAlert';
          inputAlert.type = "radio";
          inputAlert.name = key + '-wiki-action';
          inputAlert.title = 'Show banner on ' + sites[i].origins_label + ' linking to ' + sites[i].destination;
          inputAlert.lang = sites[i].language;
          inputAlert.setAttribute('data-wiki-key', key);

          // Create radio for redirecting wiki:
          let labelRedirect = document.createElement("label");
          let inputRedirect = document.createElement("input");
          inputRedirect.classList = 'toggleRedirect';
          inputRedirect.type = "radio";
          inputRedirect.name = key + '-wiki-action';
          inputRedirect.title = 'Automatically redirect ' + sites[i].origins_label + ' to ' + sites[i].destination;
          inputRedirect.lang = sites[i].language;
          inputRedirect.setAttribute('data-wiki-key', key);

          // Create radio for disabling action on search engines:
          let labelSearchEngineDisabled = document.createElement("label");
          let inputSearchEngineDisabled = document.createElement("input");
          inputSearchEngineDisabled.classList = 'toggleSearchEngineDisabled';
          inputSearchEngineDisabled.type = "radio";
          inputSearchEngineDisabled.name = key + '-search-engine-action';
          inputSearchEngineDisabled.title = 'Do nothing for ' + sites[i].origins_label;
          inputSearchEngineDisabled.lang = sites[i].language;
          inputSearchEngineDisabled.setAttribute('data-wiki-key', key);

          // Create radio for replacing results on search engines:
          let labelSearchEngineReplace = document.createElement("label");
          let inputSearchEngineReplace = document.createElement("input");
          inputSearchEngineReplace.classList = 'toggleSearchEngineReplace';
          inputSearchEngineReplace.type = "radio";
          inputSearchEngineReplace.name = key + '-search-engine-action';
          inputSearchEngineReplace.title = 'Replace ' + sites[i].origins_label + ' search engine results with ' + sites[i].destination;
          inputSearchEngineReplace.lang = sites[i].language;
          inputSearchEngineReplace.setAttribute('data-wiki-key', key);

          // Create radio for hiding results on search engines:
          let labelSearchEngineHide = document.createElement("label");
          let inputSearchEngineHide = document.createElement("input");
          inputSearchEngineHide.classList = 'toggleSearchEngineHide';
          inputSearchEngineHide.type = "radio";
          inputSearchEngineHide.name = key + '-search-engine-action';
          inputSearchEngineHide.title = 'Hide ' + sites[i].origins_label + ' from search engine results';
          inputSearchEngineHide.lang = sites[i].language;
          inputSearchEngineHide.setAttribute('data-wiki-key', key);

          // Check radio buttons based on user's settings
          if (wikiSettings[key]) {
            if (wikiSettings[key] === 'disabled') {
              inputDisabled.checked = true;
            } else if (wikiSettings[key] === 'redirect') {
              inputRedirect.checked = true;
            } else {
              inputAlert.checked = true;
            }
          } else {
            let actionSetting = defaultWikiAction;
            if (actionSetting) {
              if (actionSetting === 'disabled') {
                inputDisabled.checked = true;
              } else if (actionSetting === 'redirect') {
                inputRedirect.checked = true;
              } else {
                inputAlert.checked = true;
              }
            } else {
              inputAlert.checked = true;
            }
          }

          if (searchEngineSettings[key]) {
            if (searchEngineSettings[key] === 'disabled') {
              inputSearchEngineDisabled.checked = true;
            } else if (searchEngineSettings[key] === 'replace') {
              inputSearchEngineReplace.checked = true;
            } else {
              inputSearchEngineHide.checked = true;
            }
          } else {
            let actionSetting = defaultSearchAction;
            if (actionSetting) {
              if (actionSetting === 'true' || actionSetting === 'replace') {
                inputSearchEngineReplace.checked = true;
              } else if (actionSetting === 'false' || actionSetting === 'disabled') {
                inputSearchEngineDisabled.checked = true;
              } else {
                inputSearchEngineHide.checked = true;
              }
            } else {
              inputSearchEngineReplace.checked = true;
            }
          }

          // Add listeners for when user clicks control:
          inputDisabled.addEventListener('click', function (input) {
            chrome.storage.sync.get({ 'wikiSettings': {} }, function (response) {
              var key = input.target.getAttribute('data-wiki-key');
              response.wikiSettings.set(key, 'disabled');
              chrome.storage.sync.set({ 'wikiSettings': response.wikiSettings });
            });
          });
          inputAlert.addEventListener('click', function (input) {
            chrome.storage.sync.get({ 'wikiSettings': {} }, function (response) {
              var key = input.target.getAttribute('data-wiki-key');
              response.wikiSettings.set(key, 'alert');
              chrome.storage.sync.set({ 'wikiSettings': response.wikiSettings });
            });
          });
          inputRedirect.addEventListener('click', function (input) {
            chrome.storage.sync.get({ 'wikiSettings': {} }, function (response) {
              var key = input.target.getAttribute('data-wiki-key');
              response.wikiSettings.set(key, 'redirect');
              chrome.storage.sync.set({ 'wikiSettings': response.wikiSettings });
            });
          });
          inputSearchEngineDisabled.addEventListener('click', function (input) {
            chrome.storage.sync.get({ 'searchEngineSettings': {} }, function (response) {
              var key = input.target.getAttribute('data-wiki-key');
              response.searchEngineSettings.set(key, 'disabled');
              chrome.storage.sync.set({ 'searchEngineSettings': response.searchEngineSettings });
            });
          });
          inputSearchEngineReplace.addEventListener('click', function (input) {
            chrome.storage.sync.get({ 'searchEngineSettings': {} }, function (response) {
              var key = input.target.getAttribute('data-wiki-key');
              response.searchEngineSettings.set(key, 'replace');
              chrome.storage.sync.set({ 'searchEngineSettings': response.searchEngineSettings });
            });
          });
          inputSearchEngineHide.addEventListener('click', function (input) {
            chrome.storage.sync.get({ 'searchEngineSettings': {} }, function (response) {
              var key = input.target.getAttribute('data-wiki-key');
              response.searchEngineSettings.set(key, 'hide');
              chrome.storage.sync.set({ 'searchEngineSettings': response.searchEngineSettings });
            });
          });

          // Output wiki disable radio button:
          let inputDisabledText = document.createElement('span');
          inputDisabledText.classList.add('visuallyHidden');
          inputDisabledText.textContent = 'Disable action for ' + sites[i].origins_label;
          labelDisabled.appendChild(inputDisabled);
          labelDisabled.appendChild(inputDisabledText);

          // Output wiki alert radio button:
          let inputAlertText = document.createElement('span');
          inputAlertText.classList.add('visuallyHidden');
          inputAlertText.textContent = 'Show a banner on ' + sites[i].origins_label + ' linking to ' + sites[i].destination;
          labelAlert.appendChild(inputAlert);
          labelAlert.appendChild(inputAlertText);

          // Output wiki redirect radio button:
          let inputRedirectText = document.createElement('span');
          inputRedirectText.classList.add('visuallyHidden');
          inputRedirectText.textContent = 'Automatically redirect ' + sites[i].origins_label + ' to ' + sites[i].destination;
          labelRedirect.appendChild(inputRedirect);
          labelRedirect.appendChild(inputRedirectText);

          // Output search engine disable radio button:
          let inputSearchEngineDisabledText = document.createElement('span');
          inputSearchEngineDisabledText.classList.add('visuallyHidden');
          inputSearchEngineDisabledText.textContent = 'Do nothing for ' + sites[i].origins_label + ' on search engines';
          labelSearchEngineDisabled.appendChild(inputSearchEngineDisabled);
          labelSearchEngineDisabled.appendChild(inputSearchEngineDisabledText);

          // Output search engine replace radio button:
          let inputSearchEngineReplaceText = document.createElement('span');
          inputSearchEngineReplaceText.classList.add('visuallyHidden');
          inputSearchEngineReplaceText.textContent = 'Replace ' + sites[i].origins_label + ' search engine results with ' + sites[i].destination;
          labelSearchEngineReplace.appendChild(inputSearchEngineReplace);
          labelSearchEngineReplace.appendChild(inputSearchEngineReplaceText);

          // Output search engine hide radio button:
          let inputSearchEngineHideText = document.createElement('span');
          inputSearchEngineHideText.classList.add('visuallyHidden');
          inputSearchEngineHideText.textContent = 'Hide ' + sites[i].origins_label + ' from search engines';
          labelSearchEngineHide.appendChild(inputSearchEngineHide);
          labelSearchEngineHide.appendChild(inputSearchEngineHideText);

          // Output wiki info:
          let wikiInfo = document.createElement('span');
          let iconLink = document.createElement("a");
          iconLink.href = 'https://' + sites[i].destination_base_url + sites[i].destination_content_path;
          iconLink.title = 'Visit ' + sites[i].destination;
          iconLink.target = '_blank';
          let icon = document.createElement("img");
          icon.src = 'favicons/' + sites[i].language.toLowerCase() + '/' + sites[i].destination_icon;
          icon.alt = 'Visit ' + sites[i].destination;
          iconLink.appendChild(icon);
          wikiInfo.appendChild(iconLink);
          if (lang === 'ALL') {
            const languageSpan = document.createElement('span');
            languageSpan.classList.add('text-sm');
            languageSpan.innerText = ' [' + sites[i].language + '] ';
            wikiInfo.appendChild(languageSpan);
          }
          let wikiLink = document.createElement("a");
          wikiLink.href = 'https://' + sites[i].destination_base_url + sites[i].destination_content_path;
          wikiLink.title = 'Visit ' + sites[i].destination;
          wikiLink.target = '_blank';
          wikiLink.appendChild(document.createTextNode(sites[i].destination));
          wikiInfo.appendChild(wikiLink);
          wikiInfo.appendChild(document.createTextNode(' (from ' + sites[i].origins_label + ')'));
          let siteContainer = document.createElement("div");

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
      }

      // Add "select all" button event listeners:
      const setAllRedirect = document.getElementById('setAllRedirect');
      setAllRedirect.addEventListener('click', function () {
        const toggles = document.querySelectorAll('#toggles input.toggleRedirect');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          wikiSettings.set(toggles[i].getAttribute('data-wiki-key'), 'redirect');
        }
        chrome.storage.sync.set({ 'wikiSettings': wikiSettings });
      });

      const setAllAlert = document.getElementById('setAllAlert');
      setAllAlert.addEventListener('click', function () {
        const toggles = document.querySelectorAll('#toggles input.toggleAlert');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          wikiSettings.set(toggles[i].getAttribute('data-wiki-key'), 'alert');
        }
        chrome.storage.sync.set({ 'wikiSettings': wikiSettings });
      });

      const setAllDisabled = document.getElementById('setAllDisabled');
      setAllDisabled.addEventListener('click', function () {
        const toggles = document.querySelectorAll('#toggles input.toggleDisable');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          wikiSettings.set(toggles[i].getAttribute('data-wiki-key'), 'disabled');
        }
        chrome.storage.sync.set({ 'wikiSettings': wikiSettings });
      });

      const setAllSearchEngineDisabled = document.getElementById('setAllSearchEngineDisabled');
      setAllSearchEngineDisabled.addEventListener('click', function () {
        const toggles = document.querySelectorAll('#toggles input.toggleSearchEngineDisabled');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          searchEngineSettings.set(toggles[i].getAttribute('data-wiki-key'), 'disabled');
        }
        chrome.storage.sync.set({ 'searchEngineSettings': searchEngineSettings });
      });

      const setAllSearchEngineHide = document.getElementById('setAllSearchEngineHide');
      setAllSearchEngineHide.addEventListener('click', function () {
        const toggles = document.querySelectorAll('#toggles input.toggleSearchEngineHide');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          searchEngineSettings.set(toggles[i].getAttribute('data-wiki-key'), 'hide');
        }
        chrome.storage.sync.set({ 'searchEngineSettings': searchEngineSettings });
      });

      const setAllSearchEngineReplace = document.getElementById('setAllSearchEngineReplace');
      setAllSearchEngineReplace.addEventListener('click', function () {
        const toggles = document.querySelectorAll('#toggles input.toggleSearchEngineReplace');
        for (var i = 0; i < toggles.length; i++) {
          toggles[i].checked = true;
          searchEngineSettings.set(toggles[i].getAttribute('data-wiki-key'), 'replace');
        }
        chrome.storage.sync.set({ 'searchEngineSettings': searchEngineSettings });
      });
    });
  });
}

// Set power setting
function setPower(setting, storeSetting = true) {
  if (storeSetting) {
    chrome.storage.local.set({ 'power': setting });
  }
  const powerText = document.getElementById('powerText');
  powerText.textContent = 'Extension is ' + setting;
  const powerIcon = document.getElementById('powerIcon');
  if (setting === 'on') {
    document.getElementById('powerCheckbox').checked = true;
    powerIcon.innerText = '🔋';
  } else {
    document.getElementById('powerCheckbox').checked = false;
    powerIcon.innerText = '🪫';
  }

  chrome.runtime.sendMessage({
    action: 'updateIcon',
    value: setting
  });
}

// Set notifications setting
function setNotifications(setting, storeSetting = true) {
  if (storeSetting) {
    chrome.storage.sync.set({ 'notifications': setting });
  }
  const notificationsIcon = document.getElementById('notificationsIcon');
  if (setting === 'on') {
    document.getElementById('notificationsCheckbox').checked = true;
    notificationsIcon.innerText = '🔔';
  } else {
    document.getElementById('notificationsCheckbox').checked = false;
    notificationsIcon.innerText = '🔕';
  }
}

// Set cross-language setting
function setCrossLanguage(setting, storeSetting = true) {
  if (storeSetting) {
    chrome.storage.sync.set({ 'crossLanguage': setting });
  }

  const crossLanguageIcon = document.getElementById('crossLanguageIcon');
  if (setting === 'on') {
    document.getElementById('crossLanguageCheckbox').checked = true;
    crossLanguageIcon.innerText = '🌐';
  } else {
    document.getElementById('crossLanguageCheckbox').checked = false;
    crossLanguageIcon.innerText = '⚪️';
  }
}

// Set open changelog setting
function setOpenChangelog(setting, storeSetting = true) {
  if (storeSetting) {
    chrome.storage.sync.set({ 'openChangelog': setting });
  }

  const openChangelogIcon = document.getElementById('openChangelogIcon');
  if (setting === 'on') {
    document.getElementById('openChangelogCheckbox').checked = true;
    openChangelogIcon.innerText = '📂';
  } else {
    document.getElementById('openChangelogCheckbox').checked = false;
    openChangelogIcon.innerText = '📁';
  }
}

// Set BreezeWiki settings
function setBreezeWiki(setting, storeSetting = true) {
  if (storeSetting) {
    chrome.storage.sync.set({ 'breezewiki': setting });
  }
  const breezewikiHost = document.getElementById('breezewikiHost');
  if (setting === 'on') {
    document.getElementById('breezewikiCheckbox').checked = true;
  } else {
    document.getElementById('breezewikiCheckbox').checked = false;
  }
  if (setting === 'on') {
    breezewikiHost.style.display = 'inline-block';
    chrome.storage.sync.get({ 'breezewikiHost': null }, function (host) {
      if (!host.breezewikiHost) {
        fetch('https://bw.getindie.wiki/instances.json')
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Indie Wiki Buddy failed to get BreezeWiki data.');
          }).then((breezewikiHosts) => {
            breezewikiHosts = breezewikiHosts.filter(host =>
              chrome.runtime.getManifest().version.localeCompare(host.iwb_version,
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
            chrome.storage.sync.set({ 'breezewikiHost': host.breezewikiHost });
            chrome.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
            chrome.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
            document.getElementById('breezewikiHostSelect').value = host.breezewikiHost;
          }).catch((e) => {
            console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);

            // If fetch fails and no host is set, default to breezewiki.com:
            if (!host) {
              chrome.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
            }
          });
      } else {
        document.getElementById('breezewikiHostSelect').value = host.breezewikiHost;
      }
    });
  } else {
    breezewikiHost.style.display = 'none';
  }
}

async function migrateData() {
  await chrome.storage.sync.get(async (storage) => {
    if (!storage.v3migration) {
      let defaultWikiAction = storage.defaultWikiAction || 'alert';
      let defaultSearchAction = storage.defaultSearchAction || 'replace';

      // Set new default action settings:
      if (!storage.defaultWikiAction) {
        if (storage.defaultActionSettings && storage.defaultActionSettings['EN']) {
          defaultWikiAction = storage.defaultActionSettings['EN'];
        }
        chrome.storage.sync.set({ 'defaultWikiAction': defaultWikiAction });
      }
      if (!storage.defaultSearchAction) {
        if (storage.defaultSearchFilterSettings && storage.defaultSearchFilterSettings['EN']) {
          if (storage.defaultSearchFilterSettings['EN'] === 'false') {
            defaultSearchAction = 'disabled';
          } else {
            defaultSearchAction = 'replace';
          }
        }
        chrome.storage.sync.set({ 'defaultSearchAction': defaultSearchAction });
      }

      // Remove old objects:
      chrome.storage.sync.remove('defaultActionSettings');
      chrome.storage.sync.remove('defaultSearchFilterSettings');

      // Migrate wiki settings to new searchEngineSettings and wikiSettings objects
      sites = await getData();
      let siteSettings = storage.siteSettings || {};
      let searchEngineSettings = storage.searchEngineSettings || {};
      let wikiSettings = storage.wikiSettings || {};

      sites.forEach((site) => {
        if (!searchEngineSettings[site.id]) {
          if (siteSettings[site.id] && siteSettings[site.id].searchFilter) {
            if (siteSettings[site.id].searchFilter === 'false') {
              searchEngineSettings[site.id] = 'disabled';
            } else {
              searchEngineSettings[site.id] = 'replace';
            }
          } else {
            searchEngineSettings[site.id] = defaultSearchAction;
          }
        }

        if (!wikiSettings[site.id]) {
          wikiSettings[site.id] = siteSettings[site.id]?.action || defaultWikiAction;
        }
      });

      chrome.storage.sync.set({ 'searchEngineSettings': searchEngineSettings });
      chrome.storage.sync.set({ 'wikiSettings': wikiSettings });

      // Remove old object:
      chrome.storage.sync.remove('siteSettings');

      // Mark v3 migration as complete:
      chrome.storage.sync.set({ 'v3migration': 'done' });
    }
  });
}

// Main function that runs on-load
document.addEventListener('DOMContentLoaded', function () {
  // If newly installed, show initial install guide
  if (new URLSearchParams(window.location.search).get('newinstall')) {
    document.getElementById('firstInstallInfo').style.display = 'block';
  }

  // If running Chromium, show warning about service worker bug
  if (navigator.userAgent.match(/Chrom[e|ium]/)) {
    const notificationBannerChromeBug = document.getElementById('notificationBannerChromeBug');
    chrome.storage.local.get({ 'hideChromeBugNote': false }, function (item) {
      if (!item.hideChromeBugNote) {
        notificationBannerChromeBug.style.display = 'block';

        document.getElementById('chromeBugHideLink').addEventListener('click', function () {
          chrome.storage.local.set({ 'hideChromeBugNote': true });
          notificationBannerChromeBug.style.display = 'none';
        });
      }
    });
  }

  // If running Opera, show note about search engine access
  if (navigator.userAgent.match(/OPR\//)) {
    const notificationBannerOpera = document.getElementById('notificationBannerOpera');
    chrome.storage.local.get({ 'hideOperaPermissionsNote': false }, function (item) {
      if (!item.hideOperaPermissionsNote) {
        notificationBannerOpera.style.display = 'block';

        document.getElementById('operaPermsHideLink').addEventListener('click', function () {
          chrome.storage.local.set({ 'hideOperaPermissionsNote': true });
          notificationBannerOpera.style.display = 'none';
        });
      }
    });
  }

  // Count number of times settings have been opened
  // Purposefully using local storage instead of sync
  chrome.storage.local.get({ 'countSettingsOpened': 0 }, function (item) {
    const countSettingsOpened = item.countSettingsOpened;
    chrome.storage.local.set({ 'countSettingsOpened': countSettingsOpened + 1 });

    // Show review reminder every 5 opens,
    // and if the banner hasn't been previously dismissed
    chrome.storage.local.get({ 'hideReviewReminder': false }, function (item) {
      if (!item.hideReviewReminder && ((countSettingsOpened - 1) % 5 === 0)) {
        const notificationBannerReview = document.getElementById('notificationBannerReview');

        notificationBannerReview.style.display = 'block';
        document.getElementById('notificationBannerReview').style.display = ' block';

        // Disable future review reminders if user clicks links:
        document.getElementById('reviewReminderChromeLink').addEventListener('click', function () {
          chrome.storage.local.set({ 'hideReviewReminder': true });
        });
        document.getElementById('reviewReminderFirefoxLink').addEventListener('click', function () {
          chrome.storage.local.set({ 'hideReviewReminder': true });
        });
        document.getElementById('reviewReminderHideLink').addEventListener('click', function () {
          chrome.storage.local.set({ 'hideReviewReminder': true });
          notificationBannerReview.style.display = 'none';
        });
      }
    });
  });

  // Adding version to popup:
  const version = chrome.runtime.getManifest().version;
  document.getElementById('version').textContent = 'v' + version;

  // Get user's last set language
  chrome.storage.sync.get({ 'lang': 'EN' }, function (item) {
    langSelect.value = item.lang;
    loadOptions(item.lang);
  });
  // Add event listener for language select
  const langSelect = document.getElementById("langSelect");
  langSelect.addEventListener('change', function () {
    chrome.storage.sync.set({ 'lang': langSelect.value });
    resetOptions();
    loadOptions(langSelect.value);
  });

  // Set setting toggle values:
  chrome.storage.local.get({ 'power': 'on' }, function (item) {
    setPower(item.power, false);
  });
  chrome.storage.sync.get({ 'notifications': 'on' }, function (item) {
    setNotifications(item.notifications, false);
  });
  chrome.storage.sync.get({ 'crossLanguage': 'off' }, function (item) {
    setCrossLanguage(item.crossLanguage, false);
  });
  chrome.storage.sync.get({ 'openChangelog': 'on' }, function (item) {
    setOpenChangelog(item.openChangelog, false);
  });
  chrome.storage.sync.get({ 'breezewiki': 'off' }, function (item) {
    setBreezeWiki(item.breezewiki, false);
  });

  // Add event listeners for general setting toggles
  document.getElementById('powerCheckbox').addEventListener('change', function () {
    chrome.storage.local.get({ 'power': 'on' }, function (item) {
      if (item.power === 'on') {
        setPower('off');
      } else {
        setPower('on');
      }
    });
  });
  document.getElementById('notificationsCheckbox').addEventListener('change', function () {
    chrome.storage.sync.get({ 'notifications': 'on' }, function (item) {
      if (item.notifications === 'on') {
        setNotifications('off');
      } else {
        setNotifications('on');
      }
    });
  });
  document.getElementById('crossLanguageCheckbox').addEventListener('change', function () {
    chrome.storage.sync.get({ 'crossLanguage': 'off' }, function (item) {
      if (item.crossLanguage === 'on') {
        setCrossLanguage('off');
      } else {
        setCrossLanguage('on');
      }
    });
  });
  document.getElementById('openChangelogCheckbox').addEventListener('change', function () {
    chrome.storage.sync.get({ 'openChangelog': 'on' }, function (item) {
      if (item.openChangelog === 'on') {
        setOpenChangelog('off');
      } else {
        setOpenChangelog('on');
      }
    });
  });

  // Add event listeners for BreezeWiki settings
  document.getElementById('breezewikiCheckbox').addEventListener('change', function () {
    chrome.storage.sync.get({ 'breezewiki': 'off' }, function (item) {
      if (item.breezewiki === 'on') {
        setBreezeWiki('off');
      } else {
        setBreezeWiki('on');
        loadBreezeWikiOptions();
      }
    });
  });
  const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
  breezewikiHostSelect.addEventListener('change', function () {
    chrome.storage.sync.set({ 'breezewikiHost': breezewikiHostSelect.value });
  });

  // Add event listeners for default action selections
  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', function () {
      chrome.storage.sync.set({ 'defaultWikiAction': document.options.defaultWikiAction.value })
    });
  });
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', function () {
      chrome.storage.sync.set({ 'defaultSearchAction': document.options.defaultSearchAction.value })
    });
  });

  // Get and display stat counts
  chrome.storage.sync.get({ 'countAlerts': 0 }, function (item) {
    var key = Object.keys(item)[0];
    document.getElementById('countAlerts').textContent = item[key];
  });
  chrome.storage.sync.get({ 'countRedirects': 0 }, function (item) {
    var key = Object.keys(item)[0];
    document.getElementById('countRedirects').textContent = item[key];
  });
  chrome.storage.sync.get({ 'countSearchFilters': 0 }, function (item) {
    var key = Object.keys(item)[0];
    document.getElementById('countSearchFilters').textContent = item[key];
  });
  chrome.storage.sync.get({ 'countBreezeWiki': 0 }, function (item) {
    var key = Object.keys(item)[0];
    document.getElementById('countBreezeWiki').textContent = item[key];
  });
});

// Run v3 data migration:
migrateData();