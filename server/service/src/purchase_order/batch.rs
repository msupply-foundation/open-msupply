use repository::{PurchaseOrderLineRow, RepositoryError};

use crate::{
    purchase_order_line::insert::{
        insert_purchase_order_line, InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput,
    },
    service_provider::ServiceContext,
    BatchMutationsProcessor, InputWithResult, WithDBError,
};

#[derive(Clone)]
pub struct BatchPurchaseOrder {
    pub insert_lines: Option<Vec<InsertPurchaseOrderLineInput>>,
    pub continue_on_error: Option<bool>,
}

pub type InsertLinesResult = Vec<
    InputWithResult<
        InsertPurchaseOrderLineInput,
        Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError>,
    >,
>;

#[derive(Debug, Default)]
pub struct BatchPurchaseOrderResult {
    // TODO add batch insert purchase order
    pub insert_line: InsertLinesResult,
    // TODO add batch other line mutations
}

pub fn batch_purchase_order(
    ctx: &ServiceContext,
    input: BatchPurchaseOrder,
) -> Result<BatchPurchaseOrderResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchPurchaseOrderResult::default();

            let mutations_processor = BatchMutationsProcessor::new(ctx);

            // Normal Line

            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.insert_lines, insert_purchase_order_line);
            results.insert_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // TODO add other line mutations

            Ok(results) as Result<BatchPurchaseOrderResult, WithDBError<BatchPurchaseOrderResult>>
        })
        .map_err(|error| error.to_inner_error())
        .or_else(|error| match error {
            WithDBError::DatabaseError(repository_error) => Err(repository_error),
            WithDBError::Error(batch_response) => Ok(batch_response),
        })?;

    Ok(result)
}
