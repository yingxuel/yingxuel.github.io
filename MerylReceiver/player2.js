'use strict';

/**
 * Entry point for the sample video player which uses media element for
 * rendering video streams.
 *
 * @this {Player}
 * @param {!HTMLMediaElement} mediaElement for video rendering.
 */
var Player = function(mediaElement) {
  var namespace = 'urn:x-cast:com.google.ads.interactivemedia.dai.cast';
  var self = this;
  this.adNum_ = 1;
  this.breakNum_ = 1;
  this.castPlayer_ = null;
  this.seekToTimeAfterAdBreak_ = 0;
  this.startTime_ = 0;
  this.adIsPlaying_ = false;
  this.mediaElement_ = mediaElement;
  this.receiverManager_ = cast.receiver.CastReceiverManager.getInstance();
  this.receiverManager_.onSenderConnected = function(event) {
    console.log('Sender Connected');
  };
  this.receiverManager_.onSenderDisconnected =
      this.onSenderDisconnected.bind(this);
  this.imaMessageBus_ = this.receiverManager_.getCastMessageBus(namespace);
  this.imaMessageBus_.onMessage = function(event) {
    console.log('Received message from sender: ' + event.data);
    var message = event.data.split(',');
    var method = message[0];
    switch (method) {
      case 'bookmark':
        var time = parseFloat(message[1]);
        self.bookmark_(time);
        break;
      case 'seek':
        var time = parseFloat(message[1]);
        self.seek_(time);
        break;
      case 'snapback':
        var time = parseFloat(message[1]);
        self.snapback_(time);
        break;
      case 'getContentTime':
        var contentTime = self.getContentTime_();
        self.broadcast_('contentTime,' + contentTime);
        break;
      default:
        self.broadcast_('Message not recognized');
        break;
    }
  };

  this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);
  this.mediaManager_.onLoad = this.onLoad.bind(this);
  this.mediaManager_.onSeek = this.onSeek.bind(this);
  this.initStreamManager_();
};

/**
 * Initializes receiver stream manager and adds callbacks.
 * @private
 */
