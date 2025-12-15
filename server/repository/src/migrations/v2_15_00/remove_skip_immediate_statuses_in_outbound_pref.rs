use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_skip_immediate_statuses_in_outbound_pref"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            UPDATE preference
            SET
                id = 'invoice_status_options_' || store_id,
                key = 'invoice_status_options',
                value = '["NEW","SHIPPED","RECEIVED","DELIVERED","VERIFIED"]'
            WHERE key = 'skip_intermediate_statuses_in_outbound'
            AND store_id IS NOT NULL;
            "#,
        )?;

        Ok(())
    }
}
