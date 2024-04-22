use repository::StorageConnection;

use crate::common_stock::{check_stock_line_exists, CommonStockLineError};

use crate::stocktake_line::validate::{check_active_adjustment_reasons, check_reason_is_valid};
use crate::validate::check_store_exists;

use super::insert::{AddNewStockLine, AddNewStockLineError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &AddNewStockLine,
) -> Result<(), AddNewStockLineError> {
    use AddNewStockLineError::*;
    if !check_store_exists(connection, store_id)? {
        return Err(InvalidStore);
    }

    // TODO maybe? stock line already existing
    // let stock_line = check_stock_line_exists(connection, store_id, &input.stock_line_id).map_err(
    //     |err| match err {
    //         CommonStockLineError::DatabaseError(RepositoryError::NotFound) => StockLineDoesNotExist,
    //         CommonStockLineError::StockLineDoesNotBelongToStore => InvalidStore,
    //         CommonStockLineError::DatabaseError(error) => DatabaseError(error),
    //     },
    // )?;

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

    Ok(())
}
