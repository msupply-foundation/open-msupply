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

    // View to help figure out how many requisitions were done for a program and order type in a period

    sql!(
        connection,
        r#"
        CREATE VIEW requisitions_in_period AS
        SELECT 'n/a' as id, program_id, period_id, store_id, order_type, type, count(*) as count FROM requisition
            GROUP BY 1,2,3,4,5,6;
    "#
    )?;

    Ok(())
}
