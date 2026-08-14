var BASE64REGEX = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
const extensionAPI = typeof browser === "undefined" ? chrome : browser;

/** @param {string} str */
function b64decode(str) {
  const binary_string = atob(str);
  const len = binary_string.length;
  const bytes = new Uint8Array(new ArrayBuffer(len));
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

/**
 * Joins an array of strings as a camelCase string
 * @param {string[]} stringArray
 * @returns {string}
 */
function camelCaseJoin(stringArray) {
  let outputString = "";
  for(let i = 0; i < stringArray.length; i++)
  {
    const stringEntry = stringArray[i];
    if (i == 0) {
      outputString += stringEntry;
    } else {
      outputString += stringEntry.charAt(0).toUpperCase() + stringEntry.slice(1);
    }
  }
  return outputString;
}

/** @param {string} value */
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
/** @param {string} value */
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

  // Encode and return string (convert in chunks)
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const REMOTE_DATA_URL = 'https://api.getindie.wiki/v1/data.json';
const REMOTE_FAVICON_BASE_URL = 'https://api.getindie.wiki/favicons/';
const REMOTE_DATA_MAX_AGE_MS = 3 * 60 * 60 * 1000;

/**
 * Load the wiki data file bundled with the extension
 * @returns {Promise<SiteInfo[]>}
 */
async function loadBundledSiteData() {
  const response = await fetch(extensionAPI.runtime.getURL('data/data.json'));
  const data = await response.json();
  return data.sites;
}

/**
 * Check whether the user has enabled pulling wiki data from the API
 * @returns {Promise<boolean>}
 */
function isApiDataEnabled() {
  return new Promise((resolve) => {
    extensionAPI.storage.sync.get({ 'apiData': 'on' }, (items) => {
      resolve(items.apiData === 'on');
    });
  });
}

/**
 * Check that every site entry has the fields the extension relies on
 * @returns {boolean}
 */
function isValidSiteData(sites) {
  return Array.isArray(sites) && sites.length > 0 && sites.every((site) =>
    site &&
    typeof site.id === 'string' &&
    typeof site.language === 'string' &&
    typeof site.origins_label === 'string' &&
    typeof site.destination === 'string' &&
    typeof site.destination_base_url === 'string' &&
    Array.isArray(site.origins)
  );
}

/**
 * Load remote wiki data cached in local storage, if any.
 * Returns null when the cache is empty or the user has disabled API data.
 * @returns {Promise<SiteInfo[] | null>}
 */
function loadCachedRemoteSiteData() {
  return new Promise(async (resolve) => {
    if (!await isApiDataEnabled()) {
      resolve(null);
      return;
    }
    extensionAPI.storage.local.get(['remoteSiteData'], async (items) => {
      if (items && items.remoteSiteData) {
        try {
          const sites = await commonFunctionDecompressJSON(items.remoteSiteData);
          if (isValidSiteData(sites)) {
            resolve(sites);
            return;
          }
        } catch (e) {
          console.log('Indie Wiki Buddy failed to read cached site data: ' + e);
        }
      }
      resolve(null);
    });
  });
}

/** @type {Promise<SiteInfo[]> | undefined} */
let _siteData;

/**
 * Load wiki data, preferring cached remote data over the bundled files.
 * Result kept in memory.
 * @returns {Promise<SiteInfo[]>}
 */
async function commonFunctionLoadSiteData() {
  if (_siteData === undefined) {
    _siteData = (async () => {
      const remoteSites = await loadCachedRemoteSiteData();
      return remoteSites || loadBundledSiteData();
    })();
    // Drop a failed load so the next call retries
    _siteData.catch(() => {
      _siteData = undefined;
    });
  }
  return _siteData;
}

/** @type {Promise<void> | undefined} */
let _siteDataRefreshPromise;

/**
 * Fetch latest wiki data from the API and cache it in local storage.
 * Only fetches when the cache is missing or older than 3 hours.
 * force = true will fetch regardless of cache age.
 * @param {boolean} force
 */
function commonFunctionRefreshSiteData(force = false) {
  if (!_siteDataRefreshPromise) {
    _siteDataRefreshPromise = refreshSiteData(force).finally(() => {
      _siteDataRefreshPromise = undefined;
    });
  }
  return _siteDataRefreshPromise;
}

/** @param {boolean} force */
async function refreshSiteData(force) {
  try {
    if (!await isApiDataEnabled()) {
      return;
    }
    if (!force) {
      const timestamp = await new Promise((resolve) => {
        extensionAPI.storage.local.get(['remoteSiteDataTimestamp'], (items) => {
          resolve((items && items.remoteSiteDataTimestamp) || 0);
        });
      });
      if (Date.now() - timestamp < REMOTE_DATA_MAX_AGE_MS) {
        return;
      }
    }

    const response = await fetch(REMOTE_DATA_URL);
    if (!response.ok) {
      throw new Error('received HTTP ' + response.status);
    }
    const data = await response.json();
    if (!data || data.schemaVersion !== 1 || !isValidSiteData(data.sites)) {
      throw new Error('response failed validation');
    }

    const compressedSites = await commonFunctionCompressJSON(data.sites);
    await new Promise((resolve) => {
      extensionAPI.storage.local.set({
        'remoteSiteData': compressedSites,
        'remoteSiteDataTimestamp': Date.now()
      }, resolve);
    });
    _siteData = undefined;
    _siteDataByOrigin = undefined;
    console.debug('IWB: Remote site data refreshed.');
  } catch (e) {
    console.log('Indie Wiki Buddy failed to fetch site data: ' + e);
  }
}

// When another context stores fresh remote data, drop in-memory copy
extensionAPI.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.remoteSiteData) {
    _siteData = undefined;
    _siteDataByOrigin = undefined;
  }
});

