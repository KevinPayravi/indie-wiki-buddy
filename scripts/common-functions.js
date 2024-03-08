﻿var LANGS = ["DE", "EN", "ES", "FI", "FR", "HU", "IT", "JA", "LZH", "KO", "PL", "PT", "RU", "TH", "TOK", "UK", "ZH"];
var BASE64REGEX = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

function b64decode(str) {
  const binary_string = atob(str);
  const len = binary_string.length;
  const bytes = new Uint8Array(new ArrayBuffer(len));
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

async function commonFunctionDecompressJSON(value) {
  // Check if value is base64 encoded:
  if (BASE64REGEX.test(value)) {
    // Decode into blob
    const stream = new Blob([b64decode(value)], {
      type: "application/json",
    }).stream();

    // Decompress value
    const decompressedReadableStream = stream.pipeThrough(
      new DecompressionStream("gzip")
    );

    const resp = new Response(decompressedReadableStream);
    const blob = await resp.blob();
    const blobText = JSON.parse(await blob.text());
    return blobText;
  } else {
    return value;
  }
}

async function commonFunctionCompressJSON(value) {
  const stream = new Blob([JSON.stringify(value)], {
    type: 'application/json',
  }).stream();

  // Compress stream with gzip
  const compressedReadableStream = stream.pipeThrough(
    new CompressionStream("gzip")
  );
  const compressedResponse = new Response(compressedReadableStream);

  // Convert response to blob and buffer
  const blob = await compressedResponse.blob();
  const buffer = await blob.arrayBuffer();

  // Encode and return string 
  return btoa(
    String.fromCharCode(
      ...new Uint8Array(buffer)
    )
  );
}

// Load wiki data objects, with each destination having its own object
async function commonFunctionGetSiteDataByDestination() {
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
      matchingSites = sites.filter(el => site.replace(/.*https?:\/\//, '').startsWith(el.origin_base_url));
    } else {
      matchingSites = sites.filter(el => {
        return site.replace(/.*https?:\/\//, '').startsWith(el.origin_base_url + el.origin_content_path)
          || site.replace(/.*https?:\/\//, '').replace(/\/$/, '') === el.origin_base_url
      }
      );
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

function commonFunctionGetOriginArticle(originURL, matchingSite) {
  let url = new URL(originURL);
  return decodeURIComponent(String(url.pathname).split(matchingSite['origin_content_path'])[1] || '');
}

function commonFunctionGetDestinationArticle(matchingSite, article) {
  return matchingSite['destination_content_prefix'] + article;
}

function commonFunctionGetNewURL(originURL, matchingSite) {
  // Get article name from the end of the URL;
  // We can't just take the last part of the path due to subpages;
  // Instead, we take everything after the wiki's base URL + content path
  let originArticle = commonFunctionGetOriginArticle(originURL, matchingSite);
  let destinationArticle = commonFunctionGetDestinationArticle(matchingSite, originArticle);
  // Set up URL to redirect user to based on wiki platform
  let newURL = '';
  if (originArticle) {
    // Check if main page
    if (originArticle === matchingSite['origin_main_page']) {
      switch (matchingSite['destination_platform']) {
        case 'dokuwiki':
          destinationArticle = '';
          break;
        default:
          destinationArticle = matchingSite['destination_main_page'];
      }
    }

    // Replace underscores with spaces as that performs better in search
    destinationArticle = destinationArticle.replaceAll('_', ' ');

    // If a Fextralife wiki, replace plus signs with spaces
    // When there are multiple plus signs together, this regex will only replace only the first
    if (matchingSite['origin_base_url'].includes('.wiki.fextralife.com')) {
      destinationArticle = destinationArticle.replace(/(?<!\+)\+/g, ' ');
    }

    // Encode article
    destinationArticle = encodeURIComponent(destinationArticle);

    let searchParams = '';
    switch (matchingSite['destination_platform']) {
      case 'mediawiki':
        searchParams = '?title=Special:Search&search=' + destinationArticle;
        break;
      case 'dokuwiki':
        searchParams = '?do=search&q=' + destinationArticle;
        break;
    }
    newURL = 'https://' + matchingSite["destination_base_url"] + matchingSite["destination_search_path"] + searchParams;
  } else {
    newURL = 'https://' + matchingSite["destination_base_url"];
  }

  return newURL;
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
      let searchEngineSettings = await commonFunctionDecompressJSON(storage.searchEngineSettings || {});
      let wikiSettings = await commonFunctionDecompressJSON(storage.wikiSettings) || {};

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

      chrome.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
      chrome.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });

      // Remove old object:
      chrome.storage.sync.remove('siteSettings');

      // Mark v3 migration as complete:
      chrome.storage.sync.set({ 'v3migration': 'done' });
    }
  });
}