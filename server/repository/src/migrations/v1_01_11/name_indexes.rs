use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE INDEX IF NOT EXISTS "index_name_first_name" ON "name"("first_name"); 
        CREATE INDEX IF NOT EXISTS "index_name_last_name" ON "name"("last_name"); 
        CREATE INDEX IF NOT EXISTS "index_name_code" ON "name"("code"); 
        CREATE INDEX IF NOT EXISTS "index_name_national_health_number" ON "name"("national_health_number"); 
        "#
    )?;

    Ok(())
}
