// Set power setting
function setPower(setting) {
  chrome.storage.sync.set({ 'power': setting });
  var powerImage = document.getElementById('powerImage');
  powerImage.src = 'images/power-' + setting + '.png';
  powerImage.alt = 'Indie Wiki Buddy is ' + setting;

  chrome.runtime.sendMessage({
    action: 'updateIcon',
    value: setting
  });
}

// Populate popup settings and toggles
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
            let innerText = breezewikiHosts[i].instance.replace('https://', '');
            const numberOfPeriods = (innerText.match(/\./g)||[]).length;
            if (numberOfPeriods > 1) {
              innerText = innerText.substring(innerText.indexOf('.') + 1);
            }
            option.innerText = innerText;
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
        let innerText = hostOptions[i].instance.replace('https://', '');
        const numberOfPeriods = (innerText.match(/\./g)||[]).length;
        if (numberOfPeriods > 1) {
          innerText = innerText.substring(innerText.indexOf('.') + 1);
        }
        option.innerText = innerText;
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

// Set power setting
function setPower(setting) {
  chrome.storage.sync.set({ 'power': setting });
  var powerImage = document.getElementById('powerImage');
  powerImage.src = 'images/power-' + setting + '.png';
  powerImage.alt = 'Indie Wiki Buddy is ' + setting;
  if (setting === 'on') {
    document.getElementById('powerCheckbox').checked = true;
  } else {
    document.getElementById('powerCheckbox').checked = false;
  }

  chrome.runtime.sendMessage({
    action: 'updateIcon',
    value: setting
  });
}

// Set notifications setting
function setNotifications(setting) {
  chrome.storage.sync.set({ 'notifications': setting });
  if (setting === 'on') {
    document.getElementById('notificationsCheckbox').checked = true;
  } else {
    document.getElementById('notificationsCheckbox').checked = false;
  }
}

// Set search filter setting
function setSearchFilter(setting) {
  chrome.storage.sync.set({ 'searchFilter': setting });
  if (setting === 'on') {
    document.getElementById('searchFilterCheckbox').checked = true;
  } else {
    document.getElementById('searchFilterCheckbox').checked = false;
  }
}

// Set BreezeWiki settings
function setBreezeWiki(setting) {
  chrome.storage.sync.set({ 'breezewiki': setting });
  if (setting === 'on') {
    document.getElementById('breezewikiCheckbox').checked = true;
  } else {
    document.getElementById('breezewikiCheckbox').checked = false;
  }
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
  loadBreezeWikiOptions();

  // Listener for settings page in new tab:
  document.getElementById('openSettings').addEventListener('click', function () {
    chrome.tabs.create({'url': chrome.extension.getURL('settings.html')});
    window.close();
  });

  // Set setting toggle values:
  chrome.storage.sync.get({ 'power': 'on' }, function (item) {
    setPower(item.power);
  });
  chrome.storage.sync.get({ 'notifications': 'on' }, function (item) {
    setNotifications(item.notifications);
  });
  chrome.storage.sync.get({ 'searchFilter': 'on' }, function (item) {
    setSearchFilter(item.searchFilter);
  });
  chrome.storage.sync.get({ 'breezewiki': 'off' }, function (item) {
    setBreezeWiki(item.breezewiki);
  });

  // Add event listeners for setting toggles
  document.getElementById('powerCheckbox').addEventListener('change', function () {
    chrome.storage.sync.get({ 'power': 'on' }, function (item) {
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
  document.getElementById('searchFilterCheckbox').addEventListener('change', function () {
    chrome.storage.sync.get({ 'searchFilter': 'on' }, function (item) {
      if (item.searchFilter === 'on') {
        setSearchFilter('off');
      } else {
        setSearchFilter('on');
      }
    });
  });
  document.getElementById('breezewikiCheckbox').addEventListener('change', function () {
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
});