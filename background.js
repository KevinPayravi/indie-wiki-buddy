// Capture web requests
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (event) {
    if (event.documentLifecycle !== 'prerender') {
      main(event);
    }
  },
  { urls: ['*://*.fandom.com/*', '*://*.wiki.fextralife.com/*'], types: ['main_frame', 'sub_frame'] }
);

// Listen for user turning extension on or off, to update icon
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === 'updateIcon') {
    setPowerIcon(msg.value);
  }
});

// Listen for browser starting, to set initial icon state
chrome.runtime.onStartup.addListener(function () {
  chrome.storage.local.get({ 'power': 'on' }, function (item) {
    setPowerIcon(item.power);
  });
});

// Listen for extension installed/updating
chrome.runtime.onInstalled.addListener(async function (detail) {
  // Set initial icon state
  chrome.storage.local.get({ 'power': 'on' }, function (item) {
    setPowerIcon(item.power);
  });

  // If new install, open settings with starter guide
  if (detail.reason === 'install') {
    chrome.tabs.create({ url: 'settings.html?newinstall=true' });
  }

  // If update, open changelog
  if (detail.reason === 'update') {
    chrome.tabs.create({ url: 'https://getindie.wiki/changelog/?updated=true' });
  }

  // Temporary functions for 3.0 migration
  if (detail.reason === 'update') {
    // Set new default action settings:
    chrome.storage.sync.get({ 'defaultWikiAction': null }, function (item) {
      if (!item.defaultWikiAction) {
        chrome.storage.sync.get({ 'defaultActionSettings': {} }, function (item) {
          if (item.defaultActionSettings['EN']) {
            chrome.storage.sync.set({ 'defaultWikiAction': item.defaultActionSettings['EN'] });
          } else {
            chrome.storage.sync.set({ 'defaultWikiAction': 'alert' });
          }
        });
      }
    });
    chrome.storage.sync.get({ 'defaultSearchAction': null }, function (item) {
      if (!item.defaultSearchAction) {
        chrome.storage.sync.get({ 'defaultSearchFilterSettings': {} }, function (item) {
          if (item.defaultSearchFilterSettings['EN']) {
            if (item.defaultSearchFilterSettings['EN'] === 'true') {
              chrome.storage.sync.set({ 'defaultSearchAction': 'replace' });
            } else if (item.defaultSearchFilterSettings['EN'] === 'false') {
              chrome.storage.sync.set({ 'defaultSearchAction': 'disabled' });
            }
          } else {
            chrome.storage.sync.set({ 'defaultSearchAction': 'replace' });
          }
        });
      }
    });

    // Create new searchEngineSettings and wikiSettings objects:
    sites = await getData();
    chrome.storage.sync.get(function (storage) {
      let siteSettings = storage.siteSettings || {};
      let defaultWikiAction = storage.defaultWikiAction || 'alert';
      let defaultSearchAction = storage.defaultSearchAction || 'replace';
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
    });

    // Remove old siteSettings object:
    chrome.storage.sync.remove('siteSettings');
  }
});

if (chrome.declarativeNetRequest) {
  // In Manifest v3:
  // Whenever stored settings change, update the header
  // that is sent to BreezeWiki instances to inform them the user has IWB
  updateDeclarativeRule();
  chrome.storage.onChanged.addListener(event => updateDeclarativeRule());
} else {
  // In Manifest v2:
  // On main frame BreezeWiki requests, update the header
  // that is sent to BreezeWiki instances to inform them the user has IWB
  chrome.webRequest.onBeforeSendHeaders.addListener(async (details) =>
    addHeaderToRequest(details),
    {
      urls: [
        '*://breezewiki.com/*',
        '*://antifandom.com/*',
        '*://bw.projectsegfau.lt/*',
        '*://breeze.hostux.net/*',
        '*://breezewiki.pussthecat.org/*',
        '*://bw.vern.cc/*',
        '*://breezewiki.esmailelbob.xyz/*',
        '*://bw.artemislena.eu/*',
        '*://bw.hamstro.dev/*',
        '*://nerd.whatever.social/*',
        '*://breeze.nohost.network/*',
        '*://breeze.whateveritworks.org/*'
      ],
      types: [
        'main_frame'
      ]
    },
    ["blocking", "requestHeaders"]
  );
}

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

function addHeaderToRequest(details) {
  return new Promise((resolve) => {
    chrome.storage.local.get(async (localStorage) => {
      await chrome.storage.sync.get((syncStorage) => {
        const storage = { ...syncStorage, ...localStorage };
        const headerValue = JSON.stringify({
          'power': storage.power,
          'breezewiki': storage.breezewiki
        });
        details.requestHeaders.push({ name: 'x-indie-wiki', value: headerValue });
        resolve({ requestHeaders: details.requestHeaders });
      });
    });
  });
}

