// Copyright 2011 Jan Potoms. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var browserAction = (function () {
  
  var ICON_SIZE = 19;
  var drawingContext = document.createElement('canvas').getContext('2d');
  
  var frames = [];
  var imagesToLoad = 0;
  var imagesLoaded = 0;
  var framesLoaded = false;
  
  var colorSignedOut = [202, 204, 211, 255];
  var colorUnread = [152, 0, 16, 255];
  var colorNoUnread = [104, 104, 104, 255];
  
  var color = colorNoUnread;
  var prevCount = -1;
  var currentFrame = 0;
  
  var copyColor = function (from, to) {
    to[0] = from[0];
    to[1] = from[1];
    to[2] = from[2];
    to[3] = from[3];
  };
  
  var paintFrames = function (rgb) {
    if (!framesLoaded) {
      return;
    }
    
    for(var i = 0; i < frames.length; i++) {
      // clear context
      drawingContext.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
      // load frame to the context
      drawingContext.putImageData(frames[i], 0, 0);
      // set the color where The icon is not transparrent
      drawingContext.globalCompositeOperation = 'source-in';
      drawingContext.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
      drawingContext.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
      // save back the colored frame
      frames[i] = drawingContext.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
    }
  };
  
  var setColor = function (rgb) {
    // set icon color
    paintFrames(rgb);
  
    // set badge color 
    chrome.browserAction.setBadgeBackgroundColor({color: rgb});
    
    render(currentFrame);
  };
  
  var setBadge = function (count) {
    var text = '';
    if(count > 0) {
      // the badge can only hold 4 digits
      text = Math.min(count, 9999) + '';
    }
    
    chrome.browserAction.setBadgeText({
      text: text
    });
  };
  
  var render = function (frameIndex) {
    var frame = frames[frameIndex]
    if (frame) {
      chrome.browserAction.setIcon({imageData: frame});
    }
  };
  
  
  // called when all frames are loaded
  var onFramesLoaded = function (frames) {
    framesLoaded = true;
    paintFrames(color);
    render(currentFrame);
  };
  
  
  // called when a frame is loaded
  var onFrameLoaded = function(e) {
    var img = e.target;
    // draw the image
    drawingContext.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    drawingContext.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
    // save the frame
    frames[img.dataset.id] = drawingContext.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
    imagesLoaded += 1; // this icon is loaded
      
    if(imagesLoaded >= imagesToLoad) {
      // all icons are loaded
      onFramesLoaded(frames);
    }
  };
  
  
  // load the images for the frames
  var urls = [1, 2, 3, 4, 5, 6, 7].map(function (imgNr) {
    return '/img/browseraction/' + imgNr + '.png';
  });
  imagesToLoad = urls.length;
  urls.forEach(function (url, index) {
    var img = new Image(ICON_SIZE, ICON_SIZE);
    img.addEventListener('load', onFrameLoaded, true);
    img.src = url;
    img.dataset.id = index;
  });
  
  
  var aniamtionIntervalId;

  // perform animation
  var animate = function() {
    if (!aniamtionIntervalId) { 
      aniamtionIntervalId = setInterval(animateFrame, 60);
    }
  };
  
  var animateFrame = function () {
    currentFrame = (currentFrame + 1) % frames.length;
    render(currentFrame);
    if(currentFrame === 0) {
      // animation finished
      clearInterval(aniamtionIntervalId);
      aniamtionIntervalId = null;
    }
  }
  
  var previewTimeoutId;
  
  var stopPreview = function () {
    setColor(color);
    previewTimeoutId = null;
  };
  
  doAnimation = false;
  
  return {
    setUnreadCount: function (count) {
      count = count || 0;
      if (count !== prevCount) {
        color = count === 0 ? colorNoUnread : colorUnread;
        if (!previewTimeoutId) {
          setColor(color);
        }
        setBadge(count);
        
        if (count > prevCount && doAnimation) {
          // animate icon   
          animate();
        }
      }
      prevCount = count;
    },
    
    setNoUnreadColor: function (rgb) {
      copyColor(rgb || [0, 0, 0, 255], colorNoUnread);
      setColor(color);
    },
    
    setUnreadColor: function (rgb) {
      copyColor(rgb || [0, 0, 0, 255], colorUnread); 
      setColor(color);     
    },
    
    setDoAnimation: function (value) {
      doAnimation = value;
    },
    
    previewColor: function (rgb) {
      setColor(rgb);
      if (previewTimeoutId) {
        clearTimeout(previewTimeoutId);
        previewTimeoutId = null;
      }
      previewTimeoutId = setTimeout(stopPreview, 1500);
    }
  };

} ());

