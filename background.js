if (typeof importScripts !== 'undefined') {
  importScripts('scripts/common-functions.js');
}

let cachedStorage = {};

async function updateCachedStorage() {
  let localStorage = await chrome.storage.local.get();
  let syncStorage = await chrome.storage.sync.get();
  cachedStorage = {...localStorage, ...syncStorage};
}

async function getCachedStorage() {
  if (Object.keys(cachedStorage).length === 0) {
    await updateCachedStorage();
  }
  return cachedStorage;
}

// Cache Chrome's storage in memory so that we don't need to make repeated calls
updateCachedStorage();

// Capture web requests
chrome.webRequest.onBeforeSendHeaders.addListener(
  async (event) => {
    if (event.documentLifecycle !== 'prerender') {
      if (event.frameType === 'sub_frame') {
        let tabInfo = await chrome.tabs.get(event.tabId);
        main(tabInfo.url, event.tabId);
      } else {
        main(event.url, event.tabId);
      }
    }
  },
  { urls: ['*://*.fandom.com/*', '*://*.wiki.fextralife.com/*', '*://*.neoseeker.com/wiki/*'], types: ['main_frame', 'sub_frame'] }
);

// Listen for user turning extension on or off, to update icon
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'updateIcon') {
    setPowerIcon(msg.value);
  } else if (msg.action === 'getStorage') {
    getCachedStorage().then((res) => {
      sendResponse(res)
    });
    return true;
  }
});

// Listen for browser starting, to set initial icon state
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get({ 'power': 'on' }, (item) => {
    setPowerIcon(item.power);
  });
});

// Listen for changes to stored data, and updated our cached data
chrome.storage.onChanged.addListener(() => {
  updateCachedStorage();
})

// Listen for extension installed/updating
chrome.runtime.onInstalled.addListener(async (detail) => {
  // Set initial icon state
  chrome.storage.local.get({ 'power': 'on' }, (item) => {
    setPowerIcon(item.power);
  });

  // If new install, open settings with starter guide
  if (detail.reason === 'install') {
    chrome.tabs.create({ url: 'pages/settings/index.html?newinstall=true' });
  }

  // If update, open changelog if setting is enabled
  chrome.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
    if (item.openChangelog === 'on' && detail.reason === 'update') {
      chrome.tabs.create({ url: 'https://getindie.wiki/changelog/?updated=true', active: false });
    }
  });

  // Temporary functions for 3.0 migration
  if (detail.reason === 'update') {
    commonFunctionMigrateToV3();
  }
});

function setPowerIcon(status) {
  const manifestVersion = chrome.runtime.getManifest().manifest_version;
  if (status === 'on') {
    if (manifestVersion === 2) {
      chrome.browserAction.setIcon({ path: "/images/logo-128.png" });
    } else {
      chrome.action.setIcon({ path: "/images/logo-128.png" });
    }
  } else {
    if (manifestVersion === 2) {
      chrome.browserAction.setIcon({ path: "/images/logo-off.png" });
    } else {
      chrome.action.setIcon({ path: "/images/logo-off.png" });
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
      chrome.tabs.update(tabId, { url: host + '/' + subdomain + '/wiki/' + article });
    } else {
      chrome.tabs.update(tabId, { url: host + '/' + subdomain });
    }

    // Increase BreezeWiki stat count
    chrome.storage.sync.set({ 'countBreezeWiki': (storage.countBreezeWiki ?? 0) + 1 });

    if ((storage.notifications ?? 'on') === 'on') {
      // Notify that user is being redirected to BreezeWiki
      let notifID = 'independent-wiki-redirector-notification-' + Math.floor(Math.random() * 1E16);
      chrome.notifications.create(notifID, {
        "type": "basic",
        "iconUrl": 'images/logo-48.png',
        "title": "You've been redirected to BreezeWiki!",
        "message": "Indie Wiki Buddy has sent you to BreezeWiki for a cleaner, ad-free experience on Fandom."
      });
      // Self-clear notification after 6 seconds
      setTimeout(() => { chrome.notifications.clear(notifID); }, 6000);
    }
  }

  if (url.includes('fandom.com/wiki/') && !url.includes('fandom=allow')) {
    if (!(storage.breezewikiHost ?? null)) {
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
            chrome.storage.sync.set({ 'breezewikiHost': breezewikiMain[0].instance });
          } else {
            // If BreezeWiki.com is not available, set to a random mirror
            try {
              chrome.storage.sync.set({ 'breezewikiHost': breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance });
            } catch (e) {
              console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
            }
          }
          chrome.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
          chrome.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
          processRedirect(host);
        }).catch((e) => {
          console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
          chrome.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
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
  // Create object prototypes for getting and setting attributes
  Object.prototype.get = function (prop) {
    this[prop] = this[prop] || {};
    return this[prop];
  };
  Object.prototype.set = function (prop, value) {
    this[prop] = value;
  }

  let storage = await getCachedStorage();

  if ((storage.power ?? 'on') === 'on') {
    let crossLanguageSetting = storage.crossLanguage || 'off';
    let matchingSite = await commonFunctionFindMatchingSite(url, crossLanguageSetting);

    if (matchingSite) {
      // Get user's settings for the wiki
      let settings = await commonFunctionDecompressJSON(storage.wikiSettings) || {};
      let id = matchingSite['id'];
      let siteSetting = settings[id] || storage.defaultWikiAction || 'alert';

      // Check if redirects are enabled for the site
      if (siteSetting === 'redirect') {
        let newURL = commonFunctionGetNewURL(url, matchingSite);

        // Perform redirect
        chrome.tabs.update(tabId, { url: newURL });

        // Increase redirect count
        chrome.storage.sync.set({ 'countRedirects': (storage.countRedirects ?? 0) + 1 });

        // Notify if enabled
        if ((storage.notifications ?? 'on') === 'on') {
          // Notify that user is being redirected
          let notifID = 'independent-wiki-redirector-notification-' + Math.floor(Math.random() * 1E16);
          chrome.notifications.create(notifID, {
            "type": "basic",
            "iconUrl": 'images/logo-48.png',
            "title": "You've been redirected!",
            "message": "Indie Wiki Buddy has sent you from " + matchingSite['origin'] + " to " + matchingSite['destination']
          });
          // Self-clear notification after 6 seconds
          setTimeout(() => { chrome.notifications.clear(notifID); }, 6000);
        }
      } else if ((storage.breezewiki ?? 'off') === 'on' || (storage.breezewiki ?? 'off') === 'redirect') {
        redirectToBreezeWiki(storage, tabId, url);
      }
    } else if ((storage.breezewiki ?? 'off') === 'on' || (storage.breezewiki ?? 'off') === 'redirect') {
      redirectToBreezeWiki(storage, tabId, url);
    }
  }
}
