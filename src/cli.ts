import 'source-map-support/register';

import commander from 'commander';
import { satisfies } from 'semver';
import { Logger } from '@epickris/node-logger';

import { PronarrOptions, Server } from './server';
import { User } from './user';
import getVersion, { getRequiredNodeVersion } from './version';

import Signals = NodeJS.Signals;

/** Log */
const log = Logger.internal;

/** Required Node Version */
const requiredNodeVersion = getRequiredNodeVersion();

if (requiredNodeVersion && !satisfies(process.version, requiredNodeVersion)) {
    log.warn(`Pronarr requires Node version of ${requiredNodeVersion} which does not satisfy the current Node version of \
        ${process.version}. You may need to upgrade your installation of Node.`);
}

/** CLI */
export = function cli(): void {

    /** Keep Orphans? */
    let keepOrphans = false;

    /** Custom Pluginn Path */
    let customPluginPath: string | undefined = undefined;

    /** Debug Mode Enabled? */
    let debugModeEnabled = false;

    /** Shutting Down? */
    let shuttingDown = false;

    commander
        .version(getVersion())
        .option(
            '-C, --color',
            'Force color in logging.',
            () => Logger.forceColor()
        )
        .option(
            '-D, --debug',
            'Turn on debug level logging.',
            () => debugModeEnabled = true
        )
        .option(
            '-P, --plugin-path [path]',
            'Look for plugins installed at [path] as well as the default locations ([path] can also point to a single plugin).',
            path => customPluginPath = path
        )
        .option(
            '-K, --keep-orphans',
            'Keep cached indexers for which the associated indexer is not loaded.',
            () => keepOrphans = true
        )
        .option(
            '-T, --no-timestamp',
            'Do not issue timestamps in logging.',
            () => Logger.setTimestampEnabled(false)
        )
        .option(
            '-U, --user-storage-path [path]',
            'Look for Pronarr user files at [path] instead of the default location (~/.pronarr).',
            path => User.setStoragePath(path)
        )
        .parse(process.argv);

    if (debugModeEnabled) {
        Logger.setDebugEnabled(true);

        log.debug('Debug mode enabled.');
    }

    /** Options */
    const options: PronarrOptions = {
        keepOrphanedCachedVideos: keepOrphans,
        customPluginPath: customPluginPath,
        debugModeEnabled: debugModeEnabled
    };

    /** Server */
    const server = new Server(options);

    /**
     * Signal Handler
     * @param signal Signal
     * @param signalNum Signal Number
     */
    const signalHandler = (signal: Signals, signalNum: number): void => {
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
    const errorHandler = (error: Error): void => {
        if (error.stack) log.error(error.stack);

        if (!shuttingDown) process.kill(process.pid, 'SIGTERM');
    }

    process.on('uncaughtException', errorHandler);

    server.start().catch(errorHandler);
}