/**
 * Get the API URL for a wiki's favicon
 * Used when local favicon copy is missing
 * @param {SiteData | SiteInfo} site
 */
function commonFunctionGetApiFaviconURL(site) {
  return REMOTE_FAVICON_BASE_URL + site.language.toLowerCase() + '/' + site.destination_icon;
}

/**
 * Load wiki data objects, with each destination having its own object
 * @returns {Promise<SiteInfo[]>}
 */
async function commonFunctionGetSiteDataByDestination() {
  return commonFunctionLoadSiteData();
}

/**
 * @returns {Promise<SiteData[]>}
*/
async function populateSiteDataByOrigin() {
  // Populate with the site data
  /** @type {SiteData[]} */
  let sites = [];
  const siteData = await commonFunctionLoadSiteData();
  siteData.forEach((site) => {
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
        // /w/index.php?title= is the default path for a new MediaWiki install, change as accordingly in config JSON files
        "destination_content_path": site.destination_content_path || "/w/index.php?title=",
        "destination_content_suffix": origin.destination_content_suffix || site.destination_content_suffix || "",
        "destination_platform": site.destination_platform,
        "destination_icon": site.destination_icon,
        "destination_main_page": site.destination_main_page,
        "destination_host": site.destination_host,
        "tags": site.tags || [],
        "language": site.language
      })
    })
  });

  if (typeof window !== 'undefined') {
    window.iwb_siteDataByOrigin = sites;
  }

  return sites;
}

/** @type {Promise<SiteData[]> | undefined} */
let _siteDataByOrigin;

/**
 * Load wiki data objects, with each origin having its own object
 * @returns {Promise<SiteData[]>}
 */
function commonFunctionGetSiteDataByOrigin() {
  if (_siteDataByOrigin === undefined) {
    _siteDataByOrigin = populateSiteDataByOrigin();
    _siteDataByOrigin.then(() => {
      console.debug("IWB: Site data loaded.");
    }).catch(() => {
      // Drop the failed load so the next call retries
      _siteDataByOrigin = undefined;
    });
  }
  return _siteDataByOrigin;
}

/**
 * Given a URL, find closest match in our dataset
 * @param {string} site
 * @param {string} crossLanguageSetting
 * @param {boolean} dest
 */
