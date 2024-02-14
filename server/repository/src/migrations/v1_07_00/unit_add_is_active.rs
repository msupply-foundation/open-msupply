use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE unit ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
            CREATE INDEX "index_unit_is_active" ON "unit" ("is_active");
        "#,
    )?;

    Ok(())
}
