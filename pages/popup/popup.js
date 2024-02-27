// Set power setting
function setPower(setting) {
  chrome.storage.local.set({ 'power': setting });
  var powerImage = document.getElementById('powerImage');
  powerImage.src = '../../images/power-' + setting + '.png';
  powerImage.alt = 'Indie Wiki Buddy is ' + setting;

  chrome.runtime.sendMessage({
    action: 'updateIcon',
    value: setting
  });
}

// SAFARI-DIFF (not needed since Safari started with v3)
// async function migrateData() {
//   commonFunctionMigrateToV3();
// }

// Set power setting
function setPower(setting, storeSetting = true) {
  if (storeSetting) {
    chrome.storage.local.set({ 'power': setting });
  }
  var powerImage = document.getElementById('powerImage');
  powerImage.src = '../../images/power-' + setting + '.png';
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

// Set default action setting
chrome.storage.sync.get(['defaultWikiAction'], (item) => {
  if (item.defaultWikiAction === 'disabled') {
    document.options.defaultWikiAction.value = 'disabled';
  } else if (item.defaultWikiAction === 'redirect') {
    document.options.defaultWikiAction.value = 'redirect';
  } else {
    document.options.defaultWikiAction.value = 'alert';
  }
});
// Set default search engine setting
chrome.storage.sync.get(['defaultSearchAction'], (item) => {
  if (item.defaultSearchAction === 'disabled') {
    document.options.defaultSearchAction.value = 'disabled';
  } else if (item.defaultSearchAction === 'hide') {
    document.options.defaultSearchAction.value = 'hide';
  } else {
    document.options.defaultSearchAction.value = 'replace';
  }
});

// Main function that runs on-load
document.addEventListener('DOMContentLoaded', () => {
  // If running Opera, show note about search engine access
  if (navigator.userAgent.match(/OPR\//)) {
    const notificationBannerOpera = document.getElementById('notificationBannerOpera');
    chrome.storage.local.get({ 'hideOperaPermissionsNote': false }, (item) => {
      if (!item.hideOperaPermissionsNote) {
        notificationBannerOpera.style.display = 'block';

        document.getElementById('operaPermsHideLink').addEventListener('click', () => {
          chrome.storage.local.set({ 'hideOperaPermissionsNote': true });
          notificationBannerOpera.style.display = 'none';
        });
      }
    });
  }

  // Listener for settings links:
  document.getElementById('openSettingsButton').addEventListener('click', () => {
    chrome.tabs.create({ 'url': chrome.runtime.getURL('pages/settings/index.html') });
    window.close();
  });
  document.getElementById('openSettingsLink').addEventListener('click', () => {
    chrome.tabs.create({ 'url': chrome.runtime.getURL('pages/settings/index.html') });
    window.close();
  });
  
  // Add event listener for BreezeWiki host select
  const breezewikiHostSelect = document.getElementById('breezewikiHostSelect');
  breezewikiHostSelect.addEventListener('change', () => {
    if (breezewikiHostSelect.value === 'CUSTOM') {
      document.getElementById('breezewikiCustomHost').style.display = 'block';
    } else {
      document.getElementById('breezewikiCustomHost').style.display = 'none';
    }
    chrome.storage.sync.set({ 'breezewikiHost': breezewikiHostSelect.value });
  });

  document.options.addEventListener("submit", function(e) {
    e.preventDefault();
    return false;
  });

  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', async () => {
      chrome.storage.sync.set({ 'defaultWikiAction': document.options.defaultWikiAction.value })

      let wikiSettings = {};
      sites = await commonFunctionGetSiteDataByDestination();
      sites.forEach((site) => {
        wikiSettings[site.id] = document.options.defaultWikiAction.value;
      });
      chrome.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
    });
  });
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', async () => {
      chrome.storage.sync.set({ 'defaultSearchAction': document.options.defaultSearchAction.value })

      let searchEngineSettings = {};
      sites = await commonFunctionGetSiteDataByDestination();
      sites.forEach((site) => {
        searchEngineSettings[site.id] = document.options.defaultSearchAction.value;
      });
      chrome.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
    });
  });
});

// SAFARI-DIFF (not needed since Safari started with v3)
// Run v3 data migration:
// migrateData();