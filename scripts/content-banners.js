const breezewikiRegex = /breezewiki\.com$|antifandom\.com$|bw\.artemislena\.eu$|breezewiki\.catsarch\.com$|breezewiki\.esmailelbob\.xyz$|breezewiki\.frontendfriendly\.xyz$|bw\.hamstro\.dev$|breeze\.hostux\.net$|breezewiki\.hyperreal\.coffee$|breeze\.mint\.lgbt$|breezewiki\.nadeko\.net$|nerd\.whatever\.social$|breeze\.nohost\.network$|z\.opnxng\.com$|bw\.projectsegfau\.lt$|breezewiki\.pussthecat\.org$|bw\.vern\.cc$|breeze\.whateveritworks\.org$|breezewiki\.woodland\.cafe$/;
const currentURL = new URL(document.location);

function outputCSS() {
  if (!document.getElementById('iwb-banner-styles')) {
    styleString = `
      #indie-wiki-banner-container {
        font-family: sans-serif;
        width: 100%;
        z-index: 2147483647;
        position: sticky;
        top: 0;
        text-align: center;
      }
      .indie-wiki-banner {
        background-color: #acdae2;
        padding: 8px 10px;
        font-size: 12px;
      }
      .indie-wiki-banner-exit {
        position: absolute;
        right: 8px;
        top: 4px;
        font-size: 20px;
        color: #333;
        cursor: pointer;
      }
      .indie-wiki-banner-controls {
        padding-bottom: 5px;
      }
      .indie-wiki-banner-big-text {
        font-size: 14px;
        line-height: 24px;
        margin-top: 5px;
      }
      .indie-wiki-banner-big-text .indie-wiki-banner-link{
        font-size: 16px;
      }
      .indie-wiki-banner-link {
        font-weight: 600;
        color: #000080;
        cursor: pointer;
        padding: 0 10px;
        display: block;
        width: fit-content;
        margin: 0 auto;
      }
      .indie-wiki-banner-link:hover {
        text-decoration: underline;
        color: #000080;
      }
      .indie-wiki-banner-link-small {
        display: inline-block;
        font-size: 12px;
        min-width: 180px;
      }
      .indie-wiki-banner-disabled {
        color: #333;
        cursor: default;
      }
      .indie-wiki-banner-disabled:hover {
        text-decoration: none;
      }
      .indie-wiki-banner-hidden {
        display: none;
      }
    `

    style = document.createElement('style');
    style.id = 'iwb-banner-styles';
    style.textContent = styleString;
    document.head.append(style);
  }
}

function outputBannerContainer() {
  if (!document.getElementById('indie-wiki-banner-container')) {
    const container = document.createElement('div');
    container.id = 'indie-wiki-banner-container';
    let containerExit = document.createElement('div');
    containerExit.classList.add('indie-wiki-banner-exit');
    container.appendChild(containerExit);
    containerExit.textContent = '✕';
    containerExit.onclick = function () { this.parentElement.remove(); };
    document.body.insertAdjacentElement('beforeBegin', container);
  }
}

function processBreezeWikiBanner(storage) {
  // Output BreezeWiki banner, if enabled:
  if (storage.breezewiki === 'banner' && currentURL.toString().includes('.fandom.com/wiki/')) {
    // Extract article from URL
    const subdomain = currentURL.hostname.split(".")[0];
    const article = currentURL.toString().split('fandom.com/wiki/')[1].replaceAll('%20', '_');
    breezewikiHost = '';
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
          breezewikiHost = host;
        }).catch((e) => {
          console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
          chrome.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
        });
    } else {
      if (storage.breezewikiHost === 'CUSTOM') {
        breezewikiHost = storage.breezewikiCustomHost || 'https://breezewiki.com';
      } else {
        breezewikiHost = storage.breezewikiHost;
      }
    }

    displayBreezewikiBanner(breezewikiHost + '/' + subdomain + '/wiki/' + article);
  }
}