Player.prototype.initStreamManager_ = function() {
  var self = this;
  this.streamManager_ =
      new google.ima.dai.api.StreamManager(this.mediaElement_);
  var onStreamDataReceived = this.onStreamDataReceived.bind(this);
  var sendPingForTesting = this.sendPingForTesting_.bind(this);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.LOADED,
      function(event) {
        var streamUrl = event.getStreamData().url;
        // Each element in subtitles array is an object with url and language
        // properties. Example of a subtitles array with 2 elements:
        // {
        //   "url": "http://www.sis.com/1234/subtitles_en.ttml",
        //   "language": "en"
        // }, {
        //   "url": "http://www.sis.com/1234/subtitles_fr.ttml",
        //   "language": "fr"
        // }
        self.subtitles = event.getStreamData().subtitles;
        onStreamDataReceived(streamUrl);
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.STREAM_INITIALIZED,
      function(event) {
        self.sendPingForTesting_('streamInit', self.adNum_);
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.ERROR,
      function(event) {
        var errorMessage = event.getStreamData().errorMessage;
        self.broadcast_(errorMessage);
        var errorCode = /4\d{2}/.exec(errorMessage)[0];
        self.sendPingForTesting_('error?code=' + errorCode);
        console.log(event);
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.CUEPOINTS_CHANGED,
      function(event) {
        console.log("Cuepoints changed: ");
        console.log(event.getStreamData());
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.STARTED,
      function(event) {
        self.broadcast_('started');
        sendPingForTesting('start', self.adNum_);
        var ad = event.getAd();
        var adPodInfo = ad ? ad.getAdPodInfo() : null;
        var title = ad ? ad.getTitle() : '<no-title>';
        var position = adPodInfo ? adPodInfo.getAdPosition() : 0;
        console.log('Ad Title: ' + title);
        console.log('Ad Position: ' + position);
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.FIRST_QUARTILE,
      function(event) {
        sendPingForTesting('first', self.adNum_);
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.MIDPOINT,
      function(event) {
        sendPingForTesting('mid', self.adNum_);
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.THIRD_QUARTILE,
      function(event) {
        sendPingForTesting('third', self.adNum_);
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.COMPLETE,
      function(event) {
        self.broadcast_('complete');
        sendPingForTesting('complete', self.adNum_);
        self.adNum_++;
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.AD_BREAK_STARTED,
      function(event) {
        self.adIsPlaying_ = true;
        document.getElementById('ad-ui').style.display = 'block';
        sendPingForTesting('adBreakStarted\?num=' + self.breakNum_);
        self.broadcast_('ad_break_started');
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.AD_BREAK_ENDED,
      function(event) {
        self.adIsPlaying_ = false;
        document.getElementById('ad-ui').style.display = 'none';
        sendPingForTesting('adBreakEnded\?num=' + self.breakNum_);
        self.breakNum_++;
        self.broadcast_('ad_break_ended');
        if (self.seekToTimeAfterAdBreak_ > 0) {
          self.seek_(self.seekToTimeAfterAdBreak_);
          self.seekToTimeAfterAdBreak_ = 0;
        }
      },
      false);
  this.streamManager_.addEventListener(
      google.ima.dai.api.StreamEvent.Type.AD_PROGRESS,
      function(event) {
        var adData = event.getStreamData().adProgressData;
        document.getElementById('ad-position').innerHTML
          = adData.adPosition;
        document.getElementById('total-ads').innerHTML
          = adData.totalAds;
        document.getElementById('time-value').innerHTML
          = Math.ceil(parseFloat(adData.duration)
            - parseFloat(adData.currentTime));
        document.getElementById('ad-ui').style.display = 'block';
      },
      false);
};


/**
 * Gets content time for the stream.
 * @returns {number} The content time.
 * @private
 */
Player.prototype.getContentTime_ = function() {
  return this.streamManager_
      .contentTimeForStreamTime(this.mediaElement_.currentTime);
};


/**
 * Sends event ping for testing.
 * @param {!string} event Event pinged.
 * @param {number} number The ad number.
 * @private
 */
Player.prototype.sendPingForTesting_ = function(event, number) {
  var testingPing = 'http://www.example.com/' + event;
  if (number) {
    testingPing += '@?num=' + number + 'ld';
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open('GET', testingPing, true);
  xmlhttp.send();
  this.broadcast_('Pinging url: ' + testingPing);
};


/**
 * Sends messages to all connected sender apps.
 * @param {!string} message Message to be sent to senders.
 * @private
 */
Player.prototype.broadcast_ = function(message) {
  if (this.imaMessageBus_ && this.imaMessageBus_.broadcast) {
    this.imaMessageBus_.broadcast(message);
  }
};


/**
 * Starts receiver manager which tracks playback of the stream.
 */
Player.prototype.start = function() {
  this.receiverManager_.start();
};

/**
 * Called when a sender disconnects from the app.
 * @param {cast.receiver.CastReceiverManager.SenderDisconnectedEvent} event
 */
Player.prototype.onSenderDisconnected = function(event) {
  console.log('onSenderDisconnected');
  // When the last or only sender is connected to a receiver,
  // tapping Disconnect stops the app running on the receiver.
  if (this.receiverManager_.getSenders().length === 0 &&
      event.reason ===
          cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER) {
    this.receiverManager_.stop();
  }
};


/**
 * Called when we receive a LOAD message from the sender.
 * @param {!cast.receiver.MediaManager.Event} event The load event.
 */
Player.prototype.onLoad = function(event) {
  var imaRequestData = event.data.media.customData;
  this.startTime_ = imaRequestData.startTime;
  if (imaRequestData.assetKey) {
    this.streamRequest =
      new google.ima.dai.api.LiveStreamRequest(imaRequestData);
  } else if (imaRequestData.contentSourceId) {
    this.streamRequest =
      new google.ima.dai.api.VODStreamRequest(imaRequestData);
  }
  this.streamManager_.requestStream(this.streamRequest);
  document.getElementById('splash').style.display = 'none';
};


/**
 * Processes the SEEK event from the sender.
 * @param {!cast.receiver.MediaManager.Event} event The seek event.
 * @this {Player}
 */
Player.prototype.onSeek = function(event) {
  var currentTime = event.data.currentTime;
  this.snapback_(currentTime);
  this.mediaManager_.broadcastStatus(true, event.data.requestId);
};


/**
 * Loads stitched ads+content stream.
 * @param {!string} url of the stream.
 */
Player.prototype.onStreamDataReceived = function(url) {
  var self = this;
  var host = new cast.player.api.Host({
    'url': url,
    'mediaElement': this.mediaElement_
  });
  this.broadcast_('onStreamDataReceived: ' + url);
  host.processMetadata = function(type, data, timestamp) {
    self.streamManager_.processMetadata(type, data, timestamp);
  };
  var currentTime = this.startTime_ > 0 ? this.streamManager_
    .streamTimeForContentTime(this.startTime_) : 0;
  this.broadcast_('start time: ' + currentTime);
  this.castPlayer_ = new cast.player.api.Player(host);
  this.castPlayer_.load(
    cast.player.api.CreateHlsStreamingProtocol(host), currentTime);
  if (this.subtitles[0] && this.subtitles[0].ttml) {
    this.castPlayer_.enableCaptions(true, 'ttml', this.subtitles[0].ttml);
  }
};

/**
 * Bookmarks content so stream will return to this location if revisited.
 * @private
 */
Player.prototype.bookmark_ = function() {
  this.broadcast_('Current Time: ' + this.mediaElement_.currentTime);
  var bookmarkTime = this.streamManager_
    .contentTimeForStreamTime(this.mediaElement_.currentTime);
  this.broadcast_('bookmark,' + bookmarkTime);
};

/**
 * Seeks player to location.
 * @param {number} time The time to seek to in seconds.
 * @private
 */
Player.prototype.seek_ = function(time) {
  if (this.adIsPlaying_) {
    return;
  }
  this.mediaElement_.currentTime = time;
  this.broadcast_('Seeking to: ' + time);
};

/**
 * Seeks player to location and plays last ad break if it has not been
 * seen already.
 * @param {number} time The time to seek to in seconds.
 * @private
 */
Player.prototype.snapback_ = function(time) {
  var previousCuepoint =
    this.streamManager_.previousCuePointForStreamTime(time);
  console.log(previousCuepoint);
  var played = previousCuepoint.played;
  if (played) {
    this.seek_(time);
  } else {
    // Adding 0.1 to cuepoint start time because of bug where stream freezes
    // when seeking to certain times in VOD streams.
    this.seek_(previousCuepoint.start + 0.1);
    this.seekToTimeAfterAdBreak_ = time;
  }
};
