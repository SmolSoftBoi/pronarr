import { existsSync, readFileSync } from 'fs';

import { Logger } from '@epickris/node-logger';
import storage, { LocalStorage } from 'node-persist';

import { PluginIdentifier, PronarrAPI, IndexerIdentifier, IndexerName, IndexerPlugin, IndexerPluginConstructor, InternalAPIEvent } from './api';
import { DownloadManager, DownloadManagerOptions } from './downloadManager';
import { IndexerVideo, SerializedIndexerVideo } from './indexerVideo';
import { Plugin } from './plugin'
import { PluginManager, PluginManagerOptions } from './pluginManager';
import { User } from './user';

/** Video Storage */
const videoStorage: LocalStorage = storage.create();

/** Log */
const log = Logger.internal;

/** Pronarr Options */
export interface PronarrOptions {

    /** Pronarr Configuration? */
    config?: PronarrConfig;

    /** Keep Orphaned Cached Videos? */
    keepOrphanedCachedVideos?: boolean;

    /** Custom Plugin Path? */
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
export class Server {

    /** Pronarr API */
    private readonly api: PronarrAPI;

    /** Plugin Manager */
    private readonly pluginManager: PluginManager;

    /** Download Manager */
    private readonly downloadManager: DownloadManager;

    /** Pronarr Configuration */
    private readonly config: PronarrConfig;

    /** Keep Orphaned Cached Videos? */
    private readonly keepOrphanedCachedVideos: boolean;

    /** Cached Indexer Videos */
    private cachedIndexerVideos: IndexerVideo[] = [];

    /** Cached Videos File Created? */
    private cachedVideosFileCreated = false;

    /**
     * @param options Pronarr Options
     */
    constructor(options: PronarrOptions = {}) {
        videoStorage.initSync({
            dir: User.cachedVideoPath()
        });

        this.config = options.config || Server._loadConfig();
        this.keepOrphanedCachedVideos = options.keepOrphanedCachedVideos || false;

        this.api = new PronarrAPI();
        this.api.on(InternalAPIEvent.REGISTER_INDEXER_VIDEOS, this.handleRegisterIndexerVideos.bind(this));
        this.api.on(InternalAPIEvent.UPDATE_INDEXER_VIDEOS, this.handleUpdateIndexerVideos.bind(this));
        this.api.on(InternalAPIEvent.UNREGISTER_INDEXER_VIDEOS, this.handleUnregisterIndexerVideos.bind(this));

        /** Plugin Manager Options */
        const pluginManagerOptions: PluginManagerOptions = {
            activePlugins: this.config.plugins,
            customPluginPath: options.customPluginPath,
        };

        this.pluginManager = new PluginManager(this.api, pluginManagerOptions);

        /** Downloads Manager Options */
        const downloadManagerOptions: DownloadManagerOptions = {
            customDownloadsPath: this.config.downloads
        };

        this.downloadManager = new DownloadManager(this.api, downloadManagerOptions);
    }

    /** Start */
    public async start(): Promise<void> {
        this.loadCachedIndexerVideosFromDisk();
        this.pluginManager.initializeInstalledPlugins();

        if (this.config.indexers.length > 0) {
            this.loadIndexers();
        }

        this.restoreCachedIndexerVideos();

        this.api.signalFinished();
    }

    /**
     * Load Configuration
     * @returns Pronarr Configuration
     */
    private static _loadConfig(): PronarrConfig {
        /**
         * Look for the configuration file.
         */
        const configPath = User.configPath();

        if (!existsSync(configPath)) {
          log.warn(`config.json (${configPath}) not found.`);
        }

        /** Configuration */
        let config: Partial<PronarrConfig>;

        try {
            config = JSON.parse(readFileSync(configPath, {
                encoding: 'utf8'
            }));
        } catch (error) {
            log.error('There was a problem reading your config.json file.');
            log.error('Please try pasting your config.json file here to validate it: http://jsonlint.com');
            log.error('');
            throw error;
        }

        config.indexers = config.indexers || [];

        log.info(`Loaded config.json with ${config.indexers.length} indexers.`);

        log.info('---');

        return config as PronarrConfig;
    }

    /** Load Cached Indexer Videos from Disk */
    private loadCachedIndexerVideosFromDisk(): void {
        /** Cached Videos */
        const cachedVideos: SerializedIndexerVideo[] = videoStorage.getItem('cachedVideos');

        if (cachedVideos) {
            this.cachedIndexerVideos = cachedVideos.map(serialized => {
                return IndexerVideo.deserialize(serialized);
            });
            this.cachedVideosFileCreated = true;
        }
    }

