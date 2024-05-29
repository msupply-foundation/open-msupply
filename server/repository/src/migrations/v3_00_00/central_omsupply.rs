use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
                ALTER TABLE store ADD oms_site_id INTEGER;
        "#
    )?;

    Ok(())
}
