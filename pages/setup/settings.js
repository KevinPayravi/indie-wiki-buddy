import {
  extensionAPI,
  compressJSON,
  getSiteDataByDestination,
} from "../../scripts/common-functions.js";
import { loadOptions } from "../common-page-functions.js";


document.addEventListener('DOMContentLoaded', () => {

  // Set default wiki action
  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', async () => {
      extensionAPI.storage.sync.set({ 'defaultWikiAction': document.options.defaultWikiAction.value })

      let wikiSettings = {};
      const sites = await getSiteDataByDestination();
      sites.forEach((site) => {
        wikiSettings[site.id] = document.options.defaultWikiAction.value;
      });
      extensionAPI.storage.sync.set({ 'wikiSettings': await compressJSON(wikiSettings) });
    });
  });
  // Set default search action
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', async () => {
      extensionAPI.storage.sync.set({ 'defaultSearchAction': document.options.defaultSearchAction.value })

      let searchEngineSettings = {};
      const sites = await getSiteDataByDestination();
      sites.forEach((site) => {
        searchEngineSettings[site.id] = document.options.defaultSearchAction.value;
      });
      extensionAPI.storage.sync.set({ 'searchEngineSettings': await compressJSON(searchEngineSettings) });
    });
  });

});