export const extensionAPI = typeof browser === "undefined" ? chrome : browser;
const BASE64REGEX = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
export const BREEZEWIKIDOMAINS = [
  "https://breezewiki.com/*",
  "https://antifandom.com/*",
  "https://bw.artemislena.eu/*",
  "https://breezewiki.catsarch.com/*",
  "https://breezewiki.esmailelbob.xyz/*",
  "https://breezewiki.frontendfriendly.xyz/*",
  "https://bw.hamstro.dev/*",
  "https://breeze.hostux.net/*",
  "https://breezewiki.hyperreal.coffee/*",
  "https://breeze.mint.lgbt/*",
  "https://breezewiki.nadeko.net/*",
  "https://nerd.whatever.social/*",
  "https://breeze.nohost.network/*",
  "https://z.opnxng.com/*",
  "https://bw.projectsegfau.lt/*",
  "https://breezewiki.pussthecat.org/*",
  "https://bw.vern.cc/*",
  "https://breeze.whateveritworks.org/*",
  "https://breezewiki.woodland.cafe/*"
];
export const SEARCHENGINEDOMAINS = {
  "bing": ["https://*.bing.com/search*"],
  "brave": ["https://search.brave.com/search*"],
  "duckduckgo": ["https://*.duckduckgo.com/*"],
  "ecosia": ["https://*.ecosia.org/*"],
  "kagi": ["https://kagi.com/search*"],
  "qwant": ["https://*.qwant.com/*"],
  "yahoo": ["https://*.search.yahoo.com/*"],
  "startpage": ["https://*.startpage.com/*"],
  "yandex": ["https://*.ya.ru/*",
    "https://*.yandex.az/*",
    "https://*.yandex.by/*",
    "https://*.yandex.co.il/*",
    "https://*.yandex.com.am/*",
    "https://*.yandex.com.ge/*",
    "https://*.yandex.com.tr/*",
    "https://*.yandex.com/*",
    "https://*.yandex.ee/*",
    "https://*.yandex.eu/*",
    "https://*.yandex.fr/*",
    "https://*.yandex.kz/*",
    "https://*.yandex.lt/*",
    "https://*.yandex.lv/*",
    "https://*.yandex.md/*",
    "https://*.yandex.ru/*",
    "https://*.yandex.tj/*",
    "https://*.yandex.tm/*",
    "https://*.yandex.uz/*"],
  "google": ["https://www.google.com/search*"],
  "google_intl": ["https://www.google.ad/search*",
    "https://www.google.ae/search*",
    "https://www.google.com.af/search*",
    "https://www.google.com.ag/search*",
    "https://www.google.com.ai/search*",
    "https://www.google.al/search*",
    "https://www.google.am/search*",
    "https://www.google.co.ao/search*",
    "https://www.google.com.ar/search*",
    "https://www.google.as/search*",
    "https://www.google.at/search*",
    "https://www.google.com.au/search*",
    "https://www.google.az/search*",
    "https://www.google.ba/search*",
    "https://www.google.com.bd/search*",
    "https://www.google.be/search*",
    "https://www.google.bf/search*",
    "https://www.google.bg/search*",
    "https://www.google.com.bh/search*",
    "https://www.google.bi/search*",
    "https://www.google.bj/search*",
    "https://www.google.com.bn/search*",
    "https://www.google.com.bo/search*",
    "https://www.google.com.br/search*",
    "https://www.google.bs/search*",
    "https://www.google.bt/search*",
    "https://www.google.co.bw/search*",
    "https://www.google.by/search*",
    "https://www.google.com.bz/search*",
    "https://www.google.ca/search*",
    "https://www.google.cd/search*",
    "https://www.google.cf/search*",
    "https://www.google.cg/search*",
    "https://www.google.ch/search*",
    "https://www.google.ci/search*",
    "https://www.google.co.ck/search*",
    "https://www.google.cl/search*",
    "https://www.google.cm/search*",
    "https://www.google.cn/search*",
    "https://www.google.com.co/search*",
    "https://www.google.co.cr/search*",
    "https://www.google.com.cu/search*",
    "https://www.google.cv/search*",
    "https://www.google.com.cy/search*",
    "https://www.google.cz/search*",
    "https://www.google.de/search*",
    "https://www.google.dj/search*",
    "https://www.google.dk/search*",
    "https://www.google.dm/search*",
    "https://www.google.com.do/search*",
    "https://www.google.dz/search*",
    "https://www.google.com.ec/search*",
    "https://www.google.ee/search*",
    "https://www.google.com.eg/search*",
    "https://www.google.es/search*",
    "https://www.google.com.et/search*",
    "https://www.google.fi/search*",
    "https://www.google.com.fj/search*",
    "https://www.google.fm/search*",
    "https://www.google.fr/search*",
    "https://www.google.ga/search*",
    "https://www.google.ge/search*",
    "https://www.google.gg/search*",
    "https://www.google.com.gh/search*",
    "https://www.google.com.gi/search*",
    "https://www.google.gl/search*",
    "https://www.google.gm/search*",
    "https://www.google.gr/search*",
    "https://www.google.com.gt/search*",
    "https://www.google.gy/search*",
    "https://www.google.com.hk/search*",
    "https://www.google.hn/search*",
    "https://www.google.hr/search*",
    "https://www.google.ht/search*",
    "https://www.google.hu/search*",
    "https://www.google.co.id/search*",
    "https://www.google.ie/search*",
    "https://www.google.co.il/search*",
    "https://www.google.im/search*",
    "https://www.google.co.in/search*",
    "https://www.google.iq/search*",
    "https://www.google.is/search*",
    "https://www.google.it/search*",
    "https://www.google.je/search*",
    "https://www.google.com.jm/search*",
    "https://www.google.jo/search*",
    "https://www.google.co.jp/search*",
    "https://www.google.co.ke/search*",
    "https://www.google.com.kh/search*",
    "https://www.google.ki/search*",
    "https://www.google.kg/search*",
    "https://www.google.co.kr/search*",
    "https://www.google.com.kw/search*",
    "https://www.google.kz/search*",
    "https://www.google.la/search*",
    "https://www.google.com.lb/search*",
    "https://www.google.li/search*",
    "https://www.google.lk/search*",
    "https://www.google.co.ls/search*",
    "https://www.google.lt/search*",
    "https://www.google.lu/search*",
    "https://www.google.lv/search*",
    "https://www.google.com.ly/search*",
    "https://www.google.co.ma/search*",
    "https://www.google.md/search*",
    "https://www.google.me/search*",
    "https://www.google.mg/search*",
    "https://www.google.mk/search*",
    "https://www.google.ml/search*",
    "https://www.google.com.mm/search*",
    "https://www.google.mn/search*",
    "https://www.google.ms/search*",
    "https://www.google.com.mt/search*",
    "https://www.google.mu/search*",
    "https://www.google.mv/search*",
    "https://www.google.mw/search*",
    "https://www.google.com.mx/search*",
    "https://www.google.com.my/search*",
    "https://www.google.co.mz/search*",
    "https://www.google.com.na/search*",
    "https://www.google.com.ng/search*",
    "https://www.google.com.ni/search*",
    "https://www.google.ne/search*",
    "https://www.google.nl/search*",
    "https://www.google.no/search*",
    "https://www.google.com.np/search*",
    "https://www.google.nr/search*",
    "https://www.google.nu/search*",
    "https://www.google.co.nz/search*",
    "https://www.google.com.om/search*",
    "https://www.google.com.pa/search*",
    "https://www.google.com.pe/search*",
    "https://www.google.com.pg/search*",
    "https://www.google.com.ph/search*",
    "https://www.google.com.pk/search*",
    "https://www.google.pl/search*",
    "https://www.google.pn/search*",
    "https://www.google.com.pr/search*",
    "https://www.google.ps/search*",
    "https://www.google.pt/search*",
    "https://www.google.com.py/search*",
    "https://www.google.com.qa/search*",
    "https://www.google.ro/search*",
    "https://www.google.ru/search*",
    "https://www.google.rw/search*",
    "https://www.google.com.sa/search*",
    "https://www.google.com.sb/search*",
    "https://www.google.sc/search*",
    "https://www.google.se/search*",
    "https://www.google.com.sg/search*",
    "https://www.google.sh/search*",
    "https://www.google.si/search*",
    "https://www.google.sk/search*",
    "https://www.google.com.sl/search*",
    "https://www.google.sn/search*",
    "https://www.google.so/search*",
    "https://www.google.sm/search*",
    "https://www.google.sr/search*",
    "https://www.google.st/search*",
    "https://www.google.com.sv/search*",
    "https://www.google.td/search*",
    "https://www.google.tg/search*",
    "https://www.google.co.th/search*",
    "https://www.google.com.tj/search*",
    "https://www.google.tl/search*",
    "https://www.google.tm/search*",
    "https://www.google.tn/search*",
    "https://www.google.to/search*",
    "https://www.google.com.tr/search*",
    "https://www.google.tt/search*",
    "https://www.google.com.tw/search*",
    "https://www.google.co.tz/search*",
    "https://www.google.com.ua/search*",
    "https://www.google.co.ug/search*",
    "https://www.google.co.uk/search*",
    "https://www.google.com.uy/search*",
    "https://www.google.co.uz/search*",
    "https://www.google.com.vc/search*",
    "https://www.google.co.ve/search*",
    "https://www.google.vg/search*",
    "https://www.google.co.vi/search*",
    "https://www.google.com.vn/search*",
    "https://www.google.vu/search*",
    "https://www.google.ws/search*",
    "https://www.google.rs/search*",
    "https://www.google.co.za/search*",
    "https://www.google.co.zm/search*",
    "https://www.google.co.zw/search*",
    "https://www.google.cat/search*"
  ]
}

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
export function camelCaseJoin(stringArray) {
  let outputString = "";
  for (let i = 0; i < stringArray.length; i++) {
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
export async function decompressJSON(value) {
  if (!value) return value;
  // Check if value is base64 encoded:
  if (value.length > 0 && BASE64REGEX.test(value)) {
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
export async function compressJSON(value) {
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

// Per-wiki settings ('wikiSettings' / 'searchEngineSettings')
// Stores overrides of the default action,
// sharded across keys ('wikiSettings_0'...)
// (sharded to stay under the 8KB per-item sync quota)
// Changing this requires a re-shard migration
export const SETTINGS_SHARD_COUNT = 32;

const USER_SETTINGS_META = {
  'wikiSettings': { defaultActionKey: 'defaultWikiAction', fallbackAction: 'alert' },
  'searchEngineSettings': { defaultActionKey: 'defaultSearchAction', fallbackAction: 'replace' },
};

/** @param {string} settingsType 'wikiSettings' or 'searchEngineSettings' */
export function userSettingsShardKeys(settingsType) {
  return Array.from({ length: SETTINGS_SHARD_COUNT }, (_, i) => `${settingsType}_${i}`);
}

/**
 * Shard key holding a wiki's setting
 * @param {string} settingsType
 * @param {string} wikiId
 */
function userSettingsShardKey(settingsType, wikiId) {
  let hash = 0;
  for (let i = 0; i < wikiId.length; i++) {
    hash = (hash * 31 + wikiId.charCodeAt(i)) >>> 0;
  }
  return `${settingsType}_${hash % SETTINGS_SHARD_COUNT}`;
}

/**
 * Convert pre-3.0 'true'/'false' search values
 * @param {string} settingsType
 * @param {string} value
 */
function normalizeUserSetting(settingsType, value) {
  if (settingsType === 'searchEngineSettings') {
    if (value === 'true') return 'replace';
    if (value === 'false') return 'disabled';
  }
  return value;
}

/**
 * Parse the legacy single-key value
 * Returns null if unusable, throws if unreadable
 * @param {string} settingsType
 * @param {any} value
 * @returns {Promise<Record<string, string> | null>}
 */
async function parseLegacyUserSettings(settingsType, value) {
  if (value === undefined) return null;
  const legacy = await decompressJSON(value);
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return null;
  const settings = {};
  for (const [wikiId, action] of Object.entries(legacy)) {
    settings[wikiId] = normalizeUserSetting(settingsType, action);
  }
  return settings;
}

/**
 * Whether a legacy settings key is safe to delete
 * @param {string} settingsType
 * @param {any} value
 * @returns {Promise<boolean>}
 */
async function canDropLegacyUserSettings(settingsType, value) {
  if (value === undefined) return true;
  try {
    return (await parseLegacyUserSettings(settingsType, value)) !== null;
  } catch (e) {
    console.log('Indie Wiki Buddy failed to read pre-4.0 settings: ' + e);
    return false;
  }
}

/**
 * Get all overrides as {wikiId: action},
 * from the given storage object or storage.sync
 * @param {string} settingsType 'wikiSettings' or 'searchEngineSettings'
 * @param {Record<string, any>} [storage]
 * @returns {Promise<Record<string, string>>}
 */
export async function getUserSettings(settingsType, storage = null) {
  const shardKeys = userSettingsShardKeys(settingsType);
  if (!storage) {
    storage = await extensionAPI.storage.sync.get([settingsType, ...shardKeys]);
  }
  const settings = {};
  for (const key of shardKeys) {
    if (storage[key] && typeof storage[key] === 'object') {
      Object.assign(settings, storage[key]);
    }
  }
  // Legacy key rewritten by older devices is newer than the shards, so it wins
  try {
    const legacy = await parseLegacyUserSettings(settingsType, storage[settingsType]);
    if (legacy) {
      Object.assign(settings, legacy);
    }
  } catch (e) {
    console.log('Indie Wiki Buddy failed to read pre-4.0 settings: ' + e);
  }
  return settings;
}

// Chain writing to shards
let _userSettingsWriteChain = Promise.resolve();

/** @param {() => Promise<void>} task */
function queueUserSettingsWrite(task) {
  const run = _userSettingsWriteChain.then(task);
  _userSettingsWriteChain = run.catch(() => {});
  return run;
}

/**
 * Set one wiki's action
 * @param {string} settingsType
 * @param {string} wikiId
 * @param {string} action
 */
export function setUserSetting(settingsType, wikiId, action) {
  return setUserSettings(settingsType, { [wikiId]: action });
}

/**
 * Set multiple wikis' actions
 * A value equal to the default removes the entry
 * @param {string} settingsType
 * @param {Record<string, string>} entries {wikiId: action}
 */
export function setUserSettings(settingsType, entries) {
  return queueUserSettingsWrite(() => writeUserSettings(settingsType, entries));
}

/**
 * @param {string} settingsType
 * @param {Record<string, string>} entries
 */
async function writeUserSettings(settingsType, entries) {
  const { defaultActionKey, fallbackAction } = USER_SETTINGS_META[settingsType];

  // Group updates by shard
  const idsByShardKey = {};
  for (const wikiId of Object.keys(entries)) {
    const shardKey = userSettingsShardKey(settingsType, wikiId);
    (idsByShardKey[shardKey] ??= []).push(wikiId);
  }
  const shardKeysToUpdate = Object.keys(idsByShardKey);
  if (shardKeysToUpdate.length === 0) return;

  const stored = await extensionAPI.storage.sync.get([defaultActionKey, ...shardKeysToUpdate]);
  const defaultAction = stored[defaultActionKey] || fallbackAction;

  const updates = {};
  for (const shardKey of shardKeysToUpdate) {
    const shard = { ...(stored[shardKey] || {}) };
    for (const wikiId of idsByShardKey[shardKey]) {
      if (entries[wikiId] === defaultAction) {
        delete shard[wikiId];
      } else {
        shard[wikiId] = entries[wikiId];
      }
    }
    updates[shardKey] = shard;
  }
  await extensionAPI.storage.sync.set(updates);
}

/**
 * Set the default action for all wikis by clearing every override
 * (popup and setup pages)
 * @param {string} settingsType
 * @param {string} action
 */
export function setDefaultUserAction(settingsType, action) {
  return queueUserSettingsWrite(async () => {
    const { defaultActionKey } = USER_SETTINGS_META[settingsType];
    await extensionAPI.storage.sync.set({ [defaultActionKey]: action });
    await extensionAPI.storage.sync.remove([settingsType, ...userSettingsShardKeys(settingsType)]);
  });
}

/**
 * Set the default action for newly added wikis only (settings page)
 * Current wikis keep their effective action
 * @param {string} settingsType
 * @param {string} action
 */
export function setDefaultUserActionForNewWikis(settingsType, action) {
  return queueUserSettingsWrite(() => writeDefaultUserActionForNewWikis(settingsType, action));
}

/**
 * @param {string} settingsType
 * @param {string} action
 */
async function writeDefaultUserActionForNewWikis(settingsType, action) {
  const { defaultActionKey, fallbackAction } = USER_SETTINGS_META[settingsType];
  const shardKeys = userSettingsShardKeys(settingsType);
  const sites = await getSiteDataByDestination();
  const stored = await extensionAPI.storage.sync.get([settingsType, defaultActionKey, ...shardKeys]);
  const current = await getUserSettings(settingsType, stored);
  const oldDefault = stored[defaultActionKey] || fallbackAction;

  // Pin every known wiki to its current action
  const shards = {};
  for (const key of shardKeys) {
    shards[key] = {};
  }
  for (const site of sites) {
    const effective = current[site.id] || oldDefault;
    if (effective !== action) {
      shards[userSettingsShardKey(settingsType, site.id)][site.id] = effective;
    }
    delete current[site.id];
  }
  // Keep overrides for wikis gone from the site data
  for (const [wikiId, storedAction] of Object.entries(current)) {
    if (storedAction !== action) {
      shards[userSettingsShardKey(settingsType, wikiId)][wikiId] = storedAction;
    }
  }

  await extensionAPI.storage.sync.set({ [defaultActionKey]: action, ...shards });
  if (await canDropLegacyUserSettings(settingsType, stored[settingsType])) {
    await extensionAPI.storage.sync.remove(settingsType);
  }
}

// Serialized so runs cannot interleave
let _userSettingsMigration = Promise.resolve();

/**
 * Fold the legacy single keys into the shards, then remove them
 */
export function migrateUserSettings() {
  _userSettingsMigration = _userSettingsMigration
    .then(() => migrateUserSettingsType('wikiSettings'))
    .then(() => migrateUserSettingsType('searchEngineSettings'))
    .catch((e) => {
      console.log('Indie Wiki Buddy failed to migrate settings: ' + e);
    });
  return _userSettingsMigration;
}

/** @param {string} settingsType */
async function migrateUserSettingsType(settingsType) {
  const { defaultActionKey, fallbackAction } = USER_SETTINGS_META[settingsType];
  const shardKeys = userSettingsShardKeys(settingsType);
  const stored = await extensionAPI.storage.sync.get([settingsType, defaultActionKey, ...shardKeys]);
  if (stored[settingsType] === undefined) {
    return;
  }

  let legacy;
  try {
    legacy = await parseLegacyUserSettings(settingsType, stored[settingsType]);
  } catch (e) {
    // Unreadable: keep the key rather than lose it
    console.log('Indie Wiki Buddy failed to migrate settings: ' + e);
    return;
  }

  if (legacy) {
    const defaultAction = stored[defaultActionKey] || fallbackAction;
    const updates = {};
    for (const [wikiId, action] of Object.entries(legacy)) {
      const shardKey = userSettingsShardKey(settingsType, wikiId);
      updates[shardKey] ??= { ...(stored[shardKey] || {}) };
      if (action === defaultAction) {
        delete updates[shardKey][wikiId];
      } else {
        updates[shardKey][wikiId] = action;
      }
    }
    if (Object.keys(updates).length > 0) {
      await extensionAPI.storage.sync.set(updates);
    }

    // Remove only after the shards are written
    await extensionAPI.storage.sync.remove(settingsType);
  }
}

const REMOTE_DATA_URL = 'https://api.getindie.wiki/v1/all-data.json';
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
          const sites = await decompressJSON(items.remoteSiteData);
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
export async function loadSiteData() {
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
export function refreshSiteData(force = false) {
  if (!_siteDataRefreshPromise) {
    _siteDataRefreshPromise = fetchAndCacheSiteData(force).finally(() => {
      _siteDataRefreshPromise = undefined;
    });
  }
  return _siteDataRefreshPromise;
}

/** @param {boolean} force */
async function fetchAndCacheSiteData(force) {
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

    const compressedSites = await compressJSON(data.sites);
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
export function getApiFaviconURL(site) {
  return REMOTE_FAVICON_BASE_URL + site.language.toLowerCase() + '/' + site.destination_icon;
}

/**
 * Load wiki data objects, with each destination having its own object
 * @returns {Promise<SiteInfo[]>}
 */
export async function getSiteDataByDestination() {
  return loadSiteData();
}

/**
 * @returns {Promise<SiteData[]>}
*/
async function populateSiteDataByOrigin() {
  // Populate with the site data
  /** @type {SiteData[]} */
  let sites = [];
  const siteData = await loadSiteData();
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

  // if (typeof window !== 'undefined') {
  //   window.iwb_siteDataByOrigin = sites;
  // }

  return sites;
}

/** @type {Promise<SiteData[]> | undefined} */
let _siteDataByOrigin;

/**
 * Load wiki data objects, with each origin having its own object
 * @returns {Promise<SiteData[]>}
 */
export async function getSiteDataByOrigin() {
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
export async function findMatchingSite(site, crossLanguageSetting, dest = false) {
  let base_url_key = dest ? 'destination_base_url' : 'origin_base_url';

  let sites = await getSiteDataByOrigin();

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
export function getOriginArticle(originURL, matchingSite) {
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
export function getDestinationArticle(matchingSite, article) {
  return matchingSite['destination_content_prefix'] + article + matchingSite['destination_content_suffix'];
}

/**
 * @param {string} articleTitle
 */
export function encodeArticleTitle(articleTitle) {
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
export function getNewURL(originURL, matchingSite) {
  // Get article name from the end of the URL;
  // We can't just take the last part of the path due to subpages;
  // Instead, we take everything after the wiki's base URL + content path
  let originArticle = getOriginArticle(originURL, matchingSite);
  let destinationArticle = getDestinationArticle(matchingSite, originArticle);

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

/** @param {Node} element */
export function isAnchor(element) {
  if (!(element instanceof HTMLElement)) return false;
  return element.tagName && element.tagName.toLowerCase() === 'a';
}

/**
 * Fill elements with data-msg / data-msg-attr
 */
export function applyI18nMessages() {
  document.querySelectorAll('[data-msg]').forEach(element => {
    // data-msg-ph-* attributes hold placeholder values
    const placeholders = [];
    for (let i = 1; i <= 9; i++) {
      const ph = element.getAttribute(`data-msg-ph-${i}`);
      if (ph) {
        placeholders.push(ph);
      }
    }

    // innerHTML is safe here: the text is literals from the extension's
    // localization files, with placeholder HTML from elsewhere in the code
    element.innerHTML = extensionAPI.i18n.getMessage(element.dataset.msg, placeholders);
  });

  document.querySelectorAll('[data-msg-attr]').forEach(element => {
    const attrs = element.dataset.msgAttr.split(',');
    attrs.forEach(attr => {
      const [key, value] = attr.split('=');
      element.setAttribute(key, extensionAPI.i18n.getMessage(value));
    });
  });
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
