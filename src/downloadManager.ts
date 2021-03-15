
import { createWriteStream, existsSync, mkdirSync, PathLike, unlinkSync } from 'fs';
import { get } from 'https';
import { join } from 'path';

import { Logger } from '@epickris/node-logger';
import { AtomTag, Subler } from 'node-subler';
import rimraf from 'rimraf';

import { InternalAPIEvent, PronarrAPI } from './api';
import { IndexerVideo, IndexerVideoEvent } from './indexerVideo';
import { User } from './user';
import { Download } from './download';

/** Log */
const log = Logger.internal;

/** Download Manager Options */
export interface DownloadManagerOptions {

    /** Custom Downloads Path? */
    customDownloadsPath?: string;

    /** Debug Mode Enabled? */
    debugModeEnabled?: boolean;
}

/** Download Manager */
export class DownloadManager {

    /** Pronarr API */
    private readonly api: PronarrAPI;

    /** Path */
    private readonly path: string;

    /** Temp Path */
    private readonly tempPath: string;

    /** Active Downloads */
    private activeDownloads: Map<string, Download> = new Map();

    /** Downloads */
    private downloads: Map<string, Download> = new Map();

    /** Debug Mode Enabled */
    private debugModeEnabled = false;

    /**
     * @param api Pronarr API
     * @param options Download Mannager Options
     */
    constructor(api: PronarrAPI, options?: DownloadManagerOptions) {
        this.api = api;

        if (options) {
            if (options.customDownloadsPath) {
                User.setDownloadsPath(options.customDownloadsPath);
            }

            if (options.debugModeEnabled) {
                this.debugModeEnabled = options.debugModeEnabled;
            }
        }

        this.path = User.downloadsPath();
        this.tempPath = User.tempDownloadsPath();

        if (!existsSync(this.path)) mkdirSync(this.path, {
            recursive: true
        });

        this.api.on(InternalAPIEvent.REGISTER_INDEXER_VIDEOS, this.handleRegisterIndexerVideos.bind(this));
        this.api.on(InternalAPIEvent.UPDATE_INDEXER_VIDEOS, this.handleUpdateIndexerVideos.bind(this));
        this.api.on(InternalAPIEvent.UNREGISTER_INDEXER_VIDEOS, this.handleUnregisterIndexerVideos.bind(this));

        this.api.on('shutdown', this.handleShutdown.bind(this));

        this.next();
    }

    /** Next */
    private async next() {
        if (this.downloads.size === 0 || this.activeDownloads.size >= 2) return;

        /** Key */
        const key = this.downloads.entries().next().value[0];

        /** Download */
        const download = this.downloads.get(key);

        if (download) {
            this.downloads.delete(key);
            this.activeDownloads.set(key, download);
            this.download(download);

            if (this.activeDownloads.size < 3) this.next();
        }
    }

    /**
     * Download
     * @param video Indexer Video
     */
    private async download(download: Download) {
        /** Video */
        const video = download._associatedIndexerVideo;

        /** Temp Folder Path */
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tempFolderPath = join(this.tempPath, video._associatedIndexer!, `${video.ID} ${video.pathName}`);

        if (!existsSync(tempFolderPath)) mkdirSync(tempFolderPath, {
            recursive: true
        });

        /** Temp Video Path */
        const tempVideoPath = join(tempFolderPath, `video.${download.videoExtension}`);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await this.get(download.videoUrl, tempVideoPath);
                break;
            } catch (error) {
                log.error(error);
            }
        }

        /** Promises */
        const promises: Promise<void>[] = [];

        download.artworkUrls.forEach((artworkUrl, index) => {
            /** Promise */
            const promise = new Promise<void>(resolve => {
                /** Temp Artwork Path */
                const tempArtworkPath = join(tempFolderPath, `artwork-${index}.${download.artworkExtensions[index]}`);

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    try {
                        this.get(artworkUrl, tempArtworkPath).then(() => {
                            video.atoms.add(AtomTag.artwork, tempArtworkPath);
                            resolve();
                        });
                        break;
                    } catch (error) {
                        log.error(error);
                    }
                }
            });

            promises.push(promise);
        });

        await Promise.all(promises);

        /** Folder PAth */
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const folderPath = join(this.path, video._associatedIndexer!);

        if (!existsSync(folderPath)) mkdirSync(folderPath, {
            recursive: true
        });

        /** Video Path */
        const videoPath = join(folderPath, `${video.ID} ${video.pathName}.m4v`);

        if (video._associatedIndexer) {
            video.atoms
                .add(AtomTag.artist, video._associatedIndexer)
                .add(AtomTag.album, video._associatedIndexer)
                .add(AtomTag.tvShow, video._associatedIndexer)
                .add(AtomTag.tvNetwork, video._associatedIndexer)
                .add(AtomTag.studio, video._associatedIndexer);
        }

        /** Subler */
        const subler = new Subler(tempVideoPath, video.atoms)
            .dest(videoPath);

        /** Tag Command */
        const tagCommand = subler.buildTagCommand();

        log.debug(tagCommand.command, ...tagCommand.args);

        /** Tag */
        const tag = subler.tag();

        if (tag) {
            log.debug(JSON.stringify(tag));
        } else {
            log.warn('No output.');
        }

        if (!this.debugModeEnabled) rimraf.sync(tempFolderPath);

        this.activeDownloads.delete(video.UUID);
        this.next();
    }

    /**
     * Get
     * @param url URL
     * @param path Path
     * @returns Promise
     */
    private get(url: URL, path: PathLike) {
        /** Promise */
        const promise = new Promise((resolve, reject) => {
            /** Write Stream */
            const writeStream = createWriteStream(path);

            writeStream.on('error', () => {
                unlinkSync(path);
            });

            /** Request */
            const request = get(url, (response) => {
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
    private handleRegisterIndexerVideos(videos: IndexerVideo[]) {
        videos.forEach(video => {
            video.on(IndexerVideoEvent.ADD_DOWNLOAD, this.handleAddDownload.bind(this));
            video.on(IndexerVideoEvent.REMOVE_DOWNLOAD, this.handleRemoveDownload.bind(this));
        });

        this.next();
    }

    /**
     * Handle Update Indexer Videos
     * @param videos Indexer Videos
     */
     private handleUpdateIndexerVideos(videos: IndexerVideo[]) {
        videos.forEach(video => {
            video.on(IndexerVideoEvent.ADD_DOWNLOAD, this.handleAddDownload.bind(this));
            video.on(IndexerVideoEvent.REMOVE_DOWNLOAD, this.handleRemoveDownload.bind(this));
        });

        this.next();
    }

    /**
     * Handle Unregister Indexer Videos
     * @param videos Indexer Videos
     */
    private handleUnregisterIndexerVideos(videos: IndexerVideo[]) {
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
    private handleAddDownload(download: Download) {
        /** Video */
        const video = download._associatedIndexerVideo;

        this.downloads.set(video.UUID, download);
    }

    /**
     * Handle Remove Download
     * @param download Download
     */
    private handleRemoveDownload(download: Download) {
        /** Video */
        const video = download._associatedIndexerVideo;

        /** Current Download */
        const currentDownload = this.downloads.has(video.UUID);

        if (currentDownload) this.downloads.delete(video.UUID);
    }

    /** Handle Shutdown */
    private handleShutdown() {
        if (this.debugModeEnabled) rimraf.sync(this.tempPath);
    }
}