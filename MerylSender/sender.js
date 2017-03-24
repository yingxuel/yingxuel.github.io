(function() {
  'use strict';

var Sender = function() {
  // A boolean to indicate availability of receivers
  this.receiversAvailable_ = false;
  // chrome.cast.media.Media object
  this.currentMediaSession = null;
  // chrome.cast.Session object
  this.session = null;
  // If the current request is Live stream.
  this.isLive_ = true;
  // Time of the bookmark.
  this.bookmarkTime_ = 0;
  this.assetKey_ = null;
  this.liveApiKey_ = null;
  this.cmsId_ = null;
  this.videoId_ = null;
  this.vodApiKey_ = null;
  this.initializeSender();
};


/**
 * Initialize Cast media player API. Either successCallback and errorCallback
 * will be invoked once the API has finished initialization. The onSessionInit
 * and receiverInit may be invoked at any time afterwards, and possibly
 * more than once.
 */
Sender.prototype.initializeSender = function() {
  var this_ = this;
  this.namespace = 'urn:x-cast:com.google.ads.interactivemedia.dai.cast';
  if (!chrome.cast || !chrome.cast.isAvailable) {
    setTimeout(this.initializeSender.bind(this), 1000);
    return;
  }
  var merylId = '660E896C';
  var mDialogId = '66D2EB93';
  var applicationID = merylId;
  var autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
  var sessionRequest = new chrome.cast.SessionRequest(applicationID);
  
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
                                            this.onSessionInit.bind(this),
                                            this.onReceiverInit.bind(this),
                                            autoJoinPolicy);
  chrome.cast.initialize(apiConfig,
                         this.onInitSuccess.bind(this),
                         this.onError.bind(this));
  var liveAssetKeyInput = document.getElementById('live-asset-key-input');
  var liveApiKeyInput = document.getElementById('live-api-key-input');
  var vodCmsIdInput = document.getElementById('vod-cms-id-input');
  var vodVideoIdInput = document.getElementById('vod-video-id-input');
  var vodApiKeyInput = document.getElementById('vod-api-key-input');
  var castLiveButton = document.getElementById('cast-live-button');
  var credentialsCheckbox = document.getElementById('credentials-checkbox');
  castLiveButton.onclick = function() {
    this_.isLive_ = true;
    this_.assetKey_ = liveAssetKeyInput.value;
    this_.liveApiKey_ = liveApiKeyInput.value;
    this_.needsCredentials_ = credentialsCheckbox.checked;
    this_.launchApp();
  };
  var castVodButton = document.getElementById('cast-vod-button');
  castVodButton.onclick = function() {
    this_.isLive_ = false;
    this_.cmsId_ = vodCmsIdInput.value;
    this_.videoId_ = vodVideoIdInput.value;
    this_.vodApiKey_ = vodApiKeyInput.value;
    this_.needsCredentials_ = credentialsCheckbox.checked;
    this_.launchApp();
  };
  var bookmarkButton = document.getElementById('bookmark-button');
  bookmarkButton.onclick = function() {
    this_.sendMessage('bookmark');
  };
  var seekButton = document.getElementById('seek-button');
  var seekInput = document.getElementById('seek-input');
  seekButton.onclick = function() {
    this_.sendMessage('seek,' + seekInput.value);
  };
  var snapbackButton = document.getElementById('snapback-button');
  var snapbackInput = document.getElementById('snapback-input');
  snapbackButton.onclick = function() {
    this_.sendMessage('snapback,' + snapbackInput.value);
  };
};


/**
 * Callback function for init success
 */
Sender.prototype.onInitSuccess = function() {
  console.log('init success');
  //this.launchApp();
};


/**
 * Generic error callback function
 */
Sender.prototype.onError = function() {
  console.log('error');
};


Sender.prototype.onSessionInit = function(e) {
  console.log('sessionInit');
  if (!this.session) {
    this.session = e;
    this.session.addUpdateListener(this.onSessionUpdate.bind(this));
    this.session.addMessageListener(this.namespace, this.onSessionMessage.bind(this));
  }
};


/**
 * Listens for messages from receiver.
 */
Sender.prototype.onSessionMessage = function(namespace, event) {
  console.log('Receiver: ' + event);
  var message = event.split(',');
    var method = message[0];
    switch (method) {
      case 'bookmark':
        var time = parseFloat(message[1]);
        this.setBookmarkTime_(time);
        break;
    }
};


/**
 * Sets the bookmark time reported from receiver.
 */
Sender.prototype.setBookmarkTime_ = function(time) {
  this.bookmarkTime_ = time;
};


/**
 * Sends a message to the receiver.
 */
Sender.prototype.sendMessage = function(message) {
  console.log('Sending receiver message: ' + message);
  this.session.sendMessage(this.namespace, message);
};


Sender.prototype.onRequestSessionSuccess = function(e) {
  console.log("Successfully created session: " + e.sessionId);
  this.session = e;
  this.session.addMessageListener(this.namespace, this.onSessionMessage.bind(this));
  this.loadMedia();
};


/**
 * Callback when receiver is available..
 * @param {string} e Receiver availability.
 */
Sender.prototype.onReceiverInit = function(e) {
  if( e === 'available' ) {
    this.receiversAvailable_ = true;
    console.log('receiver found');
  }
  else {
    console.log('receiver list empty');
  }
};


/**
 * Session update listener
 */
Sender.prototype.onSessionUpdate = function(isAlive) {
  if (!isAlive) {
    this.session = null;
    clearInterval(this.timer);
  }
};


/**
 * Requests that a receiver application session be created or joined. By
 * default, the SessionRequest passed to the API at initialization time is used;
 * this may be overridden by passing a different session request in
 * opt_sessionRequest.
 */
Sender.prototype.launchApp = function() {
  console.log('launching app...');
  chrome.cast.requestSession(
      this.onRequestSessionSuccess.bind(this),
      this.onLaunchError.bind(this));
  if( this.timer ) {
    clearInterval(this.timer);
  }
};


/**
 * Callback function for launch error
 */
Sender.prototype.onLaunchError = function(e) {
  console.log('launch error');
  console.log(e);
};


/**
 * Loads media into a running receiver application.
 */
Sender.prototype.loadMedia = function() {
  if (!this.session) {
    console.log('no session');
    return;
  }

  var streamRequest = {};
  var mediaInfo;

  if (this.isLive_) {
    streamRequest.assetKey = this.assetKey_;
    if (this.liveApiKey_ && this.liveApiKey_ != '') {
      streamRequest.apiKey = this.liveApiKey_;
    }
    streamRequest.attemptPreroll = false;
    mediaInfo = new chrome.cast.media.MediaInfo(streamRequest.assetKey);
  } else {
    streamRequest.contentSourceId = this.cmsId_;
    streamRequest.videoId = this.videoId_;
    if (this.vodApiKey_ && this.vodApiKey_ != '') {
      streamRequest.apiKey = this.vodApiKey_;
    }
    mediaInfo = new chrome.cast.media.MediaInfo(streamRequest.contentSourceId);
  } 

  streamRequest.startTime = this.bookmarkTime_;
  streamRequest.needsCredentials = this.needsCredentials_;
  mediaInfo.customData = streamRequest;
  mediaInfo.contentType = 'application/x-mpegurl';
  console.log(streamRequest);

  var request = new chrome.cast.media.LoadRequest(mediaInfo);
  this.session.loadMedia(request,
      this.onMediaDiscovered.bind(this, 'loadMedia'),
      this.onLoadMediaError.bind(this));
};


/**
 * Callback function for loadMedia success.
 */
Sender.prototype.onMediaDiscovered = function(how, mediaSession) {
  this.currentMediaSession = mediaSession;
};


/**
 * Callback function when media load returns error
 */
Sender.prototype.onLoadMediaError = function(e/*chrome.cast.Error*/) {
  console.log('media error: ' + e.code + " " +e.description);
};


window.Sender = Sender;
})();
