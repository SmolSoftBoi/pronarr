/// <reference types="node" />
import { EventEmitter } from 'events';
import { Logging } from '@epickris/node-logger';
import { IndexerVideo } from './indexerVideo';
import { IndexerConfig } from './server';
/** Plugin Identifier */
export declare type PluginIdentifier = PluginName | ScopedPluginName;
/** Plugin Name */
export declare type PluginName = string;
/** Scoped Plugin Name */
export declare type ScopedPluginName = string;
/** Indexer Name */
export declare type IndexerName = string;
/** Indexer Identifier */
export declare type IndexerIdentifier = string;
/** Plugin Type */
export declare const enum PluginType {
    /** Indexer */
    INDEXER = "indexer"
}
/**
 * The {PluginInitializer} is a method which must be the default export for every Pronarr plugin.
 * It is called once the plugin is loaded from disk.
 */
export interface PluginInitializer {
    /**
     * When the initializer is called the site must use the provided api instance and call the appropriate register methods
     * - {@link API.registerIndexer}
     * - in order to correctly register for the following startup sequence.
     * @param {API} api
     */
    (api: API): void;
}
/** Indexer Plugin Constructor */
export interface IndexerPluginConstructor {
    new (logger: Logging, config: IndexerConfig, api: API): IndexerPlugin;
}
/** Indexer Plugin */
export interface IndexerPlugin {
    /**
     * This method is called for every Video, which is recreated from disk on startup.
     * It should be used to properly initialize the Video and setup all event handlers.
     * @param video Video which needs to be configured.
     */
    configureVideo(video: IndexerVideo): void;
    /** Discover Videos */
    discoverVideos(): void;
}
/** API Event */
export declare const enum APIEvent {
    /**
     * Event is fired once Pronarr has finished with booting up and initializing all components and sites.
     */
    DID_FINISH_LAUNCHING = "didFinishLaunching",
    /**
     * This event is fired when Pronarr got shutdown.
     * This could be a regular shutdown or a unexpected crash.
     * At this stage all Sites are already unpublished and saved to disk!
     */
    SHUTDOWN = "shutdown"
}
/** Internal API Event */
export declare const enum InternalAPIEvent {
    /** Register Site */
    REGISTER_INDEXER = "registerIndexer",
    /** Register Indexer Videos */
    REGISTER_INDEXER_VIDEOS = "registerIndexerVideos",
    /** Update Indexer Videos */
    UPDATE_INDEXER_VIDEOS = "updateIndexerVideos",
    /** Unregister Indexer Videos */
    UNREGISTER_INDEXER_VIDEOS = "unregisterIndexerVideos"
}
/** API */
export declare interface API {
    /**
     * On Did Finish Launching
     * @param event Did Finish Launching Event
     * @param listener Listener
     */
    on(event: 'didFinishLaunching', listener: () => void): this;
    /**
     * On Shutown
     * @param event Shutown Event
     * @param listener Listener
     */
    on(event: 'shutdown', listener: () => void): this;
}
/** API */
export interface API {
    /** Version */
    readonly version: number;
    /** Server Version */
    readonly serverVersion: string;
    /** Indexer Video */
    readonly indexerVideo: typeof IndexerVideo;
    /**
     * Register Indexer
     * @param indexerName Indexer Name
     * @param constructor Indexer Plugin Constructor
     */
    registerIndexer(indexerName: IndexerName, constructor: IndexerPluginConstructor): void;
    /**
     * Register Indexer Videos
     * @param pluginIdentifier Plugin Identifier
     * @param indexerName Indexer Name
     * @param videos Indexer Videos
     */
    registerIndexerVideos(pluginIdentifier: PluginIdentifier, indexerName: IndexerName, videos: IndexerVideo[]): void;
    /**
     * Update Indexer Videos
     * @param videos Indexer Videos
     */
    updateIndexerVideos(videos: IndexerVideo[]): void;
    /**
     * Unregister Indexer Videos
     * @param pluginIdentifier Plugin Identifier
     * @param indexerName Indexer Name
     * @param videos Indexer Videos
     */
    unregisterIndexerVideos(pluginIdentifier: PluginIdentifier, indexerName: IndexerName, videos: IndexerVideo[]): void;
}
/** Pronarr API */
export declare interface PronarrAPI {
    /**
     * On Did Finish Launching
     * @param event Did Finish Launching Event
     * @param listener Listener
     */
    on(event: 'didFinishLaunching', listener: () => void): this;
    /**
     * On Shutdown
     * @param event Shutdown Event
     * @param listener Listener
     */
    on(event: 'shutdown', listener: () => void): this;
    /**
     * On Register Site
     * @param event Register Site Event
     * @param listener Listener
     */
    on(event: InternalAPIEvent.REGISTER_INDEXER, listener: (siteName: IndexerName, siteConstructor: IndexerPluginConstructor, PluginIdentifier?: PluginIdentifier) => void): this;
    /**
     * On Register Indexer Videos
     * @param event Register Indexer Videos Event
     * @param listener Listener
     */
    on(event: InternalAPIEvent.REGISTER_INDEXER_VIDEOS, listener: (videos: IndexerVideo[]) => void): this;
    /**
     * On Update Indexer Videos
     * @param event Update Indexer Videos Event
     * @param listener Listener
     */
    on(event: InternalAPIEvent.UPDATE_INDEXER_VIDEOS, listener: (videos: IndexerVideo[]) => void): this;
    /**
     * On Unregister Indexer Videos
     * @param event Unregister Indexer Videos Event
     * @param listener Listener
     */
    on(event: InternalAPIEvent.UNREGISTER_INDEXER_VIDEOS, listener: (videos: IndexerVideo[]) => void): this;
    /**
     * Emit Did Finish Launching
     * @param event Did Finish Launching Event
     */
    emit(event: 'didFinishLaunching'): boolean;
    /**
     * Emit Shutdown
     * @param event Shutdown Event
     */
    emit(event: 'shutdown'): boolean;
    /**
     * Emit Register Indexer
     * @param event Register Indexer Event
     * @param indexerName Indexer Name
     * @param indexerConstructor Indexer Plugin Constructor
     */
    emit(event: InternalAPIEvent.REGISTER_INDEXER, indexerName: IndexerName, indexerConstructor: IndexerPluginConstructor, pluginIdentifier?: PluginIdentifier): boolean;
    /**
     * Emit Register Indexer Videos
     * @param event Register Indexer Videos Event
     * @param videos Indexer Videos
     */
    emit(event: InternalAPIEvent.REGISTER_INDEXER_VIDEOS, videos: IndexerVideo[]): boolean;
    /**
     * Emit Update Indexer Videos
     * @param event Update Indexer Videos Event
     * @param videos Indexer Videos
     */
    emit(event: InternalAPIEvent.UPDATE_INDEXER_VIDEOS, videos: IndexerVideo[]): boolean;
    /**
     * Emit Unregister Indexer Videos
     * @param event Unregister Indexer Videos
     * @param videos Indexer Videos
     */
    emit(event: InternalAPIEvent.UNREGISTER_INDEXER_VIDEOS, videos: IndexerVideo[]): boolean;
}
/** Pronarr API */
export declare class PronarrAPI extends EventEmitter implements API {
    /** Version */
    readonly version = 0.1;
    /** Server Version */
    readonly serverVersion: string;
    /** Indexer Video */
    readonly indexerVideo: typeof IndexerVideo;
    constructor();
    /**
     * Is Indexer Plugin?
     * @param indexerPlugin Indexer Plugin
     * @returns Is Indexer Plugin?
     */
    static isIndexerPlugin(indexerPlugin: IndexerPlugin): indexerPlugin is IndexerPlugin;
    /** Signal Finished */
    signalFinished(): void;
    /** Signal Shutdown */
    signalShutdown(): void;
    /**
     * Register Indexer
     * @param indexerName Indexer Name
     * @param constructor Indexer Plugin Constructor
     */
    registerIndexer(indexerName: IndexerName, constructor: IndexerPluginConstructor): void;
    /**
     * Register Indexer Videos
     * @param pluginIdentifier Plugin Identifier
     * @param indexerName Indexer Name
     * @param videos Indexer Videos
     */
    registerIndexerVideos(pluginIdentifier: PluginIdentifier, indexerName: IndexerName, videos: IndexerVideo[]): void;
    /**
     * Update Indexer Videos
     * @param videos Indexer Videos
     */
    updateIndexerVideos(videos: IndexerVideo[]): void;
    /**
     * Unregister Indexer Videos
     * @param pluginIdentifier Plugin Identifier
     * @param indexerName Indexer Name
     * @param videos Indexer Videos
     */
    unregisterIndexerVideos(pluginIdentifier: PluginIdentifier, indexerName: IndexerName, videos: IndexerVideo[]): void;
}
//# sourceMappingURL=api.d.ts.map