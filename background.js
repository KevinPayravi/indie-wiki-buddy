import {
  extensionAPI,
  findMatchingSite,
  getNewURL,
  getUserSettings,
  loadSiteData,
  migrateUserSettings,
  refreshSiteData,
  SEARCHENGINEDOMAINS,
  BREEZEWIKIDOMAINS,
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

// Fold pre-4.0 settings keys into the sharded keys
migrateUserSettings();

// Older devices can recreate the pre-4.0 keys via sync
extensionAPI.storage.onChanged.addListener((changes, area) => {
  if (
    area === 'sync' &&
    (changes.wikiSettings?.newValue !== undefined || changes.searchEngineSettings?.newValue !== undefined)
  ) {
    migrateUserSettings();
  }
});

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

// Convert a match pattern like "https://*.bing.com/search*" to an anchored regex
function matchPatternToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Match patterns ignore ports, so allow an optional port after host
  // (needed for localhost instances)
  const withPort = escaped.replace(/^([^/]+:\/\/[^/]*)\//, '$1(?::\\d+)?/');
  return new RegExp('^' + withPort
    .replace(/\*\\\./g, '\x00')
    .replace(/\*/g, '.*')
    .replace(/\x00/g, '(?:[^/]*\\.)?'));
}

function getSearchEngine(url, callback) {
  extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
    let customSearchEngines = item.customSearchEngines;
    let searchEngines = { ...SEARCHENGINEDOMAINS, ...customSearchEngines };
    try {
      for (let engine in searchEngines) {
        // Skip string entries from the pre-4.0 {hostname: preset} format
        const patterns = Array.isArray(searchEngines[engine]) ? searchEngines[engine] : [];
        for (let pattern of patterns) {
          if (matchPatternToRegex(pattern).test(url)) {
            callback(engine);
            return;
          }
        }
      }

      callback(null); // Return null if no match
    } catch (error) {
      console.error("Invalid URL:", error);
      callback(null);
    }
  });
}

function getBreezewikiHost(url, callback) {
  extensionAPI.storage.sync.get({ 'breezewikiCustomHost': '' }, (item) => {
    let breezewikiCustomHost = item.breezewikiCustomHost;
    // BREEZEWIKIDOMAINS is an array of patterns
    // breezewikiCustomHost is a string URL for the user's custom BreezeWiki host
    let allPatterns = [...BREEZEWIKIDOMAINS];
    if (breezewikiCustomHost && typeof breezewikiCustomHost === 'string') {
      allPatterns.push(breezewikiCustomHost.replace(/\/$/, '') + '/*');
    }
    try {
      for (let pattern of allPatterns) {
        if (matchPatternToRegex(pattern).test(url)) {
          callback(true);
          return;
        }
      }
      
      callback(null); // Return null if no match
    } catch (error) {
      console.error("Invalid URL:", error);
      callback(null);
    }
  });
}

extensionAPI.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.url && changeInfo.status === 'loading') {
    const currentUrl = new URL(tab.url);
    // Check if search engine
    getSearchEngine(currentUrl.href, (searchEngine) => {
      if (searchEngine) {
        extensionAPI.scripting.executeScript({
          target: { tabId: tab.id },
          args: [{engine: searchEngine}],
          func: vars => Object.assign(self, vars)
        }, () => {
          // Injection fails if the tab navigated away; skip the main script
          if (extensionAPI.runtime.lastError) {
            return;
          }
          extensionAPI.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/content-search-filtering-importer.js']
          });
        });
        extensionAPI.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['css/content-search-filtering.css']
        });
      } else {
        // If not search engine, check if Breezewiki
        getBreezewikiHost(currentUrl.href, (breezewikiHost) => {
          if (breezewikiHost) {
            extensionAPI.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['scripts/content-banners-importer.js']
            });
            extensionAPI.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['css/content-banners.css']
            });
            extensionAPI.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['scripts/content-breezewiki.js']
            });
            extensionAPI.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['css/content-search-filtering.css']
            });
          }
        });
      }
    });
  }
});

// Listen for user turning extension on or off, to update icon
extensionAPI.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
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

