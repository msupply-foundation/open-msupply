use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_ids_to_existing_rnr_form_changelogs"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // Fix for https://github.com/msupply-foundation/open-msupply/issues/4687
            r#"
                UPDATE changelog
                SET store_id = r.store_id
                FROM rnr_form r
                LEFT JOIN rnr_form_line rfl ON r.id = rfl.rnr_form_id
                WHERE 
                    (changelog.table_name = 'rnr_form' AND changelog.record_id = r.id)
                OR 
                    (changelog.table_name = 'rnr_form_line' AND changelog.record_id = rfl.id);
            "#
        )?;

        Ok(())
    }
}
