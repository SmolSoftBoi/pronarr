import { PluginIdentifier, IndexerIdentifier, IndexerName } from './api';
/** Pronarr Options */
export interface PronarrOptions {
    /** Pronarr Configuration */
    config?: PronarrConfig;
    /** Keep Orphaned Cached Videos? */
    keepOrphanedCachedVideos?: boolean;
    /** Custom Plugin Path */
    customPluginPath?: string;
}
/** Pronarr Configuration */
export interface PronarrConfig {
    /** Downloads */
    downloads?: string;
    /** Indexers */
    indexers: IndexerConfig[];
    /**
     * Array to define set of active plugins.
     */
    plugins?: PluginIdentifier[];
}
/** Site Configuration */
export interface IndexerConfig extends Record<string, unknown> {
    /** Indexer */
    indexer: IndexerName | IndexerIdentifier;
    /** Name */
    name: string;
}
/** Server */
export declare class Server {
    /** Pronarr API */
    private readonly api;
    /** Plugin Manager */
    private readonly pluginManager;
    /** Downloads Manager */
    private readonly downloadsManager;
    /** Pronarr Configuration */
    private readonly config;
    /** Keep Orphaned Cached Videos? */
    private readonly keepOrphanedCachedVideos;
    /** Cached Indexer Videos */
    private cachedIndexerVideos;
    /** Cached Videos File Created? */
    private cachedVideosFileCreated;
    /**
     * @param options Pronarr Options
     */
    constructor(options?: PronarrOptions);
    /** Start */
    start(): Promise<void>;
    /**
     * Load Configuration
     * @returns Pronarr Configuration
     */
    private static _loadConfig;
    /** Load Cached Indexer Videos from Disk */
    private loadCachedIndexerVideosFromDisk;
    /** Restore Cached Indexer Videos */
    private restoreCachedIndexerVideos;
    /** Save Cached Indexer Videos on Disk */
    private saveCachedIndexerVideosOnDisk;
    /** Load Indexers */
    private loadIndexers;
    /**
     * Set Discover Videos Interval
     * @param indexerPlugin Indexer Plugin
     * @param minutes Minutes
     */
    private setDiscoverVideosInterval;
    /**
     * Handle Register Indexer Videos
     * @param videos Indexer Videos
     */
    private handleRegisterIndexerVideos;
    /**
     * Handle Update Indecer Videos
     * @param videos Indexer Videos
     */
    private handleUpdateIndexerVideos;
    /**
     * Handle Unregister Indexer Videos
     * @param videos Indexer Videos
     */
    private handleUnregisterIndexerVideos;
    /** Teardown */
    teardown(): void;
}
//# sourceMappingURL=server.d.ts.map