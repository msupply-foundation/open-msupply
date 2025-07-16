use repository::{
    EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, ItemRow, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository, StorageConnection,
};

const LAST_PACK_THRESHOLD: f64 = 0.001;

pub fn adjust_for_residual_packs(available_packs: f64, requested_number_of_packs: f64) -> f64 {
    let residual_stock = available_packs - requested_number_of_packs;
    if residual_stock.abs() < LAST_PACK_THRESHOLD {
        // there is nearly enough, or almost everything requested, we'll take everything...
        return available_packs;
    }
    requested_number_of_packs
}

pub fn check_batch_exists(
    store_id: &str,
    batch_id: &str,
    connection: &StorageConnection,
) -> Result<Option<StockLine>, RepositoryError> {
    Ok(StockLineRepository::new(connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(batch_id)),
            Some(store_id.to_string()),
        )?
        .pop())
}

pub fn check_existing_stock_line(
    invoice_line_id: &str,
    invoice_id: &str,
    batch_id_option: Option<String>,
    connection: &StorageConnection,
) -> Result<Option<InvoiceLineRow>, RepositoryError> {
    let find_another_line =
        |invoice_line: &&InvoiceLineRow| -> bool { invoice_line.id != invoice_line_id };

    if let Some(batch_id) = batch_id_option {
        match InvoiceLineRowRepository::new(connection)
            .find_many_by_invoice_and_batch_id(&batch_id, invoice_id)
        {
            Ok(lines) => {
                if let Some(line) = lines.iter().find(find_another_line) {
                    Ok(Some(line.clone()))
                } else {
                    Ok(None)
                }
            }
            Err(_) => Ok(None),
        }
    } else {
        Ok(None)
    }
}

pub fn check_item_matches_batch(batch: &StockLine, item: &ItemRow) -> bool {
    if batch.item_row.id != item.id {
        return false;
    }
    true
}

pub fn check_batch_on_hold(batch: &StockLine) -> bool {
    if batch.stock_line_row.on_hold {
        return false;
    }
    true
}

pub enum LocationIsOnHoldError {
    LocationIsOnHold,
}

pub fn check_location_on_hold(batch: &StockLine) -> Result<(), LocationIsOnHoldError> {
    use LocationIsOnHoldError::*;

    match &batch.location_row {
        Some(location) => {
            if location.on_hold {
                return Err(LocationIsOnHold);
            }
            Ok(())
        }
        None => Ok(()),
    }
}

#[cfg(test)]
mod test {
    use crate::invoice_line::stock_out_line::adjust_for_residual_packs;

    #[test]
    fn test_adjust_for_residual_packs() {
        // Check we don't adjust when there's lots of stock

        let available_stock = 10.0;
        let requested_stock = 1.0;
        let adjusted_requested_stock = adjust_for_residual_packs(available_stock, requested_stock);

        assert_eq!(requested_stock, adjusted_requested_stock);

        let available_stock = 10.0;
        let requested_stock = 0.001;
        let adjusted_requested_stock = adjust_for_residual_packs(available_stock, requested_stock);

        assert_eq!(requested_stock, adjusted_requested_stock);

        // Check that we do adjust when there's almost enough stock

        let available_stock = 0.33332;
        let requested_stock = 0.33333;
        let adjusted_requested_stock = adjust_for_residual_packs(available_stock, requested_stock);

        assert_eq!(available_stock, adjusted_requested_stock);

        // Check we do adjust when we've asked for almost all our stock

        let available_stock = 0.33334;
        let requested_stock = 0.33333;
        let adjusted_requested_stock = adjust_for_residual_packs(available_stock, requested_stock);

        assert_eq!(available_stock, adjusted_requested_stock);
    }
}
