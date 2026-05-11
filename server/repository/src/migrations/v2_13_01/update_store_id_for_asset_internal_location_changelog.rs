use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_store_id_for_asset_internal_location_changelog"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            WITH location_and_store_id AS (
                SELECT asset_internal_location.id AS l_id, 
                    CASE
                        WHEN location.store_id IS NOT NULL THEN location.store_id
                        WHEN asset.store_id IS NOT NULL THEN asset.store_id
                    ELSE NULL 
                    END as s_id
                FROM asset_internal_location
                LEFT JOIN location ON location.id = asset_internal_location.location_id
                LEFT JOIN asset ON asset.id = asset_internal_location.asset_id
            )
            UPDATE changelog 
            SET store_id = location_and_store_id.s_id
            FROM location_and_store_id
            WHERE changelog.record_id = location_and_store_id.l_id;
        "#
        )?;

        Ok(())
    }
}
