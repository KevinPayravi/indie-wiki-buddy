const currentURL = new URL(document.location);

// Create object prototypes for getting and setting attributes:
Object.prototype.get = function (prop) {
  this[prop] = this[prop] || {};
  return this[prop];
};
Object.prototype.set = function (prop, value) {
  this[prop] = value;
}

// Function to create an observer to watch for mutations on search pages
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

function filterSearchResults(searchResults, searchEngine, storage) {
  getData().then(sites => {
    countFiltered = 0;
    searchResults.forEach(searchResult => {
      let searchResultLink = '';
      try {
        if (searchEngine === 'bing') {
          searchResultLink = searchResult.innerHTML.replaceAll('<strong>', '').replaceAll('</strong>', '');
        } else {
          searchResultLink = searchResult.closest('a[href]').href;
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
            let color = '';
            let fontSize = '';
            switch (searchEngine) {
              case 'google':
                if (searchResult.closest('div[data-hveid]')) {
                  cssQuery = 'div[data-hveid]';
                  fontSize = '14px';
                }
                break;
              case 'bing':
                if (searchResult.closest('li.b_algo')) {
                  cssQuery = 'li.b_algo';
                }
                break;
              case 'duckduckgo':
                if (searchResult.closest('li[data-layout], div.web-result')) {
                  cssQuery = 'li[data-layout], div.web-result';
                  color = 'var(--theme-col-txt-snippet)';
                }
                break;
              case 'brave':
                if (searchResult.closest('div.snippet')) {
                  cssQuery = 'div.snippet';
                  color = 'var(--search-text-03)';
                }
                break;
              case 'ecosia':
                if (searchResult.closest('div.result__body')) {
                  cssQuery = 'div.result__body';
                }
                break;
              case 'startpage':
                if (searchResult.closest('div.w-gl__result__main')) {
                  cssQuery = 'div.w-gl__result__main';
                }
                break;
              default:
            }
            if (cssQuery) {
              let searchListing = document.createElement('div');
              if (color) {
                searchListing.style.color = color;
              }
              if (fontSize) {
                searchListing.style.fontSize = fontSize;
              }
              searchListing.style.fontStyle = 'italic';
              searchListing.style.padding = '.5em';
              let searchListingLink = document.createElement('a');
              searchListingLink.style.textDecoration = 'underline';
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

function main(mutations = null, observer = null) {
  if (observer) {
    observer.disconnect();
  }
  chrome.storage.local.get(function (localStorage) {
    chrome.storage.sync.get(function (syncStorage) {
      const storage = { ...syncStorage, ...localStorage };
      // Check if extension is on:
      if ((storage.power ?? 'on') === 'on') {
        // Determine which search engine we're on
        if ((storage.searchFilter ?? 'on') === 'on') {
          if (currentURL.hostname.includes('www.google.')) {
            // Function to filter search results in Google
            function filterGoogle() {
              let searchResults = document.querySelectorAll("div[data-hveid] a[href*='fandom.com']:first-of-type, div[data-hveid] a[href*='fextralife.com']:first-of-type");
              filterSearchResults(searchResults, 'google', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              addLocationObserver(main);
              filterGoogle();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  addLocationObserver(main);
                  filterGoogle();
                }
              });
            }
          } else if (currentURL.hostname.includes('duckduckgo.com') && (currentURL.search.includes('q=') || currentURL.pathname.includes('html'))) {
            // Function to filter search results in DuckDuckGo
            function filterDuckDuckGo() {
              let searchResults = document.querySelectorAll("h2>a[href*='fandom.com'], h2>a[href*='fextralife.com']");
              filterSearchResults(searchResults, 'duckduckgo', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              addLocationObserver(main);
              filterDuckDuckGo();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  addLocationObserver(main);
                  filterDuckDuckGo();
                }
              });
            }
          } else if (currentURL.hostname.includes('www.bing.com')) {
            // Function to filter search results in Bing
            function filterBing() {
              let searchResults = Array.from(document.querySelectorAll(".b_attribution>cite")).filter(el => el.innerHTML.includes('fandom.com') || el.innerHTML.includes('fextralife.com'));
              filterSearchResults(searchResults, 'bing', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              addLocationObserver(main);
              filterBing();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  addLocationObserver(main);
                  filterBing();
                }
              });
            }
          } else if (currentURL.hostname.includes('search.brave.com')) {
            // Function to filter search results in Brave
            function filterBrave() {
              let searchResults = Array.from(document.querySelectorAll(".result-header")).filter(el => el.innerHTML.includes('fandom.com') || el.innerHTML.includes('fextralife.com'));
              filterSearchResults(searchResults, 'brave', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              addLocationObserver(main);
              filterBrave();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  addLocationObserver(main);
                  filterBrave();
                }
              });
            }
          } else if (currentURL.hostname.includes('ecosia.org')) {
            // Function to filter search results in Ecosia
            function filterEcosia() {
              let searchResults = Array.from(document.querySelectorAll("a.result__link")).filter(el => el.href.includes('fandom.com') || el.href.includes('fextralife.com'));
              filterSearchResults(searchResults, 'ecosia', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              addLocationObserver(main);
              filterEcosia();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  addLocationObserver(main);
                  filterEcosia();
                }
              });
            }
          } else if (currentURL.hostname.includes('startpage.com')) {
            // Function to filter search results in Startpage
            function filterStartpage() {
              let searchResults = Array.from(document.querySelectorAll("a.result-link")).filter(el => el.href.includes('fandom.com') || el.href.includes('fextralife.com'));
              filterSearchResults(searchResults, 'startpage', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              addLocationObserver(main);
              filterStartpage();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  addLocationObserver(main);
                  filterStartpage();
                }
              });
            }
          }
        }
      }
    });
  });
}

main();