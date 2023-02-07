const LANGS = ["DE", "EN", "ES", "IT"];
var sites = [];

// Create object prototypes for getting and setting attributes:
Object.prototype.get = function(prop) {
  this[prop] = this[prop] || {};
  return this[prop];
};
Object.prototype.set = function(prop, value) {
  this[prop] = value;
}

// Clear wiki toggles
// Used when switching languages
function resetOptions() {
  var toggleContainer = document.getElementById('toggles');
  toggleContainer.textContent = "";

  // Clone "select all" buttons to reset listeners
  document.getElementById('setAllRedirect').cloneNode(true);
  document.getElementById('setAllAlert').cloneNode(true);
  document.getElementById('setAllDisabled').cloneNode(true);
  document.getElementById('setAllSearchFilter').cloneNode(true);
  document.getElementById('setNoneSearchFilter').cloneNode(true);
}

// Get wiki data from data folder
async function getData() {
  var sites = [];
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

// Populate popup settings and toggles
async function loadOptions(lang) {
  sites = await getData();

  chrome.storage.sync.get(function (storage) {
    let siteSettings = storage.siteSettings || {};
    let defaultActionSettings = storage.defaultActionSettings || {};
    let defaultSearchFilterSettings = storage.defaultSearchFilterSettings || {};

    // Load BreezeWiki options:
    chrome.storage.sync.get(['breezewikiHostOptions', 'breezewikiHostFetchTimestamp', 'breezewikiHost'], function (item) {
      let hostOptions = item.breezewikiHostOptions;
      let hostFetchTimestamp = item.breezewikiHostFetchTimestamp;
      let host = item.breezewikiHost;
      // Fetch and cache list of BreezeWiki hosts if first time,
      // or if it has been 24 hrs since last refresh
      if (!host || !hostOptions || !hostFetchTimestamp || (Date.now() - 86400000 > hostFetchTimestamp)) {
        fetch('https://bw.getindie.wiki/instances.json')
          .then((response) => response.json())
          .then((breezewikiHosts) => {
            // If host isn't set, or currently selected host is no longer available, select random host:
            if (!host || !breezewikiHosts.some(item => item.instance === host)) {
              // Check if BreezeWiki's main site is available
              let breezewikiMain = breezewikiHosts.filter(host => host.instance === 'https://breezewiki.com');
              if (breezewikiMain.length > 0) {
                host = breezewikiMain[0].instance;
              } else {
                // If BreezeWiki.com is not available, set to a random mirror
                host = breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance;
              }
            }
            // Populate dropdown selection of hosts
            const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
            for (var i = 0; i < breezewikiHosts.length; i++) {
              let option = document.createElement('option');
              option.value = breezewikiHosts[i].instance;
              option.innerText = breezewikiHosts[i].instance.replace('https://', '');
              breezewikiHostSelect.appendChild(option);
              if (option.value === host) {
                breezewikiHostSelect.value = host;
              }
            }
            // Store BreezeWiki host details
            chrome.storage.sync.set({ 'breezewikiHost': host });
            chrome.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
            chrome.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
          });
      } else {
        // If currently selected host is no longer available, select random host:
        if (!hostOptions.some(item => item.instance === host)) {
          host = hostOptions[Math.floor(Math.random() * hostOptions.length)].instance;
        }
        // Populate dropdown selection of hosts
        const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
        for (var i = 0; i < hostOptions.length; i++) {
          let option = document.createElement('option');
          option.value = hostOptions[i].instance;
          option.innerText = hostOptions[i].instance.replace('https://', '');
          breezewikiHostSelect.appendChild(option);
          if (option.value === host) {
            breezewikiHostSelect.value = host;
          }
        }
        // Store BreezeWiki host details
        chrome.storage.sync.set({ 'breezewikiHost': host });
      }
    });

    // Populate individual wiki settings:
    var toggleContainer = document.getElementById('toggles');
    for (var i = 0; i < sites.length; i++) {
      if (sites[i].language === lang) {
        var key = sites[i].id;

        // Create radio for disabled:
        let labelDisabled = document.createElement("label");
        let inputDisabled = document.createElement("input");
        inputDisabled.classList = 'disable';
        inputDisabled.type = "radio";
        inputDisabled.name = key;
        inputDisabled.title = 'Disable actions for ' + sites[i].origin;
        inputDisabled.id = key + '-redirect';
        inputDisabled.lang = lang;

        // Create radio for redirect:
        let labelRedirect = document.createElement("label");
        let inputRedirect = document.createElement("input");
        inputRedirect.classList = 'redirect';
        inputRedirect.type = "radio";
        inputRedirect.name = key;
        inputRedirect.title = 'Automatically redirect from ' + sites[i].origin + ' to ' + sites[i].destination;
        inputRedirect.id = key + '-redirect';
        inputRedirect.lang = lang;

        // Create radio for alert:
        let labelAlert = document.createElement("label");
        let inputAlert = document.createElement("input");
        inputAlert.classList = 'alert';
        inputAlert.type = "radio";
        inputAlert.name = key;
        inputAlert.title = 'Notify with banner when visiting ' + sites[i].origin;
        inputAlert.id = key + '-alert';
        inputAlert.lang = lang;

        // Create checkbox for search filtering:
        let labelFilter = document.createElement("label");
        let inputFilter = document.createElement("input");
        inputFilter.classList = 'filter';
        inputFilter.type = 'checkbox';
        inputFilter.name = key;
        inputFilter.title = 'Filter from search results on Google, Bing, and DuckDuckGo';
        inputFilter.id = key + '-filter';
        inputFilter.lang = lang;

        // Check radio button based on user's settings
        // Will default to alert or the last "select all" setting the user chose
        if (siteSettings[key] && siteSettings[key].action) {
          if (siteSettings[key].action === 'disabled') {
            inputDisabled.checked = true;
          } else if (siteSettings[key].action === 'redirect') {
            inputRedirect.checked = true;
          } else {
            inputAlert.checked = true;
          }
        } else {
          let actionSetting = defaultActionSettings[lang];
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

        // Check search filter checkbox based on user's settings (default filter):
        if (siteSettings[key] && siteSettings[key].searchFilter) {
          if (siteSettings[key].searchFilter === 'false') {
            inputFilter.checked = false;
          } else {
            inputFilter.checked = true;
          }
        } else {
          let searchFilterSetting = defaultSearchFilterSettings[lang];
          if (searchFilterSetting && searchFilterSetting === 'false') {
            inputFilter.checked = false;
          } else {
            inputFilter.checked = true;
          }
        }

        // Add listeners for when user clicks control:
        inputRedirect.addEventListener('click', function (input) {
          chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
            var key = input.target.name;
            response.siteSettings.get(key).set('action', 'redirect');
            chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
          });
        });
        inputAlert.addEventListener('click', function (input) {
          chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
            var key = input.target.name;
            response.siteSettings.get(key).set('action', 'alert');
            chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
          });
        });
        inputDisabled.addEventListener('click', function (input) {
          chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
            var key = input.target.name;
            response.siteSettings.get(key).set('action', 'disabled');
            chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
          });
        });
        inputFilter.addEventListener('click', function (input) {
          chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
            var key = input.target.name;
            if (input.target.checked === true) {
              response.siteSettings.get(key).set('searchFilter', 'true');
            } else {
              response.siteSettings.get(key).set('searchFilter', 'false');
            }
            chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
          });
        });

        // Output disable radio button:
        let inputDisabledText = document.createElement('span');
        inputDisabledText.classList.add('visuallyHidden');
        inputDisabledText.textContent = 'Disable action for ' + sites[i].origin;
        labelDisabled.appendChild(inputDisabled);
        labelDisabled.appendChild(inputDisabledText);

        // Output redirect radio button:
        let inputRedirectText = document.createElement('span');
        inputRedirectText.classList.add('visuallyHidden');
        inputRedirectText.textContent = 'Automatically redirect ' + sites[i].origin;
        labelRedirect.appendChild(inputRedirect);
        labelRedirect.appendChild(inputRedirectText);

        // Output alert radio button:
        let inputAlertText = document.createElement('span');
        inputAlertText.classList.add('visuallyHidden');
        inputAlertText.textContent = 'Automatically alert for' + sites[i].origin;
        labelAlert.appendChild(inputAlert);
        labelAlert.appendChild(inputAlertText);

        // Output search filter checkbox:
        let inputFilterText = document.createElement('span');
        inputFilterText.classList.add('visuallyHidden');
        inputFilterText.textContent = 'Filter ' + sites[i].origin + ' from search engine results';
        labelFilter.appendChild(inputFilter);
        labelFilter.appendChild(inputFilterText);

        // Output icon
        let iconLink = document.createElement("a");
        iconLink.href = 'https://' + sites[i].destination_base_url;
        iconLink.title = sites[i].destination;
        iconLink.target = '_blank';
        let icon = document.createElement("img");
        icon.src = 'favicons/' + lang.toLowerCase() + '/' + sites[i].destination_icon;
        icon.alt = sites[i].destination;
        iconLink.appendChild(icon);

        // Output text:
        let text = document.createElement('span');
        text.textContent = sites[i].origin + ' » ' + sites[i].destination;
        let siteContainer = document.createElement("div");

        siteContainer.appendChild(labelDisabled);
        siteContainer.appendChild(labelRedirect);
        siteContainer.appendChild(labelAlert);
        siteContainer.appendChild(labelFilter);
        siteContainer.appendChild(iconLink);
        siteContainer.appendChild(text);

        toggleContainer.appendChild(siteContainer);
      }
    }

    // Add "select all" button event listeners:
    var setAllRedirect = document.getElementById('setAllRedirect');
    setAllRedirect.addEventListener('click', function () {
      var toggles = document.querySelectorAll('#toggles input.redirect');
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].checked = true;
        siteSettings.get(toggles[i].name).set('action', 'redirect');
      }
      chrome.storage.sync.set({ 'siteSettings': siteSettings });
      defaultActionSettings[toggles[0].lang] = 'redirect';
      chrome.storage.sync.set({ 'defaultActionSettings': defaultActionSettings });
    });

    var setAllAlert = document.getElementById('setAllAlert');
    setAllAlert.addEventListener('click', function () {
      var toggles = document.querySelectorAll('#toggles input.alert');
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].checked = true;
        siteSettings.get(toggles[i].name).set('action', 'alert');
      }
      chrome.storage.sync.set({ 'siteSettings': siteSettings });
      defaultActionSettings[toggles[0].lang] = 'alert';
      chrome.storage.sync.set({ 'defaultActionSettings': defaultActionSettings });
    });

    var setAllDisabled = document.getElementById('setAllDisabled');
    setAllDisabled.addEventListener('click', function () {
      var toggles = document.querySelectorAll('#toggles input.disable');
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].checked = true;
        siteSettings.get(toggles[i].name).set('action', 'disabled');
      }
      chrome.storage.sync.set({ 'siteSettings': siteSettings });
      defaultActionSettings[toggles[0].lang] = 'disabled';
      chrome.storage.sync.set({ 'defaultActionSettings': defaultActionSettings });
    });

    var setAllSearchFilter = document.getElementById('setAllSearchFilter');
    setAllSearchFilter.addEventListener('click', function () {
      var toggles = document.querySelectorAll('#toggles input.filter');
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].checked = true;
        siteSettings.get(toggles[i].name).set('searchFilter', 'true');
      }
      chrome.storage.sync.set({ 'siteSettings': siteSettings });
      defaultSearchFilterSettings[toggles[0].lang] = 'true';
      chrome.storage.sync.set({ 'defaultSearchFilterSettings': defaultSearchFilterSettings });
    });

    var setNoneSearchFilter = document.getElementById('setNoneSearchFilter');
    setNoneSearchFilter.addEventListener('click', function () {
      var toggles = document.querySelectorAll('#toggles input.filter');
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].checked = false;
        siteSettings.get(toggles[i].name).set('searchFilter', 'false');
      }
      chrome.storage.sync.set({ 'siteSettings': siteSettings });
      defaultSearchFilterSettings[toggles[0].lang] = 'false';
      chrome.storage.sync.set({ 'defaultSearchFilterSettings': defaultSearchFilterSettings });
    });
  });
}

