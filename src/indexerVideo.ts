import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import { join } from 'path';

import { Atoms, AtomTag, MediaKind } from 'node-subler';

import { IndexerName, PluginIdentifier, PluginName } from './api';
import { Download, SerializedDownload } from './download';
import { User } from './user';

/** Unknown Context */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnknownContext = Record<string, any>;

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
export const enum IndexerVideoEvent {

    /** Add Download */
    ADD_DOWNLOAD = 'addDownload',

    /** Remove Download */
    REMOVE_DOWNLOAD = 'removeDownload'
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
export class IndexerVideo<T extends UnknownContext = UnknownContext> extends EventEmitter {

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
    get UUID(): string {
        return `${this._associatedPlugin}-${this.ID}`;
    }

    /** Download */
    private download?: Download;

    /** Atoms */
    public atoms: Atoms = new Atoms();

    /**
     * This is a way for Plugin developers to store custom data with their video.
     */
    public context: T = {} as T;

    /**
     * @param displayName Display Name
     * @param id ID
     */
    constructor(displayName: string, id: string) {
        super();

        this.displayName = displayName;
        this.ID = id;
        this.pathName = this.displayName.replace(':', '');

        this.atoms
            .add(AtomTag.name, displayName)
            .add(AtomTag.mediaKind, MediaKind.TV_SHOW)
            .add(AtomTag.genre, 'Porn')
            .add(AtomTag.tvEpisodeId, this.ID)
            .add(AtomTag.rating, 'Unknown');

        if (this._associatedIndexer) {
            this.atoms
                .add(AtomTag.artist, this._associatedIndexer)
                .add(AtomTag.album, this._associatedIndexer)
                .add(AtomTag.tvShow, this._associatedIndexer)
                .add(AtomTag.tvNetwork, this._associatedIndexer)
                .add(AtomTag.studio, this._associatedIndexer);
        }
    }

    /**
     * Add Download
     * @param videoUrl URL
     * @param artworkUrls Artwork URLs
     * @returns Download
     */
    public addDownload(videoUrl: URL, artworkUrls?: URL[]): Download {
        if (this.download) this.removeDownload();

        /** Download */
        const download = new Download(this, videoUrl, artworkUrls);

        this.download = download;
        this.download._associatedIndexerVideo = this;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (!existsSync(join(User.downloadsPath(), this._associatedIndexer!, `${this.ID} ${this.pathName}.m4v`))) {
            this.emit(IndexerVideoEvent.ADD_DOWNLOAD, this.download);
        }

        return this.download;
    }

    /**
     * Remove Download
     */
    public removeDownload(): void {
        if (this.download) {
            this.emit(IndexerVideoEvent.REMOVE_DOWNLOAD, this.download);

            this.download = undefined;
        }
    }

    /**
     * Get Download
     * @returns Download
     */
    public getDownload(): Download | undefined {
        return this.download;
    }

    /**
     * Serialize
     * @param video Indexer Video
     * @returns Serialized Indexer Video
     */
    static serialize(video: IndexerVideo): SerializedIndexerVideo {
        return {
            displayName: video.displayName,
            pathName: video.pathName,
            ID: video.ID,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            plugin: video._associatedPlugin!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            indexer: video._associatedIndexer!,
            download: video.download ? Download.serialize(video.download) : undefined,
            atoms: video.atoms,
            context: video.context
        };
    }

    /**
     * Deserialize
     * @param json Serialized Indexer Video
     * @returns Indexer Video
     */
    static deserialize(json: SerializedIndexerVideo): IndexerVideo {
        /** Indexer Video */
        const indexerVideo = new IndexerVideo(json.displayName, json.ID);

        indexerVideo._associatedPlugin = json.plugin;
        indexerVideo._associatedIndexer = json.indexer;
        indexerVideo.pathName = json.pathName;
        indexerVideo.atoms = Object.assign(new Atoms(), json.atoms.inner.map(atom => Object.assign(new Atoms(), atom)));
        indexerVideo.context = json.context;

        if (json.download) indexerVideo.download = Download.deserialize(json.download, indexerVideo)

        return indexerVideo;
    }
}