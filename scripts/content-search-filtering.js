/// <reference lib="esnext" />
/// <reference path="common-functions.js" />
// @ts-check

const currentURL = new URL(document.location.href);
let hiddenWikisRevealed = {};

/** @type {{url: string, isNonIndie: boolean, siteData: SiteData, container: HTMLElement, anchor: HTMLAnchorElement}[]} */
const processedCache = [];

/** @type {string} */
let searchEngine;

// todo: write type info
/** @type {Record<string, any>} */
let storage;

/** @param {string} text */
function base64Decode(text) {
  text = text.replace(/\s+/g, '').replace(/\-/g, '+').replace(/\_/g, '/');
  return decodeURIComponent(Array.prototype.map.call(atob(text), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
}

/**
 * Function to create an observer to watch for mutations on search pages
 * This is used for search engines that paginate via JavaScript,
 * or overwrite their results and remove IWB's elements
 * @param {MutationCallback} callback
 */
function addDOMChangeObserver(callback) {
  const domObserver = new MutationObserver(callback);
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

/**
 * Function to convert strings to consistent IDs
 * Used to convert wiki names to element IDs
 * @param {string} string
 */
function stringToId(string) {
  return string.replaceAll(' ', '-').replaceAll("'", '').replace(/\W/g, '').toLowerCase();
}

/**
 * @param {string} str
 * @param {string} sub
 */
function removeSubstringIfAtEnd(str, sub) {
  if (sub && str.endsWith(sub)) {
    return str.slice(0, -sub.length);
  }
  return str;
}

/**
 * Function to show a chip/banner at the top of the container with a redirected url, and disable the original link/result.
 * @param {HTMLElement} searchResultContainer
 * @param {SiteData} wikiInfo
 * @param {string} link
 */
function replaceSearchResult(searchResultContainer, wikiInfo, link) {
  let originArticle = commonFunctionGetOriginArticle(link, wikiInfo);
  let destinationArticle = commonFunctionGetDestinationArticle(wikiInfo, originArticle);
  let newURL = commonFunctionGetNewURL(link, wikiInfo);

  if (searchResultContainer && !searchResultContainer.querySelector('.iwb-new-link') && !searchResultContainer.querySelector('.iwb-detected')) {
    searchResultContainer.classList.add('iwb-detected');
    searchResultContainer.classList.add('iwb-disavow');
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
    indieResultFavicon.width = 16;
    indieResultFavicon.height = 16;
    indieResultFavicon.src = extensionAPI.runtime.getURL('favicons/' + wikiInfo.language.toLowerCase() + '/' + wikiInfo.destination_icon);
    indieResultFaviconContainer.append(indieResultFavicon);
    let indieResultText = document.createElement('span');
    if (originArticle && decodeURIComponent(originArticle) !== wikiInfo['origin_main_page']) {
      let destinationArticleTitle = removeSubstringIfAtEnd(destinationArticle, wikiInfo['destination_content_suffix'])
        .replace(wikiInfo['destination_content_prefix'], '')
        .replaceAll('_', ' ');

      // Decode article
      destinationArticleTitle = decodeURIComponent(destinationArticleTitle);

      if (wikiInfo['language'] === 'EN' && link.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
        indieResultText.innerText = extensionAPI.i18n.getMessage('searchResultLookupEnglish', [destinationArticleTitle, wikiInfo.destination]);
      } else {
        indieResultText.innerText = extensionAPI.i18n.getMessage('searchResultLookup', [destinationArticleTitle, wikiInfo.destination]);
      }
    } else {
      if (wikiInfo['language'] === 'EN' && link.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
        indieResultText.innerText = extensionAPI.i18n.getMessage('searchResultVisitEnglish', [wikiInfo.destination]);
      } else {
        indieResultText.innerText = extensionAPI.i18n.getMessage('searchResultVisit', [wikiInfo.destination]);
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
    enableResultButton.innerText = extensionAPI.i18n.getMessage('searchResultReenable');
    resultControls.prepend(enableResultButton);

    enableResultButton.addEventListener('click', e => {
      const target = /** @type {HTMLDivElement} */ (e.target);
      target.closest('.iwb-disavow')?.classList.remove('iwb-disavow');
      target.classList.add('iwb-hide');
    });

    indieContainer.appendChild(indieResultLink);
    indieContainer.appendChild(resultControls);
    searchResultContainer.prepend(indieContainer);

    return 1;
  }
  return 0;
}

/**
 * @param {HTMLElement} element
 */
function mountToTopOfSearchResults(element) {
  switch (searchEngine) {
      case 'google':
        if (document.querySelector('#search')) {
          document.querySelector('#search').prepend(element);
        } else if (document.querySelector('#topstuff')) {
          document.querySelector('#topstuff').prepend(element);
        } else if (document.querySelector('#main')) {
          var el = document.querySelector('#main');
          if (el.querySelector('#main > div[data-hveid]')) {
            el.insertBefore(element, el.querySelector('div[data-hveid]'));
          } else {
            el.insertBefore(element, el.querySelector('div div[data-hveid]').parentElement);
          }
        }
        break;
      case 'bing':
        var li = document.createElement('li');
        li.appendChild(element);
        document.querySelector('#b_results').prepend(li);
        break;
      case 'duckduckgo':
        if (document.getElementById('web_content_wrapper')) {
          var li = document.createElement('li');
          li.appendChild(element);
          document.querySelector('#web_content_wrapper ol').prepend(li);
        } else {
          document.getElementById('links').prepend(element);
        }
        break;
      case 'brave':
        document.getElementById('results').prepend(element);
        break;
      case 'ecosia':
        document.querySelector('section.mainline').prepend(element);
        break;
      case 'qwant':
        document.querySelector('div[data-testid=sectionWeb]').prepend(element);
        break;
      case 'startpage':
        document.querySelector('#main').prepend(element);
        break;
      case 'yandex':
        var searchResultsContainer = document.querySelector('#search-result') || document.querySelector('.main__content .content');
        searchResultsContainer?.prepend(element);
        break;
      case 'yahoo':
        if (document.querySelector('#web > ol')) {
          var li = document.createElement('li');
          li.appendChild(element);
          document.querySelector('#web > ol').prepend(li);
        } else {
          document.querySelector('#main-algo').prepend(element);
        }
        break;
      case 'kagi':
        document.querySelector('#main').prepend(element);
        break;
      case 'searxng':
        document.querySelector('#results').prepend(element);
        break;
      case 'whoogle':
        document.querySelector('#main').prepend(element);
        break;
      default:
    }
  };

/**
 * Shows a banner at the top of the search results page for a given wiki type, if one is not already present.
 * @param {SiteData} wikiInfo
 */
function mountSearchBanner(wikiInfo) {
  // Insert search result removal notice, if enabled and not already injected
  let elementId = stringToId(wikiInfo.language + '-' + wikiInfo.origin);
  if (!document.getElementById('iwb-notice-' + elementId)) {
    hiddenWikisRevealed[elementId] = false;

    // Using aside to avoid conflicts with website CSS and listeners:
    let searchRemovalNotice = document.createElement('aside');
    searchRemovalNotice.id = 'iwb-notice-' + elementId;
    searchRemovalNotice.classList.add('iwb-notice');
    let searchRemovalNoticeLink = document.createElement('a');
    searchRemovalNoticeLink.href = 'https://' + wikiInfo.destination_base_url;
    searchRemovalNoticeLink.textContent = wikiInfo.destination;
    const searchRemovalNoticeText = extensionAPI.i18n.getMessage('searchRemovalNotice', [
      wikiInfo.origin + (wikiInfo.language !== 'EN' ? ' (' + wikiInfo.language + ')' : ''),
      'LINK_PLACEHOLDER',
    ]);
    const searchRemovalNoticeTextParts = searchRemovalNoticeText.split('LINK_PLACEHOLDER');
    const searchRemovalNoticeFragment = document.createDocumentFragment();
    searchRemovalNoticeFragment.appendChild(document.createTextNode(searchRemovalNoticeTextParts[0]));
    searchRemovalNoticeFragment.appendChild(searchRemovalNoticeLink);
    searchRemovalNoticeFragment.appendChild(document.createTextNode(searchRemovalNoticeTextParts[1]));
    searchRemovalNotice.appendChild(searchRemovalNoticeFragment);

    // Output container for result controls:
    let resultControls = document.createElement('div');
    resultControls.classList.add('iwb-result-controls');

    // Output link to show hidden results:
    let showResultsButton = document.createElement('div');
    showResultsButton.setAttribute('data-group', 'iwb-search-result-' + elementId);
    showResultsButton.innerText = extensionAPI.i18n.getMessage('searchFilteredResultsShow');
    resultControls.appendChild(showResultsButton);

    /** @param {MouseEvent & { target: HTMLDivElement, currentTarget: HTMLDivElement }} e */
    showResultsButton.onclick = function (e) {
      if (e.target.textContent.includes(extensionAPI.i18n.getMessage('searchFilteredResultsShow'))) {
        e.target.textContent = extensionAPI.i18n.getMessage('searchFilteredResultsHide');
        hiddenWikisRevealed[elementId] = true;
        const selector = e.currentTarget.dataset.group;
        document.querySelectorAll('.' + selector).forEach(el => {
          el.classList.remove('iwb-hide');
          el.classList.add('iwb-show');
        });
      } else {
        e.target.textContent = extensionAPI.i18n.getMessage('searchFilteredResultsShow');
        hiddenWikisRevealed[elementId] = false;
        const selector = e.currentTarget.dataset.group;
        document.querySelectorAll('.' + selector).forEach(el => {
          el.classList.remove('iwb-show');
          el.classList.add('iwb-hide');
        });
      }
    };

    searchRemovalNotice.appendChild(resultControls);

    mountToTopOfSearchResults(searchRemovalNotice);
  }
}

/**
 * @param {HTMLElement} searchResultContainer
 * @param {SiteData} wikiInfo
 * @param {string} bannerState
 */
function hideSearchResults(searchResultContainer, wikiInfo, bannerState = 'on') {
  let elementId = stringToId(wikiInfo.language + '-' + wikiInfo.origin);
  searchResultContainer.classList.add('iwb-search-result-' + elementId);
  const revealed = hiddenWikisRevealed[elementId] ?? false;
  searchResultContainer.classList.toggle('iwb-hide', !revealed);
  searchResultContainer.classList.toggle('iwb-show', revealed);

  if (bannerState === 'on') {
    mountSearchBanner(wikiInfo);
  }

  return 1;
}

/**
 * @param {HTMLElement | ParentNode} child
 * @param {HTMLElement} parent
 */
function getDistance(child, parent) {
  let distance = 0;

  while (parent !== child) {
    if (!child.parentNode) break;
    child = child.parentNode;
    distance++;
  }

  return distance;
}

/**
 * @param {HTMLElement} target
 * @param {(HTMLElement | null)[]} elements
 * @returns {HTMLElement | null}
 */
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

/**
 * Returns the container element for a search result, searching up the tree from the anchor element.
 * @param {string} searchEngine
 * @param {HTMLElement} searchResult
 * @returns {HTMLElement | null}
 */
function getResultContainer(searchEngine, searchResult) {
  let searchResultContainer = null;

  switch (searchEngine) {
    case 'google':
      /** @type {HTMLElement} */
      const closestJsController = searchResult.closest('div[jscontroller]');
      /** @type {HTMLElement} */
      const closestDataDiv = searchResult.closest('div[data-hveid].g') || searchResult.closest('div[data-hveid]');
      // For Google search results, get the parentNode of the result container as that tends to be more reliable:
      searchResultContainer = findClosestElement(searchResult, [closestJsController, closestDataDiv]).parentElement;
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
      searchResultContainer = searchResult.closest('div.mainline__result-wrapper article > div.result__body');
      break;
    case 'qwant':
      if (searchResult.closest('div[data-testid=webResult]')) {
        const cssQuery = 'div[data-testid=webResult]';
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
  }

  // @ts-ignore: searchResultContainer would always be of type HTMLElement
  return searchResultContainer;
}

/**
 * @param {SiteData} wikiInfo
 * @param {HTMLAnchorElement} anchorElement
 */
function filterSearchResult(wikiInfo, anchorElement) {
  // Get user's settings for the wiki
  let id = wikiInfo.id;
  let searchFilterSetting = 'replace';
  let searchEngineSettings = storage.searchEngineSettings ?? {};
  if (searchEngineSettings[id]) {
    searchFilterSetting = searchEngineSettings[id];
  } else if (storage.defaultSearchAction) {
    searchFilterSetting = storage.defaultSearchAction;
  }

  let countFiltered = 0;

  // Get the containing element for the search result
  let searchResultContainer = getResultContainer(searchEngine, anchorElement);
  if (searchResultContainer) {
    // If this page from Fandom is the same as a re-ordered page, filter it out
    let searchResultLink = anchorElement.getAttribute('data-iwb-href') || anchorElement.href;
    let originArticle = commonFunctionGetOriginArticle(searchResultLink, wikiInfo);
    let destinationArticle = commonFunctionGetDestinationArticle(wikiInfo, originArticle);

    if (processedCache.find(({ url }) => url.match(
      // Match for destination URL with content path and article name
      new RegExp(
        `http(s)?://${wikiInfo.destination_base_url}${wikiInfo.destination_content_path}${decodeURI(destinationArticle)}$`
      )
    ))) {
      countFiltered += hideSearchResults(searchResultContainer, wikiInfo, 'off');
      console.debug(`Indie Wiki Buddy has hidden a result matching ${searchResultLink} because we re-ordered an indie wiki result with a matching article`);
    } else if (searchFilterSetting !== 'disabled') {
      if (searchFilterSetting === 'hide') {
        // Else, if the user has the preference set to hide search results, hide it indiscriminately
        countFiltered += hideSearchResults(searchResultContainer, wikiInfo, storage['hiddenResultsBanner']);
      } else {
        countFiltered += replaceSearchResult(searchResultContainer, wikiInfo, searchResultLink);
      }
    }
  }

  return countFiltered;
}

/**
 * Swaps two elements in the DOM WITHOUT changing their references
 * @param {HTMLElement} a
 * @param {HTMLElement} b
 */
function swapDOMElements(a, b) {
  let dummy = document.createElement('span');
  a.before(dummy);
  b.before(a);
  dummy.replaceWith(b);
}

/**
 * @param {HTMLAnchorElement[]} searchResults
 */
async function filterSearchResults(searchResults) {
  let countFiltered = 0;

  for (const searchResult of searchResults) {
    try {
      // Check that result isn't within another result
      if (!searchResult.closest('.iwb-detected') && !searchResult.closest('.iwb-detected')?.querySelector('.iwb-new-link')) {
        let searchResultLink = searchResult.getAttribute('data-iwb-href') ?? searchResult.href ?? '';
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
            searchResult.closest('h1') ||
            searchResult.closest('h3') ||
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
        const searchResultContainer = getResultContainer(searchEngine, searchResult);

        // Handle source -> destination filtering, i.e. non-indie/commercial wikis
        let matchingNonIndieWiki = await commonFunctionFindMatchingSite(searchResultLink, crossLanguageSetting);
        if (matchingNonIndieWiki) {
          console.debug('Indie Wiki Buddy: Filtering search result:', searchResultLink);
          // Site found in db, process search result
          countFiltered += filterSearchResult(matchingNonIndieWiki, searchResult);
          processedCache.push({
            url: searchResultLink,
            isNonIndie: true,
            siteData: matchingNonIndieWiki,
            container: searchResultContainer,
            anchor: searchResult,
          });
        } else {
          // handle destination -> source, i.e. indie wikis
          let matchingIndieWiki = await commonFunctionFindMatchingSite(searchResultLink, crossLanguageSetting, true);

          if (matchingIndieWiki) {
            console.debug('Indie Wiki Buddy: Found indie wiki for search result:', searchResultLink);
            const cacheInfo = {
              url: searchResultLink,
              isNonIndie: false,
              siteData: matchingIndieWiki,
              container: searchResultContainer,
              anchor: searchResult,
            };

            if ((storage.reorderResults ?? 'on') == 'on' && processedCache[0]?.isNonIndie) {
              console.debug('Indie Wiki Buddy: Reordering search result:', searchResultLink);
              swapDOMElements(searchResultContainer, processedCache[0].container);
              // now swap the cache to not reorder the same element multiple times
              const old = processedCache[0];
              processedCache[0] = cacheInfo;
              processedCache.push(old);

              // re-filter the element that was swapped
              countFiltered += filterSearchResult(old.siteData, old.anchor);
            } else {
              processedCache.push(cacheInfo);
            };
          }
        }
        searchResultContainer?.classList.add('iwb-detected');
      }
    } catch (e) {
      console.error('Indie Wiki Buddy failed to properly parse search results with error: ', e);
    }
    // prevent re-filtering
  };


  // If any results were filtered, update search filter count
  if (countFiltered > 0) {
    extensionAPI.storage.sync.set({ 'countSearchFilters': (storage.countSearchFilters ?? 0) + countFiltered });
  }
}

/**
 * Detects whether a given link is to a supported non-indie wikifarm site
 * @param {string} link
 */
function isNonIndieSite(link) {
  return link?.includes('.fandom.com') || link?.includes('.wiki.fextralife.com') || link?.includes('.neoseeker.com/wiki/');
}

/**
 * @param {HTMLAnchorElement[] | undefined} newAnchors
 */
function filterAnchors(newAnchors) {
  if (newAnchors == undefined || newAnchors.length === 0) return;

  // Determine which search engine we're on
  switch (searchEngine) {
    case 'google': {
      // Query Google results and rewrite HREFs when Google uses middleman links (i.e. google.com/url?q=)
      let searchResults = newAnchors.filter(e => e.matches("div[data-hveid] a:first-of-type:not([role='button']):not([target='_self'])"));
      searchResults = searchResults.filter(
        e =>
          !e.closest(
            'g-section-with-header, div[aria-expanded], div[data-q], div[data-g], div[data-minw], div[data-num-cols], div[data-docid], div[data-lpage]'
          )
      );
      searchResults.forEach(
        /** @param {HTMLAnchorElement} searchResult */ searchResult => {
          if (searchResult.href) {
            const link = new URL(searchResult.href);
            if (link.href.includes('https://www.google.com/url')) {
              try {
                const destinationLink = link.searchParams.get('url') || link.searchParams.get('q');
                if (destinationLink) {
                  searchResult.setAttribute('data-iwb-href', destinationLink);
                }
              } catch (e) {
                throw new Error('Indie Wiki Buddy failed to parse Google link with error: ' + e);
              }
            }
          }
        }
      );

      filterSearchResults(searchResults);
      break;
    }
    case 'duckduckgo': {
      const searchResults = newAnchors.filter(e => e.matches('h2 > a'));

      filterSearchResults(searchResults);
      break;
    }
    case 'bing': {
      const searchResults = newAnchors.filter(e => e.matches('li.b_algo h2 a, li.b_algo .b_algoheader a'));
      searchResults.forEach(
        /** @param {HTMLAnchorElement} searchResult */
        searchResult => {
          if (searchResult.href) {
            const encodedLink = new URL(searchResult.href);
            if (encodedLink.href.includes('https://www.bing.com/ck/')) {
              try {
                const uVal = encodedLink.searchParams.get('u');
                if (uVal) {
                  const decodedLink = base64Decode(uVal.replace(/^a1/, ''));
                  searchResult.setAttribute('data-iwb-href', decodedLink);
                }
              } catch (e) {
                console.log('Indie Wiki Buddy failed to parse Bing link with error: ', e);
              }
            }
          }
        }
      );

      filterSearchResults(searchResults);
      break;
    }
    case 'brave': {
      const searchResults = newAnchors.filter(e => e.matches('div.snippet[data-type="web"] a'));
      filterSearchResults(searchResults);
      break;
    }
    case 'ecosia': {
      const searchResults = newAnchors.filter(e => e.matches('section.mainline .result__title a.result__link'));
      filterSearchResults(searchResults);
      break;
    }
    case 'qwant': {
      const searchResults = newAnchors.filter(e => e.matches('a.external'));
      filterSearchResults(searchResults);
      break;
    }
    case 'startpage': {
      const searchResults = newAnchors.filter(e => e.matches('a.result-link'));
      filterSearchResults(searchResults);
      break;
    }
    case 'yandex': {
      const searchResults = newAnchors.filter(e => e.matches('li[data-cid] a.link, li[data-cid] a.Link, .serp-item a.link, .serp-item a.Link, .MMOrganicSnippet a, .viewer-snippet a'));
      filterSearchResults(searchResults);
      break;
    }

    case 'yahoo': {
      const searchResults = newAnchors.filter(e => e.matches('#web > ol > li a:not(.thmb), #main-algo section.algo a:not(.thmb)'));
      searchResults.forEach(
        /** @param {HTMLAnchorElement} searchResult */
        searchResult => {
          if (searchResult.href) {
            if (searchResult.href.includes('https://r.search.yahoo.com/')) {
              try {
                // Extract the URL between "RU=" and "/RK="
                const embeddedUrlRegex = /RU=([^/]+)\/RK=/;
                const match = searchResult.href.match(embeddedUrlRegex);
                const extractedURL = decodeURIComponent(match && match[1]);

                if (extractedURL) searchResult.setAttribute('data-iwb-href', extractedURL);

              } catch (e) {
                console.error('Indie Wiki Buddy failed to parse Yahoo link with error: ', e);
              }
            }
          }
        }
      );

      filterSearchResults(searchResults);
      break;
    }
    case 'kagi': {
      const searchResults = newAnchors.filter(e => e.matches('h3>a, a.__sri-url'));
      filterSearchResults(searchResults);
      break;
    }
    default: {
      if (storage.customSearchEngines) {
        function filterSearXNG() {
          const searchResults = newAnchors.filter(e => e.matches('h3>a'));
          filterSearchResults(searchResults);
        }

        function filterWhoogle() {
          const searchResults = newAnchors.filter(e => e.matches('div>a'));
          filterSearchResults(searchResults);
        }

        /** @param {string} searchEngine */
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

/** @type {HTMLElement} */
let pageChangeDetector = null;

function checkRevalidate() {
  if (pageChangeDetector == null || !document.body.contains(pageChangeDetector)) {
    processedCache.length = 0;

    // mount dummy element to detect page changes
    pageChangeDetector = document.createElement('span');
    pageChangeDetector.id = 'iwb-page-change-detector';
    pageChangeDetector.style.display = 'none';
    try {
      mountToTopOfSearchResults(pageChangeDetector);
      // just in case, re-process search results
      console.debug('IWB: Reprocessing search results...');
      filterAnchors(Array.from(document.body?.querySelectorAll('a')));
    } catch (e) {
      // search results not mounted yet, so we wait until they exist.
      return;
    }
  }
}

/**
 * @param {MutationRecord[]} [mutations]
 * @param {MutationObserver} [observer]
 */
function filterMutations(mutations, observer) {
  // Check if *any* content has loaded (since we run at document start)
  if (document.body == undefined || mutations == undefined) return;
  checkRevalidate();


  const addedSubtrees = mutations.flatMap(mutation => Array.from(mutation.addedNodes));
  const newAnchors = /** @type {HTMLAnchorElement[]} */ (addedSubtrees
    .filter(node => node instanceof HTMLElement)
    .flatMap(node => (isAnchor(node) && node) || Array.from(node.querySelectorAll('a')))
  );

  filterAnchors(newAnchors);
}

/**
 * Decode the base64 encoded values in the storage object
 * @param {Record<string, any>} storage
 */
async function decompressStorage(storage) {
  const compressedKeys = ['searchEngineSettings', 'wikiSettings'];
  await Promise.all(
    compressedKeys.map(async key => {
      if (storage[key]) {
        storage[key] = await commonFunctionDecompressJSON(storage[key]);
      }
    })
  );

  return storage;
}

/**
 * Check if user has enabled filtering for the current search engine
 * If so, call startFiltering function to start filtering process
 * @param {string} _searchEngine
 */
function processSearchEngine(_searchEngine) {
  searchEngine = _searchEngine;
  console.debug('Indie Wiki Buddy: Processing search engine:', searchEngine);
  extensionAPI.runtime.sendMessage(
    { action: 'getStorage' },
    /** @param {Record<string, any>} _storage */ async _storage => {
      console.debug('IWB: Storage acquired.');
      storage = await decompressStorage(_storage ?? {});
      console.debug('IWB: storage decompressed.');
      const searchEngineToggles = storage.searchEngineToggles ?? {};
      if ((storage.power ?? 'on') != 'on') return;
      if (searchEngineToggles[searchEngine] === 'on' || !searchEngineToggles.hasOwnProperty(searchEngine)) {
        // catchup on any possible missed search results
        checkRevalidate();
        filterAnchors(Array.from(document.body?.querySelectorAll('a') ?? []));

        // start listening to DOM changes
        addDOMChangeObserver(filterMutations);
      }
    }
  );
}

// fill cache
void commonFunctionGetSiteDataByOrigin();

// Figure out which search engine we're on
if (currentURL.hostname.includes('www.google.')) {
  processSearchEngine('google');
} else if (currentURL.hostname.includes('duckduckgo.com') && (currentURL.search.includes('q=') || currentURL.pathname.includes('html'))) {
  processSearchEngine('duckduckgo');
} else if (currentURL.hostname.endsWith('.bing.com')) {
  processSearchEngine('bing');
} else if (currentURL.hostname.includes('search.brave.com')) {
  // todo: fix reordering behaving weirdly on descriptions
  processSearchEngine('brave');
} else if (currentURL.hostname.includes('ecosia.org')) {
  // todo: figure out what is causing race conditions to make elements disappear, and ecosia to crash
  window.addEventListener("load", () => processSearchEngine('ecosia'));
} else if (currentURL.hostname.includes('qwant.com')) {
  processSearchEngine('qwant');
} else if (currentURL.hostname.includes('startpage.com')) {
  processSearchEngine('startpage');
} else if (currentURL.hostname.includes('yandex.') || currentURL.hostname.includes('ya.ru')) {
  processSearchEngine('yandex');
} else if (currentURL.hostname.includes('yahoo.com')) {
  processSearchEngine('yahoo');
} else if (currentURL.hostname.includes('kagi.com')) {
  processSearchEngine('kagi');
}
