// onBeforeNavigate captures right before navigation to a new page starts; 
// onCreatedNavigationTarget captures new tabs/windows;
// onCommitted captures after onBeforeNavigate, used to catch redirects.
chrome.webNavigation.onBeforeNavigate.addListener(event => main(event, 'onBeforeNavigation'));
chrome.webNavigation.onCreatedNavigationTarget.addListener(event => main(event, 'onCreatedNavigationTarget'));
chrome.webNavigation.onCommitted.addListener(event => main(event, 'onCommitted'));

// Listen for user turning extension on or off, to update icon
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === "updateIcon") {
    const manifestVersion = chrome.runtime.getManifest().manifest_version;
    if (msg.value === 'on') {
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
});

function redirectToBreezeWiki(storage, eventInfo, url) {
  function processRedirect(host) {
    const subdomain = url.hostname.split(".")[0];
    const article = url.href.split('fandom.com/wiki/')[1].replaceAll('%20', '_');
    if (article) {
      chrome.tabs.update(eventInfo.tabId, { url: host + '/' + subdomain + '/wiki/' + article });
    } else {
      chrome.tabs.update(eventInfo.tabId, { url: host + '/' + subdomain });
    }
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
      // Self-clear notification after 6 seconds:
      setTimeout(function () { chrome.notifications.clear(notifID); }, 6000);
    }
  }

  if (url.href.includes('fandom.com/wiki/')) {
    if (!(storage.breezewikiHost ?? null)) {
      fetch('https://bw.getindie.wiki/instances.json')
        .then((response) => response.json())
        .then((breezewikiHosts) => {
          // Check if BreezeWiki's main site is available
          let breezewikiMain = breezewikiHosts.filter(host => host.instance === 'https://breezewiki.com');
          if (breezewikiMain.length > 0) {
            chrome.storage.sync.set({ 'breezewikiHost': breezewikiMain[0].instance });
          } else {
            // If BreezeWiki.com is not available, set to a random mirror
            chrome.storage.sync.set({ 'breezewikiHost': breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance });
          }
          chrome.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
          chrome.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
          processRedirect(host);
        });
    } else {
      processRedirect(storage.breezewikiHost);
    }
  }
}

// Load website data:
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
              "destination_base_url":  site.destination_base_url,
              "destination_content_path":  site.destination_content_path,
              "destination_platform":  site.destination_platform,
              "destination_icon":  site.destination_icon,
              "lang": LANGS[i]
            })
          })
        });
      }));
  }
  await Promise.all(promises);
  return sites;
}

async function main(eventInfo, eventName) {
  // Create object prototypes for getting and setting attributes:
  Object.prototype.get = function (prop) {
    this[prop] = this[prop] || {};
    return this[prop];
  };
  Object.prototype.set = function (prop, value) {
    this[prop] = value;
  }

  // Store tab URL and remove any search parameters and section anchors:
  const url = new URL(eventInfo.url.replace(/(\?|#).*/i, ''));

  // Check if tabId is > 0 (some background events may have tabId < 0)
  // & check for fandom.com in hostname and quit early if it's not:
  if (eventInfo.tabId > 0 && (url.hostname.includes('.fandom.com') || url.hostname.includes('wiki.fextralife.com'))) {
    // Check if tab is actually available
    // This is mainly to prevent background processes from triggering an event
    chrome.tabs.get(eventInfo.tabId, async function (tab) {
      if (tab) {
        let sites = [];

        sites = await getData();

        chrome.storage.sync.get(function (storage) {
          if ((storage.power ?? 'on') === 'on') {
            // Check if site is in our list of wikis:
            let matchingSites = sites.filter(el => url.href.replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
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
                let settings = storage.siteSettings || {};
                let id = site['id'];
                let siteSetting = '';
                if (settings.hasOwnProperty(id) && settings[id].hasOwnProperty('action')) {
                  siteSetting = settings[id].action;
                } else if (storage.defaultActionSettings && storage.defaultActionSettings[site.language]) {
                  siteSetting = storage.defaultActionSettings[site.language];
                } else {
                  siteSetting = 'alert';
                }
                // Check if redirects are enabled for the site:
                if (siteSetting === 'redirect') {
                  // Get article name from the end of the URL;
                  // We can't just take the last part of the path due to subpages;
                  // Instead, we take everything after the wiki's base URL + content path:
                  let article = url.href.split(site['origin_base_url'] + site['origin_content_path'])[1];
                  // Set up URL to redirect user to based on wiki platform:
                  if (article || (!article && !url.href.split(site['origin_base_url'] + '/')[1])) {
                    let newURL = '';
                    if (article) {
                      let searchParams = '';
                      switch (site['destination_platform']) {
                        case 'mediawiki':
                          searchParams = '?title=Special:Search&search=' + article;
                          break;
                        case 'doku':
                          searchParams = 'start?do=search&q=' + article;
                          break;
                      }
                      newURL = 'https://' + site["destination_base_url"] + site["destination_content_path"] + searchParams;
                    } else {
                      newURL = 'https://' + site["destination_base_url"];
                    }

                    // Perform redirect:
                    chrome.tabs.update(eventInfo.tabId, { url: newURL });
                    // Increase global redirect count:
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
                      // Self-clear notification after 6 seconds:
                      setTimeout(function () { chrome.notifications.clear(notifID); }, 6000);
                    }
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
      }
    });
  }
}
