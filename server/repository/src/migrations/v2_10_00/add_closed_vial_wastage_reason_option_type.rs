use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_closed_vial_wastage_reason_option_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE reason_option_type 
                      ADD VALUE IF NOT EXISTS 'CLOSED_VIAL_WASTAGE' AFTER 'OPEN_VIAL_WASTAGE';
                "#
            )?;
        }

        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET integration_datetime = NULL
                    WHERE table_name = 'options'; 
                "#
        )?;

        Ok(())
    }
}
