const currentURL = new URL(document.location);
let filteredWikis = [];
let hiddenWikisRevealed = {};

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
              "origin_group": site.origins_label,
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

function insertCSS() {
  // Output CSS
  styleString = `
    .iwb-notice {
      display: block !important;
      margin: .5em .5em 1em .5em !important;
      padding: .5em .5em .5em 1em !important;
      border-left: 3px solid #FFCC33 !important;
      font-size: 14px !important;
      color: white !important;
      mix-blend-mode: difference !important;
    }

    .iwb-notice a {
      text-decoration: underline !important;
      color: white !important;
      mix-blend-mode: difference !important;
    }

    .iwb-notice button {
      cursor: pointer !important;
      display: inline-block !important;
      padding: 2px 8px !important;
      margin: 8px 8px 0 0 !important;
      background-color: transparent !important;
      border: 1px solid !important;
      border-radius: 5px !important; 
      font-size: 11px !important;
      color: white !important;
      mix-blend-mode: difference !important;
      text-align: left !important;
    }
    .iwb-notice button+a {
      display: inline-block;
      font-size: 12px !important;
      margin: 8px 0 0 0 !important;
      white-space: nowrap !important;
    }

    .iwb-hide {
      display: none !important;
    }
    .iwb-show {
      display: block !important;
    }

    .iwb-notice button:hover {
      outline: 1px solid !important;
    }
  `
  style = document.createElement('style');
  style.textContent = styleString;
  document.head.append(style);
}

// Function to convert strings to consistent IDs
// Used to convert wiki names to element IDs
function stringToId(string) {
  return string.replaceAll(' ', '-').replaceAll("'", '').replace(/\W/g, '').toLowerCase();
}

