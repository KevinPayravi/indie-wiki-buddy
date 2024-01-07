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
  { urls: ['*://*.fandom.com/*', '*://*.wiki.fextralife.com/*'], types: ['main_frame', 'sub_frame'] }
);

// Listen for user turning extension on or off, to update icon
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'updateIcon') {
    setPowerIcon(msg.value);
  }
});

// Listen for browser starting, to set initial icon state
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get({ 'power': 'on' }, (item) => {
    setPowerIcon(item.power);
  });
});

// Listen for extension installed/updating
chrome.runtime.onInstalled.addListener(async (detail) => {
  // Set initial icon state
  chrome.storage.local.get({ 'power': 'on' }, (item) => {
    setPowerIcon(item.power);
  });

  // If new install, open settings with starter guide
  if (detail.reason === 'install') {
    chrome.tabs.create({ url: 'settings.html?newinstall=true' });
  }

  // If update, open changelog if setting is enabled
  chrome.storage.sync.get({ 'openChangelog': 'off' }, (item) => {
    if (item.openChangelog === 'on' && detail.reason === 'update') {
      chrome.tabs.create({ url: 'https://getindie.wiki/changelog/?updated=true', active: false });
    }
  });

  // Temporary functions for 3.0 migration
  if (detail.reason === 'update') {
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
    const subdomain = urlFormatted.hostname.split(".")[0];
    const article = url.split('fandom.com/wiki/')[1].replaceAll('%20', '_');

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

// Load website data
async function getData() {
  const LANGS = ["DE", "EN", "ES", "FR", "IT", "KO", "PL", "PT", "RU", "TOK", "UK", "ZH"];
  let sites = [];
  let promises = [];
  for (let i = 0; i < LANGS.length; i++) {
    promises.push(fetch(chrome.runtime.getURL('data/sites' + LANGS[i] + '.json'))
      .then((resp) => resp.json())
      .then((jsonData) => {
        jsonData.forEach((site) => {
          site.origins.forEach((origin) => {
            sites.push({
              "id": site.id,
              "origin": origin.origin,
              "origin_base_url": origin.origin_base_url,
              "origin_content_path": origin.origin_content_path,
              "origin_main_page": origin.origin_main_page,
              "destination": site.destination,
              "destination_base_url": site.destination_base_url,
              "destination_search_path": site.destination_search_path,
              "destination_content_prefix": (site.destination_content_prefix ? site.destination_content_prefix : ""),
              "destination_platform": site.destination_platform,
              "destination_icon": site.destination_icon,
              "destination_main_page": site.destination_main_page,
              "lang": LANGS[i]
            })
          })
        });
      }));
  }
  await Promise.all(promises);
  return sites;
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

  // Check if tab is actually available
  // This is mainly to prevent background processes from triggering an event
  let sites = [];

  sites = await getData();

  chrome.storage.local.get((localStorage) => {
    chrome.storage.sync.get((syncStorage) => {
      const storage = { ...syncStorage, ...localStorage };
      if ((storage.power ?? 'on') === 'on') {
        let crossLanguageSetting = storage.crossLanguage || 'off';
        // Check if site is in our list of wikis:
        let matchingSites = [];
        if (crossLanguageSetting === 'on') {
          matchingSites = sites.filter(el => url.replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
        } else {
          matchingSites = sites.filter(el => url.replace(/^https?:\/\//, '').startsWith(el.origin_base_url + el.origin_content_path));
        }
        if (matchingSites.length > 0) {
          // Select match with longest base URL 
          let closestMatch = "";
          matchingSites.forEach(site => {
            if (site.origin_base_url.length > closestMatch.length) {
              closestMatch = site.origin_base_url;
            }
          });
          let site = matchingSites.find(site => site.origin_base_url === closestMatch);
          if (site) {
            // Get user's settings for the wiki
            let settings = storage.wikiSettings || {};
            let id = site['id'];
            let siteSetting = settings[id] || storage.defaultWikiAction || 'alert';
            // Check if redirects are enabled for the site
            if (siteSetting === 'redirect') {
              // Get article name from the end of the URL;
              // We can't just take the last part of the path due to subpages;
              // Instead, we take everything after the wiki's base URL + content path
              let originArticle = decodeURIComponent(url.split(site['origin_base_url'] + site['origin_content_path'])[1] || '');
              let destinationArticle = originArticle;
              // Set up URL to redirect user to based on wiki platform
              let newURL = '';
              if (originArticle) {
                // Check if main page
                if (originArticle === site['origin_main_page']) {
                  switch (site['destination_platform']) {
                    case 'doku':
                      destinationArticle = '';
                      break;
                    default:
                      destinationArticle = site['destination_main_page'];
                  }
                }

                // Replace underscores with spaces as that performs better in search
                destinationArticle = destinationArticle.replaceAll('_', ' ');

                let searchParams = '';
                switch (site['destination_platform']) {
                  case 'mediawiki':
                    searchParams = '?search=' + site['destination_content_prefix'] + destinationArticle;
                    break;
                  case 'doku':
                    searchParams = 'start?do=search&q=' + destinationArticle;
                    break;
                }
                newURL = 'https://' + site["destination_base_url"] + site["destination_search_path"] + searchParams;
              } else {
                newURL = 'https://' + site["destination_base_url"];
              }

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
                  "message": "Indie Wiki Buddy has sent you from " + site['origin'] + " to " + site['destination']
                });
                // Self-clear notification after 6 seconds
                setTimeout(() => { chrome.notifications.clear(notifID); }, 6000);
              }
            } else if ((storage.breezewiki ?? 'off') === 'on' || (storage.breezewiki ?? 'off') === 'redirect') {
              redirectToBreezeWiki(storage, tabId, url);
            }
          }
        } else if ((storage.breezewiki ?? 'off') === 'on' || (storage.breezewiki ?? 'off') === 'redirect') {
          redirectToBreezeWiki(storage, tabId, url);
        }
      }
    });
  });
}
