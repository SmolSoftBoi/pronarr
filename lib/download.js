"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Download = void 0;
/** Download */
class Download {
    /**
     * @param video Indexer Video
     * @param videoUrl URL
     * @param artworkUrls Artwork URLs
     */
    constructor(video, videoUrl, artworkUrls) {
        /** Artwork URLs */
        this.artworkUrls = [];
        this._associatedIndexerVideo = video;
        this.videoUrl = videoUrl;
        this.artworkUrls = artworkUrls || [];
        this.videoExtension = this.videoUrl.pathname.split('/').reverse()[0].split('.').reverse()[0];
        this.artworkExtensions = this.artworkUrls.map(artworkUrl => artworkUrl.pathname.split('/').reverse()[0].split('.').reverse()[0]);
    }
    /**
     * Serialize
     * @param download Download
     * @returns Serialized Download
     */
    static serialize(download) {
        return {
            videoUrl: download.videoUrl.href,
            artworkUrls: download.artworkUrls.map(artworkUrl => artworkUrl.href)
        };
    }
    /**
     * Deserialize
     * @param json Serialized Download
     * @param video Indexer Video
     * @returns Download
     */
    static deserialize(json, video) {
        /** Video URL */
        const videoUrl = new URL(json.videoUrl);
        /** Artwork URLs */
        const artworkUrls = json.artworkUrls.map(artworkUrl => new URL(artworkUrl));
        /** Download */
        const download = new Download(video, videoUrl, artworkUrls);
        return download;
    }
}
exports.Download = Download;
//# sourceMappingURL=download.js.map