// Set power setting
function setPower(setting) {
  chrome.storage.sync.set({ 'power': setting });
  var powerImage = document.getElementById('powerImage');
  powerImage.src = 'images/power-' + setting + '.png';
  var powerText = document.getElementById('powerText');
  powerText.textContent = 'Extension is ' + setting;

  chrome.runtime.sendMessage({
    action: 'updateIcon',
    value: setting
  });
}

// Set notifications setting
function setNotifications(setting) {
  chrome.storage.sync.set({ 'notifications': setting });
  var notificationsImage = document.getElementById('notificationsImage');
  notificationsImage.src = 'images/bell-' + setting + '.png';
  var notificationsText = document.getElementById('notificationsText');
  notificationsText.textContent = 'Notify-on-redirect is ' + setting;
}

// Set BreezeWiki settings
function setBreezeWiki(setting) {
  chrome.storage.sync.set({ 'breezewiki': setting });
  var breezewikiImage = document.getElementById('breezewikiImage');
  breezewikiImage.src = 'images/check-' + setting + '.png';
  var breezewikiText = document.getElementById('breezewikiText');
  breezewikiText.textContent = 'BreezeWiki is ' + setting;
  var breezewikiHost = document.getElementById('breezewikiHost');
  if (setting === 'on') {
    breezewikiHost.style.display = 'block';
    chrome.storage.sync.get({ 'breezewikiHost': null }, function (host) {
      if (!host.breezewikiHost) {
        fetch('https://bw.getindie.wiki/instances.json')
          .then((response) => response.json())
          .then((breezewikiHosts) => {
            // Check if BreezeWiki's main site is available
            let breezewikiMain = breezewikiHosts.filter(host => host.instance === 'https://breezewiki.com');
            if (breezewikiMain.length > 0) {
              host.breezewikiHost = breezewikiMain[0].instance;
            } else {
              // If BreezeWiki.com is not available, set to a random mirror
              host.breezewikiHost = breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance;
            }
            chrome.storage.sync.set({ 'breezewikiHost': host.breezewikiHost });
            chrome.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
            chrome.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
            document.getElementById('breezewikiHostSelect').value = host.breezewikiHost;
          });
      } else {
        document.getElementById('breezewikiHostSelect').value = host.breezewikiHost;
      }
    });
  } else {
    breezewikiHost.style.display = 'none';
  }
}

