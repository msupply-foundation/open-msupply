use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE store_preference ADD COLUMN response_requisition_requires_authorisation bool NOT NULL DEFAULT false;
            ALTER TABLE store_preference ADD COLUMN request_requisition_requires_authorisation bool NOT NULL DEFAULT false;
        "#
    )?;

    Ok(())
}
