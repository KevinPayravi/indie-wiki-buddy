import {
  extensionAPI,
  decompressJSON,
  findMatchingSite,
  getNewURL,
  loadSiteData,
  migrateToV3,
  refreshSiteData,
 } from "./scripts/common-functions.js";

// Local storage keys to cache
const CACHED_LOCAL_KEYS = ['power', 'hideOperaPermissionsNote', 'countSettingsOpened', 'hideReviewReminder'];

function getStorageData(area, keys) {
  // Wrap the extensionAPI.storage.get method in a promise
  // Needed for Firefox manifest v2
  return new Promise((resolve) => {
    extensionAPI.storage[area].get(keys, (items) => {
      resolve(items);
    });
  });
}

async function loadCachedStorage() {
  const [localStorageData, syncStorageData] = await Promise.all([
    getStorageData('local', CACHED_LOCAL_KEYS),
    getStorageData('sync', null)
  ]);
  return { ...localStorageData, ...syncStorageData };
}

function applyStorageChanges(storage, changes, area) {
  if (area !== 'local' && area !== 'sync') {
    return;
  }
  for (const [key, change] of Object.entries(changes)) {
    if (area === 'local' && !CACHED_LOCAL_KEYS.includes(key)) {
      continue;
    }
    if ('newValue' in change) {
      storage[key] = change.newValue;
    } else {
      delete storage[key];
    }
  }
}

// Cache storage in memory so that we don't need to make repeated calls
let cachedStoragePromise = loadCachedStorage();

function getCachedStorage() {
  return cachedStoragePromise;
}

// Refresh remote site data every 3 hours
const SITE_DATA_ALARM = 'refreshSiteData';

extensionAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SITE_DATA_ALARM) {
    refreshSiteData(true);
  }
});

extensionAPI.alarms.get(SITE_DATA_ALARM, (alarm) => {
  if (!alarm) {
    extensionAPI.alarms.create(SITE_DATA_ALARM, { periodInMinutes: 180 });
  }
});

// Also refresh on-load
// (in case alarm is missed or fresh install)
refreshSiteData();

// Capture web requests
extensionAPI.webRequest.onBeforeSendHeaders.addListener(
  async (event) => {
    // Check for prefetch/prerender headers
    const isPrefetch = event.requestHeaders?.some(header => {
      const headerName = header.name.toLowerCase();
      const headerValue = (header.value || '').toLowerCase();
      return (
        (headerName === 'purpose' && headerValue.includes('prefetch')) ||
        (headerName === 'purpose' && headerValue.includes('preview')) ||
        (headerName === 'sec-purpose' && headerValue.includes('prefetch')) || 
        (headerName === 'sec-purpose' && headerValue.includes('preview')) ||
        (headerName === 'x-purpose' && headerValue.includes('prefetch')) ||
        (headerName === 'x-purpose' && headerValue.includes('preview')) ||
        headerName === 'x-moz-prefetch'
      );
    });

    if (!isPrefetch && event.documentLifecycle !== 'prerender') {
      if (event.frameType === 'sub_frame') {
        let tabInfo = await extensionAPI.tabs.get(event.tabId);
        main(tabInfo.url, event.tabId);
      } else {
        main(event.url, event.tabId);
      }
    }
  },
  { 
    urls: ['*://*.fandom.com/*', '*://*.wiki.fextralife.com/*', '*://*.neoseeker.com/wiki/*'], 
    types: ['main_frame', 'sub_frame']
  },
  ['requestHeaders']
);

// Listen for user turning extension on or off, to update icon
extensionAPI.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.action === 'updateIcon') {
    setPowerIcon(msg.value);
  } else if (msg.action === 'getStorage') {
    getCachedStorage().then((res) => {
      sendResponse(res);
      return res;
    });
    return true;
  } else if (msg.action === 'getSiteData') {
    loadSiteData().then((sites) => {
      sendResponse(sites);
    }).catch(() => {
      // Answer with null so the caller falls back to reading directly
      sendResponse(null);
    });
    return true;
  }
});

// Listen for browser starting, to set initial icon state
extensionAPI.runtime.onStartup.addListener(() => {
  extensionAPI.storage.local.get({ 'power': 'on' }, (item) => {
    setPowerIcon(item.power);
  });
});

// Listen for changes to stored data, and update our cached data
extensionAPI.storage.onChanged.addListener((changes, area) => {
  cachedStoragePromise = cachedStoragePromise.then((storage) => {
    applyStorageChanges(storage, changes, area);
    return storage;
  });
})

// Listen for extension installed/updating
extensionAPI.runtime.onInstalled.addListener(async (detail) => {
  // Set initial icon state
  extensionAPI.storage.local.get({ 'power': 'on' }, (item) => {
    setPowerIcon(item.power);
  });

  // If new install, open settings with starter guide
  if (detail.reason === 'install') {
    extensionAPI.tabs.create({ url: 'pages/settings/index.html?newinstall=true' });
  }

  // If update, open changelog if setting is enabled
  extensionAPI.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
    if (item.openChangelog === 'on' && detail.reason === 'update') {
      extensionAPI.tabs.create({ url: 'https://getindie.wiki/changelog/?updated=true', active: false });
    }
  });

  // Temporary functions for 3.0 migration
  if (detail.reason === 'update') {
    migrateToV3();
  }
});

