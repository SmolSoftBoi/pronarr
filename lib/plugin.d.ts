import { API, PluginIdentifier, PluginName, IndexerIdentifier, IndexerName, IndexerPlugin, IndexerPluginConstructor } from './api';
import { PackageJSON } from './pluginManager';
/**
 * Represents a loaded Pronarr plugin.
 */
export declare class Plugin {
    /** Plugin Name */
    private readonly pluginName;
    /**
     * npm Package Scope
     */
    private readonly scope?;
    /** Plugin Path */
    private readonly pluginPath;
    /** Version */
    readonly version: string;
    /** Main */
    private readonly main;
    /**
     * Used to store data for a limited time until the load method is called, will be reset afterwards.
     */
    private loadContext?;
    /**
     * Default exported function from the plugin that initializes it.
     */
    private pluginInitializer?;
    /** Registered Indexers */
    private readonly registeredIndexers;
    /** Active Indexers */
    private readonly activeIndexers;
    /**
     * @param name Plugin Name
     * @param path Path
     * @param packageJSON Package JSON
     * @param scope Scope?
     */
    constructor(name: PluginName, path: string, packageJSON: PackageJSON, scope?: string);
    /**
     * Return full plugin name with scope prefix.
     */
    getPluginIdentifier(): PluginIdentifier;
    /**
     * Get Plugin Path
     * @returns Plugin Path
     */
    getPluginPath(): string;
    /**
     * Register Indexer
     * @param name Indexer Name
     * @param constructor SitIndexere Plugin Constructor
     */
    registerIndexer(name: IndexerName, constructor: IndexerPluginConstructor): void;
    /**
     * Get Indexer Constructor
     * @param indexerIdentifier Indexer Identifier
     * @returns Indexer Plugin Constructor
     */
    getIndexerConstructor(indexerIdentifier: IndexerIdentifier | IndexerName): IndexerPluginConstructor;
    /**
     * Assign Indexer
     * @param indexerIdentifier Indexer Identifier
     * @param indexerPlugin Indexer Plugin
     */
    assignIndexer(indexerIdentifier: IndexerIdentifier | IndexerName, indexerPlugin: IndexerPlugin): void;
    /**
     * Get Active Indexer
     * @param indexerName Indexer Name
     * @returns Indexer Plugin?
     */
    getActiveIndexer(indexerName: IndexerName): IndexerPlugin | undefined;
    /** Load */
    load(): void;
    /** Initialize */
    initialize(api: API): void;
}
//# sourceMappingURL=plugin.d.ts.map