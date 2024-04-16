use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        UPDATE name set is_deceased = false WHERE is_deceased is null;
      "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TABLE name ALTER COLUMN is_deceased SET NOT NULL;
            ALTER TABLE name ALTER COLUMN is_deceased SET DEFAULT false;
          "#
        )?;
    }

    Ok(())
}