function updateDeclarativeRule() {
  chrome.storage.local.get(function (localStorage) {
    chrome.storage.sync.get(function (syncStorage) {
      const storage = { ...syncStorage, ...localStorage };
      const headerValue = JSON.stringify({
        'power': storage.power ?? 'on',
        'breezewiki': storage.breezewiki ?? 'off'
      });
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [
          {
            "id": 1,
            "priority": 1,
            "action": {
              "type": "modifyHeaders",
              "requestHeaders": [
                {
                  "operation": "set",
                  "header": "x-indie-wiki",
                  "value": headerValue
                }
              ]
            },
            "condition": {
              "requestDomains": [
                "breezewiki.com",
                "antifandom.com",
                "bw.projectsegfau.lt",
                "breeze.hostux.net",
                "breezewiki.pussthecat.org",
                "bw.vern.cc",
                "breezewiki.esmailelbob.xyz",
                "bw.artemislena.eu",
                "bw.hamstro.dev",
                "nerd.whatever.social",
                "breeze.nohost.network",
                "breeze.whateveritworks.org"
              ],
              "resourceTypes": [
                "main_frame"
              ]
            }
          }
        ]
      });
    });
  });
}

function redirectToBreezeWiki(storage, eventInfo, url) {
  function processRedirect(host) {
    const subdomain = url.hostname.split(".")[0];
    const article = url.href.split('fandom.com/wiki/')[1].replaceAll('%20', '_');

    // Extract article from URL
    if (article) {
      chrome.tabs.update(eventInfo.tabId, { url: host + '/' + subdomain + '/wiki/' + article });
    } else {
      chrome.tabs.update(eventInfo.tabId, { url: host + '/' + subdomain });
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
      setTimeout(function () { chrome.notifications.clear(notifID); }, 6000);
    }
  }

  if (url.href.includes('fandom.com/wiki/')) {
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
      processRedirect(storage.breezewikiHost);
    }
  }
}

// Load website data
async function getData() {
  const LANGS = ["DE", "EN", "ES", "FR", "IT", "PL", "TOK"];
  let sites = [];
  let promises = [];
  for (let i = 0; i < LANGS.length; i++) {
    promises.push(fetch(chrome.runtime.getURL('data/sites' + LANGS[i] + '.json'))
      .then((resp) => resp.json())
      .then(function (jsonData) {
        jsonData.forEach((site) => {
          site.origins.forEach((origin) => {
            sites.push({
              "id": site.id,
              "origin": origin.origin,
              "origin_base_url": origin.origin_base_url,
              "origin_content_path": origin.origin_content_path,
              "destination": site.destination,
              "destination_base_url": site.destination_base_url,
              "destination_content_path": site.destination_content_path,
              "destination_content_prefix": (site.destination_content_prefix ? site.destination_content_prefix : ""),
              "destination_platform": site.destination_platform,
              "destination_icon": site.destination_icon,
              "lang": LANGS[i]
            })
          })
        });
      }));
  }
  await Promise.all(promises);
  return sites;
}

async function main(eventInfo) {
  // Store tab URL and remove any search parameters and section anchors
  let url = '';
  if (eventInfo.type === 'main_frame') {
    url = new URL(eventInfo.url.replace(/(\?|#).*/i, ''));
  } else {
    url = new URL(eventInfo.initiator);
  }

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

  chrome.storage.local.get(function (localStorage) {
    chrome.storage.sync.get(function (syncStorage) {
      const storage = { ...syncStorage, ...localStorage };
      if ((storage.power ?? 'on') === 'on') {
        let crossLanguageSetting = storage.crossLanguage || 'off';
        // Check if site is in our list of wikis:
        let matchingSites = [];
        if (crossLanguageSetting === 'on') {
          matchingSites = sites.filter(el => url.href.replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
        } else {
          matchingSites = sites.filter(el => url.href.replace(/^https?:\/\//, '').startsWith(el.origin_base_url + el.origin_content_path));
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
              let article = url.href.split(site['origin_base_url'] + site['origin_content_path'])[1];
              // Set up URL to redirect user to based on wiki platform
              let newURL = '';
              if (article) {
                let searchParams = '';
                switch (site['destination_platform']) {
                  case 'mediawiki':
                    searchParams = 'Special:Search/' + site['destination_content_prefix'] + article;
                    break;
                  case 'doku':
                    searchParams = 'start?do=search&q=' + article;
                    break;
                }
                newURL = 'https://' + site["destination_base_url"] + site["destination_content_path"] + searchParams;
              } else {
                newURL = 'https://' + site["destination_base_url"];
              }

              // Perform redirect
              chrome.tabs.update(eventInfo.tabId, { url: newURL });

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
                setTimeout(function () { chrome.notifications.clear(notifID); }, 6000);
              }
            } else if ((storage.breezewiki ?? 'off') === 'on') {
              redirectToBreezeWiki(storage, eventInfo, url);
            }
          }
        } else if ((storage.breezewiki ?? 'off') === 'on') {
          redirectToBreezeWiki(storage, eventInfo, url);
        }
      }
    });
  });
}
