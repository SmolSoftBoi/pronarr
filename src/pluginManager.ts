import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { delimiter, join, resolve } from 'path';

import { Logger } from '@epickris/node-logger';

import { InternalAPIEvent, PluginIdentifier, PluginName, PronarrAPI, IndexerIdentifier, IndexerName, IndexerPluginConstructor } from './api';
import { Plugin } from './plugin';

/** Log */
const log = Logger.internal;

/** Package JSON */
export interface PackageJSON {

    /** Name */
    name: string;

    /** Version */
    version: string;

    /** Keywords */
    keywords?: string[];

    /** Main */
    main?: string;

    /** Engines */
    engines?: Record<string, string>;

    /** Dependencies */
    dependencies?: Record<string, string>;

    /** Developer Dependencies */
    devDependencies?: Record<string, string>;

    /** Peer Dependencies */
    peerDependencies?: Record<string, string>;
}

/** Plugin Manager Options */
export interface PluginManagerOptions {

    /**
     * Additional path to search for plugins in. Specified relative to the current working directory.
     */
    customPluginPath?: string;

    /**
     * When defined, only plugins specified here will be initialized.
     */
    activePlugins?: PluginIdentifier[];
}

/**
 * Utility which exposes methods to search for installed Pronarr plugins.
 */
export class PluginManager {

    /**
     * Name must be prefixed with `pronarr-` or `@scope/pronarr-`.
     */
    private static readonly PLUGIN_IDENTIFIER_PATTERN = /^((@[\w-]*)\/)?(pronarr-[\w-]*)$/;

    /** Pronarr API */
    private readonly api: PronarrAPI;

    /**
     * Unique set of search paths we will use to discover installed plugins.
     */
    private readonly searchPaths: Set<string> = new Set();

    /** Active Plugins */
    private readonly activePlugins?: PluginIdentifier[];

    /** Plugins */
    private readonly plugins: Map<PluginIdentifier, Plugin> = new Map();

    /**
     * We have some plugins which simply pass a wrong or misspelled plugin name to the API calls, this translation tries to mitigate this.
     */
    private readonly pluginIdentifierTranslation: Map<PluginIdentifier, PluginIdentifier> = new Map();

    /** Indexer to Plugin Map */
    private readonly indexerToPluginMap: Map<IndexerName, Plugin[]> = new Map();

    /**
     * Used to match registering plugins, see `handleRegisterSite`.
     */
    private currentInitializingPlugin?: Plugin;

    /**
     * @param api Pronarr API
     * @param options Plugin Manager Options
     */
    constructor(api: PronarrAPI, options?: PluginManagerOptions) {
        this.api = api;

        if (options) {
            if (options.customPluginPath) {
                this.searchPaths.add(resolve(process.cwd(), options.customPluginPath));
            }

            this.activePlugins = options.activePlugins;
        }

        this.loadDefaultPaths();

        this.api.on(InternalAPIEvent.REGISTER_INDEXER, this.handleRegisterIndexer.bind(this));
    }

    /**
     * Is Qualified Plugin Identifier?
     * @param identifier Identifier
     * @returns Is Qualified Plugin Identifier?
     */
    public static isQualifiedPluginIdentifier(identifier: string): boolean {
        return PluginManager.PLUGIN_IDENTIFIER_PATTERN.test(identifier);
    }

    /**
     * Extract plugin name without `@scope/` prefix.
     * @param name Name
     * @returns Plugin Name
     */
    public static extractPluginName(name: string): PluginName {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return name.match(PluginManager.PLUGIN_IDENTIFIER_PATTERN)![3];
    }

    /**
     * Extract the `@scope` of a npm module name.
     * @param name Name
     * @returns Plugin Scope
     */
    public static extractPluginScope(name: string): string {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return name.match(PluginManager.PLUGIN_IDENTIFIER_PATTERN)![2];
    }

