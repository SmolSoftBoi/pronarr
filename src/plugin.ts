import { assert } from 'console';
import { join } from 'path';

import { Logger } from '@epickris/node-logger';
import { satisfies } from 'semver';

import { API, PluginIdentifier, PluginInitializer, PluginName, IndexerIdentifier, IndexerName, IndexerPlugin, IndexerPluginConstructor } from './api';
import { PackageJSON, PluginManager } from './pluginManager';
import getVersion from './version';

/** Log */
const log = Logger.internal;

/**
 * Represents a loaded Pronarr plugin.
 */
export class Plugin {

    /** Plugin Name */
    private readonly pluginName: PluginName;

    /**
     * npm Package Scope
     */
    private readonly scope?: string;

    /** Plugin Path */
    private readonly pluginPath: string;

    /** Version */
    readonly version: string;

    /** Main */
    private readonly main: string;

    /**
     * Used to store data for a limited time until the load method is called, will be reset afterwards.
     */
    private loadContext?: {
        engines?: Record<string, string>;
        dependencies?: Record<string, string>;
    }

    /**
     * Default exported function from the plugin that initializes it.
     */
    private pluginInitializer?: PluginInitializer;

    /** Registered Indexers */
    private readonly registeredIndexers: Map<IndexerName, IndexerPluginConstructor> = new Map();

    /** Active Indexers */
    private readonly activeIndexers: Map<IndexerName, IndexerPlugin[]> = new Map();

    /**
     * @param name Plugin Name
     * @param path Path
     * @param packageJSON Package JSON
     * @param scope Scope?
     */
    constructor(name: PluginName, path: string, packageJSON: PackageJSON, scope?: string) {
        this.pluginName = name;
        this.scope = scope;
        this.pluginPath = path;
        this.version = packageJSON.version || '0.0.0';
        this.main = packageJSON.main || './index.js';

        if (packageJSON.peerDependencies && (!packageJSON.engines || !packageJSON.engines.pronarr)) {
            packageJSON.engines = packageJSON.engines || {};
            packageJSON.engines.pronarr = packageJSON.peerDependencies.pronarr;
        }

        this.loadContext = {
            engines: packageJSON.engines,
            dependencies: packageJSON.dependencies
        }
    }

    /**
     * Return full plugin name with scope prefix.
     */
    public getPluginIdentifier(): PluginIdentifier {
        return (this.scope? this.scope + '/': '') + this.pluginName;
    }

    /**
     * Get Plugin Path
     * @returns Plugin Path
     */
    public getPluginPath(): string {
        return this.pluginPath;
    }

    /**
     * Register Indexer
     * @param name Indexer Name
     * @param constructor SitIndexere Plugin Constructor
     */
    public registerIndexer(name: IndexerName, constructor: IndexerPluginConstructor): void {
        if (this.registeredIndexers.has(name)) {
            throw new Error(`Plugin '${this.getPluginIdentifier()}' tried to register an indexer '${name}' which has already been \
                registered!`);
        }

        log.info(`Registering indexer '${this.getPluginIdentifier()}.${name}'`);

        this.registeredIndexers.set(name, constructor);
    }

    /**
     * Get Indexer Constructor
     * @param indexerIdentifier Indexer Identifier
     * @returns Indexer Plugin Constructor
     */
    public getIndexerConstructor(indexerIdentifier: IndexerIdentifier | IndexerName): IndexerPluginConstructor {
        /** Indexer Name */
        const name: IndexerName = PluginManager.getIndexerName(indexerIdentifier);

        /** Constructor */
        const constructor = this.registeredIndexers.get(name);

        if (!constructor) {
            throw new Error(`The requested indexer '${name}' was not registered by the plugin '${this.getPluginIdentifier()}'.`);
        }

        if (this.activeIndexers.has(name)) {
            log.error(`The indexer ${name} from the plugin ${this.getPluginIdentifier()} seems to be configured multiple times in your \
                config.json.`);
        }

        return constructor;
    }

    /**
     * Assign Indexer
     * @param indexerIdentifier Indexer Identifier
     * @param indexerPlugin Indexer Plugin
     */
    public assignIndexer(indexerIdentifier: IndexerIdentifier | IndexerName, indexerPlugin: IndexerPlugin): void {
        /** Indexer Name */
        const name: IndexerName = PluginManager.getIndexerName(indexerIdentifier);

        /** Indexers */
        let indexers = this.activeIndexers.get(name);

        if (!indexers) {
            indexers = [];

            this.activeIndexers.set(name, indexers);
        }

        indexers.unshift(indexerPlugin);
    }

    /**
     * Get Active Indexer
     * @param indexerName Indexer Name
     * @returns Indexer Plugin?
     */
    public getActiveIndexer(indexerName: IndexerName): IndexerPlugin | undefined {
        /** Indexers */
        const indexers = this.activeIndexers.get(indexerName);

        return indexers && indexers[0];
    }

    /** Load */
    public load(): void {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const context = this.loadContext!;

        assert(context, 'Reached illegal state. Plugin state is undefined!');

        this.loadContext = undefined;

        if (!context.engines || !context.engines.pronarr) {
            throw new Error(`Plugin ${this.pluginPath} does not contain the 'pronarr' package in 'engines'.`);
        }

        /** Version Required */
        const versionRequired = context.engines.pronarr;

        /** Node Version Required */
        const nodeVersionRequired = context.engines.node;

        if (!satisfies(getVersion(), versionRequired, { includePrerelease: true })) {
            log.error(`The plugin "${this.pluginName}" requires a Pronarr version of ${versionRequired} which does not satisfy the current `
                + `Pronarr version of ${getVersion()}. You may need to update this plugin (or Pronarr) to a newer version. `
                + 'You may face unexpected issues or stability problems running this plugin.');
        }

        if (nodeVersionRequired && !satisfies(process.version, nodeVersionRequired)) {
            log.warn(`The plugin "${this.pluginName}" requires Node version of ${nodeVersionRequired} which does ot satisfy the current `
                + `Node version of ${process.version}. You may need to upgrade your installation of Node.`);
        }

        /** Dependencies */
        const dependencies = context.dependencies || {};

        if (dependencies.pronarr) {
            log.error(`The plugin "${this.pluginName}" defines 'pronarr' in their 'dependencies' section, `
                + 'meaning they carry an additional copy of Pronarr. '
                + 'This not only wastes disk space, but also can cause major incompatibility issues and thus is considered bad practice. '
                + 'Please inform the developer to update their plugin!');
        }

        /** Main Path */
        const mainPath = join(this.pluginPath, this.main);

        /** Plugin Modules */
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginModules = require(mainPath);

        if (typeof pluginModules === 'function') {
            this.pluginInitializer = pluginModules;
        } else if (pluginModules && typeof pluginModules.default === 'function') {
            this.pluginInitializer = pluginModules.default;
        } else {
            throw new Error(`Plugin ${this.pluginPath} does not export a initializer function from main.`);
        }
    }

    /** Initialize */
    public initialize(api: API): void {
        if (!this.pluginInitializer) {
            throw new Error('Tried to initialize a plugin which hasn\'t been loaded yet!');
        }

        this.pluginInitializer(api);
    }
}