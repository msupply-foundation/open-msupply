use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE requisition ADD COLUMN program_id TEXT;
        ALTER TABLE requisition ADD COLUMN period_id TEXT REFERENCES period(id);
        ALTER TABLE requisition ADD COLUMN order_type TEXT;
        "#
    )?;

    Ok(())
}
