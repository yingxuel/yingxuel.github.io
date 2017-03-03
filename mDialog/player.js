'use strict';

var sampleplayer = sampleplayer || {};
/**
 * @param {!Element} element the element to attach the player
 * @struct
 * @constructor
 * @export
 */
sampleplayer.CastPlayer = function(element) {
	this.element_ = element;
	this.mediaElement_ = /** @type {HTMLMediaElement} */
		(this.element_.querySelector('video'));

	this.player_ = null;

	this.receiverManager_ = cast.receiver.CastReceiverManager.getInstance();
	this.receiverManager_.onSenderDisconnected =
		this.onSenderDisconnected_.bind(this);

	this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);

	this.onLoadOrig_ =
		this.mediaManager_.onLoad.bind(this.mediaManager_);
	this.mediaManager_.onLoad = this.onLoad_.bind(this);
};

sampleplayer.CastPlayer.prototype.start = function() {
	this.receiverManager_.start();
};

/**
 * Loads some video content.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @return {boolean} Whether the media was preloaded
 * @private
 */
sampleplayer.CastPlayer.prototype.loadVideo_ = function() {
	console.log('loadVideo_');
	// MD Cast SDK Integration
	// Set withCredentials = true if the request to your server or CDN requires passong cookies 
	// when requesting playlists, encryption keys or segments.
	var updateManifestRequestInfoCallback = function(requestInfo) {
		if (!requestInfo.url) {
			requestInfo.url = this.url;
		}
		console.log('### updateManifestRequestInfo: load manifest url - ' + requestInfo.url);
		if (requestInfo.url.indexOf("googlevideo.com") != -1
			|| requestInfo.url.indexOf("cbsdai-ads.akamaized.net") != -1) {
			requestInfo.withCredentials = false;
		} else {
			requestInfo.withCredentials = true;
		}
	};
	var updateLicenseRequestInfoCallback = function(requestInfo) {
		console.log('### updateLicenseRequestInfo: request url - ' + requestInfo.url);
		if (requestInfo.url.indexOf("googlevideo.com") != -1
			|| requestInfo.url.indexOf("cbsdai-ads.akamaized.net") != -1) {
			requestInfo.withCredentials = false;
		} else {
			requestInfo.withCredentials = true;
		}
	};
	var updateSegmentRequestInfoCallback = function(requestInfo) {
		console.log('### updateSegmentRequestInfo: request url - ' + requestInfo.url);
		if (requestInfo.url.indexOf("googlevideo.com") != -1 || requestInfo.url.indexOf("-mdialog-") != -1) {
			requestInfo.withCredentials = false;
		} else {
			requestInfo.withCredentials = true;
		}
	};
	// MD Cast SDK Integration
	var host = new cast.player.api.Host({
		'mediaElement': this.mediaElement_
	});
	host.updateManifestRequestInfo = updateManifestRequestInfoCallback;
	host.updateLicenseRequestInfo = updateLicenseRequestInfoCallback;
	host.updateSegmentRequestInfo = updateSegmentRequestInfoCallback;
	host.url = 'https://cbsdaistg-vh.akamaihd.net/i/temp_hd_gallery_video/CBS_Production_Outlet_VMS/video_robot/CBS_Production_Entertainment/2017/02/19/880378435780/CBS_2_BROKE_GIRLS_617_CONTENT_CIAN_vr_20M_1053680_,1848000,548000,158000,2596000,1248000,298000,3596000,848000,.mp4.csmil/master.m3u8?hdnea=st=1488567216~exp=1488570816~acl=/i/temp_hd_gallery_video/CBS_Production_Outlet_VMS/video_robot/CBS_Production_Entertainment/2017/02/19/880378435780/CBS_2_BROKE_GIRLS_617_CONTENT_CIAN_vr_20M_1053680_,1848000,548000,158000,2596000,1248000,298000,3596000,848000,.mp4.csmil/*~hmac=6721c84be461657ea36c4135b1ff3567b3bc4638c8430bde47b6fb7b8c32a18e&originpath=/ondemand/hls/content/6067/vid/C1BDCF7F-2B9C-4F05-1009-53D6F0549AA3/CHS/streams/34c16241-b270-4178-8336-0ee9f6a3859d/master.m3u8';
	self.player_ = new cast.player.api.Player(host);
	self.player_.load(cast.player.api.CreateHlsStreamingProtocol(host), 0);
};

/**
 * Called when a sender disconnects from the app.
 *
 * @param {cast.receiver.CastReceiverManager.SenderDisconnectedEvent} event
 * @private
 */
sampleplayer.CastPlayer.prototype.onSenderDisconnected_ = function(event) {
	console.log('onSenderDisconnected');
	this.receiverManager_.stop();
};
/**
 * Called when media has an error. Transitions to IDLE state and
 * calls to the original media manager implementation.
 *
 * @see cast.receiver.MediaManager#onError
 * @param {!Object} error
 * @private
 */
sampleplayer.CastPlayer.prototype.onError_ = function(error) {
	console.log('onError: ' + error);
};

/**
 * Called when we receive a LOAD message. Calls load().
 *
 * @see sampleplayer#load
 * @param {cast.receiver.MediaManager.Event} event The load event.
 * @private
 */
sampleplayer.CastPlayer.prototype.onLoad_ = function(event) {
	console.log('onLoad_');
	this.loadVideo_();
};