/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'm3u8-parser' {

    export interface Manifest {
        allowCache: boolean;
        discontinuityStarts: number[];
        segments: any[];
        playlists: Playlist[];
    }

    export interface Playlist {
        attributes: Record<any, any>;
        uri?: string;
    }

    /**
     * A parser for M3U8 files. The current interpretation of the input is
     * exposed as a property `manifest` on parser objects. It's just two lines to
     * create and parse a manifest once you have the contents available as a string:
     *
     * ```js
     * var parser = new m3u8.Parser();
     * parser.push(xhr.responseText);
     * ```
     *
     * New input can later be applied to update the manifest object by calling
     * `push` again.
     *
     * The parser attempts to create a usable manifest object even if the
     * underlying input is somewhat nonsensical. It emits `info` and `warning`
     * events during the parse if it encounters input that seems invalid or
     * requires some property of the manifest object to be defaulted.
     *
     * @class Parser
     * @extends Stream
     */
    export class Parser {

        manifest: Manifest;

        /**
         * Parse the input string and update the manifest object.
         *
         * @param {string} chunk a potentially incomplete portion of the manifest
         */
        push(chunk: string): void;

        /**
         * Flush any remaining input. This can be handy if the last line of an M3U8
         * manifest did not contain a trailing newline but the file has been
         * completely received.
         */
        end(): void;
    }
}