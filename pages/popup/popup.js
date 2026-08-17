import {
  extensionAPI,
  setDefaultUserAction,
 } from "../../scripts/common-functions.js";
import { debounce } from "../common-page-functions.js";

// Main function that runs on-load
document.addEventListener('DOMContentLoaded', () => {
  // Listener for settings links:
  document.getElementById('openSettingsButton').addEventListener('click', () => {
    extensionAPI.tabs.create({ 'url': extensionAPI.runtime.getURL('pages/settings/index.html') });
    window.close();
  });
  document.getElementById('openSettingsLink').addEventListener('click', () => {
    extensionAPI.tabs.create({ 'url': extensionAPI.runtime.getURL('pages/settings/index.html') });
    window.close();
  });

  // Debounced
  const applyDefaultWikiAction = debounce(() => {
    setDefaultUserAction('wikiSettings', document.options.defaultWikiAction.value);
  }, 200);
  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', applyDefaultWikiAction);
  });
  const applyDefaultSearchAction = debounce(() => {
    setDefaultUserAction('searchEngineSettings', document.options.defaultSearchAction.value);
  }, 200);
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', applyDefaultSearchAction);
  });
});