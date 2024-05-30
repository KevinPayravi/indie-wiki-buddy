async function migrateData() {
  commonFunctionMigrateToV3();
}

// Set power setting
function setPower(setting, storeSetting = true) {
  if (storeSetting) {
    extensionAPI.storage.local.set({ 'power': setting });
  }
  var powerImage = document.getElementById('powerImage');
  powerImage.src = '../../images/power-' + setting + '.png';
  powerImage.alt = 'Indie Wiki Buddy is ' + setting;
  if (setting === 'on') {
    document.getElementById('powerCheckbox').checked = true;
  } else {
    document.getElementById('powerCheckbox').checked = false;
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

// Main function that runs on-load
document.addEventListener('DOMContentLoaded', () => {
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

  // Listener for settings links:
  document.getElementById('openSettingsButton').addEventListener('click', () => {
    extensionAPI.tabs.create({ 'url': extensionAPI.runtime.getURL('pages/settings/index.html') });
    window.close();
  });
  document.getElementById('openSettingsLink').addEventListener('click', () => {
    extensionAPI.tabs.create({ 'url': extensionAPI.runtime.getURL('pages/settings/index.html') });
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
    extensionAPI.storage.sync.set({ 'breezewikiHost': breezewikiHostSelect.value });
  });

  document.options.addEventListener("submit", function (e) {
    e.preventDefault();
    return false;
  });

  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', async () => {
      extensionAPI.storage.sync.set({ 'defaultWikiAction': document.options.defaultWikiAction.value })

      let wikiSettings = {};
      sites = await commonFunctionGetSiteDataByDestination();
      sites.forEach((site) => {
        wikiSettings[site.id] = document.options.defaultWikiAction.value;
      });
      extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
    });
  });
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', async () => {
      extensionAPI.storage.sync.set({ 'defaultSearchAction': document.options.defaultSearchAction.value })

      let searchEngineSettings = {};
      sites = await commonFunctionGetSiteDataByDestination();
      sites.forEach((site) => {
        searchEngineSettings[site.id] = document.options.defaultSearchAction.value;
      });
      extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
    });
  });
});

// Run v3 data migration:
migrateData();