"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const os_1 = require("os");
const path_1 = require("path");
/**
 * Manages user settings and storage locations.
 */
class User {
    /**
     * Configuration Path
     * @returns Configuration Path
     */
    static configPath() {
        return path_1.join(User.storagePath(), 'config.json');
    }
    /**
     * Persist Path
     * @returns Persist Path
     */
    static persistPath() {
        return path_1.join(User.storagePath(), 'persist');
    }
    /**
     * Cached Video Path
     * @returns Cached Video Path
     */
    static cachedVideoPath() {
        return path_1.join(User.storagePath(), 'videos');
    }
    /**
     * Temp Downloads Path
     * @returns Temp Downloads Path
     */
    static tempDownloadsPath() {
        return path_1.join(User.storagePath(), 'downloads');
    }
    /**
     * Storage Path
     * @returns Storage Path
     */
    static storagePath() {
        User.storageAccessed = true;
        return User.customStoragePath ? User.customStoragePath : path_1.join(os_1.homedir(), '.pronarr');
    }
    /**
     * Downloads Path
     * @returns Downloads Path
     */
    static downloadsPath() {
        User.downloadsAccessed = true;
        return User.customDownloadsPath ? User.customDownloadsPath : path_1.join(os_1.homedir(), 'Downloads/Pron');
    }
    /**
     * Set Storage Path
     * @param storagePathSegments Storage Path Segments
     */
    static setStoragePath(...storagePathSegments) {
        if (User.storageAccessed) {
            throw new Error('Storage path was already accessed and cannot be changed anymore. \
                Try initializing your custom storage path earlier!');
        }
        User.customStoragePath = path_1.resolve(...storagePathSegments);
    }
    /**
     * Set Downloads Path
     * @param downloadsPathSegments Downloads Path Segments
     */
    static setDownloadsPath(...downloadsPathSegments) {
        if (User.downloadsAccessed) {
            throw new Error('Downloads path was already accessed and cannot be changed anymore. \
                Try initializing your custom downloads path earlier!');
        }
        User.customDownloadsPath = path_1.resolve(...downloadsPathSegments);
    }
}
exports.User = User;
/** Storage Accessed? */
User.storageAccessed = false;
/** Downloads Accessed? */
User.downloadsAccessed = false;
//# sourceMappingURL=user.js.map