#Notifier for Google Reader


Google Chrome extension that checks Google Reader and shows the unread items count. Quickly go through your feeds with the popup.

Supports: 

  * Displays the number of unread items in a browseraction, the Browseraction color depends on the amount of unread items.
  * Displays a list with read and unread items when clicked.
  * Shows a preview of the item when clicked. Supports easy navigation through the reading list.
  * Update interval can be adjusted.
  * Browseraction will be animated when new items arrive. (optional)
  * Supports custom themes. Choose any color you want for the browseraction through the settings page.
  
##Acknowledgements
  The following projects were used to realise this extension:
  
  * [AngularJS](http://angularjs.org/)
  * [Bootstrap](http://twitter.github.com/bootstrap/)
  
##License

Copyright (C) 2013 Jan Potoms

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  
##Contributions
I'm happy to accept bug fixes. I can't promise to accept new features.

##version history

###2.1.9: Keep unread
  * Support 'Keep unread'.
  * Fix bug when switching lists where old items were shown.
  * Clean up the UI.
  * Respect Google Reader API more with editing tags.

###2.1.8: Reach for the stars
  * Support starred list
  * expand toolbar
  * fix bug wrong items opened in unread view

###2.1.7: Stars
  * Add refresh button.
  * filter unread list.

###2.1.6: Tweak
  * Scroll per item in the list.
  * Better performance when marking as read/starring items.
  * Show published time with items.

###2.1.5: Very old bugs
  * Fix unread count to 0 when last item is read in Google Reader.
  * Bug fix for items without a url.

###2.1.4: Spy games
  * Add Google Analytics support

###2.1.3: Oops
  * Was accidentally loading 240 items instead of 20 at startup.
  
###2.1.2: Annoyances
  * Don't load all images when creating a snippet.
  * Display errors when the feed don't load.

###2.1.1: Clean it up
  * Allow ctrl+click for links in feed content to open in the background.
  * Fix bug where iterator could load more items when it shouldn't.
  * larger buttons for navigation in preview.  

###2.1.0: Cut me some slack
  * redesign items list to be able to mark as read without previewing.

###2.0.7: Eye candy
  * new star icon.
  * fix special characters in tooltips.
  
###2.0.5 - 2.0.6: Can't do good for everyone
  * Bring back middle click support in the items list.
  * Bring back 4 hour and 8 hour update intervals.
  * Bring back option to open Google Reader instead of the popup.
  * remember whether all items are shown or only unread items.

###2.0.1 - 2.0.4: Beta
  * Test the extension in the webstore and fix obvious bugs.
   
###2.0.0: Initial commit
  * Reading list, preview items, themes, options.