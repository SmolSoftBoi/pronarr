import { homedir } from 'os';
import { join, resolve } from 'path';

/**
 * Manages user settings and storage locations.
 */
export class User {

    /** Custom Storage Path */
    private static customStoragePath?: string;

    /** Custom Downloads Path */
    private static customDownloadsPath?: string;

    /** Storage Accessed? */
    private static storageAccessed = false;

    /** Downloads Accessed? */
    private static downloadsAccessed = false;

    /**
     * Configuration Path
     * @returns Configuration Path
     */
    static configPath(): string {
        return join(User.storagePath(), 'config.json');
    }

    /**
     * Persist Path
     * @returns Persist Path
     */
    static persistPath(): string {
        return join(User.storagePath(), 'persist');
    }

    /**
     * Cached Video Path
     * @returns Cached Video Path
     */
    static cachedVideoPath(): string {
        return join(User.storagePath(), 'videos');
    }

    /**
     * Temp Downloads Path
     * @returns Temp Downloads Path
     */
     static tempDownloadsPath(): string {
        return join(User.storagePath(), 'downloads');
    }

    /**
     * Storage Path
     * @returns Storage Path
     */
    static storagePath(): string {
        User.storageAccessed = true;

        return User.customStoragePath ? User.customStoragePath : join(homedir(), '.pronarr');
    }

    /**
     * Downloads Path
     * @returns Downloads Path
     */
    static downloadsPath(): string {
        User.downloadsAccessed = true;

        return User.customDownloadsPath ? User.customDownloadsPath : join(homedir(), 'Downloads/Pron');
    }

    /**
     * Set Storage Path
     * @param storagePathSegments Storage Path Segments
     */
    public static setStoragePath(...storagePathSegments: string[]): void {
        if (User.storageAccessed) {
            throw new Error('Storage path was already accessed and cannot be changed anymore. \
                Try initializing your custom storage path earlier!');
        }

        User.customStoragePath = resolve(...storagePathSegments);
    }

    /**
     * Set Downloads Path
     * @param downloadsPathSegments Downloads Path Segments
     */
     public static setDownloadsPath(...downloadsPathSegments: string[]): void {
        if (User.downloadsAccessed) {
            throw new Error('Downloads path was already accessed and cannot be changed anymore. \
                Try initializing your custom downloads path earlier!');
        }

        User.customDownloadsPath = resolve(...downloadsPathSegments);
    }
}