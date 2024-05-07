use repository::StorageConnection;

use crate::common_stock::check_stock_line_does_not_exist;

use crate::stocktake_line::validate::{check_active_adjustment_reasons, check_reason_is_valid};

use super::insert::{AddNewStockLine, AddNewStockLineError};

pub fn validate(
    connection: &StorageConnection,
    input: &AddNewStockLine,
) -> Result<(), AddNewStockLineError> {
    use AddNewStockLineError::*;
    if !check_stock_line_does_not_exist(&input.stock_line_id, connection)? {
        return Err(StockLineAlreadyExists);
    }

    let reduction_amount = -input.number_of_packs;

    if check_active_adjustment_reasons(connection, reduction_amount)?.is_some()
        && input.inventory_adjustment_reason_id.is_none()
    {
        return Err(AdjustmentReasonNotProvided);
    }

    if input.inventory_adjustment_reason_id.is_some()
        && !check_reason_is_valid(
            connection,
            input.inventory_adjustment_reason_id.clone(),
            reduction_amount,
        )?
    {
        return Err(AdjustmentReasonNotValid);
    }

    // Most stock/invoice line fields validated by `stock_in_line`

    Ok(())
}
