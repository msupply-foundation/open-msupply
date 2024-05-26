use crate::{
    migrations::{sql, DATE, JSON},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
             ALTER TABLE asset ADD COLUMN properties {JSON};
             ALTER TABLE asset ADD COLUMN donor_name_id TEXT REFERENCES name_link(id);
             ALTER TABLE asset ADD COLUMN warranty_start {DATE};
             ALTER TABLE asset ADD COLUMN warranty_end {DATE};
            "#
    )?;

    Ok(())
}
