const currentURL = new URL(document.location);
let hiddenWikisRevealed = {};

function base64Decode(text) {
  text = text.replace(/\s+/g, '').replace(/\-/g, '+').replace(/\_/g, '/');
  return decodeURIComponent(Array.prototype.map.call(atob(text), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
}

// Function to create an observer to watch for mutations on search pages
// This is used for search engines that paginate via JavaScript,
// or overwrite their results and remove IWB's elements
function addDOMChangeObserver(callback, searchEngine, storage) {
  const config = {
    attributes: false,
    childList: true,
    subtree: true
  }

  const wrappedCallback = (mutations, observer) => {
    callback(searchEngine, storage, mutations, observer);
  };

  const domObserver = new MutationObserver(wrappedCallback);
  domObserver.observe(document.body, config);
}

// Function to convert strings to consistent IDs
// Used to convert wiki names to element IDs
function stringToId(string) {
  return string.replaceAll(' ', '-').replaceAll("'", '').replace(/\W/g, '').toLowerCase();
}

function removeSubstringIfAtEnd(str, sub) {
  if (sub && str.endsWith(sub)) {
    return str.slice(0, -sub.length);
  }
  return str;
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
    indieResultFavicon.src = extensionAPI.runtime.getURL('favicons/' + site.language.toLowerCase() + '/' + site.destination_icon);
    indieResultFaviconContainer.append(indieResultFavicon);
    let indieResultText = document.createElement('span');
    if (originArticle && decodeURIComponent(originArticle) !== site['origin_main_page']) {
      let destinationArticleTitle = removeSubstringIfAtEnd(destinationArticle, site['destination_content_suffix']).replace(site['destination_content_prefix'], '').replaceAll('_', ' ');
      
      // Decode article
      destinationArticleTitle = decodeURIComponent(destinationArticleTitle);

      if (site['language'] === 'EN' && link.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
        indieResultText.innerText = 'Look up "' + destinationArticleTitle + '" on ' + site.destination + ' (EN)';
      } else {
        indieResultText.innerText = 'Look up "' + destinationArticleTitle + '" on ' + site.destination;
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
  // Insert search result removal notice, if enabled and not already injected
  let elementId = stringToId(site.language + '-' + site.origin);
  if (showBanner === 'on' && !document.getElementById('iwb-notice-' + elementId)) {
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
      case 'qwant':
        document.querySelector('div[data-testid=sectionWeb]').prepend(searchRemovalNotice);
        break;
      case 'startpage':
        document.querySelector('#main').prepend(searchRemovalNotice);
        break;
      case 'yandex':
        var searchResultsContainer = document.querySelector('#search-result') || document.querySelector('.main__content .content');
        searchResultsContainer?.prepend(searchRemovalNotice);
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
      case 'kagi':
        document.querySelector('#main').prepend(searchRemovalNotice);
        break;
      case 'searxng':
        document.querySelector('#results').prepend(searchRemovalNotice);
        break;
      case 'whoogle':
        document.querySelector('#main').prepend(searchRemovalNotice);
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

function getSearchContainer(searchEngine, searchResult) {
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
    case 'qwant':
      if (searchResult.closest('div[data-testid=webResult]')) {
        cssQuery = 'div[data-testid=webResult]';
        searchResultContainer = searchResult.closest(cssQuery).parentElement;
      }
      break;
    case 'startpage':
      searchResultContainer = searchResult.closest('div.result, div.w-gl__result');
      break;
    case 'yandex':
      searchResultContainer = searchResult.closest('li[data-cid], .serp-item, .MMOrganicSnippet, .viewer-snippet');
      break;
    case 'yahoo':
      searchResultContainer = searchResult.closest('#web > ol > li div.itm .exp, #web > ol > li div.algo, #web > ol > li, section.algo');
      break;
    case 'kagi':
      searchResultContainer = searchResult.closest('div.search-result, div.__srgi');
      break;
    case 'searxng':
      searchResultContainer = searchResult.closest('article');
      break;
    case 'whoogle':
      searchResultContainer = searchResult.closest('#main>div>div, details>div>div>div>div>div>div.has-favicon');
      break;
    default:
  }

  return searchResultContainer;
}

async function filterSearchResult(matchingSite, searchResult, searchEngine, countFiltered, storage, reorderedHrefs) {
  // Get user's settings for the wiki
  let id = matchingSite['id'];
  let searchFilterSetting = 'replace';
  let searchEngineSettings = await commonFunctionDecompressJSON(storage.searchEngineSettings || {});
  if (searchEngineSettings[id]) {
    searchFilterSetting = searchEngineSettings[id];
  } else if (storage.defaultSearchAction) {
    searchFilterSetting = storage.defaultSearchAction;
  }

  const searchResultContainer = getSearchContainer(searchEngine, searchResult);

  if (searchResultContainer) {
    // If this page from Fandom is the same as a re-ordered page, filter it out
    let searchResultLink = searchResult.getAttribute('data-iwb-href') || searchResult.href;
    let originArticle = commonFunctionGetOriginArticle(searchResultLink, matchingSite);
    let destinationArticle = commonFunctionGetDestinationArticle(matchingSite, originArticle);

    if (reorderedHrefs.find((href) => href.match(
      // Match for destination URL with content path and article name
      new RegExp(
        `http(s)?://${matchingSite['destination_base_url']}${matchingSite['destination_content_path']}${decodeURI(destinationArticle)}$`
      )
    ))) {
      countFiltered += hideSearchResults(searchResultContainer, searchEngine, matchingSite, 'off');
      console.debug(`Indie Wiki Buddy has hidden a result matching ${searchResultLink} because we re-ordered an indie wiki result with a matching article`);
    } else if (searchFilterSetting !== 'disabled') {
      if (searchFilterSetting === 'hide') {
        // Else, if the user has the preference set to hide search results, hide it indiscriminately
        countFiltered += hideSearchResults(searchResultContainer, searchEngine, matchingSite, storage['hiddenResultsBanner']);
      } else {
        countFiltered += replaceSearchResults(searchResultContainer, matchingSite, searchResultLink);
      }
    }
  }

  return countFiltered;
}

async function reorderDestinationSearchResult(firstNonIndieResult, searchResult) {
  // Find containing element for non-indie result
  const nonIndieSearchResultContainer = getSearchContainer('google', firstNonIndieResult);

  // Find containing element for the indie search result
  const indieSearchResultContainer = getSearchContainer('google', searchResult);

  if (!indieSearchResultContainer || indieSearchResultContainer.classList.contains('iwb-reordered')) {
    return;
  }

  indieSearchResultContainer.classList.add('iwb-reordered');
  // Prepend search results to first Fandom/Fextra/Neoseeker result
  nonIndieSearchResultContainer.parentNode.prepend(indieSearchResultContainer);
}

async function reorderSearchResults(searchResults, searchEngine, storage) {
  const reorderResultsSetting = storage.reorderResults || 'on';
  if (reorderResultsSetting === 'off') return [];

  let reorderedHrefs = [];

  if (!document.body.classList.contains('iwb-reorder')) {
    document.body.classList.add('iwb-reorder');

    // Only support Google for now
    if (searchEngine !== 'google') return;

    // Get the first element in the results container
    const resultsFirstChild = document.querySelector('#rso div[data-hveid].g') ||
      document.querySelector('#main div[data-hveid].g') ||
      document.querySelector('#rso div[data-hveid] div[data-dsrp]') ||
      document.querySelector('#main div[data-hveid] div[data-dsrp]') ||
      document.querySelector('#rso div[data-hveid]') ||
      document.querySelector('#main div[data-hveid]');

    // Get the first Fandom/Fextralife/Neoseeker result, if it exists
    const nonIndieResults = Array.from(document.querySelectorAll(`div[data-hveid] a:first-of-type:not([role='button']):not([target='_self'])`)).filter(el => isNonIndieSite(el.href));
    const firstNonIndieResult = Array.from(nonIndieResults).filter((e) => !e.closest('g-section-with-header, div[aria-expanded], div[data-q], div[data-minw], div[data-num-cols], div[data-docid], div[data-lpage]'))[0];
    if (!resultsFirstChild || !firstNonIndieResult) return;

    searchResults.some((result, i) => {
      if (isNonIndieSite(result.href)) {
        searchResults.splice(0, i + 1);
        return true;
      }
      return false;
    });

    let crossLanguageSetting = storage.crossLanguage || 'off';
    let resultsToSort = [];

    for (const searchResult of searchResults) {
      try {
        if (searchResult.closest('.iwb-detected')) {
          continue;
        }

        const searchResultLink = searchResult.getAttribute('data-iwb-href') || searchResult.href || '';

        // Handle re-ordering of results to move destination results up the page
        let matchingDest = await commonFunctionFindMatchingSite(searchResultLink, crossLanguageSetting, true);
        if (matchingDest) {
          if (resultsFirstChild.contains(searchResult)) {
            // If this search result is inside the first child of the results container (aka, it's the first result),
            // and there is a matchingDest at this point, then an indie wiki is #1 on the search results page.
            // Therefore, we should abandon the search re-ordering.
            console.debug('Indie Wiki Buddy is not re-ordering results, as an indie wiki is already the first result.');
            break;
          }

          let searchEngineSettings = await commonFunctionDecompressJSON(storage.searchEngineSettings || {});
          if (searchEngineSettings[matchingDest.id] !== 'disabled') {
            resultsToSort.push(searchResult);
          }
        }
      } catch (e) {
        console.log('Indie Wiki Buddy failed to properly re-order search results with error: ' + e);
      }
    }

    // Reverse order of resultsToSort,
    // to restore top-down order.
    resultsToSort = resultsToSort.reverse();

    for (const searchResult of resultsToSort) {
      try {
        await reorderDestinationSearchResult(firstNonIndieResult, searchResult);
        reorderedHrefs.push(searchResult.getAttribute('data-iwb-href') || searchResult.href);
      } catch (e) {
        console.log('Indie Wiki Buddy failed to properly re-order search results with error: ' + e);
      }
    }
  }

  return reorderedHrefs;
}

async function filterSearchResults(searchResults, searchEngine, storage, reorderedHrefs = []) {
  let countFiltered = 0;

  for (const searchResult of searchResults) {
    try {
      // Check that result isn't within another result
      if (!searchResult.closest('.iwb-detected') || !searchResult.closest('.iwb-detected')?.querySelector('.iwb-new-link')) {
        let searchResultLink = searchResult.getAttribute('data-iwb-href') || searchResult.href || '';

        if (!searchResultLink) {
          continue;
        }

        if (searchEngine === 'google') {
          // Break if image result:
          if (searchResultLink.includes('imgurl=')) {
            continue;
          }

          // Skip if result doesn't include specific tags/attributes
          // This helps avoid capturing unintended image results
          if (!(
            searchResult.querySelector('h1') ||
            searchResult.querySelector('h3') ||
            searchResult.querySelector('cite') ||
            searchResult.querySelector("div[role='link']"))) {
            searchResult.classList.add('iwb-detected');
            continue;
          }
        }

        let crossLanguageSetting = storage.crossLanguage || 'off';

        // Handle source -> destination filtering
        let matchingSource = await commonFunctionFindMatchingSite(searchResultLink, crossLanguageSetting);
        if (matchingSource) {
          countFiltered = await filterSearchResult(matchingSource, searchResult, searchEngine, countFiltered, storage, reorderedHrefs);
        }
      }
    } catch (e) {
      console.log('Indie Wiki Buddy failed to properly parse search results with error: ' + e);
    }
  };

  // Add location observer to check for additional mutations
  addDOMChangeObserver(startFiltering, searchEngine, storage);

  // If any results were filtered, update search filter count
  if (countFiltered > 0) {
    extensionAPI.storage.sync.set({ 'countSearchFilters': (storage.countSearchFilters ?? 0) + countFiltered });
  }
}

// Detects whether a given link is to a supported non-indie wikifarm site
function isNonIndieSite(link) {
  return link?.includes('.fandom.com') || link?.includes('.wiki.fextralife.com') || link?.includes('.neoseeker.com/wiki/');
}

function startFiltering(searchEngine, storage, mutations = null, observer = null) {
  if (observer) {
    observer.disconnect();
  }

  // Check if extension is on:
  if ((storage.power ?? 'on') === 'on') {
    // Determine which search engine we're on
    switch (searchEngine) {
      case 'google':
        // Query Google results and rewrite HREFs when Google uses middleman links (i.e. google.com/url?q=)
        let searchResults = document.querySelectorAll("div[data-hveid] a:first-of-type:not([role='button']):not([target='_self'])");
        searchResults.forEach((searchResult) => {
          if (searchResult.href) {
            const link = new URL(searchResult.href);
            if (link.href.includes('https://www.google.com/url')) {
              try {
                const destinationLink = link.searchParams.get('url') || link.searchParams.get('q');
                searchResult.setAttribute('data-iwb-href', destinationLink);
              } catch (e) {
                console.log('Indie Wiki Buddy failed to parse Google link with error: ', e);
              }
            }
          }
        });

        // Function to filter search results in Google
        function filterGoogle(reorderedHrefs) {
          let searchResults = Array.from(document.querySelectorAll(`div[data-hveid] a:first-of-type:not([role='button']):not([target='_self'])`)).filter(el => isNonIndieSite(el.href));

          filterSearchResults(searchResults, 'google', storage, reorderedHrefs);
        }

        async function reorderGoogle() {
          let searchResults = document.querySelectorAll("div[data-hveid] a:first-of-type:not([role='button']):not([target='_self'])");
          // Remove any matches that are not "standard" search results - this could've been done with :has() but limited browser support right now
          searchResults = Array.from(searchResults).filter((e) => !e.closest('g-section-with-header, div[aria-expanded], div[data-q], div[data-minw], div[data-num-cols], div[data-docid], div[data-lpage]'));

          return await reorderSearchResults(searchResults, 'google', storage);
        }

        reorderGoogle().then((r) => {
          // Filtering happens after re-ordering, so that we can filter anything that matches what we re-ordered
          filterGoogle(r);
        });
        break;
      
      case 'duckduckgo':
        // Function to filter search results in DuckDuckGo
        function filterDuckDuckGo() {
          let searchResults = Array.from(document.querySelectorAll('h2>a')).filter(el => isNonIndieSite(el.href));
          filterSearchResults(searchResults, 'duckduckgo', storage);
        }

        filterDuckDuckGo();
        break;
      
      case 'bing':
        // Function to filter search results in Bing
        function filterBing() {
          let searchResultsEncoded = document.querySelectorAll('li.b_algo h2 a, li.b_algo .b_algoheader a');
          let searchResults = [];
          searchResultsEncoded.forEach((searchResult) => {
            if (searchResult.href) {
              const encodedLink = new URL(searchResult.href);
              if (encodedLink.href.includes('https://www.bing.com/ck/')) {
                try {
                  let decodedLink = base64Decode(encodedLink.searchParams.get('u').replace(/^a1/, ''));
                  if (isNonIndieSite(decodedLink)) {
                    searchResult.setAttribute('data-iwb-href', decodedLink);
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

        filterBing();
        break;
      
      case 'brave':
        // Function to filter search results in Brave
        function filterBrave() {
          let searchResults = Array.from(document.querySelectorAll('div.snippet[data-type="web"] a')).filter(el => isNonIndieSite(el.href));
          filterSearchResults(searchResults, 'brave', storage);
        }

        filterBrave();
        break;
      
      case 'ecosia':
        // Function to filter search results in Ecosia
        function filterEcosia() {
          let searchResults = Array.from(document.querySelectorAll('section.mainline .result__title a.result__link')).filter(el => isNonIndieSite(el.href));
          filterSearchResults(searchResults, 'ecosia', storage);
        }

        filterEcosia();
        break;
      
      case 'qwant':
        // Function to filter search results in Qwant
        function filterQwant() {
          let searchResults = Array.from(document.querySelectorAll('a.external')).filter(el => isNonIndieSite(el.href));
          filterSearchResults(searchResults, 'qwant', storage);
        }

        filterQwant();
        break;
      
      case 'startpage':
        // Function to filter search results in Startpage
        function filterStartpage() {
          let searchResults = Array.from(document.querySelectorAll('a.result-link')).filter(el => isNonIndieSite(el.href));
          filterSearchResults(searchResults, 'startpage', storage);
        }

        filterStartpage();
        break;
      
      case 'yandex':
        // Function to filter search results in Yandex
        function filterYandex() {
          let searchResults = Array.from(document.querySelectorAll('li[data-cid] a.link, li[data-cid] a.Link, .serp-item a.link, .serp-item a.Link, .MMOrganicSnippet a, .viewer-snippet a')).filter(el => isNonIndieSite(el.href));
          filterSearchResults(searchResults, 'yandex', storage);
        }

        filterYandex();
        break;
      
      case 'yahoo':
        // Function to filter search results in Yahoo
        function filterYahoo() {
          let searchResultsEncoded = document.querySelectorAll('#web > ol > li a:not(.thmb), #main-algo section.algo a:not(.thmb)');
          let searchResults = [];
          searchResultsEncoded.forEach((searchResult) => {
            if (searchResult.href) {
              if (searchResult.href.includes('https://r.search.yahoo.com/')) {
                try {
                  // Extract the URL between "RU=" and "/RK="
                  const embeddedUrlRegex = /RU=([^/]+)\/RK=/;
                  const match = searchResult.href.match(embeddedUrlRegex);
                  const extractedURL = decodeURIComponent(match && match[1]);

                  if (isNonIndieSite(extractedURL)) {
                    searchResult.setAttribute('data-iwb-href', extractedURL);
                    searchResults.push(searchResult);
                  }
                } catch (e) {
                  console.log('Indie Wiki Buddy failed to parse Yahoo link with error: ', e);
                }
              } else {
                searchResults.push(searchResult);
              }
            }
          });

          filterSearchResults(searchResults, 'yahoo', storage);
        }

        filterYahoo();
        break;
      
      case 'kagi':
        // Function to filter search results in Kagi
        function filterKagi() {
          let searchResults = Array.from(document.querySelectorAll('h3>a, a.__sri-url')).filter(el => isNonIndieSite(el.href));
          filterSearchResults(searchResults, 'kagi', storage);
        }

        filterKagi();
        break;
      
      default:
        if (storage.customSearchEngines) {
          function filterSearXNG() {
            let searchResults = Array.from(document.querySelectorAll('h3>a')).filter(el => isNonIndieSite(el.href));
            filterSearchResults(searchResults, 'searxng', storage);
          }

          function filterWhoogle() {
            let searchResults = Array.from(document.querySelectorAll('div>a')).filter(el => isNonIndieSite(el.href));
            filterSearchResults(searchResults, 'whoogle', storage);
          }

          function filter(searchEngine) {
            if (searchEngine === 'searxng') {
              filterSearXNG();
            } else if (searchEngine === 'whoogle') {
              filterWhoogle();
            }
          }

          let customSearchEngines = storage.customSearchEngines;
          if (customSearchEngines[currentURL.hostname]) {
            let customSearchEnginePreset = customSearchEngines[currentURL.hostname];
            filter(customSearchEnginePreset);
          }
        }
    }
  }
}

// Check if user has enabled filtering for the current search engine
// If so, call startFiltering function to start filtering process
function checkIfEnabled(searchEngine) {
  extensionAPI.runtime.sendMessage({ action: 'getStorage' }, (storage) => {
    searchEngineToggles = storage.searchEngineToggles || {};
    if (searchEngineToggles[searchEngine] === 'on' || !searchEngineToggles.hasOwnProperty(searchEngine)) {
      startFiltering(searchEngine, storage);
    }
  });
}

// Figure out which search engine we're on
if (currentURL.hostname.includes('www.google.')) {
  checkIfEnabled('google');
} else if (currentURL.hostname.includes('duckduckgo.com') && (currentURL.search.includes('q=') || currentURL.pathname.includes('html'))) {
  checkIfEnabled('duckduckgo');
} else if (currentURL.hostname.endsWith('.bing.com')) {
  checkIfEnabled('bing');
} else if (currentURL.hostname.includes('search.brave.com')) {
  checkIfEnabled('brave');
} else if (currentURL.hostname.includes('ecosia.org')) {
  checkIfEnabled('ecosia');
} else if (currentURL.hostname.includes('qwant.com')) {
  checkIfEnabled('qwant');
} else if (currentURL.hostname.includes('startpage.com')) {
  checkIfEnabled('startpage');
} else if (currentURL.hostname.includes('yandex.') || currentURL.hostname.includes('ya.ru')) {
  checkIfEnabled('yandex');
} else if (currentURL.hostname.includes('yahoo.com')) {
  checkIfEnabled('yahoo');
} else if (currentURL.hostname.includes('kagi.com')) {
  checkIfEnabled('kagi');
}