// Listen for optional permissions being revoked externally (i.e. via the browser's
// extensions management page) and sync searchEngineToggles storage accordingly.
extensionAPI.permissions.onRemoved.addListener((permissions) => {
  const removedOrigins = permissions.origins || [];
  if (removedOrigins.length === 0) return;

  // A broad wildcard removal (e.g. switching to "on click" in Chrome) also
  // revokes access to all engines covered by optional_host_permissions.
  const broadWildcardRemoved = removedOrigins.some(
    (o) => o === 'https://*/*' || o === '*://*/*'
  );

  extensionAPI.storage.sync.get({ 'searchEngineToggles': {} }, (settings) => {
    let updated = false;
    for (const [engine, origins] of Object.entries(SEARCHENGINEDOMAINS)) {
      // google.com filtering is declared in content_scripts, so perms don't switch
      if (engine === 'google') {
        continue;
      }
      const directMatch = origins.some((o) => removedOrigins.includes(o));
      if (directMatch || broadWildcardRemoved) {
        if (settings.searchEngineToggles[engine] !== 'off') {
          settings.searchEngineToggles[engine] = 'off';
          updated = true;
        }
      }
    }
    if (updated) {
      extensionAPI.storage.sync.set({ 'searchEngineToggles': settings.searchEngineToggles });
    }
  });
});

// Listen for optional permissions being granted to sync settings
// This is necessary because if a permission is requested from a popup, the popup might close
// before the callback executes, preventing the setting from being saved.
extensionAPI.permissions.onAdded.addListener((permissions) => {
  const addedOrigins = permissions.origins || [];
  if (addedOrigins.length === 0) return;

  // A broad wildcard grant (e.g. switching back from "on click" in Chrome)
  // restores access to all engines covered by optional_host_permissions
  const broadWildcardAdded = addedOrigins.some(
    (o) => o === 'https://*/*' || o === '*://*/*'
  );

  // For each engine the grant touches,
  // confirm its full origin set is now held
  // before toggling it on
  const engineChecks = Object.entries(SEARCHENGINEDOMAINS)
    .filter(([engine, origins]) =>
      // google.com filtering is declared in content_scripts, so perms don't switch
      engine !== 'google' &&
      (broadWildcardAdded || origins.some((o) => addedOrigins.includes(o)))
    )
    .map(([engine, origins]) =>
      new Promise((resolve) => {
        extensionAPI.permissions.contains({ origins }, (hasAllOrigins) => {
          resolve(hasAllOrigins ? engine : null);
        });
      })
    );

  Promise.all(engineChecks).then((engines) => {
    const enginesToEnable = engines.filter(Boolean);
    if (enginesToEnable.length === 0) return;
    extensionAPI.storage.sync.get({ 'searchEngineToggles': {} }, (settings) => {
      let updated = false;
      for (const engine of enginesToEnable) {
        if (settings.searchEngineToggles[engine] !== 'on') {
          settings.searchEngineToggles[engine] = 'on';
          updated = true;
        }
      }
      if (updated) {
        extensionAPI.storage.sync.set({ 'searchEngineToggles': settings.searchEngineToggles });
      }
    });
  });

  // Check if there are any pending BreezeWiki setting updates
  commitPendingBreezewikiHosts();
});

// Commit a pending BreezeWiki host choice once its permission is held
function commitPendingBreezewikiHosts() {
  extensionAPI.storage.local.get(['pendingBreezeWikiHost', 'pendingCustomBreezeWikiHost'], (local) => {
    if (local.pendingBreezeWikiHost) {
      extensionAPI.permissions.contains({ origins: [local.pendingBreezeWikiHost + '/*'] }, (hasPermission) => {
        if (hasPermission) {
          extensionAPI.storage.sync.set({ 'breezewikiHost': local.pendingBreezeWikiHost });
          extensionAPI.storage.local.remove(['pendingBreezeWikiHost']);
        }
      });
    }
    if (local.pendingCustomBreezeWikiHost) {
      extensionAPI.permissions.contains({ origins: [local.pendingCustomBreezeWikiHost + '/*'] }, (hasPermission) => {
        if (hasPermission) {
          extensionAPI.storage.sync.set({
            'breezewikiHost': 'CUSTOM',
            'breezewikiCustomHost': local.pendingCustomBreezeWikiHost
          });
          extensionAPI.storage.local.remove(['pendingCustomBreezeWikiHost']);
        }
      });
    }
  });
}

