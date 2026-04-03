// Static imports do not work in content scripts, but dynamic imports do.
// By dynamically importing the entire main script from web_accessible_resources,
// the main script can successfully resolve its own static imports.
//
// Based on https://stackoverflow.com/a/53033388

const extensionAPI = typeof browser === "undefined" ? chrome : browser;

(async () => {
  const src = extensionAPI.runtime.getURL('scripts/content-search-filtering.js');
  await import(src);
})();
