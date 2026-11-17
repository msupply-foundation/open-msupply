/*
 * The legacy table config map, served by vite/legacyTableConfigMap.ts from the
 * server migration fragment that converts the shared table layouts. It says how
 * each React front end (`client/`) table and column id maps to this UI's.
 *
 * The plugin checks the file against this shape whenever it loads it, so a
 * build or test run fails on a map these types don't describe. Import it only
 * from the lazy legacy-table import chunk: vite/lazyChunkGuard.ts fails a build
 * that pulls it into the startup bundle.
 */
declare module 'virtual:legacy-table-config-map' {
  /** One React front end table, and where its settings go in this UI. */
  export interface LegacyTableMapping {
    /**
     * The React front end's table id: the `<id>` in its
     * `@openmsupply-client/tables/<id>` localStorage key, and its key in the
     * `global_table_configs` preference.
     */
    readonly from: string;
    /** This UI's table id. */
    readonly to: string;
    /**
     * React front end column id → this UI's column id. A column mapped to
     * null, or not listed, is dropped from every setting.
     */
    readonly columns: Readonly<Record<string, string | null>>;
    /**
     * What a non-empty React front end `grouping` means for this table.
     * Absent when this UI's table has no row grouping.
     */
    readonly groupRows?: boolean;
  }

  export interface LegacyTableConfigMap {
    readonly version: number;
    /**
     * In a fixed order: when two entries map to the same `to`, the earlier
     * one wins.
     */
    readonly tables: readonly LegacyTableMapping[];
  }

  const map: LegacyTableConfigMap;
  export default map;
}
