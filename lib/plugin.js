"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = void 0;
const console_1 = require("console");
const path_1 = require("path");
const node_logger_1 = require("@epickris/node-logger");
const semver_1 = require("semver");
const pluginManager_1 = require("./pluginManager");
const version_1 = __importDefault(require("./version"));
/** Log */
const log = node_logger_1.Logger.internal;
/**
 * Represents a loaded Pronarr plugin.
 */
class Plugin {
    /**
     * @param name Plugin Name
     * @param path Path
     * @param packageJSON Package JSON
     * @param scope Scope?
     */
    constructor(name, path, packageJSON, scope) {
        /** Registered Indexers */
        this.registeredIndexers = new Map();
        /** Active Indexers */
        this.activeIndexers = new Map();
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
        };
    }
    /**
     * Return full plugin name with scope prefix.
     */
    getPluginIdentifier() {
        return (this.scope ? this.scope + '/' : '') + this.pluginName;
    }
    /**
     * Get Plugin Path
     * @returns Plugin Path
     */
    getPluginPath() {
        return this.pluginPath;
    }
    /**
     * Register Indexer
     * @param name Indexer Name
     * @param constructor SitIndexere Plugin Constructor
     */
    registerIndexer(name, constructor) {
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
    getIndexerConstructor(indexerIdentifier) {
        /** Indexer Name */
        const name = pluginManager_1.PluginManager.getIndexerName(indexerIdentifier);
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
    assignIndexer(indexerIdentifier, indexerPlugin) {
        /** Indexer Name */
        const name = pluginManager_1.PluginManager.getIndexerName(indexerIdentifier);
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
    getActiveIndexer(indexerName) {
        /** Indexers */
        const indexers = this.activeIndexers.get(indexerName);
        return indexers && indexers[0];
    }
    /** Load */
    load() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const context = this.loadContext;
        console_1.assert(context, 'Reached illegal state. Plugin state is undefined!');
        this.loadContext = undefined;
        if (!context.engines || !context.engines.pronarr) {
            throw new Error(`Plugin ${this.pluginPath} does not contain the 'pronarr' package in 'engines'.`);
        }
        /** Version Required */
        const versionRequired = context.engines.pronarr;
        /** Node Version Required */
        const nodeVersionRequired = context.engines.node;
        if (!semver_1.satisfies(version_1.default(), versionRequired, { includePrerelease: true })) {
            log.error(`The plugin "${this.pluginName}" requires a Pronarr version of ${versionRequired} which does not satisfy the current `
                + `Pronarr version of ${version_1.default()}. You may need to update this plugin (or Pronarr) to a newer version. `
                + 'You may face unexpected issues or stability problems running this plugin.');
        }
        if (nodeVersionRequired && !semver_1.satisfies(process.version, nodeVersionRequired)) {
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
        const mainPath = path_1.join(this.pluginPath, this.main);
        /** Plugin Modules */
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginModules = require(mainPath);
        if (typeof pluginModules === 'function') {
            this.pluginInitializer = pluginModules;
        }
        else if (pluginModules && typeof pluginModules.default === 'function') {
            this.pluginInitializer = pluginModules.default;
        }
        else {
            throw new Error(`Plugin ${this.pluginPath} does not export a initializer function from main.`);
        }
    }
    /** Initialize */
    initialize(api) {
        if (!this.pluginInitializer) {
            throw new Error('Tried to initialize a plugin which hasn\'t been loaded yet!');
        }
        this.pluginInitializer(api);
    }
}
exports.Plugin = Plugin;
//# sourceMappingURL=plugin.js.map