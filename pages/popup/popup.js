import {
  extensionAPI,
  setDefaultUserAction,
 } from "../../scripts/common-functions.js";

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

  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', () => {
      setDefaultUserAction('wikiSettings', document.options.defaultWikiAction.value);
    });
  });
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', () => {
      setDefaultUserAction('searchEngineSettings', document.options.defaultSearchAction.value);
    });
  });
});