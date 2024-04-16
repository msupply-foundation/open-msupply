use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE key_type ADD value 'SETTINGS_LABEL_PRINTER';
            "#,
        )?;
    }

    Ok(())
}
