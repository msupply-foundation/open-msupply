use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_property_v2_value_lookup_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Sort by a V2 property is implemented as a correlated subquery
        // `SELECT … FROM property_v2_value pv WHERE pv.record_id = name.id
        //  AND pv.table_name = ? AND pv.property_id = ?`, which fires once per
        // outer row. The existing indexes only cover two of those three keys,
        // so each lookup falls back to a partition scan. On SQLite this drives
        // the V2 sort to ~5s on a 10k-row dataset; with the three-column index
        // it drops to single-digit ms.
        sql!(
            connection,
            r#"
                CREATE INDEX IF NOT EXISTS idx_property_v2_value_lookup
                ON property_v2_value(property_id, table_name, record_id);
            "#
        )?;
        Ok(())
    }
}
