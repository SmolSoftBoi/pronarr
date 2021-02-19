/// <reference types="node" />
import { EventEmitter } from 'events';
import { Atoms } from 'node-subler';
import { IndexerName, PluginIdentifier, PluginName } from './api';
import { Download, SerializedDownload } from './download';
/** Unknown Context */
export declare type UnknownContext = Record<string, any>;
/** Serialized Indexer Video */
export interface SerializedIndexerVideo<T extends UnknownContext = UnknownContext> {
    /** Display Name */
    displayName: string;
    /** Path Name */
    pathName: string;
    /** ID */
    ID: string;
    /** Plugin Name */
    plugin: PluginName;
    /** Indexer */
    indexer: IndexerName;
    /** Download */
    download?: SerializedDownload;
    /** Atoms */
    atoms: Atoms;
    /** Context */
    context: T;
}
/** Indexer Video Event */
export declare const enum IndexerVideoEvent {
    /** Add Download */
    ADD_DOWNLOAD = "addDownload",
    /** Remove Download */
    REMOVE_DOWNLOAD = "removeDownload"
}
/** Indexer Video */
export declare interface IndexerVideo {
    /**
     * On Add Download
     * @param event Add Download Event
     * @param listener Listener
     */
    on(event: 'addDownload', listener: (download: Download) => void): this;
    /**
     * On Remove Download
     * @param event Remove Download Event
     * @param listener Listener
     */
    on(event: 'removeDownload', listener: (download: Download) => void): this;
    /**
     * Emit Add Download
     * @param event Add Download Event
     * @param event Download
     */
    emit(event: 'addDownload', download: Download): boolean;
    /**
     * Emit Remove Download
     * @param event Add Remove Event
     */
    emit(event: 'removeDownload', download: Download): boolean;
}
/** Indexer Video */
export declare class IndexerVideo<T extends UnknownContext = UnknownContext> extends EventEmitter {
    /**
     * Present as soon as it is registered.
     */
    _associatedPlugin?: PluginIdentifier;
    /** Associated Indexer */
    _associatedIndexer?: IndexerName;
    /** Display Name */
    displayName: string;
    /** Path Name */
    pathName: string;
    /** ID */
    ID: string;
    /** UUID */
    get UUID(): string;
    /** Download */
    private download?;
    /** Atoms */
    atoms: Atoms;
    /**
     * This is a way for Plugin developers to store custom data with their video.
     */
    context: T;
    /**
     * @param displayName Display Name
     * @param id ID
     */
    constructor(displayName: string, id: string);
    /**
     * Add Download
     * @param videoUrl URL
     * @param artworkUrls Artwork URLs
     * @returns Download
     */
    addDownload(videoUrl: URL, artworkUrls?: URL[]): Download;
    /**
     * Remove Download
     */
    removeDownload(): void;
    /**
     * Get Download
     * @returns Download
     */
    getDownload(): Download | undefined;
    /**
     * Serialize
     * @param video Indexer Video
     * @returns Serialized Indexer Video
     */
    static serialize(video: IndexerVideo): SerializedIndexerVideo;
    /**
     * Deserialize
     * @param json Serialized Indexer Video
     * @returns Indexer Video
     */
    static deserialize(json: SerializedIndexerVideo): IndexerVideo;
}
//# sourceMappingURL=indexerVideo.d.ts.map