function displayBreezewikiBanner(newUrl) {
  outputCSS();

  // Output banner
  let banner = document.createElement('div');
  banner.id = 'indie-wiki-banner-bw';
  banner.classList.add('indie-wiki-banner');

  // Output main banner text
  let bannerText = document.createElement('span');
  let bannerWikiLink = document.createElement('a');
  bannerWikiLink.classList.add('indie-wiki-banner-link');
  bannerWikiLink.href = newUrl;
  bannerWikiLink.textContent = 'View this Fandom wiki through BreezeWiki';
  bannerText.appendChild(bannerWikiLink);
  banner.appendChild(bannerText);

  // Function to insert banner into DOM before body element
  function addBannerToDOM() {
    // Check if document is in a ready state
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      // Add banner container if not already in doc
      outputBannerContainer();
      // Ensure banner isn't already outputted
      if (!document.querySelector(':root > #indie-wiki-banner-bw')) {
        document.getElementById('indie-wiki-banner-container').appendChild(banner);
      }

      // Remove readystatechange listener
      document.removeEventListener('readystatechange', addBannerToDOM);
    }
  }

  document.addEventListener('readystatechange', addBannerToDOM);
  addBannerToDOM();
}

function displayRedirectBanner(newUrl, id, destinationName, destinationLanguage, tags, storage) {
  outputCSS();

  // Output banner
  let banner = document.createElement('div');
  banner.id = 'indie-wiki-banner-redirect';
  banner.classList.add('indie-wiki-banner');

  // Output control links container
  let bannerControls = document.createElement('div');
  bannerControls.classList.add('indie-wiki-banner-controls');
  banner.appendChild(bannerControls);

  // Output "restore banner" link
  let bannerRestoreLink = document.createElement('div');
  bannerRestoreLink.classList.add('indie-wiki-banner-restore');
  bannerRestoreLink.classList.add('indie-wiki-banner-link');
  bannerRestoreLink.classList.add('indie-wiki-banner-link-small');
  bannerRestoreLink.classList.add('indie-wiki-banner-hidden');
  bannerRestoreLink.textContent = '⎌ Restore banner';
  bannerControls.appendChild(bannerRestoreLink);
  bannerRestoreLink.onclick = function (e) {
    chrome.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
      let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
      wikiSettings[id] = 'alert';
      chrome.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      e.target.textContent = '✓ Banner restored';
      e.target.classList.add('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-redirect').textContent = '↪ Auto redirect this wiki';
      bannerControls.querySelector('.indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-disable').textContent = '✕ Disable banner for this wiki';
      bannerControls.querySelector('.indie-wiki-banner-disable').classList.remove('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "disable banner" link
  let bannerDisableLink = document.createElement('div');
  bannerDisableLink.classList.add('indie-wiki-banner-disable');
  bannerDisableLink.classList.add('indie-wiki-banner-link');
  bannerDisableLink.classList.add('indie-wiki-banner-link-small');
  bannerDisableLink.textContent = '✕ Disable banner for this wiki';
  bannerControls.appendChild(bannerDisableLink);
  bannerDisableLink.onclick = function (e) {
    chrome.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
      let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
      wikiSettings[id] = 'disabled';
      chrome.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      e.target.textContent = '✓ Banner disabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-restore').textContent = '⎌ Restore banner';
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "auto redirect" link
  let bannerRedirectLink = document.createElement('div');
  bannerRedirectLink.classList.add('indie-wiki-banner-redirect');
  bannerRedirectLink.classList.add('indie-wiki-banner-link');
  bannerRedirectLink.classList.add('indie-wiki-banner-link-small');
  bannerRedirectLink.textContent = '↪ Auto redirect this wiki';
  bannerControls.appendChild(bannerRedirectLink);
  bannerRedirectLink.onclick = function (e) {
    chrome.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
      let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
      wikiSettings[id] = 'redirect';
      chrome.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      e.target.textContent = '✓ Redirect enabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-disable').classList.add('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-restore').textContent = '⎌ Restore banner';
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output main banner text
  let bannerText = document.createElement('span');
  bannerText.classList.add('indie-wiki-banner-big-text');
  banner.appendChild(bannerText);

  // Build descriptor
  let descriptor = 'an independent';
  if (tags.includes('wiki.gg')) {
    descriptor = 'a wiki.gg';
  }
  if (tags.includes('official')) {
    descriptor = 'an official ' + descriptor.split(" ").slice(-1);
  }

  if (destinationLanguage === 'EN' && location.href.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
    bannerText.textContent = 'There is ' + descriptor + ' wiki covering this topic in English!';
  } else {
    bannerText.textContent = 'There is ' + descriptor + ' wiki covering this topic!';
  }
  let bannerWikiLink = document.createElement('a');
  bannerWikiLink.classList.add('indie-wiki-banner-link');
  bannerText.appendChild(bannerWikiLink);
  bannerWikiLink.href = newUrl;
  bannerWikiLink.textContent = 'Visit ' + destinationName + ' →';

  // Function to insert banner into DOM before body element
  function addBannerToDOM() {
    // Check if document is in a ready state
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      // Add banner container if not already in doc
      outputBannerContainer();
      // Ensure banner isn't already outputted
      if (!document.querySelector(':root > #indie-wiki-banner-redirect')) {
        document.getElementById('indie-wiki-banner-container').appendChild(banner);
        // Increment banner count
        if (storage.breezewiki === 'on') {
          if (currentURL.hostname.match(breezewikiRegex) || (storage.breezewikiHost === 'CUSTOM' && storage.breezewikiCustomHost?.includes(currentURL.hostname))) {
            chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
          }
        } else {
          chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
        }

        // Hide duplicative indie wiki notice on BreezeWiki instances
        if (currentURL.hostname.match(breezewikiRegex)) {
          const bwIndieNotice = document.querySelector('aside.niwa__notice');
          if (bwIndieNotice) {
            bwIndieNotice.style.display = 'none';
          }
        }
      }

      // Remove readystatechange listener
      document.removeEventListener('readystatechange', addBannerToDOM);
    }
  }

  document.addEventListener('readystatechange', addBannerToDOM);
  addBannerToDOM();
}

function main() {
  chrome.storage.local.get((localStorage) => {
    chrome.storage.sync.get((syncStorage) => {
      const storage = { ...syncStorage, ...localStorage };
      // Check if extension is on:
      if ((storage.power ?? 'on') === 'on') {
        // Check if there is a pathname, to ensure we're looking at an article
        if (currentURL.pathname.length > 1) {
          processBreezeWikiBanner(storage);

          let origin = currentURL.toString();

          // If on a BreezeWiki site, convert to Fandom link to match with our list of wikis:
          if (currentURL.hostname.match(breezewikiRegex) || (storage.breezewikiHost === 'CUSTOM' && storage.breezewikiCustomHost?.includes(currentURL.hostname))) {
            origin = String(currentURL.pathname).split('/')[1] + '.fandom.com/wiki/';
            if (currentURL.search.includes('?q=')) {
              origin = 'https://' + origin + currentURL.search.substring(3).split('&')[0];
            } else {
              origin = 'https://' + origin + currentURL.pathname.split('/')[3];
            }
          }

          commonFunctionGetSiteDataByOrigin().then(async sites => {
            let crossLanguageSetting = storage.crossLanguage || 'off';
            let matchingSite = await commonFunctionFindMatchingSite(origin, crossLanguageSetting);
            if (matchingSite) {
              // Get user's settings for the wiki
              let id = matchingSite['id'];
              let siteSetting = 'alert';
              let wikiSettings = await commonFunctionDecompressJSON(storage.wikiSettings || {});
              if (wikiSettings[id]) {
                siteSetting = wikiSettings[id];
              } else if (storage.defaultWikiAction) {
                siteSetting = storage.defaultWikiAction;
              }

              // Notify if enabled for the wiki:
              if (siteSetting === 'alert') {
                let newURL = commonFunctionGetNewURL(origin, matchingSite);

                // When head elem is loaded, notify that another wiki is available
                const docObserver = new MutationObserver((mutations, mutationInstance) => {
                  const headElement = document.querySelector('head');
                  if (headElement) {
                    try {
                      displayRedirectBanner(newURL, matchingSite['id'], matchingSite['destination'], matchingSite['language'], matchingSite['tags'], storage);
                    } finally {
                      mutationInstance.disconnect();
                    }
                  }
                });
                docObserver.observe(document, {
                  childList: true,
                  subtree: true
                });
              }
            }
          });
        }
      }
    });
  });
}

main();