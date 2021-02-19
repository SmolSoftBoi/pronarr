"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const fs_1 = require("fs");
const node_logger_1 = require("@epickris/node-logger");
const node_persist_1 = __importDefault(require("node-persist"));
const api_1 = require("./api");
const downloadManager_1 = require("./downloadManager");
const indexerVideo_1 = require("./indexerVideo");
const pluginManager_1 = require("./pluginManager");
const user_1 = require("./user");
/** Video Storage */
const videoStorage = node_persist_1.default.create();
/** Log */
const log = node_logger_1.Logger.internal;
/** Server */
class Server {
    /**
     * @param options Pronarr Options
     */
    constructor(options = {}) {
        /** Cached Indexer Videos */
        this.cachedIndexerVideos = [];
        /** Cached Videos File Created? */
        this.cachedVideosFileCreated = false;
        videoStorage.initSync({
            dir: user_1.User.cachedVideoPath()
        });
        this.config = options.config || Server._loadConfig();
        this.keepOrphanedCachedVideos = options.keepOrphanedCachedVideos || false;
        this.api = new api_1.PronarrAPI();
        this.api.on("registerIndexerVideos" /* REGISTER_INDEXER_VIDEOS */, this.handleRegisterIndexerVideos.bind(this));
        this.api.on("updateIndexerVideos" /* UPDATE_INDEXER_VIDEOS */, this.handleUpdateIndexerVideos.bind(this));
        this.api.on("unregisterIndexerVideos" /* UNREGISTER_INDEXER_VIDEOS */, this.handleUnregisterIndexerVideos.bind(this));
        /** Plugin Manager Options */
        const pluginManagerOptions = {
            activePlugins: this.config.plugins,
            customPluginPath: options.customPluginPath,
        };
        this.pluginManager = new pluginManager_1.PluginManager(this.api, pluginManagerOptions);
        /** Downloads Manager Options */
        const downloadManagerOptions = {
            customDownloadsPath: this.config.downloads
        };
        this.downloadsManager = new downloadManager_1.DownloadManager(this.api, downloadManagerOptions);
    }
    /** Start */
    async start() {
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
    static _loadConfig() {
        /**
         * Look for the configuration file.
         */
        const configPath = user_1.User.configPath();
        if (!fs_1.existsSync(configPath)) {
            log.warn(`config.json (${configPath}) not found.`);
        }
        /** Configuration */
        let config;
        try {
            config = JSON.parse(fs_1.readFileSync(configPath, {
                encoding: 'utf8'
            }));
        }
        catch (error) {
            log.error('There was a problem reading your config.json file.');
            log.error('Please try pasting your config.json file here to validate it: http://jsonlint.com');
            log.error('');
            throw error;
        }
        config.indexers = config.indexers || [];
        log.info(`Loaded config.json with ${config.indexers.length} indexers.`);
        log.info('---');
        return config;
    }
    /** Load Cached Indexer Videos from Disk */
    loadCachedIndexerVideosFromDisk() {
        /** Cached Videos */
        const cachedVideos = videoStorage.getItem('cachedVideos');
        if (cachedVideos) {
            this.cachedIndexerVideos = cachedVideos.map(serialized => {
                return indexerVideo_1.IndexerVideo.deserialize(serialized);
            });
            this.cachedVideosFileCreated = true;
        }
    }
    /** Restore Cached Indexer Videos */
    restoreCachedIndexerVideos() {
        this.cachedIndexerVideos = this.cachedIndexerVideos.filter(video => {
            /** Plugin */
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            let plugin = this.pluginManager.getPlugin(video._associatedPlugin);
            if (!plugin) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    plugin = this.pluginManager.getPluginByActiveIndexer(video._associatedIndexer);
                    if (plugin) {
                        log.info(`When searching for the associated plugin of the indexer '${video.displayName}' it seems like the plugin \
                            name changed from '${video._associatedPlugin}' to '${plugin.getPluginIdentifier()}'. \
                            Plugin association is now being transformed!`);
                        video._associatedPlugin = plugin.getPluginIdentifier();
                    }
                }
                catch (error) {
                    log.info(`Could not find the associated plugin for the indexer '${video.displayName}'. \
                        Tried to find the plugin by the site name but ${error.message}`);
                }
            }
            /** Indexer Plugins */
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const indexerPlugins = plugin && plugin.getActiveIndexer(video._associatedIndexer);
            if (!indexerPlugins) {
                log.info(`Failed to find plugin to handle accessory ${video.displayName}`);
                if (!this.keepOrphanedCachedVideos) {
                    log.info(`Removing orphaned video ${video.displayName}`);
                    return false;
                }
            }
            else {
                indexerPlugins.configureVideo(video);
            }
            return true;
        });
    }
    /** Save Cached Indexer Videos on Disk */
    saveCachedIndexerVideosOnDisk() {
        if (this.cachedIndexerVideos.length > 0) {
            this.cachedVideosFileCreated = true;
            /** Serialized Videos */
            const serializedVideos = this.cachedIndexerVideos.map(video => indexerVideo_1.IndexerVideo.serialize(video));
            videoStorage.setItemSync('cachedVideos', serializedVideos);
        }
        else if (this.cachedVideosFileCreated) {
            this.cachedVideosFileCreated = false;
            videoStorage.removeItemSync('cachedVideos');
        }
    }
    /** Load Indexers */
    loadIndexers() {
        log.info(`Loading ${this.config.indexers.length} indexers...`);
        this.config.indexers.forEach((indexerConfig, index) => {
            if (!indexerConfig.indexer) {
                log.warn(`Your config.json contains an illegal indexer configuration object at position ${index + 1}. \
                    Missing property 'indexer'. Skipping entry...`);
                return;
            }
            /** Indexer Identifier */
            const indexerIdentifier = indexerConfig.indexer;
            /** Display Name */
            const displayName = indexerConfig.name || indexerIdentifier;
            /** Plugin */
            let plugin;
            /** Indexer Plugin Constructor */
            let constructor;
            try {
                plugin = this.pluginManager.getPluginForIndexer(indexerIdentifier);
                constructor = plugin.getIndexerConstructor(indexerIdentifier);
            }
            catch (error) {
                log.warn(`Error loading indexer requested in your config.json at position ${index + 1}`);
                throw error;
            }
            /** Logger */
            const logger = node_logger_1.Logger.withPrefix(displayName);
            logger(`Initializing ${indexerIdentifier} indexer...`);
            /** Indexer Plugin */
            const indexer = new constructor(logger, indexerConfig, this.api);
            this.setDiscoverVideosInterval(indexer, 60);
            if (api_1.PronarrAPI.isIndexerPlugin(indexer)) {
                plugin.assignIndexer(indexerIdentifier, indexer);
            }
        });
    }
    /**
     * Set Discover Videos Interval
     * @param indexerPlugin Indexer Plugin
     * @param minutes Minutes
     */
    async setDiscoverVideosInterval(indexerPlugin, minutes = 60) {
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
    handleRegisterIndexerVideos(videos) {
        videos.forEach(video => {
            this.cachedIndexerVideos.push(video);
            /** Plugin */
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const plugin = this.pluginManager.getPlugin(video._associatedPlugin);
            if (plugin) {
                /** Indexers */
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const indexers = plugin.getActiveIndexer(video._associatedIndexer);
                if (!indexers) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    log.warn(`The plugin '${video._associatedPlugin}' registered a new video for the indexer '${video._associatedIndexer}'. \
                        The indexer couldn't be found though!`);
                }
            }
            else {
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
    handleUpdateIndexerVideos(videos) {
        this.saveCachedIndexerVideosOnDisk();
    }
    /**
     * Handle Unregister Indexer Videos
     * @param videos Indexer Videos
     */
    handleUnregisterIndexerVideos(videos) {
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
    teardown() {
        this.saveCachedIndexerVideosOnDisk();
        this.api.signalShutdown();
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map