// Main function that runs on-load
document.addEventListener('DOMContentLoaded', function () {
  // Get user's last set language
  chrome.storage.sync.get({ 'lang': 'EN' }, function (item) {
    langSelect.value = item.lang;
    chrome.storage.sync.set({ 'lang': item.lang });
    loadOptions(item.lang);
  });
  // Add event listener for language select
  var langSelect = document.getElementById("langSelect");
  langSelect.addEventListener('change', function () {
    chrome.storage.sync.set({ 'lang': langSelect.value });
    resetOptions();
    loadOptions(langSelect.value);
  });

  // Set power, notification, and BreezeWiki setting toggle values:
  chrome.storage.sync.get({ 'power': 'on' }, function (item) {
    setPower(item.power);
  });
  chrome.storage.sync.get({ 'notifications': 'on' }, function (item) {
    setNotifications(item.notifications);
  });
  chrome.storage.sync.get({ 'breezewiki': 'off' }, function (item) {
    setBreezeWiki(item.breezewiki);
  });

  // Add event listeners for power, notification, and BreezeWiki setting toggles
  document.getElementById('powerButton').addEventListener('change', function () {
    chrome.storage.sync.get({ 'power': 'on' }, function (item) {
      if (item.power === 'on') {
        setPower('off');
      } else {
        setPower('on');
      }
    });
  });
  document.getElementById('notificationsButton').addEventListener('change', function () {
    chrome.storage.sync.get({ 'notifications': 'on' }, function (item) {
      if (item.notifications === 'on') {
        setNotifications('off');
      } else {
        setNotifications('on');
      }
    });
  });
  document.getElementById('breezewikiButton').addEventListener('change', function () {
    chrome.storage.sync.get({ 'breezewiki': 'off' }, function (item) {
      if (item.breezewiki === 'on') {
        setBreezeWiki('off');
      } else {
        setBreezeWiki('on');
      }
    });
  });
  var breezewikiHostSelect = document.getElementById("breezewikiHostSelect");
  breezewikiHostSelect.addEventListener('change', function () {
    chrome.storage.sync.set({ 'breezewikiHost': breezewikiHostSelect.value });
  });

  // Get and display stat counts
  chrome.storage.sync.get({ 'countAlerts': 0 }, function (item) {
    var key = Object.keys(item)[0];
    chrome.storage.sync.set({ 'countAlerts': item[key] });
    document.getElementById('countAlerts').textContent = item[key];
  });
  chrome.storage.sync.get({ 'countRedirects': 0 }, function (item) {
    var key = Object.keys(item)[0];
    chrome.storage.sync.set({ 'countRedirects': item[key] });
    document.getElementById('countRedirects').textContent = item[key];
  });
  chrome.storage.sync.get({ 'countSearchFilters': 0 }, function (item) {
    var key = Object.keys(item)[0];
    chrome.storage.sync.set({ 'countSearchFilters': item[key] });
    document.getElementById('countSearchFilters').textContent = item[key];
  });  
});