    /** Restore Cached Indexer Videos */
    private restoreCachedIndexerVideos(): void {
        this.cachedIndexerVideos = this.cachedIndexerVideos.filter(video => {
            /** Plugin */
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            let plugin = this.pluginManager.getPlugin(video._associatedPlugin!);

            if (!plugin) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    plugin = this.pluginManager.getPluginByActiveIndexer(video._associatedIndexer!);

                    if (plugin) {
                        log.info(`When searching for the associated plugin of the indexer '${video.displayName}' it seems like the plugin \
                            name changed from '${video._associatedPlugin}' to '${plugin.getPluginIdentifier()}'. \
                            Plugin association is now being transformed!`);

                        video._associatedPlugin = plugin.getPluginIdentifier();
                    }
                } catch (error) {
                    log.info(`Could not find the associated plugin for the indexer '${video.displayName}'. \
                        Tried to find the plugin by the site name but ${error.message}`);
                }
            }

            /** Indexer Plugins */
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const indexerPlugins = plugin && plugin.getActiveIndexer(video._associatedIndexer!);

            if (!indexerPlugins) {
                log.info(`Failed to find plugin to handle accessory ${video.displayName}`);

                if (!this.keepOrphanedCachedVideos) {
                    log.info(`Removing orphaned video ${video.displayName}`);

                    return false;
                }
            } else {
                indexerPlugins.configureVideo(video);
            }

            return true;
        });
    }

    /** Save Cached Indexer Videos on Disk */
    private saveCachedIndexerVideosOnDisk(): void {
        if (this.cachedIndexerVideos.length > 0) {
            this.cachedVideosFileCreated = true;

            /** Serialized Videos */
            const serializedVideos = this.cachedIndexerVideos.map(video => IndexerVideo.serialize(video));

            videoStorage.setItemSync('cachedVideos', serializedVideos);
        } else if (this.cachedVideosFileCreated) {
            this.cachedVideosFileCreated = false;
            videoStorage.removeItemSync('cachedVideos');
        }
    }

    /** Load Indexers */
    private loadIndexers(): void {
        log.info(`Loading ${this.config.indexers.length} indexers...`);

        this.config.indexers.forEach((indexerConfig, index) => {
            if (!indexerConfig.indexer) {
                log.warn(`Your config.json contains an illegal indexer configuration object at position ${index + 1}. \
                    Missing property 'indexer'. Skipping entry...`);

                return;
            }

            /** Indexer Identifier */
            const indexerIdentifier: IndexerName | IndexerIdentifier = indexerConfig.indexer;

            /** Display Name */
            const displayName = indexerConfig.name || indexerIdentifier;

            /** Plugin */
            let plugin: Plugin;

            /** Indexer Plugin Constructor */
            let constructor: IndexerPluginConstructor;

            try {
                plugin = this.pluginManager.getPluginForIndexer(indexerIdentifier);
                constructor = plugin.getIndexerConstructor(indexerIdentifier);
            } catch (error) {
                log.warn(`Error loading indexer requested in your config.json at position ${index + 1}`);

                throw error;
            }

            /** Logger */
            const logger = Logger.withPrefix(displayName);

            logger(`Initializing ${indexerIdentifier} indexer...`);

            /** Indexer Plugin */
            const indexer: IndexerPlugin = new constructor(logger, indexerConfig, this.api);

            this.setDiscoverVideosInterval(indexer, 60);

            if (PronarrAPI.isIndexerPlugin(indexer)) {
                plugin.assignIndexer(indexerIdentifier, indexer);
            }
        });
    }

    /**
     * Set Discover Videos Interval
     * @param indexerPlugin Indexer Plugin
     * @param minutes Minutes
     */
    private async setDiscoverVideosInterval(indexerPlugin: IndexerPlugin, minutes = 60) {
        setInterval(async () => {
            await indexerPlugin.discoverVideos();

            log.debug('Triggering discoverVideos.');
        }, minutes * 60 * 1000);
    }

    /**
     * Handle Register Indexer Videos
     * @param videos Indexer Videos
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleRegisterIndexerVideos(videos: IndexerVideo[]): void {
        videos.forEach(video => {
            this.cachedIndexerVideos.push(video);

            /** Plugin */
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const plugin = this.pluginManager.getPlugin(video._associatedPlugin!);

            if (plugin) {
                /** Indexers */
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const indexers = plugin.getActiveIndexer(video._associatedIndexer!);

                if (!indexers) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    log.warn(`The plugin '${video._associatedPlugin!}' registered a new video for the indexer '${video._associatedIndexer!}'. \
                        The indexer couldn't be found though!`);
                }
            } else {
                log.warn(`An indexer configured a new video under the plugin name '${video._associatedPlugin}'. \
                    However no loaded plugin could be found for the name!`);
            }
        });

        this.saveCachedIndexerVideosOnDisk();
    }

    /**
     * Handle Update Indecer Videos
     * @param videos Indexer Videos
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleUpdateIndexerVideos(videos: IndexerVideo[]): void {
        this.saveCachedIndexerVideosOnDisk();
    }

    /**
     * Handle Unregister Indexer Videos
     * @param videos Indexer Videos
     */
    private handleUnregisterIndexerVideos(videos: IndexerVideo[]): void {
        videos.forEach(video => {
            /** Index */
            const index = this.cachedIndexerVideos.indexOf(video);

            if (index >= 0) {
                this.cachedIndexerVideos.splice(index, 1);
            }
        });

        this.saveCachedIndexerVideosOnDisk();
    }

    /** Teardown */
    teardown(): void {
        this.saveCachedIndexerVideosOnDisk();

        this.api.signalShutdown();
    }
}