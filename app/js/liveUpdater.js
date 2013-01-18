var newItemCountLabel = document.getElementById('reading-list-unread-count');

if (newItemCountLabel) {
  function requestUpdate() {
    var match = /(\d+)(\+?)/.exec(newItemCountLabel.innerHTML);

    var count = 0;
    var hasMore = false;

    if (match && !newItemCountLabel.classList.contains('hidden')) {
      count = match[1];
      hasMore = match[2] === '+';
    }

    console.log('unread count: ' + count);
    chrome.extension.sendMessage({
      method: "updateUnreadCount",
      count: count,
      hasMore: hasMore
    });
  }

  window.MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
  var observer = new MutationObserver(requestUpdate);
  observer.observe(newItemCountLabel, { attributes: true, characterData: true });

  //newItemCountLabel.addEventListener('DOMCharacterDataModified', requestUpdate, true);
  //requestUpdate();
}