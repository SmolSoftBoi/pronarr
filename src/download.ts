import { IndexerVideo } from './indexerVideo';

/** Serialized Download */
export interface SerializedDownload {

    /** Video URL */
    videoUrl: string;

    /** Artwork URLs */
    artworkUrls: string[];
}

/** Download */
export class Download {

    /** Associated Indexer Video */
    _associatedIndexerVideo: IndexerVideo;

    /** Video URL */
    public readonly videoUrl: URL;

    /** Artwork URLs */
    public readonly artworkUrls: URL[] = [];

    /** Extension */
    public readonly videoExtension: string;

    /** Artwork Extensions */
    public readonly artworkExtensions: string[];

    /**
     * @param video Indexer Video
     * @param videoUrl URL
     * @param artworkUrls Artwork URLs
     */
    constructor(video: IndexerVideo, videoUrl: URL, artworkUrls?: URL[]) {
        this._associatedIndexerVideo = video;
        this.videoUrl = videoUrl;
        this.artworkUrls = artworkUrls || [];
        this.videoExtension = this.videoUrl.pathname.split('/').reverse()[0].split('.').reverse()[0];
        this.artworkExtensions = this.artworkUrls.map(artworkUrl => artworkUrl.pathname.split('/').reverse()[0].split('.').reverse()[0]);
    }

    /**
     * Serialize
     * @param download Download
     * @returns Serialized Download
     */
    static serialize(download: Download): SerializedDownload {
        return {
            videoUrl: download.videoUrl.href,
            artworkUrls: download.artworkUrls.map(artworkUrl => artworkUrl.href)
        };
    }

    /**
     * Deserialize
     * @param json Serialized Download
     * @param video Indexer Video
     * @returns Download
     */
    static deserialize(json: SerializedDownload, video: IndexerVideo): Download {
        /** Video URL */
        const videoUrl = new URL(json.videoUrl);

        /** Artwork URLs */
        const artworkUrls = json.artworkUrls.map(artworkUrl => new URL(artworkUrl));

        /** Download */
        const download = new Download(video, videoUrl, artworkUrls);

        return download;
    }
}