// Pages write the pending key before calling permissions.request
extensionAPI.storage.onChanged.addListener((changes, area) => {
  if (
    area === 'local' &&
    (changes.pendingBreezeWikiHost?.newValue || changes.pendingCustomBreezeWikiHost?.newValue)
  ) {
    commitPendingBreezewikiHosts();
  }
});

// Listen for extension installed/updating
extensionAPI.runtime.onInstalled.addListener(async (detail) => {
  // Set initial icon state
  extensionAPI.storage.local.get({ 'power': 'on' }, (item) => {
    setPowerIcon(item.power);
  });

  // If new install, open settings with starter guide
  if (detail.reason === 'install') {
    extensionAPI.tabs.create({ url: 'pages/setup/index.html' });
  }

  const isPre4Update = detail.reason === 'update' && parseInt(detail.previousVersion.split('.')[0], 10) < 4;

  // If update, open changelog if setting is enabled
  // (skipped when the permissions update page below is also opening)
  extensionAPI.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
    if (item.openChangelog === 'on' && detail.reason === 'update' && !isPre4Update) {
      extensionAPI.tabs.create({ url: 'https://getindie.wiki/changelog/?updated=true', active: false });
    }
  });

  // If updating from pre-4.0, show permissions update page
  if (isPre4Update) {
    extensionAPI.tabs.create({ url: 'pages/permissions-update/index.html', active: false });

    // Reset Breezewiki settings
    extensionAPI.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
    extensionAPI.storage.sync.set({ 'breezewikiCustomHost': '' });

    // Convert custom search engines from the pre-4.0 {hostname: preset}
    // format to {preset: [origin patterns]}
    extensionAPI.storage.sync.get({ 'customSearchEngines': {} }, (item) => {
      const engines = item.customSearchEngines;
      if (!Object.values(engines).some((value) => typeof value === 'string')) {
        return;
      }
      const migrated = {};
      for (const [key, value] of Object.entries(engines)) {
        if (Array.isArray(value)) {
          // Already-migrated {preset: [patterns]} entry synced from another device
          migrated[key] = [...new Set([...(migrated[key] || []), ...value])];
        } else if (typeof value === 'string') {
          // Pre-4.0 {hostname: preset} entry
          const pattern = 'https://' + key + '/*';
          migrated[value] = migrated[value] || [];
          if (!migrated[value].includes(pattern)) {
            migrated[value].push(pattern);
          }
        }
      }
      extensionAPI.storage.sync.set({ 'customSearchEngines': migrated });
    });
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
    // Ensure host has a protocol (guard against stored values missing https://)
    if (host && !host.startsWith('http')) {
      host = 'https://' + host;
    }

    // Extract article from URL
    const urlFormatted = new URL(url);
    urlFormatted.search = '';
    const subdomain = urlFormatted.hostname.split(".")[0];
    
    let article = '';
    if (urlFormatted.pathname.startsWith('/wiki/')) {
      article = urlFormatted.pathname.substring(6).replaceAll('%20', '_');
      if (urlFormatted.hash) {
        article += urlFormatted.hash;
      }
    }

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

  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (e) {
    return;
  }

  if (
    urlObj.hostname.endsWith('fandom.com') && 
    urlObj.pathname.startsWith('/wiki/') && 
    !urlObj.pathname.startsWith('/wiki/Special:') && 
    !urlObj.pathname.startsWith('/wiki/Spezial:') && 
    !urlObj.search.includes('fandom=allow')
  ) {
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
          let selectedHost;
          let breezewikiMain = breezewikiHosts.filter(h => h.instance === 'https://breezewiki.com');
          if (breezewikiMain.length > 0) {
            selectedHost = breezewikiMain[0].instance;
            extensionAPI.storage.sync.set({ 'breezewikiHost': selectedHost });
          } else {
            // If BreezeWiki.com is not available, set to a random mirror
            try {
              selectedHost = breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance;
              extensionAPI.storage.sync.set({ 'breezewikiHost': selectedHost });
            } catch (e) {
              console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
              selectedHost = 'https://breezewiki.com';
            }
          }
          extensionAPI.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
          extensionAPI.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
          processRedirect(selectedHost);
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
      let settings = await getUserSettings('wikiSettings', storage);
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
