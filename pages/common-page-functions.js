// Set setting toggle values on-load:
chrome.storage.local.get({ 'power': 'on' }, (item) => {
  setPower(item.power, false);
});
chrome.storage.sync.get({ 'notifications': 'on' }, (item) => {
  setNotifications(item.notifications, false);
});
chrome.storage.sync.get({ 'hiddenResultsBanner': 'on' }, (item) => {
  setHiddenResultsBanner(item.hiddenResultsBanner, false);
});
chrome.storage.sync.get({ 'crossLanguage': 'off' }, (item) => {
  setCrossLanguage(item.crossLanguage, false);
});
chrome.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
  setOpenChangelog(item.openChangelog, false);
});
chrome.storage.sync.get({ 'breezewiki': 'off' }, (item) => {
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

// Add event listener for power toggle
document.getElementById('powerCheckbox').addEventListener('change', () => {
  chrome.storage.local.get({ 'power': 'on' }, (item) => {
    if (item.power === 'on') {
      setPower('off');
    } else {
      setPower('on');
    }
  });
});

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

// Set search results hidden banner setting
function setHiddenResultsBanner(setting, storeSetting = true) {
  if (storeSetting) {
    chrome.storage.sync.set({ 'hiddenResultsBanner': setting });
  }
  const hiddenResultsBannerIcon = document.getElementById('hiddenResultsBannerIcon');
  if (setting === 'on') {
    document.getElementById('hiddenResultsBannerCheckbox').checked = true;
    hiddenResultsBannerIcon.innerText = '🔔';
  } else {
    document.getElementById('hiddenResultsBannerCheckbox').checked = false;
    hiddenResultsBannerIcon.innerText = '🔕';
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

// Event listeners for general setting toggles
document.getElementById('notificationsCheckbox').addEventListener('change', () => {
  chrome.storage.sync.get({ 'notifications': 'on' }, (item) => {
    if (item.notifications === 'on') {
      setNotifications('off');
    } else {
      setNotifications('on');
    }
  });
});
document.getElementById('hiddenResultsBannerCheckbox').addEventListener('change', () => {
  chrome.storage.sync.get({ 'hiddenResultsBanner': 'on' }, (item) => {
    if (item.hiddenResultsBanner === 'on') {
      setHiddenResultsBanner('off');
    } else {
      setHiddenResultsBanner('on');
    }
  });
});
document.getElementById('crossLanguageCheckbox').addEventListener('change', () => {
  chrome.storage.sync.get({ 'crossLanguage': 'off' }, (item) => {
    if (item.crossLanguage === 'on') {
      setCrossLanguage('off');
    } else {
      setCrossLanguage('on');
    }
  });
});
document.getElementById('openChangelogCheckbox').addEventListener('change', () => {
  chrome.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
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
    chrome.storage.sync.set({ 'breezewiki': settingValue });
    setBreezeWiki(settingValue);
    if (settingValue !== 'off') {
      loadBreezewikiOptions();
    }
  });
});

// Set BreezeWiki settings
function setBreezeWiki(setting, storeSetting = true) {
  // Account for legacy BreezeWiki sestting ('on' is now 'redirect')
  if (setting === 'on') {
    setting = 'redirect';
  }

  // Store BreezeWiki setting
  if (storeSetting) {
    chrome.storage.sync.set({ 'breezewiki': setting });
  }

  // Set BreezeWiki value on radio group
  document.options.breezewikiSetting.value = setting;

  // Toggle/update host display
  const breezewikiHost = document.getElementById('breezewikiHost');
  if (setting !== 'off') {
    breezewikiHost.style.display = 'block';
    chrome.storage.sync.get({ 'breezewikiHost': null }, (host) => {
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

function populateBreezewikiHosts(breezewikiHosts, selectedHost, customHostName) {
  // Populate dropdown selection of hosts
  const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
  while (breezewikiHostSelect.firstChild) {
    // Remove any existing options
    breezewikiHostSelect.removeChild(breezewikiHostSelect.firstChild);
  }

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
  customOption.textContent = 'Custom host...';
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
  chrome.storage.sync.get(['breezewikiHostOptions', 'breezewikiHostFetchTimestamp', 'breezewikiHost', 'breezewikiCustomHost'], (item) => {
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
          populateBreezewikiHosts(breezewikiHosts, host, customHost);

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
      if (host !== 'CUSTOM' && !hostOptions.some(item => item.instance === host)) {
        host = hostOptions[Math.floor(Math.random() * hostOptions.length)].instance;
      }
      
      populateBreezewikiHosts(hostOptions, host, customHost);

      // Store BreezeWiki host details
      chrome.storage.sync.set({ 'breezewikiHost': host });
    }
  });
}