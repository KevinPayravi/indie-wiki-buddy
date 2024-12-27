const breezewikiRegex = /breezewiki\.com$|antifandom\.com$|bw\.artemislena\.eu$|breezewiki\.catsarch\.com$|breezewiki\.esmailelbob\.xyz$|breezewiki\.frontendfriendly\.xyz$|bw\.hamstro\.dev$|breeze\.hostux\.net$|breezewiki\.hyperreal\.coffee$|breeze\.mint\.lgbt$|breezewiki\.nadeko\.net$|nerd\.whatever\.social$|breeze\.nohost\.network$|z\.opnxng\.com$|bw\.projectsegfau\.lt$|breezewiki\.pussthecat\.org$|bw\.vern\.cc$|breeze\.whateveritworks\.org$|breezewiki\.woodland\.cafe$/;
const currentURL = new URL(document.location);

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
            extensionAPI.runtime.getManifest().version.localeCompare(host.iwb_version,
              undefined,
              { numeric: true, sensitivity: 'base' }
            ) >= 0
          );
          // Check if BreezeWiki's main site is available
          let breezewikiMain = breezewikiHosts.filter(host => host.instance === 'https://breezewiki.com');
          if (breezewikiMain.length > 0) {
            extensionAPI.storage.sync.set({ 'breezewikiHost': breezewikiMain[0].instance });
          } else {
            // If BreezeWiki.com is not available, set to a random mirror
            try {
              extensionAPI.storage.sync.set({ 'breezewikiHost': breezewikiHosts[Math.floor(Math.random() * breezewikiHosts.length)].instance });
            } catch (e) {
              console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
            }
          }
          extensionAPI.storage.sync.set({ 'breezewikiHostOptions': breezewikiHosts });
          extensionAPI.storage.sync.set({ 'breezewikiHostFetchTimestamp': Date.now() });
          breezewikiHost = host;
        }).catch((e) => {
          console.log('Indie Wiki Buddy failed to get BreezeWiki data: ' + e);
          extensionAPI.storage.sync.set({ 'breezewikiHost': 'https://breezewiki.com' });
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
  // Output banner
  let banner = document.createElement('div');
  banner.id = 'indie-wiki-banner-bw';
  banner.classList.add('indie-wiki-banner');

  // Output main banner text
  let bannerText = document.createElement('span');
  let bannerWikiLink = document.createElement('a');
  bannerWikiLink.classList.add('indie-wiki-banner-link');
  bannerWikiLink.href = newUrl;
  bannerWikiLink.textContent = extensionAPI.i18n.getMessage('bannerBreezeWiki');
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

function displayRedirectBanner(newUrl, id, destinationName, destinationLanguage, host, tags, storage) {
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
  bannerRestoreLink.textContent = '⎌ ' + extensionAPI.i18n.getMessage('bannerRestore');
  bannerControls.appendChild(bannerRestoreLink);
  bannerRestoreLink.onclick = function (e) {
    extensionAPI.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
      let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
      wikiSettings[id] = 'alert';
      extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      e.target.textContent = '✓ ' + extensionAPI.i18n.getMessage('bannerRestoreDone');
      e.target.classList.add('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-redirect').textContent = '↪ ' + extensionAPI.i18n.getMessage('bannerRedirect');
      bannerControls.querySelector('.indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-disable').textContent = '✕ ' + extensionAPI.i18n.getMessage('bannerDisable');
      bannerControls.querySelector('.indie-wiki-banner-disable').classList.remove('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "disable banner" link
  let bannerDisableLink = document.createElement('div');
  bannerDisableLink.classList.add('indie-wiki-banner-disable');
  bannerDisableLink.classList.add('indie-wiki-banner-link');
  bannerDisableLink.classList.add('indie-wiki-banner-link-small');
  bannerDisableLink.textContent = '✕ ' + extensionAPI.i18n.getMessage('bannerDisable');
  bannerControls.appendChild(bannerDisableLink);
  bannerDisableLink.onclick = function (e) {
    extensionAPI.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
      let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
      wikiSettings[id] = 'disabled';
      extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      e.target.textContent = '✓ ' + extensionAPI.i18n.getMessage('bannerDisableDone');
      e.target.classList.add('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-restore').textContent = '⎌ ' + extensionAPI.i18n.getMessage('bannerRestore');
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "auto redirect" link
  let bannerRedirectLink = document.createElement('div');
  bannerRedirectLink.classList.add('indie-wiki-banner-redirect');
  bannerRedirectLink.classList.add('indie-wiki-banner-link');
  bannerRedirectLink.classList.add('indie-wiki-banner-link-small');
  bannerRedirectLink.textContent = '↪ ' + extensionAPI.i18n.getMessage('bannerRedirect');
  bannerControls.appendChild(bannerRedirectLink);
  bannerRedirectLink.onclick = function (e) {
    extensionAPI.storage.sync.get({ 'wikiSettings': {} }, async (response) => {
      let wikiSettings = await commonFunctionDecompressJSON(response.wikiSettings);
      wikiSettings[id] = 'redirect';
      extensionAPI.storage.sync.set({ 'wikiSettings': await commonFunctionCompressJSON(wikiSettings) });
      e.target.textContent = '✓ ' + extensionAPI.i18n.getMessage('bannerRedirectDone');
      e.target.classList.add('indie-wiki-banner-disabled');
      bannerControls.querySelector('.indie-wiki-banner-disable').classList.add('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-restore').textContent = '⎌ ' + extensionAPI.i18n.getMessage('bannerRestore');
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      bannerControls.querySelector('.indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output main banner text
  let bannerText = document.createElement('span');
  bannerText.classList.add('indie-wiki-banner-big-text');
  banner.appendChild(bannerText);

  // Build descriptors
  let wikiDescriptor = extensionAPI.i18n.getMessage('bannerDescriptorIndependent');
  let hostDescriptor = '';

  if (host) {
    hostDescriptor = extensionAPI.i18n.getMessage('bannerHost', host);
    if (tags.includes('official')) {
      wikiDescriptor = extensionAPI.i18n.getMessage('bannerDescriptorOfficial');
    } else {
      wikiDescriptor = extensionAPI.i18n.getMessage('bannerDescriptorWiki');
    }
  } else if (tags.includes('official')) {
    wikiDescriptor = extensionAPI.i18n.getMessage('bannerDescriptorIndependentOfficial');
  }

  let bannerTextContent = '';
  if (destinationLanguage === 'EN' && location.href.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
    bannerTextContent = extensionAPI.i18n.getMessage('bannerText', [
      wikiDescriptor,
      hostDescriptor,
      extensionAPI.i18n.getMessage('bannerLanguageEnglish')
    ]);
  } else {
    bannerTextContent = extensionAPI.i18n.getMessage('bannerText', [wikiDescriptor, hostDescriptor, '']);
  }
  // Reduce repeated spaces into single space
  bannerText.textContent = bannerTextContent.replace(/\s+/g, ' ');
  let bannerWikiLink = document.createElement('a');
  bannerWikiLink.classList.add('indie-wiki-banner-link');
  bannerText.appendChild(bannerWikiLink);
  bannerWikiLink.href = newUrl;
  bannerWikiLink.textContent = extensionAPI.i18n.getMessage('bannerVisit', [destinationName]) + ' →';

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
            extensionAPI.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
          }
        } else {
          extensionAPI.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
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
  extensionAPI.runtime.sendMessage({ action: 'getStorage' }, (storage) => {
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
            origin = 'https://' + origin + currentURL.search.substring(3);
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
                    displayRedirectBanner(newURL, matchingSite['id'], matchingSite['destination'], matchingSite['language'], matchingSite['destination_host'], matchingSite['tags'], storage);
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
}

main();
