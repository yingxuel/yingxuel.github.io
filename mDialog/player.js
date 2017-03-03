'use strict';

var sampleplayer = sampleplayer || {};
/**
 * @param {!Element} element the element to attach the player
 * @struct
 * @constructor
 * @export
 */
sampleplayer.CastPlayer = function(element) {
	var namespace = 'urn:x-cast:com.google.ads.interactivemedia.dai.cast';
	this.mediaElement_ = element;

	this.player_ = null;

	this.receiverManager_ = cast.receiver.CastReceiverManager.getInstance();
	this.receiverManager_.onSenderDisconnected =
		this.onSenderDisconnected_.bind(this);

	this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);
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
		if (requestInfo.url.indexOf("googlevideo.com") != -1 || requestInfo.url.indexOf("cbsdai-ads.akamaized.net") != -1) {
			requestInfo.withCredentials = false;
		} else {
			requestInfo.withCredentials = true;
		}
	};
	// MD Cast SDK Integration
	var host = new cast.player.api.Host({
		'mediaElement': this.mediaElement_,
		'url': 'https://cbsdaistg-vh.akamaihd.net/i/temp_hd_gallery_video/CBS_Production_Outlet_VMS/video_robot/CBS_Production_Entertainment/2017/02/19/880378435780/CBS_2_BROKE_GIRLS_617_CONTENT_CIAN_vr_20M_1053680_,1848000,548000,158000,2596000,1248000,298000,3596000,848000,.mp4.csmil/master.m3u8?hdnea=st=1488580070~exp=1488583670~acl=/i/temp_hd_gallery_video/CBS_Production_Outlet_VMS/video_robot/CBS_Production_Entertainment/2017/02/19/880378435780/CBS_2_BROKE_GIRLS_617_CONTENT_CIAN_vr_20M_1053680_,1848000,548000,158000,2596000,1248000,298000,3596000,848000,.mp4.csmil/*~hmac=16d0f0764b57a3e4de4ae5d3e693c712c1e8c69c4799c61aca8c0d2fd02a1844&originpath=/ondemand/hls/content/6067/vid/C1BDCF7F-2B9C-4F05-1009-53D6F0549AA3/CHS/streams/9a19220d-120f-45d9-9ec2-159fdcf00394/master.m3u8',
	});
	host.updateManifestRequestInfo = updateManifestRequestInfoCallback;
	host.updateLicenseRequestInfo = updateLicenseRequestInfoCallback;
	host.updateSegmentRequestInfo = updateSegmentRequestInfoCallback;

	this.player_ = new cast.player.api.Player(host);
	this.player_.load(cast.player.api.CreateHlsStreamingProtocol(host), 0);
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