"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadManager = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const https_1 = require("https");
const path_1 = require("path");
const node_logger_1 = require("@epickris/node-logger");
const node_subler_1 = require("node-subler");
const rimraf_1 = __importDefault(require("rimraf"));
const user_1 = require("./user");
/** Log */
const log = node_logger_1.Logger.internal;
class DownloadManager {
    /**
     * @param api Pronarr API
     * @param options Download Mannager Options
     */
    constructor(api, options) {
        /** Active Downloads */
        this.activeDownloads = new Map();
        /** Downloads */
        this.downloads = new Map();
        this.api = api;
        if (options) {
            if (options.customDownloadsPath) {
                user_1.User.setDownloadsPath(options.customDownloadsPath);
            }
        }
        this.path = user_1.User.downloadsPath();
        this.tempPath = user_1.User.tempDownloadsPath();
        if (!fs_1.existsSync(this.path))
            fs_1.mkdirSync(this.path, {
                recursive: true
            });
        this.api.on("registerIndexerVideos" /* REGISTER_INDEXER_VIDEOS */, this.handleRegisterIndexerVideos.bind(this));
        this.api.on("updateIndexerVideos" /* UPDATE_INDEXER_VIDEOS */, this.handleUpdateIndexerVideos.bind(this));
        this.api.on("unregisterIndexerVideos" /* UNREGISTER_INDEXER_VIDEOS */, this.handleUnregisterIndexerVideos.bind(this));
        this.api.on('shutdown', this.handleShutdown.bind(this));
        this.next();
    }
    /** Next */
    async next() {
        if (this.downloads.size === 0 || this.activeDownloads.size >= 2)
            return;
        /** Key */
        const key = this.downloads.entries().next().value[0];
        /** Download */
        const download = this.downloads.get(key);
        if (download) {
            this.downloads.delete(key);
            this.activeDownloads.set(key, download);
            this.download(download);
            if (this.activeDownloads.size < 3)
                this.next();
        }
    }
    /**
     * Download
     * @param video Indexer Video
     */
    async download(download) {
        /** Video */
        const video = download._associatedIndexerVideo;
        /** Temp Folder Path */
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tempFolderPath = path_1.join(this.tempPath, video._associatedIndexer, `${video.ID} ${video.pathName}`);
        if (!fs_1.existsSync(tempFolderPath))
            fs_1.mkdirSync(tempFolderPath, {
                recursive: true
            });
        /** Temp Video Path */
        const tempVideoPath = path_1.join(tempFolderPath, `video.${download.videoExtension}`);
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await this.get(download.videoUrl, tempVideoPath);
                break;
            }
            catch (error) {
                log.error(error);
            }
        }
        /** Promises */
        const promises = [];
        download.artworkUrls.forEach((artworkUrl, index) => {
            /** Promise */
            const promise = new Promise(resolve => {
                /** Temp Artwork Path */
                const tempArtworkPath = path_1.join(tempFolderPath, `artwork-${index}.${download.artworkExtensions[index]}`);
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    try {
                        this.get(artworkUrl, tempArtworkPath).then(() => {
                            video.atoms.add(node_subler_1.AtomTag.artwork, tempArtworkPath);
                            resolve();
                        });
                        break;
                    }
                    catch (error) {
                        log.error(error);
                    }
                }
            });
            promises.push(promise);
        });
        await Promise.all(promises);
        /** Folder PAth */
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const folderPath = path_1.join(this.path, video._associatedIndexer);
        if (!fs_1.existsSync(folderPath))
            fs_1.mkdirSync(folderPath, {
                recursive: true
            });
        /** Video Path */
        const videoPath = path_1.join(folderPath, `${video.ID} ${video.pathName}.m4v`);
        if (video._associatedIndexer) {
            video.atoms
                .add(node_subler_1.AtomTag.artist, video._associatedIndexer)
                .add(node_subler_1.AtomTag.album, video._associatedIndexer)
                .add(node_subler_1.AtomTag.tvShow, video._associatedIndexer)
                .add(node_subler_1.AtomTag.tvNetwork, video._associatedIndexer)
                .add(node_subler_1.AtomTag.studio, video._associatedIndexer);
        }
        /** Subler */
        const subler = new node_subler_1.Subler(tempVideoPath, video.atoms)
            .dest(videoPath);
        /** Tag Command */
        const tagCommand = subler.buildTagCommand();
        /** Echo */
        const echo = child_process_1.spawnSync('echo', [
            tagCommand.command,
            ...tagCommand.args
        ]);
        log.debug(echo.output.join(' '));
        /** Tag */
        const tag = subler.tag();
        if (tag) {
            log.debug(JSON.stringify(tag));
        }
        else {
            log.warn('No output.');
        }
        rimraf_1.default.sync(tempFolderPath);
        this.activeDownloads.delete(video.UUID);
        this.next();
    }
    /**
     * Get
     * @param url URL
     * @param path Path
     * @returns Promise
     */
    get(url, path) {
        /** Promise */
        const promise = new Promise((resolve, reject) => {
            /** Write Stream */
            const writeStream = fs_1.createWriteStream(path);
            writeStream.on('error', () => {
                fs_1.unlinkSync(path);
            });
            /** Request */
            const request = https_1.get(url, (response) => {
                response.pipe(writeStream);
                response.on('end', resolve);
            });
            request.on('abort', reject);
            request.on('error', reject);
        });
        return promise;
    }
    /**
     * Handle Register Indexer Videos
     * @param videos Indexer Videos
     */
    handleRegisterIndexerVideos(videos) {
        videos.forEach(video => {
            video.on("addDownload" /* ADD_DOWNLOAD */, this.handleAddDownload.bind(this));
            video.on("removeDownload" /* REMOVE_DOWNLOAD */, this.handleRemoveDownload.bind(this));
        });
        this.next();
    }
    /**
     * Handle Update Indexer Videos
     * @param videos Indexer Videos
     */
    handleUpdateIndexerVideos(videos) {
        videos.forEach(video => {
            video.on("addDownload" /* ADD_DOWNLOAD */, this.handleAddDownload.bind(this));
            video.on("removeDownload" /* REMOVE_DOWNLOAD */, this.handleRemoveDownload.bind(this));
        });
        this.next();
    }
    /**
     * Handle Unregister Indexer Videos
     * @param videos Indexer Videos
     */
    handleUnregisterIndexerVideos(videos) {
        videos.forEach(video => {
            /** Current Download */
            const currentDownload = this.downloads.has(video.UUID);
            if (currentDownload) {
                this.downloads.delete(video.UUID);
            }
        });
    }
    /**
     * Hand Add Download
     * @param download Download
     */
    handleAddDownload(download) {
        /** Video */
        const video = download._associatedIndexerVideo;
        this.downloads.set(video.UUID, download);
    }
    /**
     * Handle Remove Download
     * @param download Download
     */
    handleRemoveDownload(download) {
        /** Video */
        const video = download._associatedIndexerVideo;
        /** Current Download */
        const currentDownload = this.downloads.has(video.UUID);
        if (currentDownload)
            this.downloads.delete(video.UUID);
    }
    /** Handle Shutdown */
    handleShutdown() {
        rimraf_1.default.sync(this.tempPath);
    }
}
exports.DownloadManager = DownloadManager;
//# sourceMappingURL=downloadManager.js.map