function setPowerIcon(status) {
  const manifestVersion = extensionAPI.runtime.getManifest().manifest_version;
  if (status === 'on') {
    if (manifestVersion === 2) {
      extensionAPI.browserAction.setIcon({ path: "/images/logo-128.png" });
    } else {
      extensionAPI.action.setIcon({ path: "/images/logo-128.png" });
    }
  } else {
    if (manifestVersion === 2) {
      extensionAPI.browserAction.setIcon({ path: "/images/logo-off.png" });
    } else {
      extensionAPI.action.setIcon({ path: "/images/logo-off.png" });
    }
  }
}

function redirectToBreezeWiki(storage, tabId, url) {
  function processRedirect(host) {
    // Extract article from URL
    const urlFormatted = new URL(url);
    urlFormatted.search = '';
    const subdomain = urlFormatted.hostname.split(".")[0];
    const article = String(urlFormatted).split('fandom.com/wiki/')[1].replaceAll('%20', '_');

    // Perform redirect
    if (article) {
      extensionAPI.tabs.update(tabId, { url: host + '/' + subdomain + '/wiki/' + article });
    } else {
      extensionAPI.tabs.update(tabId, { url: host + '/' + subdomain });
    }

    // Increase BreezeWiki stat count
    extensionAPI.storage.sync.set({ 'countBreezeWiki': (storage.countBreezeWiki ?? 0) + 1 });

    if ((storage.notifications ?? 'on') === 'on') {
      // Notify that user is being redirected to BreezeWiki
      let notifID = 'independent-wiki-redirector-notification-' + Math.floor(Math.random() * 1E16);
      extensionAPI.notifications.create(notifID, {
        "type": "basic",
        "iconUrl": 'images/logo-48.png',
        "title": extensionAPI.i18n.getMessage('notificationTitleBreezeWiki'),
        "message": extensionAPI.i18n.getMessage('notificationMessageBreezeWiki')
      });
      // Self-clear notification after 6 seconds
      setTimeout(() => { extensionAPI.notifications.clear(notifID); }, 6000);
    }
  }

  if (url.includes('fandom.com/wiki/') && !url.includes('fandom.com/wiki/Special:') && !url.includes('fandom.com/wiki/Spezial:') && !url.includes('fandom=allow')) {
    if (!(storage.breezewikiHost ?? null)) {
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
            extensionAPI.storage.sync.set({ 'breezewikiHost': breezewikiMain[0].instance });
          } else {
            // If BreezeWiki.com is not available, set to a random mirror
            try {
              extensionAPI.storage.sync.set({ 'breezewikiHost': breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance });
            } catch (e) {
              console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
            }
          }
          extensionAPI.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
          extensionAPI.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
          processRedirect(host);
        }).catch((e) => {
          console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
          extensionAPI.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
        });
    } else {
      if (storage.breezewikiHost === 'CUSTOM') {
        processRedirect(storage.breezewikiCustomHost || 'https://breezewiki.com');
      } else {
        processRedirect(storage.breezewikiHost);
      }
    }
  }
}

async function main(url, tabId) {
  let storage = await getCachedStorage();

  if ((storage.power ?? 'on') === 'on') {
    let crossLanguageSetting = storage.crossLanguage || 'off';
    let matchingSite = await findMatchingSite(url, crossLanguageSetting);

    if (matchingSite) {
      // Get user's settings for the wiki
      let settings = await decompressJSON(storage.wikiSettings) || {};
      let id = matchingSite['id'];
      let siteSetting = settings[id] || storage.defaultWikiAction || 'alert';

      // Check if redirects are enabled for the site
      if (siteSetting === 'redirect') {
        let newURL = getNewURL(url, matchingSite);

        // Perform redirect
        extensionAPI.tabs.update(tabId, { url: newURL });

        // Increase redirect count
        extensionAPI.storage.sync.set({ 'countRedirects': (storage.countRedirects ?? 0) + 1 });

        // Notify if enabled
        if ((storage.notifications ?? 'on') === 'on') {
          // Notify that user is being redirected
          let notifID = 'independent-wiki-redirector-notification-' + Math.floor(Math.random() * 1E16);
          extensionAPI.notifications.create(notifID, {
            "type": "basic",
            "iconUrl": 'images/logo-48.png',
            "title": extensionAPI.i18n.getMessage('notificationTitle'),
            "message": extensionAPI.i18n.getMessage('notificationMessage', [matchingSite['origin'], matchingSite['destination']])
          });
          // Self-clear notification after 6 seconds
          setTimeout(() => { extensionAPI.notifications.clear(notifID); }, 6000);
        }
      } else if ((storage.breezewiki ?? 'off') === 'on' || (storage.breezewiki ?? 'off') === 'redirect') {
        redirectToBreezeWiki(storage, tabId, url);
      }
    } else if ((storage.breezewiki ?? 'off') === 'on' || (storage.breezewiki ?? 'off') === 'redirect') {
      redirectToBreezeWiki(storage, tabId, url);
    }
  }
}
