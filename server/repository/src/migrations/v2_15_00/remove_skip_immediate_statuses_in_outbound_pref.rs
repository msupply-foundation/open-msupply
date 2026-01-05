use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_skip_immediate_statuses_in_outbound_pref_v2"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO preference (id, store_id, key, value)
            SELECT
                'invoice_status_options_' || store_id,
                store_id,
                'invoice_status_options',
                 CASE 
                    WHEN value = 'true' THEN '["NEW","SHIPPED","RECEIVED","DELIVERED","VERIFIED"]'
                    ELSE '["NEW","ALLOCATED","PICKED","SHIPPED","RECEIVED","DELIVERED","VERIFIED"]'
                END
            FROM preference
            WHERE key = 'skip_intermediate_statuses_in_outbound'
            AND store_id IS NOT NULL;

            -- Create changelog entries for the new preferences
            INSERT INTO changelog (record_id, table_name, row_action, store_id) SELECT 
                    id,
                    'preference',
                    'UPSERT',
                    store_id
            FROM preference
            WHERE key = 'invoice_status_options';

            -- Clean up any broken preferences changelogs from the old version of this migration
            DELETE FROM changelog WHERE record_id like 'skip_intermediate_statuses_in_outbound%' and record_id not in (
                SELECT id FROM preference WHERE key = 'skip_intermediate_statuses_in_outbound'
            );
            "#,
        )?;

        Ok(())
    }
}
