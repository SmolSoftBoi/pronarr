"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const node_logger_1 = require("@epickris/node-logger");
const plugin_1 = require("./plugin");
/** Log */
const log = node_logger_1.Logger.internal;
/**
 * Utility which exposes methods to search for installed Pronarr plugins.
 */
class PluginManager {
    /**
     * @param api Pronarr API
     * @param options Plugin Manager Options
     */
    constructor(api, options) {
        /**
         * Unique set of search paths we will use to discover installed plugins.
         */
        this.searchPaths = new Set();
        /** Plugins */
        this.plugins = new Map();
        /**
         * We have some plugins which simply pass a wrong or misspelled plugin name to the API calls, this translation tries to mitigate this.
         */
        this.pluginIdentifierTranslation = new Map();
        /** Indexer to Plugin Map */
        this.indexerToPluginMap = new Map();
        this.api = api;
        if (options) {
            if (options.customPluginPath) {
                this.searchPaths.add(path_1.resolve(process.cwd(), options.customPluginPath));
            }
            this.activePlugins = options.activePlugins;
        }
        this.loadDefaultPaths();
        this.api.on("registerIndexer" /* REGISTER_INDEXER */, this.handleRegisterIndexer.bind(this));
    }
    /**
     * Is Qualified Plugin Identifier?
     * @param identifier Identifier
     * @returns Is Qualified Plugin Identifier?
     */
    static isQualifiedPluginIdentifier(identifier) {
        return PluginManager.PLUGIN_IDENTIFIER_PATTERN.test(identifier);
    }
    /**
     * Extract plugin name without `@scope/` prefix.
     * @param name Name
     * @returns Plugin Name
     */
    static extractPluginName(name) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return name.match(PluginManager.PLUGIN_IDENTIFIER_PATTERN)[3];
    }
    /**
     * Extract the `@scope` of a npm module name.
     * @param name Name
     * @returns Plugin Scope
     */
    static extractPluginScope(name) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return name.match(PluginManager.PLUGIN_IDENTIFIER_PATTERN)[2];
    }
    /**
     * Get Indexer Name
     * @param identifier Indexer Identifier
     * @returns Indexer Name
     */
    static getIndexerName(identifier) {
        if (identifier.indexOf('.') === -1) {
            return identifier;
        }
        return identifier.split('.')[1];
    }
    /**
     * Get Plugin Identifier
     * @param identifier Identifier
     * @returns Plugin Identifier
     */
    static getPluginIdentifier(identifier) {
        return identifier.split('.')[0];
    }
    /** Initialize Installed Plugins */
    initializeInstalledPlugins() {
        this.loadInstalledPlugins();
        this.plugins.forEach((plugin, identifier) => {
            try {
                plugin.load();
            }
            catch (error) {
                log.error('====================');
                log.error(`ERROR LOADING PLUGIN ${identifier}:`);
                log.error(error.stack);
                log.error('====================');
                this.plugins.delete(identifier);
                return;
            }
            log.info(`Loaded plugin: ${identifier}@${plugin.version}`);
            try {
                this.currentInitializingPlugin = plugin;
                plugin.initialize(this.api);
            }
            catch (error) {
                log.error('====================');
                log.error(`ERROR INITIALIZING PLUGIN ${identifier}:`);
                log.error(error.stack);
                log.error('====================');
                this.plugins.delete(identifier);
                return;
            }
            log.info('---');
        });
        this.currentInitializingPlugin = undefined;
    }
    /**
     * Handle Register Indexer
     * @param name Indexer Name
     * @param constructor Indexer Plugin Constructor
     * @param pluginIdentifier Plugin Identifier?
     */
    handleRegisterIndexer(name, constructor, pluginIdentifier) {
        if (!this.currentInitializingPlugin) {
            throw new Error(`Unexpected indexer registration. \
                Plugin ${pluginIdentifier ? `'${pluginIdentifier}' ` : ""}tried to register outside the initializer function!`);
        }
        if (pluginIdentifier && pluginIdentifier !== this.currentInitializingPlugin.getPluginIdentifier()) {
            log.debug(`Plugin '${this.currentInitializingPlugin.getPluginIdentifier()}' tried to register with an incorrect plugin \
                identifier: '${pluginIdentifier}'. Please report this to the developer!`);
            this.pluginIdentifierTranslation.set(pluginIdentifier, this.currentInitializingPlugin.getPluginIdentifier());
        }
        this.currentInitializingPlugin.registerIndexer(name, constructor);
        /** Plugins */
        let plugins = this.indexerToPluginMap.get(name);
        if (!plugins) {
            plugins = [];
            this.indexerToPluginMap.set(name, plugins);
        }
        plugins.push(this.currentInitializingPlugin);
    }
    /**
     * Get Plugin for Indexer
     * @param indexerIdentifier Indexer Identifier
     */
    getPluginForIndexer(indexerIdentifier) {
        /** Plugin */
        let plugin;
        if (indexerIdentifier.indexOf('.') === -1) {
            /**
             * See if it matches exactly one site.
             */
            const found = this.indexerToPluginMap.get(indexerIdentifier);
            if (!found) {
                throw new Error(`The requested indexer '${indexerIdentifier}' was not registered by any plugin.`);
            }
            else if (found.length > 1) {
                const options = found.map(plugin => `${plugin.getPluginIdentifier()}.${indexerIdentifier}`).join(', ');
                throw new Error(`The requested indexer '${indexerIdentifier}' has been registered multiple times. \
                    Please be more specific by writing one of: ${options}`);
            }
            else {
                plugin = found[0];
                indexerIdentifier = `${plugin.getPluginIdentifier()}.${indexerIdentifier}`;
            }
        }
        else {
            const pluginIdentifier = PluginManager.getPluginIdentifier(indexerIdentifier);
            if (!this.hasPluginRegistered(pluginIdentifier)) {
                throw new Error(`The requested plugin '${pluginIdentifier}' was not registered.`);
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            plugin = this.getPlugin(pluginIdentifier);
        }
        return plugin;
    }
    /**
     * Has Plugin Registered?
     * @param pluginIdentifier Plugin Identifier
     * @returns Has Plugin Registered?
     */
    hasPluginRegistered(pluginIdentifier) {
        return this.plugins.has(pluginIdentifier) || this.pluginIdentifierTranslation.has(pluginIdentifier);
    }
    /**
     * Get Plugin
     * @param pluginIdentifier Plugin Identifier
     * @returns Plugin?
     */
    getPlugin(pluginIdentifier) {
        /** Plugin */
        const plugin = this.plugins.get(pluginIdentifier);
        if (plugin) {
            return plugin;
        }
        else {
            /** Translation */
            const translation = this.pluginIdentifierTranslation.get(pluginIdentifier);
            if (translation) {
                return this.plugins.get(translation);
            }
        }
        return undefined;
    }
    /**
     * Get Plugin by Active Indexer
     * @param indexerName Indexer Name
     * @returns Plugin?
     */
    getPluginByActiveIndexer(indexerName) {
        /** Found */
        const found = (this.indexerToPluginMap.get(indexerName) || []).filter(plugin => !!plugin.getActiveIndexer(indexerName));
        if (found.length === 0) {
            return undefined;
        }
        else if (found.length > 1) {
            /** Plugins */
            const plugins = found.map(plugin => plugin.getPluginIdentifier()).join(', ');
            throw new Error(`'${indexerName}' is an ambiguous indexer name. It was registered by multiple plugins: ${plugins}`);
        }
        else {
            return found[0];
        }
    }
    /**
     * Gets all plugins installed on the local system.
     */
    loadInstalledPlugins() {
        this.searchPaths.forEach(searchPath => {
            if (!fs_1.existsSync(searchPath)) {
                return;
            }
            if (fs_1.existsSync(path_1.join(searchPath, 'package.json'))) {
                try {
                    this.loadPlugin(searchPath);
                }
                catch (error) {
                    log.warn(error.message);
                    return;
                }
            }
            else {
                /**
                 * Search for directories only.
                 */
                const relativePluginPaths = fs_1.readdirSync(searchPath).filter(relativePath => {
                    try {
                        return fs_1.statSync(path_1.resolve(searchPath, relativePath)).isDirectory();
                    }
                    catch (error) {
                        log.debug(`Ignoring path ${path_1.resolve(searchPath, relativePath)} - ${error.message}`);
                        return false;
                    }
                });
                relativePluginPaths.slice().filter(path => path.charAt(0) === '@').forEach(scopeDirectory => {
                    /**
                     * Remove scopeDirectory from the path list.
                     */
                    const index = relativePluginPaths.indexOf(scopeDirectory);
                    relativePluginPaths.splice(index, 1);
                    /** Absolute Path */
                    const absolutePath = path_1.join(searchPath, scopeDirectory);
                    fs_1.readdirSync(absolutePath).filter(name => PluginManager.isQualifiedPluginIdentifier(name)).filter(name => {
                        try {
                            return fs_1.statSync(path_1.resolve(absolutePath, name)).isDirectory();
                        }
                        catch (error) {
                            log.debug(`Ignoring path ${path_1.resolve(absolutePath, name)} - ${error.message}`);
                            return false;
                        }
                    }).forEach(name => relativePluginPaths.push(`${scopeDirectory}/${name}`));
                });
                relativePluginPaths.filter(pluginIdentifier => {
                    return PluginManager.isQualifiedPluginIdentifier(pluginIdentifier)
                        && (!this.activePlugins || this.activePlugins.includes(pluginIdentifier));
                }).forEach(pluginIdentifier => {
                    try {
                        /** Absolute Path */
                        const absolutePath = path_1.resolve(searchPath, pluginIdentifier);
                        this.loadPlugin(absolutePath);
                    }
                    catch (error) {
                        log.warn(error.message);
                        return;
                    }
                });
            }
        });
        if (this.plugins.size === 0) {
            log.warn('No plugins found. See the README for information on installing plugins.');
        }
    }
    /**
     * Load Plugin
     * @param absolutePath Absolute Path
     * @returns Plugin
     */
    loadPlugin(absolutePath) {
        /** Package JSON */
        const packageJson = PluginManager.loadPackageJSON(absolutePath);
        /** Plugin Identifier */
        const identifier = packageJson.name;
        /** Plugin Name */
        const name = PluginManager.extractPluginName(identifier);
        /** Scope? */
        const scope = PluginManager.extractPluginScope(identifier);
        /**
         * Check if there is already a plugin with the same Identifier.
         */
        const alreadyInstalled = this.plugins.get(identifier);
        if (alreadyInstalled) {
            throw new Error(`Warning: skipping plugin found at '${absolutePath}' since we already loaded the same plugin from `
                + `'${alreadyInstalled.getPluginPath()}'.`);
        }
        /** Plugin */
        const plugin = new plugin_1.Plugin(name, absolutePath, packageJson, scope);
        this.plugins.set(identifier, plugin);
        return plugin;
    }
    /**
     * Load Package JSON
     * @param pluginPath Plugin Oath
     * @returns Package JSON
     */
    static loadPackageJSON(pluginPath) {
        /** Package JSON Path */
        const packageJsonPath = path_1.join(pluginPath, 'package.json');
        /** Package JSON */
        let packageJson;
        if (!fs_1.existsSync(packageJsonPath)) {
            throw new Error(`Plugin ${pluginPath} does not contain a package.json.`);
        }
        try {
            packageJson = JSON.parse(fs_1.readFileSync(packageJsonPath, {
                encoding: 'utf8'
            }));
        }
        catch (error) {
            throw new Error(`Plugin ${pluginPath} contains an invalid package.json. Error: ${error}`);
        }
        if (!packageJson.name || !PluginManager.isQualifiedPluginIdentifier(packageJson.name)) {
            throw new Error(`Plugin ${pluginPath} does not have a package name that begins with 'pronarr-' or '@scope/pronarr-.`);
        }
        if (!packageJson.keywords || !packageJson.keywords.includes('pronarr-plugin')) {
            throw new Error(`Plugin ${pluginPath} package.json does not contain the keyword 'pronarr-plugin'.`);
        }
        return packageJson;
    }
    /** Load Default Paths */
    loadDefaultPaths() {
        if (require.main) {
            require.main.paths.forEach(path => this.searchPaths.add(path));
        }
        if (process.env.NODE_PATH) {
            process.env.NODE_PATH.split(path_1.delimiter).filter(path => !!path).forEach(path => this.searchPaths.add(path));
        }
        else {
            if (process.platform === 'win32') {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.searchPaths.add(path_1.join(process.env.APPDATA, 'npm/node_modules'));
            }
            else {
                this.searchPaths.add('/usr/local/lib/node_modules');
                this.searchPaths.add('/usr/lib/node_modules');
                this.searchPaths.add(child_process_1.execSync('/bin/echo -n "$(npm --no-update-notifier -g prefix)/lib/node_modules"').toString('utf8'));
            }
        }
    }
}
exports.PluginManager = PluginManager;
/**
 * Name must be prefixed with `pronarr-` or `@scope/pronarr-`.
 */
PluginManager.PLUGIN_IDENTIFIER_PATTERN = /^((@[\w-]*)\/)?(pronarr-[\w-]*)$/;
//# sourceMappingURL=pluginManager.js.map