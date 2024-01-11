// Load wiki data objects, with each destination having its own object
async function commonFunctionGetSiteDataByDestination() {
  const LANGS = ["DE", "EN", "ES", "FR", "IT", "KO", "PL", "PT", "RU", "TOK", "UK", "ZH"];
  var sites = [];
  let promises = [];
  for (let i = 0; i < LANGS.length; i++) {
    promises.push(fetch(chrome.runtime.getURL('data/sites' + LANGS[i] + '.json'))
      .then((resp) => resp.json())
      .then((jsonData) => {
        jsonData.forEach((site) => site.language = LANGS[i]);
        sites = sites.concat(jsonData);
      }));
  }
  await Promise.all(promises);
  return sites;
}

// Load wiki data objects, with each origin having its own object
async function commonFunctionGetSiteDataByOrigin() {
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
              "destination_content_prefix": origin.destination_content_prefix || site.destination_content_prefix || "",
              "destination_platform": site.destination_platform,
              "destination_icon": site.destination_icon,
              "destination_main_page": site.destination_main_page,
              "tags": site.tags || [],
              "language": LANGS[i]
            })
          })
        });
      }));
  }
  await Promise.all(promises);
  return sites;
}

// Given a URL, find closest match in our dataset
async function commonFunctionFindMatchingSite(site, crossLanguageSetting) {
  let matchingSite = commonFunctionGetSiteDataByOrigin().then(sites => {
    let matchingSites = [];
    if (crossLanguageSetting === 'on') {
      matchingSites = sites.filter(el => site.replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
    } else {
      matchingSites = sites.filter(el => site.replace(/^https?:\/\//, '').startsWith(el.origin_base_url + el.origin_content_path));
    }
    if (matchingSites.length > 0) {
      // Select match with longest base URL 
      let closestMatch = '';
      matchingSites.forEach(site => {
        if (site.origin_base_url.length > closestMatch.length) {
          closestMatch = site.origin_base_url;
        }
      });
      return matchingSites.find(site => site.origin_base_url === closestMatch);
    } else {
      return null;
    }
  });

  return matchingSite;
}

// Temporary function to migrate user data to IWB version 3.0+
async function commonFunctionMigrateToV3() {
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
      sites = await commonFunctionGetSiteDataByOrigin();
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