import { PluginIdentifier, PluginName, PronarrAPI, IndexerIdentifier, IndexerName } from './api';
import { Plugin } from './plugin';
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
export declare class PluginManager {
    /**
     * Name must be prefixed with `pronarr-` or `@scope/pronarr-`.
     */
    private static readonly PLUGIN_IDENTIFIER_PATTERN;
    /** Pronarr API */
    private readonly api;
    /**
     * Unique set of search paths we will use to discover installed plugins.
     */
    private readonly searchPaths;
    /** Active Plugins */
    private readonly activePlugins?;
    /** Plugins */
    private readonly plugins;
    /**
     * We have some plugins which simply pass a wrong or misspelled plugin name to the API calls, this translation tries to mitigate this.
     */
    private readonly pluginIdentifierTranslation;
    /** Indexer to Plugin Map */
    private readonly indexerToPluginMap;
    /**
     * Used to match registering plugins, see `handleRegisterSite`.
     */
    private currentInitializingPlugin?;
    /**
     * @param api Pronarr API
     * @param options Plugin Manager Options
     */
    constructor(api: PronarrAPI, options?: PluginManagerOptions);
    /**
     * Is Qualified Plugin Identifier?
     * @param identifier Identifier
     * @returns Is Qualified Plugin Identifier?
     */
    static isQualifiedPluginIdentifier(identifier: string): boolean;
    /**
     * Extract plugin name without `@scope/` prefix.
     * @param name Name
     * @returns Plugin Name
     */
    static extractPluginName(name: string): PluginName;
    /**
     * Extract the `@scope` of a npm module name.
     * @param name Name
     * @returns Plugin Scope
     */
    static extractPluginScope(name: string): string;
    /**
     * Get Indexer Name
     * @param identifier Indexer Identifier
     * @returns Indexer Name
     */
    static getIndexerName(identifier: IndexerIdentifier): IndexerName;
    /**
     * Get Plugin Identifier
     * @param identifier Identifier
     * @returns Plugin Identifier
     */
    static getPluginIdentifier(identifier: IndexerIdentifier): PluginIdentifier;
    /** Initialize Installed Plugins */
    initializeInstalledPlugins(): void;
    /**
     * Handle Register Indexer
     * @param name Indexer Name
     * @param constructor Indexer Plugin Constructor
     * @param pluginIdentifier Plugin Identifier?
     */
    private handleRegisterIndexer;
    /**
     * Get Plugin for Indexer
     * @param indexerIdentifier Indexer Identifier
     */
    getPluginForIndexer(indexerIdentifier: IndexerIdentifier | IndexerName): Plugin;
    /**
     * Has Plugin Registered?
     * @param pluginIdentifier Plugin Identifier
     * @returns Has Plugin Registered?
     */
    hasPluginRegistered(pluginIdentifier: PluginIdentifier): boolean;
    /**
     * Get Plugin
     * @param pluginIdentifier Plugin Identifier
     * @returns Plugin?
     */
    getPlugin(pluginIdentifier: PluginIdentifier): Plugin | undefined;
    /**
     * Get Plugin by Active Indexer
     * @param indexerName Indexer Name
     * @returns Plugin?
     */
    getPluginByActiveIndexer(indexerName: IndexerName): Plugin | undefined;
    /**
     * Gets all plugins installed on the local system.
     */
    private loadInstalledPlugins;
    /**
     * Load Plugin
     * @param absolutePath Absolute Path
     * @returns Plugin
     */
    private loadPlugin;
    /**
     * Load Package JSON
     * @param pluginPath Plugin Oath
     * @returns Package JSON
     */
    private static loadPackageJSON;
    /** Load Default Paths */
    private loadDefaultPaths;
}
//# sourceMappingURL=pluginManager.d.ts.map