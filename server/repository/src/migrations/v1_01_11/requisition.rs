use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // requisition.program_id -> nullable text (would ideally be referencing program.id, but program data, is not protected from deletion, so this field can't have a referential constraint)

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
