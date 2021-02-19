"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PronarrAPI = exports.InternalAPIEvent = exports.APIEvent = exports.PluginType = void 0;
const events_1 = require("events");
const indexerVideo_1 = require("./indexerVideo");
const version_1 = __importDefault(require("./version"));
/** Plugin Type */
var PluginType;
(function (PluginType) {
    /** Indexer */
    PluginType["INDEXER"] = "indexer";
})(PluginType = exports.PluginType || (exports.PluginType = {}));
/** API Event */
var APIEvent;
(function (APIEvent) {
    /**
     * Event is fired once Pronarr has finished with booting up and initializing all components and sites.
     */
    APIEvent["DID_FINISH_LAUNCHING"] = "didFinishLaunching";
    /**
     * This event is fired when Pronarr got shutdown.
     * This could be a regular shutdown or a unexpected crash.
     * At this stage all Sites are already unpublished and saved to disk!
     */
    APIEvent["SHUTDOWN"] = "shutdown";
})(APIEvent = exports.APIEvent || (exports.APIEvent = {}));
/** Internal API Event */
var InternalAPIEvent;
(function (InternalAPIEvent) {
    /** Register Site */
    InternalAPIEvent["REGISTER_INDEXER"] = "registerIndexer";
    /** Register Indexer Videos */
    InternalAPIEvent["REGISTER_INDEXER_VIDEOS"] = "registerIndexerVideos";
    /** Update Indexer Videos */
    InternalAPIEvent["UPDATE_INDEXER_VIDEOS"] = "updateIndexerVideos";
    /** Unregister Indexer Videos */
    InternalAPIEvent["UNREGISTER_INDEXER_VIDEOS"] = "unregisterIndexerVideos";
})(InternalAPIEvent = exports.InternalAPIEvent || (exports.InternalAPIEvent = {}));
/** Pronarr API */
class PronarrAPI extends events_1.EventEmitter {
    constructor() {
        super();
        /** Version */
        this.version = 0.1;
        /** Server Version */
        this.serverVersion = version_1.default();
        /** Indexer Video */
        this.indexerVideo = indexerVideo_1.IndexerVideo;
    }
    /**
     * Is Indexer Plugin?
     * @param indexerPlugin Indexer Plugin
     * @returns Is Indexer Plugin?
     */
    static isIndexerPlugin(indexerPlugin) {
        return 'configureVideo' in indexerPlugin;
    }
    /** Signal Finished */
    signalFinished() {
        this.emit("didFinishLaunching" /* DID_FINISH_LAUNCHING */);
    }
    /** Signal Shutdown */
    signalShutdown() {
        this.emit("shutdown" /* SHUTDOWN */);
    }
    /**
     * Register Indexer
     * @param indexerName Indexer Name
     * @param constructor Indexer Plugin Constructor
     */
    registerIndexer(indexerName, constructor) {
        this.emit("registerIndexer" /* REGISTER_INDEXER */, indexerName, constructor);
    }
    /**
     * Register Indexer Videos
     * @param pluginIdentifier Plugin Identifier
     * @param indexerName Indexer Name
     * @param videos Indexer Videos
     */
    registerIndexerVideos(pluginIdentifier, indexerName, videos) {
        videos.forEach(video => {
            if (!(video instanceof indexerVideo_1.IndexerVideo)) {
                throw new Error(`${pluginIdentifier} - ${indexerName} attempt to register a videos that isn't IndexerVideo!`);
            }
            video._associatedPlugin = pluginIdentifier;
            video._associatedIndexer = indexerName;
        });
        this.emit("registerIndexerVideos" /* REGISTER_INDEXER_VIDEOS */, videos);
    }
    /**
     * Update Indexer Videos
     * @param videos Indexer Videos
     */
    updateIndexerVideos(videos) {
        this.emit("updateIndexerVideos" /* UPDATE_INDEXER_VIDEOS */, videos);
    }
    /**
     * Unregister Indexer Videos
     * @param pluginIdentifier Plugin Identifier
     * @param indexerName Indexer Name
     * @param videos Indexer Videos
     */
    unregisterIndexerVideos(pluginIdentifier, indexerName, videos) {
        videos.forEach(accessory => {
            if (!(accessory instanceof indexerVideo_1.IndexerVideo)) {
                throw new Error(`${pluginIdentifier} - ${indexerName} attempt to unregister a video that isn't IndexerVideo!`);
            }
        });
        this.emit("unregisterIndexerVideos" /* UNREGISTER_INDEXER_VIDEOS */, videos);
    }
}
exports.PronarrAPI = PronarrAPI;
//# sourceMappingURL=api.js.map