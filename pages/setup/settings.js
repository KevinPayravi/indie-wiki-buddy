import {
  setDefaultUserAction,
} from "../../scripts/common-functions.js";
import { loadOptions } from "../common-page-functions.js";


document.addEventListener('DOMContentLoaded', () => {

  // Set default wiki action
  document.querySelectorAll('[name="defaultWikiAction"]').forEach((el) => {
    el.addEventListener('change', () => {
      setDefaultUserAction('wikiSettings', document.options.defaultWikiAction.value);
    });
  });
  // Set default search action
  document.querySelectorAll('[name="defaultSearchAction"]').forEach((el) => {
    el.addEventListener('change', () => {
      setDefaultUserAction('searchEngineSettings', document.options.defaultSearchAction.value);
    });
  });

});