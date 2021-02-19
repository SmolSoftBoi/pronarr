import { PronarrAPI } from './api';
/** Download Manager Options */
export interface DownloadManagerOptions {
    /** Custom Downloads Path */
    customDownloadsPath?: string;
}
export declare class DownloadManager {
    /** Pronarr API */
    private readonly api;
    /** Path */
    private readonly path;
    /** Temp Path */
    private readonly tempPath;
    /** Active Downloads */
    private activeDownloads;
    /** Downloads */
    private downloads;
    /**
     * @param api Pronarr API
     * @param options Download Mannager Options
     */
    constructor(api: PronarrAPI, options?: DownloadManagerOptions);
    /** Next */
    private next;
    /**
     * Download
     * @param video Indexer Video
     */
    private download;
    /**
     * Get
     * @param url URL
     * @param path Path
     * @returns Promise
     */
    private get;
    /**
     * Handle Register Indexer Videos
     * @param videos Indexer Videos
     */
    private handleRegisterIndexerVideos;
    /**
     * Handle Update Indexer Videos
     * @param videos Indexer Videos
     */
    private handleUpdateIndexerVideos;
    /**
     * Handle Unregister Indexer Videos
     * @param videos Indexer Videos
     */
    private handleUnregisterIndexerVideos;
    /**
     * Hand Add Download
     * @param download Download
     */
    private handleAddDownload;
    /**
     * Handle Remove Download
     * @param download Download
     */
    private handleRemoveDownload;
    /** Handle Shutdown */
    private handleShutdown;
}
//# sourceMappingURL=downloadManager.d.ts.map