(function() {
  'use strict';

  const blockedSources = /webflow|stripe|jquery/i;

  function blockElement(element) {
    const source = element.getAttribute('src') || '';

    if (!blockedSources.test(source)) return

    element.remove();
  }

  function parseScripts() {
    document.querySelectorAll('script, iframe').forEach(blockElement);
  }

  parseScripts();

  const mutation = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (/script|iframe/i.test(node.tagName)) {
          blockElement(node);
        }
      });
    });
  });

  mutation.observe(document, {
    subtree: true,
    childList: true
  });
})();
