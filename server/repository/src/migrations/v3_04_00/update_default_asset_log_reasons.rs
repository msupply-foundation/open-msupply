use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_default_asset_log_reasons"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Brings the "Not functioning" reasons seeded in v2_00_00 in line with
        // the list UNICEF specified (issue #1287): "Multiple temperature
        // breaches" was filed under Not in use and is renamed and moved, and
        // "Solar panel failure" and "Other" are added.
        //
        // `asset_log_reason` is central-authored, and every site seeds the same
        // fixed ids in its own migration, so updating and inserting by those ids
        // here leaves every site with the same rows without a changelog entry.
        // ON CONFLICT keeps the inserts safe on a site that already has them.
        sql!(
            connection,
            r#"
            UPDATE asset_log_reason
            SET asset_log_status = 'NOT_FUNCTIONING', reason = 'Multiple temperature excursions'
            WHERE id = '2f734462-c76d-4b08-b8d2-40b250538d46';

            INSERT INTO asset_log_reason (id, asset_log_status, reason)
            VALUES ('ba800d96-2cf6-44e8-8fbb-41fedb154265', 'NOT_FUNCTIONING', 'Solar panel failure'),
            ('646c80b2-2ff7-4c50-916b-18ff3df5cfb5', 'NOT_FUNCTIONING', 'Other')
            ON CONFLICT (id) DO NOTHING;
            "#
        )?;

        Ok(())
    }
}
