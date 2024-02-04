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

function base64Decode(text) {
  text = text.replace(/\s+/g, '').replace(/\-/g, '+').replace(/\_/g, '/');
  return decodeURIComponent(Array.prototype.map.call(window.atob(text), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
}

// Function to create an observer to watch for mutations on search pages
// This is used for search engines that paginate via JavaScript,
// or overwrite their results and remove IWB's elements
function addLocationObserver(callback) {
  const config = {
    attributes: false,
    childList: true,
    subtree: true
  }
  const observer = new MutationObserver(callback);
  observer.observe(document.body, config);
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
      font-size: 12px !important;
      color: white !important;
      mix-blend-mode: difference !important;
      text-align: left !important;
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
    .iwb-new-link-container {
      display: inline-block;
      font-size: 12px !important;
      text-decoration: none;
      padding-left: 5px;
      position: relative;
    }
    .iwb-new-link {
      display: inline-block;
      text-decoration: none;
      position: relative;
    }
    .iwb-new-link:hover {
      text-decoration: none;
      z-index: 9999999;
    }
    .iwb-new-link button {
      cursor: pointer;
      color: white;
      background: #005799;
      border: 0px solid #fff;
      border-radius: 10px;
      padding: 5px 10px;
      margin: .5em 0;
      font-size: 1.2em;
      width: fit-content;
    }
    .iwb-new-link button:hover {
      background: #00467a;
    }
    .iwb-new-link button * {
      vertical-align: middle;
    }
    .iwb-new-link div:first-of-type {
      display: inline-block;
      background: white; 
      border-radius: 16px;
      margin-right: 10px;
      width: fit-content;
      height: fit-content;
      line-height: 12px;
      padding: 5px;
    }
    .iwb-new-link img {
      width: 12px;
    }
    .iwb-disavow > *:not([class^="iwb-"]) {
      opacity: 60%;
      pointer-events: none;
      cursor: default;
    }
    .iwb-disavow > a:not([class^="iwb-"]), .iwb-disavow > *:not([class^="iwb-"]) a, .iwb-disavow > *:not([class^="iwb-"]) a * {
      text-decoration: line-through !important;
    }

    .iwb-result-controls {
      display: inline-block;
      margin: .5em;
      font-size: 12px;
      color: white !important;
      mix-blend-mode: difference !important;
    }
    .iwb-result-controls > div {
      display: inline-block;
      cursor: pointer;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-thickness: 1px;
      padding: 0 1em;
    }

    .iwb-notice .iwb-result-controls {
      margin: 8px 0 0 0;
    }

    
  `
  style = document.createElement('style');
  style.classList.add('iwb-styles');
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

function replaceSearchResults(searchResultContainer, site, link) {
  let originArticle = commonFunctionGetOriginArticle(link, site);
  let destinationArticle = commonFunctionGetDestinationArticle(site, originArticle);
  let newURL = commonFunctionGetNewURL(link, site);

  if (searchResultContainer && !searchResultContainer.querySelector('.iwb-new-link')) {
    if (!searchResultContainer.classList.contains('iwb-detected')) {
      searchResultContainer.classList.add('iwb-detected');
      searchResultContainer.classList.add('iwb-disavow');
    }
    // Using aside to avoid conflicts with website CSS and listeners:
    let indieContainer = document.createElement('aside');
    indieContainer.classList.add('iwb-new-link-container');
    let indieResultLink = document.createElement('a');
    indieResultLink.href = newURL;
    indieResultLink.classList.add('iwb-new-link');
    let indieResultButton = document.createElement('button');
    let indieResultFaviconContainer = document.createElement('div');
    let indieResultFavicon = document.createElement('img');
    indieResultFavicon.alt = '';
    indieResultFavicon.width = '12';
    indieResultFavicon.height = '12';
    indieResultFavicon.src = chrome.runtime.getURL('favicons/' + site.language.toLowerCase() + '/' + site.destination_icon);
    indieResultFaviconContainer.append(indieResultFavicon);
    let indieResultText = document.createElement('span');
    if (originArticle && originArticle !== site['origin_main_page']) {
      destinationArticleTitle = destinationArticle.replace(site['destination_content_prefix'], '').replaceAll('_', ' ');
      // If a Fextralife wiki, replace plus signs with spaces
      // When there are multiple plus signs together, this regex will only replace only the first
      if (link.includes('.wiki.fextralife.com')) {
        destinationArticleTitle = destinationArticleTitle.replace(/(?<!\+)\+/g, ' ');
      }
  
      if (site['language'] === 'EN' && link.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
        indieResultText.innerText = 'Look up "' + decodeURIComponent(destinationArticleTitle) + '" on ' + site.destination + ' (EN)';
      } else {
        indieResultText.innerText = 'Look up "' + decodeURIComponent(destinationArticleTitle) + '" on ' + site.destination;
      }
    } else {
      if (site['language'] === 'EN' && link.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
        indieResultText.innerText = 'Visit ' + site.destination + ' (EN) instead';
      } else {
        indieResultText.innerText = 'Visit ' + site.destination + ' instead';
      }
    }
    indieResultButton.append(indieResultFaviconContainer);
    indieResultButton.append(indieResultText);
    indieResultLink.appendChild(indieResultButton);

    // Output container for result controls:
    let resultControls = document.createElement('div');
    resultControls.classList.add('iwb-result-controls');
    // Output link to re-enable disabled result:
    let enableResultButton = document.createElement('div');
    enableResultButton.innerText = 'Re-enable the result below';
    resultControls.prepend(enableResultButton);
    enableResultButton.addEventListener('click', (e) => {
      e.target.closest('.iwb-disavow').classList.remove('iwb-disavow');
      e.target.classList.add('iwb-hide');
    });

    indieContainer.appendChild(indieResultLink);
    indieContainer.appendChild(resultControls);
    searchResultContainer.prepend(indieContainer);

    return 1;
  }
  return 0;
}

function hideSearchResults(searchResultContainer, searchEngine, site, showBanner = 'on') {
  // Insert search result removal notice
  if (showBanner === 'on' && !filteredWikis.includes(site.language + ' ' + site.origin)) {
    filteredWikis.push(site.language + ' ' + site.origin);

    let elementId = stringToId(site.language + '-' + site.origin);
    hiddenWikisRevealed[elementId] = false;

    // Using aside to avoid conflicts with website CSS and listeners:
    let searchRemovalNotice = document.createElement('aside');
    searchRemovalNotice.id = 'iwb-notice-' + elementId;
    searchRemovalNotice.classList.add('iwb-notice');
    let searchRemovalNoticeLink = document.createElement('a');
    searchRemovalNoticeLink.href = 'https://' + site.destination_base_url;
    searchRemovalNoticeLink.textContent = site.destination;
    searchRemovalNoticePretext = document.createTextNode('Indie Wiki Buddy has filtered out results from ' + site.origin + (site.language !== 'EN' ? ' (' + site.language + ')' : '') + '. Look for results from ');
    searchRemovalNoticePosttext = document.createTextNode(' instead.');
    searchRemovalNotice.appendChild(searchRemovalNoticePretext);
    searchRemovalNotice.appendChild(searchRemovalNoticeLink);
    searchRemovalNotice.appendChild(searchRemovalNoticePosttext);

    // Output container for result controls:
    let resultControls = document.createElement('div');
    resultControls.classList.add('iwb-result-controls');

    // Output link to show hidden results:
    let showResultsButton = document.createElement('div');
    showResultsButton.setAttribute('data-group', 'iwb-search-result-' + elementId);
    showResultsButton.innerText = 'Show filtered results';
    resultControls.appendChild(showResultsButton)
    showResultsButton.onclick = function (e) {
      if (e.target.textContent.includes('Show')) {
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

    searchRemovalNotice.appendChild(resultControls);

    switch (searchEngine) {
      case 'google':
        if (document.querySelector('#search')) {
          document.querySelector('#search').prepend(searchRemovalNotice);
        } else if (document.querySelector('#topstuff')) {
          document.querySelector('#topstuff').prepend(searchRemovalNotice);
        } else if (document.querySelector('#main')) {
          var el = document.querySelector('#main');
          if (el.querySelector('#main > div[data-hveid]')) {
            el.insertBefore(searchRemovalNotice, el.querySelector('div[data-hveid]'));
          } else {
            el.insertBefore(searchRemovalNotice, el.querySelector('div div[data-hveid]').parentElement);
          }
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

  if (!Array.from(searchResultContainer.classList).includes('iwb-hide')) {
    let elementId = stringToId(site.language + '-' + site.origin);
    searchResultContainer.classList.add('iwb-search-result-' + elementId);
    searchResultContainer.classList.add('iwb-hide');
    searchResultContainer.classList.add('iwb-detected');
    if (hiddenWikisRevealed[elementId]) {
      searchResultContainer.classList.add('iwb-show');
    }
    return 1;
  }

  return 0;
}

function getDistance(child, parent) {
  let distance = 0;

  while (parent !== child) {
    child = child.parentNode;
    distance++;
    if (!child) break;
  }

  return distance;
}

function findClosestElement(target, elements) {
  let closestElement = null;
  let closestDistance = Infinity;

  elements.forEach(element => {
    const distance = element?.contains(target) ? getDistance(target, element) : Infinity;

    if (distance < closestDistance) {
      closestDistance = distance;
      closestElement = element;
    }
  });

  return closestElement;
}

async function filterSearchResults(searchResults, searchEngine, storage) {
  let countFiltered = 0;

  for (let searchResult of searchResults) {
    try {
      // Check that result isn't within another result
      if (!searchResult.closest('.iwb-detected')) {
        searchResultLink = searchResult.href || '';

        if (!searchResultLink) {
          continue;
        }

        if (searchEngine === 'google') {
          // Break if image result:
          if (searchResultLink.includes('imgurl=')) {
            break;
          }

          // Skip if result doesn't include specific tags/attributes
          // This helps avoid capturing unintended image results
          if (!(
            searchResult.querySelector('h1') ||
            searchResult.querySelector('h3') ||
            searchResult.querySelector('cite') ||
            searchResult.querySelector("div[role='link']")))
          {
            searchResult.classList.add('iwb-detected');
            continue;
          }
        }

        let crossLanguageSetting = storage.crossLanguage || 'off';
        let matchingSite = await commonFunctionFindMatchingSite(searchResultLink, crossLanguageSetting);
        if (matchingSite) {
          // Get user's settings for the wiki
          let id = matchingSite['id'];
          let searchFilterSetting = 'replace';
          if (storage.searchEngineSettings && storage.searchEngineSettings[id]) {
            searchFilterSetting = storage.searchEngineSettings[id];
          } else if (storage.defaultSearchAction) {
            searchFilterSetting = storage.defaultSearchAction;
          }

          if (searchFilterSetting !== 'disabled') {
            // Output stylesheet if not already done
            if (filteredWikis.length === 0) {
              // Wait for head to be available
              const headElement = document.querySelector('head');
              if (headElement && !document.querySelector('.iwb-styles')) {
                insertCSS();
              } else {
                const docObserver = new MutationObserver((mutations, mutationInstance) => {
                  const headElement = document.querySelector('head');
                  if (headElement && !document.querySelector('.iwb-styles')) {
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

            let searchResultContainer = null;

            switch (searchEngine) {
              case 'google':
                const closestJsController = searchResult.closest('div[jscontroller]');
                const closestDataDiv = searchResult.closest('div[data-hveid].g') || searchResult.closest('div[data-hveid]');
                searchResultContainer = findClosestElement(searchResult, [closestJsController, closestDataDiv]);
                break;
              case 'bing':
                searchResultContainer = searchResult.closest('li.b_algo');
                break;
              case 'duckduckgo':
                searchResultContainer = searchResult.closest('li[data-layout], div.web-result');
                break;
              case 'brave':
                searchResultContainer = searchResult.closest('div.snippet');
                break;
              case 'ecosia':
                searchResultContainer = searchResult.closest('div.mainline__result-wrapper article div.result__body');
                break;
              case 'startpage':
                searchResultContainer = searchResult.closest('div.w-gl__result');
                break;
              case 'yahoo':
                searchResultContainer = searchResult.closest('#web > ol > li div.itm .exp, #web > ol > li div.algo, #web > ol > li, section.algo');
                break;
              default:
            }

            if (searchResultContainer) {
              if (searchFilterSetting === 'hide') {
                countFiltered += hideSearchResults(searchResultContainer, searchEngine, matchingSite, storage['hiddenResultsBanner']);
              } else {
                countFiltered += replaceSearchResults(searchResultContainer, matchingSite, searchResultLink);
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
}

function main(mutations = null, observer = null) {
  if (observer) {
    observer.disconnect();
  }
  chrome.storage.local.get((localStorage) => {
    chrome.storage.sync.get((syncStorage) => {
      const storage = { ...syncStorage, ...localStorage };
      // Check if extension is on:
      if ((storage.power ?? 'on') === 'on') {
        // Determine which search engine we're on
        if (currentURL.hostname.includes('www.google.')) {
          // Function to filter search results in Google
          function filterGoogle() {
            let searchResults = document.querySelectorAll("div[data-hveid] a[href*='.fandom.com/']:first-of-type:not([role='button']):not([target='_self']), div[data-hveid] a[href*='.fextralife.com/']:first-of-type:not([role='button']):not([target='_self'])");
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
        } else if (currentURL.hostname.endsWith('.bing.com')) {
          // Function to filter search results in Bing
          function filterBing() {
            let searchResultsEncoded = document.querySelectorAll('li.b_algo a');
            let searchResults = [];
            searchResultsEncoded.forEach((searchResult) => {
              if (searchResult.href) {
                const encodedLink = new URL(searchResult.href);
                if (encodedLink.href.includes('https://www.bing.com/ck/')) {
                  try {
                    let decodedLink = base64Decode(encodedLink.searchParams.get('u').replace(/^a1/, ''));
                    if (decodedLink.includes('fandom.com') || decodedLink.includes('fextralife.com')) {
                      searchResult.href = decodedLink;
                      searchResults.push(searchResult);
                    }
                  } catch (e) {
                    console.log('Indie Wiki Buddy failed to parse Bing link with error: ', e);
                  }
                } else {
                  searchResults.push(searchResult);
                }
              }
            });

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
            let searchResults = Array.from(document.querySelectorAll('section.mainline .result__title a.result__link')).filter(el => el.href?.includes('fandom.com') || el.href?.includes('fextralife.com'));
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
            let searchResults = Array.from(document.querySelectorAll('a.result-link')).filter(el => el.href?.includes('fandom.com') || el.href?.includes('fextralife.com'));
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
            let searchResults = Array.from(document.querySelectorAll('#web > ol > li a:not(.thmb), #main-algo section.algo a:not(.thmb)')).filter(el => el.href?.includes('fandom.com') || el.href?.includes('fextralife.com'));
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
    });
  });
}

main();