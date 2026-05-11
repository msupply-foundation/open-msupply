use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_line_status_enums"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    CREATE TYPE purchase_order_line_status AS ENUM ('NEW', 'SENT', 'CLOSED');
                "#
            )?;

            "purchase_order_line_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order_line
                ADD COLUMN status {status_type} NOT NULL DEFAULT 'NEW';
            "#,
        )?;

        sql!(
            connection,
            r#"
                CREATE INDEX idx_purchase_order_line_status 
                ON purchase_order_line (status);
            "#,
        )?;

        Ok(())
    }
}
