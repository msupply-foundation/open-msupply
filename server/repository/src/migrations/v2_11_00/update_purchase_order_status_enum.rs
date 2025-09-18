use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_purchase_order_status_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE purchase_order_status RENAME VALUE 'AUTHORISED' to 'REQUEST_APPROVAL';
                "#
            )?;
            sql!(
                connection,
                r#"
                    ALTER TYPE purchase_order_status ADD VALUE 'SENT';
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                UPDATE purchase_order SET status = 'REQUEST_APPROVAL' WHERE status = 'AUTHORISED';
            "#,
            )?;
        }

        Ok(())
    }
}