async function commonFunctionFindMatchingSite(site, crossLanguageSetting, dest = false) {
  let base_url_key = dest ? 'destination_base_url' : 'origin_base_url';

  let sites = await commonFunctionGetSiteDataByOrigin();

  let matchingSites = [];
  if (crossLanguageSetting === 'on') {
    matchingSites = sites.filter(el => site.replace(/.*https?:\/\//, '').startsWith(el[base_url_key]));
  } else {
    matchingSites = sites.filter(
      el =>
        site.replace(/.*https?:\/\//, '').startsWith(dest ? el[base_url_key] : el.origin_base_url + el.origin_content_path) ||
        site.replace(/.*https?:\/\//, '').replace(/\/$/, '') === el[base_url_key]
    );
  }

  if (matchingSites.length > 0) {
    // Select match with longest base URL
    let closestMatch = '';
    matchingSites.forEach(site => {
      if (site[base_url_key].length > closestMatch.length) {
        closestMatch = site[base_url_key];
      }
    });
    return matchingSites.find(site => site[base_url_key] === closestMatch) ?? null;
  } else {
    return null;
  }
}

/**
 * @param {string} originURL
 * @param {SiteData} matchingSite
 */
function commonFunctionGetOriginArticle(originURL, matchingSite) {
  let url = new URL('https://' + originURL.replace(/.*https?:\/\//, ''));
  let article = String(url.pathname).split(matchingSite['origin_content_path'])[1] || '';

  // If a Fextralife wiki, replace plus signs with spaces
  // When there are multiple plus signs together, this regex will only replace only the first
  if (originURL.includes('.wiki.fextralife.com')) {
    article = article.replace(/(?<!\+)\+/g, ' ');
  }

  return article;
}

/**
 * @param {SiteData} matchingSite
 * @param {string} article
 */
function commonFunctionGetDestinationArticle(matchingSite, article) {
  return matchingSite['destination_content_prefix'] + article + matchingSite['destination_content_suffix'];
}

/**
 * @param {string} articleTitle
 */
function encodeArticleTitle(articleTitle) {
  // We decode + encode to ensure we don't double-encode,
  // in the event a string is already encoded.
  // We wrap in a try-catch as decoding can sometimes fail if destination article
  // does have special characters (e.g. %) in the title.
  try {
    return encodeURIComponent(decodeURIComponent(articleTitle));
  } catch {
    return encodeURIComponent(articleTitle);
  }
}

/**
 * Get query parameters from a URL
 * @param {string} originURL
 */
function getQueryParams(originURL) {
  let url = new URL('https://' + originURL.replace(/.*https?:\/\//, ''));
  return url.search || '';
}

/**
 * @param {string} originURL
 * @param {SiteData} matchingSite
 */
function commonFunctionGetNewURL(originURL, matchingSite) {
  // Get article name from the end of the URL;
  // We can't just take the last part of the path due to subpages;
  // Instead, we take everything after the wiki's base URL + content path
  let originArticle = commonFunctionGetOriginArticle(originURL, matchingSite);
  let destinationArticle = commonFunctionGetDestinationArticle(matchingSite, originArticle);

  // Set up URL to redirect user to based on wiki platform
  let newURL = '';

  // If the article is the main page (or missing), redirect to the indie wiki's main page
  if ((!originArticle) || (decodeURIComponent(originArticle).toLowerCase() === matchingSite['origin_main_page'].toLowerCase())) {
    const mainPageArticle = encodeArticleTitle(matchingSite['destination_main_page']);
    newURL = 'https://' + matchingSite["destination_base_url"] + matchingSite["destination_content_path"] + mainPageArticle + matchingSite['destination_content_suffix'];
    return newURL;
  }

  // Replace underscores with spaces as that performs better in search
  const encodedDestinationArticle = encodeArticleTitle(destinationArticle.replaceAll('_', ' '));

  let searchParams = '';
  switch (matchingSite['destination_platform']) {
    case 'mediawiki':
      searchParams = `?title=Special:Search&search=${encodedDestinationArticle}`;
      break;
    case 'dokuwiki':
      searchParams = `?do=search&q=${encodedDestinationArticle}`;
      break;
    case 'moinmoin':
      searchParams = `?action=fullsearch&context=180&value="${encodedDestinationArticle}"&fullsearch=Text`;
      break;
    // Otherwise, assume the full search path is defined on "destination_search_path"
    default:
      searchParams = encodedDestinationArticle;
      break;
  }
  newURL = 'https://' + matchingSite["destination_base_url"] + matchingSite["destination_search_path"] + searchParams;

  // Preserve original query parameters
  // Used for special pages that may rely on query parameters, like Special:Search
  const queryParams = getQueryParams(originURL);
  if (queryParams) {
    newURL += (newURL.includes('?') ? '&' : '?') + queryParams.substring(1);
  }

  return newURL;
}

/** Temporary function to migrate user data to IWB version 3.0+ */
async function commonFunctionMigrateToV3() {
  await extensionAPI.storage.sync.get(async (storage) => {
    if (!storage.v3migration) {
      let defaultWikiAction = storage.defaultWikiAction || 'alert';
      let defaultSearchAction = storage.defaultSearchAction || 'replace';

      // Set new default action settings:
      if (!storage.defaultWikiAction) {
        if (storage.defaultActionSettings && storage.defaultActionSettings['EN']) {
          defaultWikiAction = storage.defaultActionSettings['EN'];
        }
        extensionAPI.storage.sync.set({ 'defaultWikiAction': defaultWikiAction });
      }
      if (!storage.defaultSearchAction) {
        if (storage.defaultSearchFilterSettings && storage.defaultSearchFilterSettings['EN']) {
          if (storage.defaultSearchFilterSettings['EN'] === 'false') {
            defaultSearchAction = 'disabled';
          } else {
            defaultSearchAction = 'replace';
          }
        }
        extensionAPI.storage.sync.set({ 'defaultSearchAction': defaultSearchAction });
      }

      // Remove old objects:
      extensionAPI.storage.sync.remove('defaultActionSettings');
      extensionAPI.storage.sync.remove('defaultSearchFilterSettings');

      // Migrate wiki settings to new searchEngineSettings and wikiSettings objects
      const sites = await commonFunctionGetSiteDataByOrigin();
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

      extensionAPI.storage.sync.set({ 'searchEngineSettings': await commonFunctionCompressJSON(searchEngineSettings) });
      extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });

      // Remove old object:
      extensionAPI.storage.sync.remove('siteSettings');

      // Mark v3 migration as complete:
      extensionAPI.storage.sync.set({ 'v3migration': 'done' });
    }
  });
}

/** @param {Node} element */
function isAnchor(element) {
  if (!(element instanceof HTMLElement)) return false;
  return element.tagName && element.tagName.toLowerCase() === 'a';
}

/**
 * @typedef {Object} SiteData
 * @property {string} id
 * @property {string} origin
 * @property {string} origin_base_url
 * @property {string} origin_content_path
 * @property {string} origin_main_page
 * @property {string} destination
 * @property {string} destination_base_url
 * @property {string} destination_search_path
 * @property {string} destination_content_prefix
 * @property {string} destination_content_path
 * @property {string} destination_content_suffix
 * @property {string} destination_platform
 * @property {string} destination_icon
 * @property {string} destination_main_page
 * @property {string} destination_host
 * @property {string[]} tags
 * @property {string} language
 */

/**
 * @typedef {Object} SiteInfo
 * @property {string} id
 * @property {string} origins_label
 * @property {Origin[]} origins
 * @property {string} destination
 * @property {string} destination_base_url
 * @property {string} destination_platform
 * @property {string} destination_icon
 * @property {string} destination_main_page
 * @property {string} destination_search_path
 * @property {string} destination_content_path
 * @property {string} [destination_host]
 * @property {string[]} [tags]
 * @property {string} [destination_content_suffix]
 */

/**
 * @typedef {Object} Origin
 * @property {string} origin
 * @property {string} origin_base_url
 * @property {string} origin_content_path
 * @property {string} origin_main_page
 */
