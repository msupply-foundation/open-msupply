use crate::migrations::*;

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE requisition_line RENAME COLUMN requested_quantity TO requested_quantity_old;
        ALTER TABLE requisition_line ADD COLUMN requested_quantity REAL;
        UPDATE requisition_line SET requested_quantity = requested_quantity_old;
        ALTER TABLE requisition_line DROP COLUMN requested_quantity_old;

        ALTER TABLE requisition_line RENAME COLUMN suggested_quantity TO suggested_quantity_old;
        ALTER TABLE requisition_line ADD COLUMN suggested_quantity REAL;
        UPDATE requisition_line SET suggested_quantity = suggested_quantity_old;
        ALTER TABLE requisition_line DROP COLUMN suggested_quantity_old;

        ALTER TABLE requisition_line RENAME COLUMN supply_quantity TO supply_quantity_old;
        ALTER TABLE requisition_line ADD COLUMN supply_quantity REAL;
        UPDATE requisition_line SET supply_quantity = supply_quantity_old;
        ALTER TABLE requisition_line DROP COLUMN supply_quantity_old;

        ALTER TABLE requisition_line RENAME COLUMN available_stock_on_hand TO available_stock_on_hand_old;
        ALTER TABLE requisition_line ADD COLUMN available_stock_on_hand REAL;
        UPDATE requisition_line SET available_stock_on_hand = available_stock_on_hand_old;
        ALTER TABLE requisition_line DROP COLUMN available_stock_on_hand_old;
        
        ALTER TABLE requisition_line RENAME COLUMN average_monthly_consumption TO average_monthly_consumption_old;
        ALTER TABLE requisition_line ADD COLUMN average_monthly_consumption REAL;
        UPDATE requisition_line SET average_monthly_consumption = average_monthly_consumption_old;
        ALTER TABLE requisition_line DROP COLUMN average_monthly_consumption_old;

        ALTER TABLE requisition_line RENAME COLUMN approved_quantity TO approved_quantity_old;
        ALTER TABLE requisition_line ADD COLUMN approved_quantity REAL;
        UPDATE requisition_line SET approved_quantity = approved_quantity_old;
        ALTER TABLE requisition_line DROP COLUMN approved_quantity_old;
        "#,
    )?;
    Ok(())
}

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE requisition_line ALTER COLUMN requested_quantity TYPE DOUBLE PRECISION using requested_quantity;
        ALTER TABLE requisition_line ALTER COLUMN suggested_quantity TYPE DOUBLE PRECISION using suggested_quantity;
        ALTER TABLE requisition_line ALTER COLUMN supply_quantity TYPE DOUBLE PRECISION using supply_quantity;
        ALTER TABLE requisition_line ALTER COLUMN available_stock_on_hand TYPE DOUBLE PRECISION using available_stock_on_hand;
        ALTER TABLE requisition_line ALTER COLUMN average_monthly_consumption TYPE DOUBLE PRECISION using average_monthly_consumption;
        ALTER TABLE requisition_line ALTER COLUMN approved_quantity TYPE DOUBLE PRECISION using approved_quantity;

        "#,
    )?;
    Ok(())
}
