use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // View to help figure out how many requisitions were done for a program and order type in a period

    // This migration adds the not null constraint to order_type
    sql!(
        connection,
        r#"
        DROP VIEW IF EXISTS requisitions_in_period;

        CREATE VIEW requisitions_in_period AS
        SELECT 'n/a' as id, program_id, period_id, store_id, order_type, type, count(*) as count FROM requisition WHERE order_type IS NOT NULL
            GROUP BY 1,2,3,4,5,6;
    "#
    )?;

    Ok(())
}
