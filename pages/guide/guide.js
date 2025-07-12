const extensionAPI = typeof browser === "undefined" ? chrome : browser;

// Somehow this has to be done manually
document.querySelectorAll('[data-msg]').forEach(element => {
  // Check data-msg-ph-* attributes for placeholder text
  // iterate
  const placeholders = [];
  for (let i = 1; i <= 9; i++) {
    let ph = element.getAttribute(`data-msg-ph-${i}`);
    if (ph) {
      placeholders.push(ph);
    }
  }

  // Usage of innerHTML below is safe,
  // as we are displaying literals from the extension's localization files,
  // populated with placeholder HTML from elsewhere in the code.
  element.innerHTML = extensionAPI.i18n.getMessage(element.dataset.msg, placeholders);
});

document.querySelectorAll('[data-msg-attr]').forEach(element => {
  const attrs = element.dataset.msgAttr.split(',');
  attrs.forEach(attr => {
    const [key, value] = attr.split('=');
    element.setAttribute(key, extensionAPI.i18n.getMessage(value));
  });
});
