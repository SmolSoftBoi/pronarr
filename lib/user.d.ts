/**
 * Manages user settings and storage locations.
 */
export declare class User {
    /** Custom Storage Path */
    private static customStoragePath?;
    /** Custom Downloads Path */
    private static customDownloadsPath?;
    /** Storage Accessed? */
    private static storageAccessed;
    /** Downloads Accessed? */
    private static downloadsAccessed;
    /**
     * Configuration Path
     * @returns Configuration Path
     */
    static configPath(): string;
    /**
     * Persist Path
     * @returns Persist Path
     */
    static persistPath(): string;
    /**
     * Cached Video Path
     * @returns Cached Video Path
     */
    static cachedVideoPath(): string;
    /**
     * Temp Downloads Path
     * @returns Temp Downloads Path
     */
    static tempDownloadsPath(): string;
    /**
     * Storage Path
     * @returns Storage Path
     */
    static storagePath(): string;
    /**
     * Downloads Path
     * @returns Downloads Path
     */
    static downloadsPath(): string;
    /**
     * Set Storage Path
     * @param storagePathSegments Storage Path Segments
     */
    static setStoragePath(...storagePathSegments: string[]): void;
    /**
     * Set Downloads Path
     * @param downloadsPathSegments Downloads Path Segments
     */
    static setDownloadsPath(...downloadsPathSegments: string[]): void;
}
//# sourceMappingURL=user.d.ts.map