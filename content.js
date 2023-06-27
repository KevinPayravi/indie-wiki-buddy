const searchEngineRegex = /www\.google\.|duckduckgo\.com|www\.bing\.com|search\.brave\.com/;
const fandomRegex = /\.fandom\.com$/;
const fextraRegex = /\.fextralife\.com$/;
const breezeWikiRegex = /breezewiki\.com$|breeze\.hostux\.net$|bw\.projectsegfau\.lt$|antifandom\.com$|breezewiki\.pussthecat\.org$|bw\.vern\.cc$|breezewiki\.esmailelbob\.xyz$|bw\.artemislena\.eu$|bw\.hamstro\.dev$|nerd\.whatever\.social$|breeze\.nohost\.network$/;
const currentURL = new URL(document.location);

// Create object prototypes for getting and setting attributes:
Object.prototype.get = function (prop) {
  this[prop] = this[prop] || {};
  return this[prop];
};
Object.prototype.set = function (prop, value) {
  this[prop] = value;
}

// Create an observer to watch for mutations
function addLocationObserver(callback) {
  const config = {
    attributes: false,
    childList: true,
    subtree: true
  }
  const observer = new MutationObserver(callback);
  observer.observe(document.body, config);
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

function displayRedirectBanner(url, id, destination, storage) {
  // Output CSS
  styleString = `
    #indie-wiki-banner {
      font-size: 18px;
      font-family: sans-serif;
      width: 100%;
      z-index: 2147483647;
      position: fixed;
      text-align: center;
      background-color: #acdae2;
      min-height: 40px;
      line-height: 28px;
      padding: 5px 10px;
    }
    #indie-wiki-banner-exit {
      float: right;
      font-size: 1.5em;
      color: #333;
      cursor: pointer;
    }
    .indie-wiki-banner-link {
      color: navy;
      font-weight: 600;
      cursor: pointer;
      padding: 0 10px;
      display: block;
      width: fit-content;
      margin: 0 auto;
    }
    .indie-wiki-banner-link:hover {
      text-decoration: underline;
    }
    .indie-wiki-banner-link-small {
      display: inline-block;
      font-size: .7em;
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
  style.textContent = styleString;
  document.head.append(style);

  // Output banner
  var banner = document.createElement('div');
  banner.id = 'indie-wiki-banner';
  var bannerExit = document.createElement('div');
  bannerExit.id = 'indie-wiki-banner-exit';
  banner.appendChild(bannerExit);
  bannerExit.innerText = '✕';
  bannerExit.onclick = function () { this.parentElement.remove(); };

  // Output "restore banner" link
  var bannerRestoreLink = document.createElement('div');
  bannerRestoreLink.id = 'indie-wiki-banner-restore';
  bannerRestoreLink.classList.add('indie-wiki-banner-link');
  bannerRestoreLink.classList.add('indie-wiki-banner-link-small');
  bannerRestoreLink.classList.add('indie-wiki-banner-hidden');
  bannerRestoreLink.innerText = '⎌ Restore banner';
  banner.appendChild(bannerRestoreLink);
  bannerRestoreLink.onclick = function (e) {
    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
      response.siteSettings.get(id).set('action', 'alert');
      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
      e.target.innerText = '✓ Banner restored';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-redirect').innerText = '↪ Auto redirect this wiki';
      document.getElementById('indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-disable').innerText = '✕ Disable banner for this wiki';
      document.getElementById('indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "disable banner" link
  var bannerDisableLink = document.createElement('div');
  bannerDisableLink.id = 'indie-wiki-banner-disable';
  bannerDisableLink.classList.add('indie-wiki-banner-link');
  bannerDisableLink.classList.add('indie-wiki-banner-link-small');
  bannerDisableLink.innerText = '✕ Disable banner for this wiki'
  banner.appendChild(bannerDisableLink);
  bannerDisableLink.onclick = function (e) {
    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
      response.siteSettings.get(id).set('action', 'disabled');
      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
      e.target.innerText = '✓ Banner disabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-redirect').innerText = '↪ Auto redirect this wiki';
      document.getElementById('indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-restore').innerText = '⎌ Restore banner';
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "auto redirect" link
  var bannerRedirectLink = document.createElement('div');
  bannerRedirectLink.id = 'indie-wiki-banner-redirect';
  bannerRedirectLink.classList.add('indie-wiki-banner-link');
  bannerRedirectLink.classList.add('indie-wiki-banner-link-small');
  bannerRedirectLink.innerText = '↪ Auto redirect this wiki';
  banner.appendChild(bannerRedirectLink);
  bannerRedirectLink.onclick = function (e) {
    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
      response.siteSettings.get(id).set('action', 'redirect');
      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
      e.target.innerText = '✓ Redirect enabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-disable').innerText = '✕ Disable banner for this wiki';
      document.getElementById('indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-restore').innerText = '⎌ Restore banner';
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  banner.appendChild(document.createElement('br'));

  // Output main banner text
  var bannerText = document.createElement('span');
  banner.appendChild(bannerText);
  bannerText.textContent = 'There is an independent wiki covering this topic!'
  var bannerWikiLink = document.createElement('a');
  bannerWikiLink.classList.add('indie-wiki-banner-link');
  bannerText.appendChild(bannerWikiLink);
  bannerWikiLink.href = url;
  bannerWikiLink.innerText = 'Visit ' + destination + ' →';

  // Increment stats
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    document.body.insertAdjacentElement('beforeBegin', banner);
    if (storage.breezewiki === 'on') {
      if (currentURL.hostname.match(breezeWikiRegex)) {
        chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
      }
    } else {
      chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
    }
  } else {
    document.addEventListener('readystatechange', e => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        document.body.insertAdjacentElement('beforeBegin', banner);
        if (storage.breezewiki === 'on') {
          if (currentURL.hostname.match(breezeWikiRegex)) {
            chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
          }
        } else {
          chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
        }
      }
    });
  }
}

function filterSearchResults(fandomSearchResults, searchEngine, storage) {
  getData().then(sites => {
    countFiltered = 0;
    fandomSearchResults.forEach(searchResult => {
      let searchResultLink = '';
      try {
        if (searchEngine === 'bing') {
          searchResultLink = searchResult.innerHTML.replaceAll('<strong>', '').replaceAll('</strong>', '');
        } else {
          searchResultLink = searchResult.closest('[href]').href;
        }
      } catch (e) {
        console.log('Indie Wiki Buddy failed to properly parse search results with error: ' + e);
      }
      // Check if site is in our list of wikis:
      let matchingSites = sites.filter(el => String(searchResultLink).replace(/(.*)https?:\/\//, '').startsWith(el.origin_base_url));
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
          let searchFilterSetting = '';
          if (settings.hasOwnProperty(id) && settings[id].searchFilter) {
            searchFilterSetting = settings[id].searchFilter;
          } else if (storage.defaultSearchFilterSettings && storage.defaultSearchFilterSettings[site.language]) {
            searchFilterSetting = storage.defaultSearchFilterSettings[site.language];
          } else {
            searchFilterSetting = 'true';
          }
          if (searchFilterSetting === 'true') {
            let cssQuery = '';
            switch (searchEngine) {
              case 'google':
                if (searchResult.closest('div[data-hveid]')) {
                  cssQuery = 'div[data-hveid]';
                }
                break;
              case 'bing':
                if (searchResult.closest('li.b_algo')) {
                  cssQuery = 'li.b_algo';
                }
                break;
              case 'duckduckgo':
                if (searchResult.closest('div.nrn-react-div')) {
                  cssQuery = 'div.nrn-react-div';
                }
                break;
              case 'brave':
                if (searchResult.closest('div.snippet')) {
                  cssQuery = 'div.snippet';
                }
                break;
              default:
            }
            if (cssQuery) {
              let searchListing = document.createElement('div');
              searchListing.style.fontStyle = 'italic';
              searchListing.style.color = 'var(--search-text-03)';
              let searchListingLink = document.createElement('a');
              searchListingLink.href = 'https://' + site.destination_base_url;
              searchListingLink.textContent = site.destination;
              searchListingPretext = document.createTextNode('A search result from ' + site.origin + ' has been removed by Indie Wiki Buddy. Look for results from ');
              searchListingPosttext = document.createTextNode(' instead!');
              searchListing.appendChild(searchListingPretext);
              searchListing.appendChild(searchListingLink);
              searchListing.appendChild(searchListingPosttext);
              searchResult.closest(cssQuery).replaceChildren(searchListing);
              countFiltered++;
            }
          }
        }
      }
    });
    if (countFiltered > 0) {
      chrome.storage.sync.set({ 'countSearchFilters': (storage.countSearchFilters ?? 0) + countFiltered });
    }
  });
}

// Check if search engine results, Fandom, or a BreezeWiki host:
function checkSite() {
  if (currentURL.hostname.match(searchEngineRegex) || currentURL.hostname.match(fandomRegex) || currentURL.hostname.match(fextraRegex) || currentURL.hostname.match(breezeWikiRegex)) {
    return true;
  }
}

function main(mutations = null, observer = null) {
  if (observer) {
    observer.disconnect();
  }
  chrome.storage.local.get(function (localStorage) {
    chrome.storage.sync.get(function (syncStorage) {
      const storage = {...syncStorage, ...localStorage};
      // Check if extension is on:
      if ((storage.power ?? 'on') === 'on') {
        // Check if on Fandom, Fextralife, or BreezeWiki
        // If on BreezeWiki, check if there is a pathname (which indicates we are looking at a wiki)
        if (currentURL.hostname.match(fandomRegex) || currentURL.hostname.match(fextraRegex) || (currentURL.hostname.match(breezeWikiRegex) && currentURL.pathname.length > 1)) {
          let origin = currentURL;
          // If on a BreezeWiki site, convert to Fandom link to match with our list of wikis:
          if (currentURL.hostname.match(breezeWikiRegex)) {
            origin = String(currentURL.pathname).split('/')[1] + '.fandom.com/wiki/';
            if (currentURL.search.includes('?q=')) {
              origin = origin + currentURL.search.substring(3).split('&')[0];
            } else {
              origin = origin + currentURL.pathname.split('/')[3];
            }
          }
          getData().then(sites => {
            // Check if site is in our list of wikis:
            let matchingSites = sites.filter(el => String(origin).replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
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
                // Notify if enabled for the wiki:
                if (siteSetting === 'alert') {
                  // Get article name from the end of the URL;
                  // We can't just take the last part of the path due to subpages;
                  // Instead, we take everything after the wiki's base URL + content path:
                  let article = String(origin).split(site['origin_base_url'] + site['origin_content_path'])[1];
                  // Set up URL to redirect user to based on wiki platform:
                  if (article || (!article && !url.href.split(site['origin_base_url'] + '/')[1])) {
                    let newURL = '';
                    if (article) {
                      let searchParams = '';
                      switch (site['destination_platform']) {
                        case 'mediawiki':
                          searchParams = 'Special:Search/' + article;
                          break;
                        case 'doku':
                          searchParams = 'start?do=search&q=' + article;
                          break;
                      }
                      newURL = 'https://' + site["destination_base_url"] + site["destination_content_path"] + searchParams;
                    } else {
                      newURL = 'https://' + site["destination_base_url"];
                    }
                    // Notify that another wiki is available
                    displayRedirectBanner(newURL, site['id'], site['destination'], storage);
                  }
                }
              }
            }
          });
        } else if ((storage.searchFilter ?? 'on') === 'on') {
          if (currentURL.hostname.includes('www.google.')) {
            // Check if doing a Google search:
            function filterGoogle() {
              let searchResults = document.querySelectorAll("div[lang] a[href*='fandom.com'], div[lang] a[href*='fextralife.com']");
              filterSearchResults(searchResults, 'google', storage);
            }
            addLocationObserver(main);
            filterGoogle();
          } else if (currentURL.hostname.includes('duckduckgo.com') && currentURL.search.includes('q=')) {
            // Check if doing a Duck Duck Go search:
            function filterDuckDuckGo() {
              let searchResults = document.querySelectorAll("h2>a[href*='fandom.com'], h2>a[href*='fextralife.com']");
              filterSearchResults(searchResults, 'duckduckgo', storage);
            }
            // Need to wait for document to be ready
            if (document.readyState === 'complete') {
              addLocationObserver(main);
              filterDuckDuckGo();
            } else {
              document.addEventListener('readystatechange', e => {
                if (document.readyState === 'complete') {
                  addLocationObserver(main);
                  filterDuckDuckGo();
                }
              });
            }
          } else if (currentURL.hostname.includes('www.bing.com')) {
            // Check if doing a Bing search:
            function filterBing() {
              let searchResults = Array.from(document.querySelectorAll(".b_attribution>cite")).filter(el => el.innerHTML.includes('fandom.com') || el.innerHTML.includes('fextralife.com'));
              filterSearchResults(searchResults, 'bing', storage);
            }
            // Need to wait for document to be ready
            if (document.readyState === 'complete') {
              addLocationObserver(main);
              filterBing();
            } else {
              document.addEventListener('readystatechange', e => {
                if (document.readyState === 'complete') {
                  addLocationObserver(main);
                  filterBing();
                }
              });
            }
          } else if (currentURL.hostname.includes('search.brave.com')) {
            // Check if doing a Brave search:
            function filterBrave() {
              let searchResults = Array.from(document.querySelectorAll(".result-header")).filter(el => el.innerHTML.includes('fandom.com') || el.innerHTML.includes('fextralife.com'));
              filterSearchResults(searchResults, 'brave', storage);
            }
            // Need to wait for document to be ready
            if (document.readyState === 'complete') {
              addLocationObserver(main);
              filterBrave();
            } else {
              document.addEventListener('readystatechange', e => {
                if (document.readyState === 'complete') {
                  addLocationObserver(main);
                  filterBrave();
                }
              });
            }
          }
        }
      }
    });
  });
}

if (checkSite()) {
  main();
}