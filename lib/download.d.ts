import { IndexerVideo } from './indexerVideo';
/** Serialized Download */
export interface SerializedDownload {
    /** Video URL */
    videoUrl: string;
    /** Artwork URLs */
    artworkUrls: string[];
}
/** Download */
export declare class Download {
    /** Associated Indexer Video */
    _associatedIndexerVideo: IndexerVideo;
    /** Video URL */
    readonly videoUrl: URL;
    /** Artwork URLs */
    readonly artworkUrls: URL[];
    /** Extension */
    readonly videoExtension: string;
    /** Artwork Extensions */
    readonly artworkExtensions: string[];
    /**
     * @param video Indexer Video
     * @param videoUrl URL
     * @param artworkUrls Artwork URLs
     */
    constructor(video: IndexerVideo, videoUrl: URL, artworkUrls?: URL[]);
    /**
     * Serialize
     * @param download Download
     * @returns Serialized Download
     */
    static serialize(download: Download): SerializedDownload;
    /**
     * Deserialize
     * @param json Serialized Download
     * @param video Indexer Video
     * @returns Download
     */
    static deserialize(json: SerializedDownload, video: IndexerVideo): Download;
}
//# sourceMappingURL=download.d.ts.map