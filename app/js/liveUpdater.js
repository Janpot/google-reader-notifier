var newItemCountLabel = document.getElementById('reading-list-unread-count');

if (newItemCountLabel) {
  function requestUpdate() {
    var itemCountMatcher = /(\d+)(\+?)/;
    var match = itemCountMatcher.exec(newItemCountLabel.innerHTML);

    var count = 0;
    
    if (!newItemCountLabel.classList.contains('hidden')) {
      count = match[1];
    }
    
    console.log('unread count: ' + count);
    chrome.extension.sendMessage({
        method: "updateUnreadCount",
        count: count,
        hasMore: match[2] === '+'
      });
  }

  newItemCountLabel.addEventListener('DOMCharacterDataModified', requestUpdate, true);
  requestUpdate();
}