    /**
     * Get Indexer Name
     * @param identifier Indexer Identifier
     * @returns Indexer Name
     */
    public static getIndexerName(identifier: IndexerIdentifier): IndexerName {
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
    public static getPluginIdentifier(identifier: IndexerIdentifier): PluginIdentifier {
        return identifier.split('.')[0];
    }

    /** Initialize Installed Plugins */
    public initializeInstalledPlugins(): void {
        this.loadInstalledPlugins();

        this.plugins.forEach((plugin: Plugin, identifier: PluginIdentifier) => {
            try {
                plugin.load();
            } catch (error) {
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
            } catch (error) {
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
    private handleRegisterIndexer(name: IndexerName, constructor: IndexerPluginConstructor, pluginIdentifier?: PluginIdentifier): void {
        if (!this.currentInitializingPlugin) {
            throw new Error(`Unexpected indexer registration. \
                Plugin ${pluginIdentifier? `'${pluginIdentifier}' `: ""}tried to register outside the initializer function!`);
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
    public getPluginForIndexer(indexerIdentifier: IndexerIdentifier | IndexerName): Plugin {
        /** Plugin */
        let plugin: Plugin;

        if (indexerIdentifier.indexOf('.') === -1) {
            /**
             * See if it matches exactly one site.
             */
            const found = this.indexerToPluginMap.get(indexerIdentifier);

            if (!found) {
                throw new Error(`The requested indexer '${indexerIdentifier}' was not registered by any plugin.`);
            } else if (found.length > 1) {
                const options = found.map(plugin => `${plugin.getPluginIdentifier()}.${indexerIdentifier}`).join(', ');
                throw new Error(`The requested indexer '${indexerIdentifier}' has been registered multiple times. \
                    Please be more specific by writing one of: ${options}`);
            } else {
                plugin = found[0];
                indexerIdentifier = `${plugin.getPluginIdentifier()}.${indexerIdentifier}`;
            }
        } else {
            const pluginIdentifier = PluginManager.getPluginIdentifier(indexerIdentifier);
            if (!this.hasPluginRegistered(pluginIdentifier)) {
                throw new Error(`The requested plugin '${pluginIdentifier}' was not registered.`);
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            plugin = this.getPlugin(pluginIdentifier)!;
        }

        return plugin;
    }

    /**
     * Has Plugin Registered?
     * @param pluginIdentifier Plugin Identifier
     * @returns Has Plugin Registered?
     */
    public hasPluginRegistered(pluginIdentifier: PluginIdentifier): boolean {
        return this.plugins.has(pluginIdentifier) || this.pluginIdentifierTranslation.has(pluginIdentifier);
    }

    /**
     * Get Plugin
     * @param pluginIdentifier Plugin Identifier
     * @returns Plugin?
     */
    public getPlugin(pluginIdentifier: PluginIdentifier): Plugin | undefined {
        /** Plugin */
        const plugin = this.plugins.get(pluginIdentifier);

        if (plugin) {
            return plugin;
        } else {
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
    public getPluginByActiveIndexer(indexerName: IndexerName): Plugin | undefined {
        /** Found */
        const found = (this.indexerToPluginMap.get(indexerName) || []).filter(plugin => !!plugin.getActiveIndexer(indexerName));

        if (found.length === 0) {
            return undefined;
        } else if (found.length > 1) {
            /** Plugins */
            const plugins = found.map(plugin => plugin.getPluginIdentifier()).join(', ');

            throw new Error(`'${indexerName}' is an ambiguous indexer name. It was registered by multiple plugins: ${plugins}`);
        } else {
            return found[0];
        }
    }

    /**
     * Gets all plugins installed on the local system.
     */
    private loadInstalledPlugins(): void {
        this.searchPaths.forEach(searchPath => {
            if (!existsSync(searchPath)) {
                return;
            }

            if (existsSync(join(searchPath, 'package.json'))) {
                try {
                    this.loadPlugin(searchPath);
                } catch (error) {
                    log.warn(error.message);
                    return;
                }
            } else {
                /**
                 * Search for directories only.
                 */
                const relativePluginPaths = readdirSync(searchPath).filter(relativePath => {
                    try {
                      return statSync(resolve(searchPath, relativePath)).isDirectory();
                    } catch (error) {
                        log.debug(`Ignoring path ${resolve(searchPath, relativePath)} - ${error.message}`);
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
                    const absolutePath = join(searchPath, scopeDirectory);

                    readdirSync(absolutePath).filter(name => PluginManager.isQualifiedPluginIdentifier(name)).filter(name => {
                        try {
                            return statSync(resolve(absolutePath, name)).isDirectory();
                        } catch (error) {
                            log.debug(`Ignoring path ${resolve(absolutePath, name)} - ${error.message}`);
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
                        const absolutePath = resolve(searchPath, pluginIdentifier);

                        this.loadPlugin(absolutePath);
                    } catch (error) {
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
    private loadPlugin(absolutePath: string): Plugin {
        /** Package JSON */
        const packageJson: PackageJSON = PluginManager.loadPackageJSON(absolutePath);

        /** Plugin Identifier */
        const identifier: PluginIdentifier = packageJson.name;

        /** Plugin Name */
        const name: PluginName = PluginManager.extractPluginName(identifier);

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
        const plugin = new Plugin(name, absolutePath, packageJson, scope);

        this.plugins.set(identifier, plugin);

        return plugin;
    }

    /**
     * Load Package JSON
     * @param pluginPath Plugin Oath
     * @returns Package JSON
     */
    private static loadPackageJSON(pluginPath: string): PackageJSON {
        /** Package JSON Path */
        const packageJsonPath = join(pluginPath, 'package.json');

        /** Package JSON */
        let packageJson: PackageJSON;

        if (!existsSync(packageJsonPath)) {
            throw new Error(`Plugin ${pluginPath} does not contain a package.json.`);
        }

        try {
            packageJson = JSON.parse(readFileSync(packageJsonPath, {
                encoding: 'utf8'
            }));
        } catch (error) {
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
    private loadDefaultPaths(): void {
        if (require.main) {
            require.main.paths.forEach(path => this.searchPaths.add(path));
        }

        if (process.env.NODE_PATH) {
            process.env.NODE_PATH.split(delimiter).filter(path => !!path).forEach(path => this.searchPaths.add(path));
        } else {
            if (process.platform === 'win32') {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.searchPaths.add(join(process.env.APPDATA!, 'npm/node_modules'));
            } else {
                this.searchPaths.add('/usr/local/lib/node_modules');
                this.searchPaths.add('/usr/lib/node_modules');
                this.searchPaths.add(execSync('/bin/echo -n "$(npm --no-update-notifier -g prefix)/lib/node_modules"').toString('utf8'));
            }
        }
    }
}