// Function to escape string to use in regex
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function filterSearchResults(searchResults, searchEngine, storage) {
  getData().then(sites => {
    let countFiltered = 0;

    for (let searchResult of searchResults) {
      try {
        let searchResultLink = '';
        if (searchEngine === 'bing') {
          searchResultLink = searchResult.innerHTML.replaceAll('<strong>', '').replaceAll('</strong>', '');
        } else {
          searchResultLink = searchResult.closest('a[href]').href;
        }
        let link = String(decodeURIComponent(searchResultLink));

        if (searchEngine ==='google') {
          // Break if image result:
          if (link.includes('imgurl=')) {
            break;
          }
        }

        // Check if site is in our list of wikis:
        let matchingSites = sites.filter(el => {
          if (link.substring(8).includes('/')) {
            // If the URL has a path, check if an exact match with base URL or base URL + content path
            // This is done to ensure we capture non-English Fandom wikis correctly
            return (link === 'https://' + el.origin_base_url) || (link.includes('https://' + el.origin_base_url + el.origin_content_path));
          } else {
            // If URL does not have a path, just check base URL
            return link.includes('https://' + el.origin_base_url);
          }
        });
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
              // Output stylesheet if not already done
              if (filteredWikis.length === 0) {
                // Wait for head to be available
                const headElement = document.querySelector('head');
                if (headElement) {
                  insertCSS();
                } else {
                  const docObserver = new MutationObserver(function (mutations, mutationInstance) {
                    const headElement = document.querySelector('head');
                    if (headElement) {
                      insertCSS();
                      mutationInstance.disconnect();
                    }
                  });
                  docObserver.observe(document, {
                    childList: true,
                    subtree: true
                  });
                }
              }

              // Insert search result removal notice
              if (!filteredWikis.includes(site.lang + ' ' + site.origin_group)) {
                filteredWikis.push(site.lang + ' ' + site.origin_group);

                let elementId = stringToId(site.lang + '-' + site.origin_group);
                hiddenWikisRevealed[elementId] = false;
    
                let searchRemovalNotice = document.createElement('aside');
                searchRemovalNotice.id = 'iwb-notice-' + elementId;
                searchRemovalNotice.classList.add('iwb-notice');
                let searchRemovalNoticeLink = document.createElement('a');
                searchRemovalNoticeLink.href = 'https://' + site.destination_base_url;
                searchRemovalNoticeLink.textContent = site.destination;
                searchRemovalNoticePretext = document.createTextNode('Indie Wiki Buddy has filtered out results from ' + site.origin_group + (site.lang !== 'EN' ? ' (' + site.lang + ')' : '') + '. Look for results from ');
                searchRemovalNoticePosttext = document.createTextNode(' instead!');
                linebreak = document.createElement("br");
                searchRemovalNotice.appendChild(searchRemovalNoticePretext);
                searchRemovalNotice.appendChild(searchRemovalNoticeLink);
                searchRemovalNotice.appendChild(searchRemovalNoticePosttext);
                searchRemovalNotice.appendChild(linebreak);

                // Output "show results" button
                let showResultsButton = document.createElement('button');
                showResultsButton.classList.add('iwb-show-results-button');
                showResultsButton.setAttribute('data-group', 'iwb-search-result-' + elementId);
                showResultsButton.textContent = 'Show filtered results';
                searchRemovalNotice.appendChild(showResultsButton);
                showResultsButton.onclick = function (e) {
                  if(e.target.textContent.includes('Show')) {
                    e.target.textContent = 'Re-hide filtered results';
                    hiddenWikisRevealed[elementId] = true;
                    const selector = e.currentTarget.dataset.group;
                    document.querySelectorAll('.' + selector).forEach(el => {
                      el.classList.add('iwb-show');
                    })
                  } else {
                    e.target.textContent = 'Show filtered results';
                    hiddenWikisRevealed[elementId] = false;
                    const selector = e.currentTarget.dataset.group;
                    document.querySelectorAll('.' + selector).forEach(el => {
                      el.classList.remove('iwb-show');
                    })
                  }
                }

                // Output "disable filtering" button
                let disableFilterButton = document.createElement('button');
                disableFilterButton.classList.add('iwb-disable-filtering-button');
                disableFilterButton.textContent = 'Stop filtering ' + site.origin_group + ' in future searches';
                disableFilterButton.style.border = '1px solid';
                searchRemovalNotice.appendChild(disableFilterButton);
                disableFilterButton.onclick = function (e) {
                  if (e.target.textContent.includes('Stop')) {
                    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
                      response.siteSettings.get(site.id).set('searchFilter', 'false');
                      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
                      e.target.textContent = 'Re-enable filtering for ' + site.origin_group;
                    })
                  } else {
                    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
                      response.siteSettings.get(site.id).set('searchFilter', 'true');
                      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
                      e.target.textContent = 'Stop filtering ' + site.origin_group + ' in future searches';
                    })
                  }
                }

                switch (searchEngine) {
                  case 'google':
                    if (document.querySelector('#search')) {
                      document.querySelector('#search').prepend(searchRemovalNotice);
                    } else if (document.querySelector('#topstuff')) {
                      document.querySelector('#topstuff').prepend(searchRemovalNotice);
                    } else if (document.querySelector('#main')) {
                      var el = document.querySelector('#main');
                      el.insertBefore(searchRemovalNotice, el.querySelector('div [data-hveid]').parentElement);
                    };
                    break;
                  case 'bing':
                    var li = document.createElement('li');
                    li.appendChild(searchRemovalNotice);
                    document.querySelector('#b_results').prepend(li);
                    break;
                  case 'duckduckgo':
                    if (document.getElementById('web_content_wrapper')) {
                      var li = document.createElement('li');
                      li.appendChild(searchRemovalNotice);
                      document.querySelector('#web_content_wrapper ol').prepend(li);
                    } else {
                      document.getElementById('links').prepend(searchRemovalNotice);
                    }
                    break;
                  case 'brave':
                    document.querySelector('body').prepend(searchRemovalNotice);
                    break;
                  case 'ecosia':
                    document.querySelector('body').prepend(searchRemovalNotice);
                    break;
                  case 'startpage':
                    document.querySelector('#main').prepend(searchRemovalNotice);
                    break;
                  case 'yahoo':
                    if (document.querySelector('#web > ol')) {
                      var li = document.createElement('li');
                      li.appendChild(searchRemovalNotice);
                      document.querySelector('#web > ol').prepend(li);
                    } else {
                      document.querySelector('#main-algo').prepend(searchRemovalNotice);
                    }
                    break;
                  default:
                }
              }

              let cssQuery = '';
              let searchResultContainer = null;
              switch (searchEngine) {
                case 'google':
                  if (searchResult.closest('div[data-hveid]')) {
                    cssQuery = 'div[data-hveid]';
                    searchResultContainer = searchResult.closest(cssQuery).parentElement;
                  }
                  break;
                case 'bing':
                  if (searchResult.closest('li.b_algo')) {
                    cssQuery = 'li.b_algo';
                    searchResultContainer = searchResult.closest(cssQuery);
                  }
                  break;
                case 'duckduckgo':
                  if (searchResult.closest('li[data-layout], div.web-result')) {
                    cssQuery = 'li[data-layout], div.web-result';
                    searchResultContainer = searchResult.closest(cssQuery);
                  }
                  break;
                case 'brave':
                  if (searchResult.closest('div.snippet')) {
                    cssQuery = 'div.snippet';
                    searchResultContainer = searchResult.closest(cssQuery);
                  }
                  break;
                case 'ecosia':
                  if (searchResult.closest('div.mainline__result-wrapper')) {
                    cssQuery = 'div.mainline__result-wrapper';
                    searchResultContainer = searchResult.closest(cssQuery);
                  }
                  break;
                case 'startpage':
                  if (searchResult.closest('div.w-gl__result')) {
                    cssQuery = 'div.w-gl__result';
                    searchResultContainer = searchResult.closest(cssQuery);
                  }
                  break;
                case 'yahoo':
                  if (searchResult.closest('#web > ol > li, section.algo')) {
                    cssQuery = '#web > ol > li, section.algo';
                    searchResultContainer = searchResult.closest(cssQuery);
                  }
                  break;
                default:
              }

              if(!Array.from(searchResultContainer.classList).includes('iwb-hide')) {
                let elementId = stringToId(site.lang + '-' + site.origin_group);
                searchResultContainer.classList.add('iwb-search-result-' + elementId);
                searchResultContainer.classList.add('iwb-hide');
                countFiltered++;
                if (hiddenWikisRevealed[elementId]) {
                  searchResultContainer.classList.add('iwb-show');
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('Indie Wiki Buddy failed to properly parse search results with error: ' + e);
      }
    };
    addLocationObserver(main);
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
              let searchResults = document.querySelectorAll("div[data-hveid] a[href*='fandom.com']:first-of-type:not([role='button']):not([target]), div[data-hveid] a[href*='fextralife.com']:first-of-type:not([role='button']):not([target])");
              filterSearchResults(searchResults, 'google', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              filterGoogle();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  filterGoogle();
                }
              }, { once: true });
            }
          } else if (currentURL.hostname.includes('duckduckgo.com') && (currentURL.search.includes('q=') || currentURL.pathname.includes('html'))) {
            // Function to filter search results in DuckDuckGo
            function filterDuckDuckGo() {
              let searchResults = document.querySelectorAll('h2>a[href*="fandom.com"], h2>a[href*="fextralife.com"]');
              filterSearchResults(searchResults, 'duckduckgo', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              filterDuckDuckGo();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  filterDuckDuckGo();
                }
              }, { once: true });
            }
          } else if (currentURL.hostname.includes('www.bing.com')) {
            // Function to filter search results in Bing
            function filterBing() {
              let searchResults = Array.from(document.querySelectorAll('.b_attribution>cite')).filter(el => el.innerHTML.includes('fandom.com') || el.innerHTML.includes('fextralife.com'));
              filterSearchResults(searchResults, 'bing', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              filterBing();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  filterBing();
                }
              }, { once: true });
            }
          } else if (currentURL.hostname.includes('search.brave.com')) {
            // Function to filter search results in Brave
            function filterBrave() {
              let searchResults = Array.from(document.querySelectorAll('div.snippet[data-type="web"] a')).filter(el => el.innerHTML.includes('fandom.com') || el.innerHTML.includes('fextralife.com'));
              console.log(searchResults);
              filterSearchResults(searchResults, 'brave', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              filterBrave();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  filterBrave();
                }
              }, { once: true });
            }
          } else if (currentURL.hostname.includes('ecosia.org')) {
            // Function to filter search results in Ecosia
            function filterEcosia() {
              let searchResults = Array.from(document.querySelectorAll('section.mainline .result__title a.result__link')).filter(el => el.href.includes('fandom.com') || el.href.includes('fextralife.com'));
              filterSearchResults(searchResults, 'ecosia', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              filterEcosia();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  filterEcosia();
                }
              }, { once: true });
            }
          } else if (currentURL.hostname.includes('startpage.com')) {
            // Function to filter search results in Startpage
            function filterStartpage() {
              let searchResults = Array.from(document.querySelectorAll('a.result-link')).filter(el => el.href.includes('fandom.com') || el.href.includes('fextralife.com'));
              filterSearchResults(searchResults, 'startpage', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              filterStartpage();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  filterStartpage();
                }
              }, { once: true });
            }
          } else if (currentURL.hostname.includes('yahoo.com')) {
            // Function to filter search results in Yahoo
            function filterYahoo() {
              let searchResults = Array.from(document.querySelectorAll('#web > ol > li a:not(.thmb), #main-algo section.algo a:not(.thmb)')).filter(el => el.href.includes('fandom.com') || el.href.includes('fextralife.com'));
              filterSearchResults(searchResults, 'yahoo', storage);
            }

            // Wait for document to be interactive/complete:
            if (['interactive', 'complete'].includes(document.readyState)) {
              filterYahoo();
            } else {
              document.addEventListener('readystatechange', e => {
                if (['interactive', 'complete'].includes(document.readyState)) {
                  filterYahoo();
                }
              }, { once: true });
            }
          }
        }
      }
    });
  });
}

main();