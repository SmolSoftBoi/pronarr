"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexerVideo = exports.IndexerVideoEvent = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
const node_subler_1 = require("node-subler");
const download_1 = require("./download");
const user_1 = require("./user");
/** Indexer Video Event */
var IndexerVideoEvent;
(function (IndexerVideoEvent) {
    /** Add Download */
    IndexerVideoEvent["ADD_DOWNLOAD"] = "addDownload";
    /** Remove Download */
    IndexerVideoEvent["REMOVE_DOWNLOAD"] = "removeDownload";
})(IndexerVideoEvent = exports.IndexerVideoEvent || (exports.IndexerVideoEvent = {}));
/** Indexer Video */
class IndexerVideo extends events_1.EventEmitter {
    /**
     * @param displayName Display Name
     * @param id ID
     */
    constructor(displayName, id) {
        super();
        /** Atoms */
        this.atoms = new node_subler_1.Atoms();
        /**
         * This is a way for Plugin developers to store custom data with their video.
         */
        this.context = {};
        this.displayName = displayName;
        this.ID = id;
        this.pathName = this.displayName.replace(':', '');
        this.atoms
            .add(node_subler_1.AtomTag.name, displayName)
            .add(node_subler_1.AtomTag.mediaKind, node_subler_1.MediaKind.TV_SHOW)
            .add(node_subler_1.AtomTag.genre, 'Porn')
            .add(node_subler_1.AtomTag.tvEpisodeId, this.ID)
            .add(node_subler_1.AtomTag.rating, 'Unknown');
        if (this._associatedIndexer) {
            this.atoms
                .add(node_subler_1.AtomTag.artist, this._associatedIndexer)
                .add(node_subler_1.AtomTag.album, this._associatedIndexer)
                .add(node_subler_1.AtomTag.tvShow, this._associatedIndexer)
                .add(node_subler_1.AtomTag.tvNetwork, this._associatedIndexer)
                .add(node_subler_1.AtomTag.studio, this._associatedIndexer);
        }
    }
    /** UUID */
    get UUID() {
        return `${this._associatedPlugin}-${this.ID}`;
    }
    /**
     * Add Download
     * @param videoUrl URL
     * @param artworkUrls Artwork URLs
     * @returns Download
     */
    addDownload(videoUrl, artworkUrls) {
        if (this.download)
            this.removeDownload();
        /** Download */
        const download = new download_1.Download(this, videoUrl, artworkUrls);
        this.download = download;
        this.download._associatedIndexerVideo = this;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (!fs_1.existsSync(path_1.join(user_1.User.downloadsPath(), this._associatedIndexer, `${this.ID} ${this.pathName}.m4v`))) {
            this.emit("addDownload" /* ADD_DOWNLOAD */, this.download);
        }
        return this.download;
    }
    /**
     * Remove Download
     */
    removeDownload() {
        if (this.download) {
            this.emit("removeDownload" /* REMOVE_DOWNLOAD */, this.download);
            this.download = undefined;
        }
    }
    /**
     * Get Download
     * @returns Download
     */
    getDownload() {
        return this.download;
    }
    /**
     * Serialize
     * @param video Indexer Video
     * @returns Serialized Indexer Video
     */
    static serialize(video) {
        return {
            displayName: video.displayName,
            pathName: video.pathName,
            ID: video.ID,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            plugin: video._associatedPlugin,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            indexer: video._associatedIndexer,
            download: video.download ? download_1.Download.serialize(video.download) : undefined,
            atoms: video.atoms,
            context: video.context
        };
    }
    /**
     * Deserialize
     * @param json Serialized Indexer Video
     * @returns Indexer Video
     */
    static deserialize(json) {
        /** Indexer Video */
        const indexerVideo = new IndexerVideo(json.displayName, json.ID);
        indexerVideo._associatedPlugin = json.plugin;
        indexerVideo._associatedIndexer = json.indexer;
        indexerVideo.pathName = json.pathName;
        indexerVideo.atoms = Object.assign(new node_subler_1.Atoms(), json.atoms.inner.map(atom => Object.assign(new node_subler_1.Atoms(), atom)));
        indexerVideo.context = json.context;
        if (json.download)
            indexerVideo.download = download_1.Download.deserialize(json.download, indexerVideo);
        return indexerVideo;
    }
}
exports.IndexerVideo = IndexerVideo;
//# sourceMappingURL=indexerVideo.js.map