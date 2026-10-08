use crate::{StorageConnection, migrations::sql};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        // No referential constraint due to circular dependency during sync integration
        r#"ALTER TABLE invoice RENAME COLUMN tax TO tax_percentage;
        ALTER TABLE invoice_line RENAME COLUMN tax TO tax_percentage;
        "#
    )?;

    Ok(())
}
