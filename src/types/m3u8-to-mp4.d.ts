/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'm3u8-to-mp4' {

    /**
     * A class to convert M3U8 to MP4
     * @class
     */
    export default class m3u8ToMp4Converter {

        /**
         * Sets the input file
         * @param {String} filename M3U8 file path. You can use remote URL
         * @returns {Function}
         */
        setInputFile(filename: string): this;

        /**
         * Sets the output file
         * @param {String} filename Output file path. Has to be local :)
         * @returns {Function}
         */
        setOutputFile(filename: string): this;

        /**
         * Starts the process
         */
        start(): Promise<unknown>;
    }
}