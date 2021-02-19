"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
require("source-map-support/register");
const commander_1 = __importDefault(require("commander"));
const semver_1 = require("semver");
const node_logger_1 = require("@epickris/node-logger");
const server_1 = require("./server");
const user_1 = require("./user");
const version_1 = __importStar(require("./version"));
/** Log */
const log = node_logger_1.Logger.internal;
/** Required Node Version */
const requiredNodeVersion = version_1.getRequiredNodeVersion();
if (requiredNodeVersion && !semver_1.satisfies(process.version, requiredNodeVersion)) {
    log.warn(`Pronarr requires Node version of ${requiredNodeVersion} which does not satisfy the current Node version of \
        ${process.version}. You may need to upgrade your installation of Node.`);
}
module.exports = function cli() {
    /** Kepp Orphans? */
    let keepOrphans = false;
    /** Custom Pluginn Path */
    let customPluginPath = undefined;
    /** Shutting Down? */
    let shuttingDown = false;
    commander_1.default
        .version(version_1.default())
        .option('-C, --color', 'Force color in logging.', () => node_logger_1.Logger.forceColor())
        .option('-D, --debug', 'Turn on debug level logging.', () => node_logger_1.Logger.setDebugEnabled(true))
        .option('-P, --plugin-path [path]', 'Look for plugins installed at [path] as well as the default locations ([path] can also point to a single plugin).', path => customPluginPath = path)
        .option('-K, --keep-orphans', 'Keep cached indexers for which the associated indexer is not loaded.', () => keepOrphans = true)
        .option('-T, --no-timestamp', 'Do not issue timestamps in logging.', () => node_logger_1.Logger.setTimestampEnabled(false))
        .option('-U, --user-storage-path [path]', 'Look for Pronarr user files at [path] instead of the default location (~/.pronarr).', path => user_1.User.setStoragePath(path))
        .parse(process.argv);
    /** Options */
    const options = {
        keepOrphanedCachedVideos: keepOrphans,
        customPluginPath: customPluginPath
    };
    /** Server */
    const server = new server_1.Server(options);
    /**
     * Signal Handler
     * @param signal Signal
     * @param signalNum Signal Number
     */
    const signalHandler = (signal, signalNum) => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        log.info(`Got ${signal}, shutting down Pronarr...`);
        server.teardown();
        setTimeout(() => process.exit(128 + signalNum), 5000);
    };
    process.on('SIGINT', signalHandler.bind(undefined, 'SIGINT', 2));
    process.on('SIGTERM', signalHandler.bind(undefined, 'SIGTERM', 15));
    /**
     * Error Handler
     * @param error Error
     */
    const errorHandler = (error) => {
        if (error.stack)
            log.error(error.stack);
        if (!shuttingDown)
            process.kill(process.pid, 'SIGTERM');
    };
    process.on('uncaughtException', errorHandler);
    server.start().catch(errorHandler);
};
//# sourceMappingURL=cli.js.map