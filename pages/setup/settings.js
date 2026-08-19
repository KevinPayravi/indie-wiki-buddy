import {
  setDefaultUserAction,
} from "../../scripts/common-functions.js";
import { debounce } from "../common-page-functions.js";


document.addEventListener('DOMContentLoaded', () => {

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