use crate::{
    purchase_order::{
        delete::{delete_purchase_order, DeletePurchaseOrderError},
        insert::{insert_purchase_order, InsertPurchaseOrderError, InsertPurchaseOrderInput},
        update::{update_purchase_order, UpdatePurchaseOrderError, UpdatePurchaseOrderInput},
    },
    purchase_order_line::{
        delete::{delete_purchase_order_line, DeletePurchaseOrderLineError},
        insert::{insert_purchase_order_line, InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput},
        update::{update_purchase_order_line, UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError},
    },
    service_provider::ServiceContext,
    BatchMutationsProcessor, InputWithResult, WithDBError,
};
use repository::{PurchaseOrderLine, PurchaseOrderLineRow, PurchaseOrderRow, RepositoryError};

#[derive(Debug, Clone)]
pub struct BatchPurchaseOrder {
    pub insert_purchase_order: Option<Vec<InsertPurchaseOrderInput>>,
    pub insert_purchase_order_line: Option<Vec<InsertPurchaseOrderLineInput>>,
    pub update_purchase_order_line: Option<Vec<UpdatePurchaseOrderLineInput>>,
    pub delete_purchase_order_line: Option<Vec<String>>,
    pub update_purchase_order: Option<Vec<UpdatePurchaseOrderInput>>,
    pub delete_purchase_order: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub type InsertPurchaseOrdersResult =
    Vec<InputWithResult<InsertPurchaseOrderInput, Result<PurchaseOrderRow, InsertPurchaseOrderError>>>;
pub type InsertPurchaseOrderLinesResult = Vec<
    InputWithResult<
        InsertPurchaseOrderLineInput,
        Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError>,
    >,
>;
pub type UpdatePurchaseOrderLinesResult = Vec<
    InputWithResult<UpdatePurchaseOrderLineInput, Result<PurchaseOrderLine, UpdatePurchaseOrderLineInputError>>,
>;
pub type DeletePurchaseOrderLinesResult =
    Vec<InputWithResult<String, Result<String, DeletePurchaseOrderLineError>>>;
pub type UpdatePurchaseOrdersResult =
    Vec<InputWithResult<UpdatePurchaseOrderInput, Result<PurchaseOrderRow, UpdatePurchaseOrderError>>>;
pub type DeletePurchaseOrdersResult =
    Vec<InputWithResult<String, Result<String, DeletePurchaseOrderError>>>;

#[derive(Debug, Default)]
pub struct BatchPurchaseOrderResult {
    pub insert_purchase_order: InsertPurchaseOrdersResult,
    pub insert_purchase_order_line: InsertPurchaseOrderLinesResult,
    pub update_purchase_order_line: UpdatePurchaseOrderLinesResult,
    pub delete_purchase_order_line: DeletePurchaseOrderLinesResult,
    pub update_purchase_order: UpdatePurchaseOrdersResult,
    pub delete_purchase_order: DeletePurchaseOrdersResult,
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
            let store_id = &ctx.store_id;

            // Insert Purchase Orders
            let insert_fn = |ctx: &ServiceContext, input: InsertPurchaseOrderInput| {
                insert_purchase_order(ctx, store_id, input)
            };
            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.insert_purchase_order, insert_fn);
            results.insert_purchase_order = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Purchase Order Lines
            let insert_line_fn = |ctx: &ServiceContext, input: InsertPurchaseOrderLineInput| {
                insert_purchase_order_line(ctx, store_id, input)
            };
            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.insert_purchase_order_line, insert_line_fn);
            results.insert_purchase_order_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let update_line_fn = |ctx: &ServiceContext, input: UpdatePurchaseOrderLineInput| {
                update_purchase_order_line(ctx, store_id, input)
            };
            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.update_purchase_order_line, update_line_fn);
            results.update_purchase_order_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let delete_line_fn = |ctx: &ServiceContext, id: String| {
                delete_purchase_order_line(ctx, id)
            };
            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.delete_purchase_order_line, delete_line_fn);
            results.delete_purchase_order_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Update Purchase Orders
            let update_fn = |ctx: &ServiceContext, input: UpdatePurchaseOrderInput| {
                update_purchase_order(ctx, store_id, input)
            };
            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.update_purchase_order, update_fn);
            results.update_purchase_order = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Delete Purchase Orders
            let delete_fn = |ctx: &ServiceContext, id: String| {
                delete_purchase_order(ctx, id)
            };
            let (_has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.delete_purchase_order, delete_fn);
            results.delete_purchase_order = result;

            Ok(results) as Result<BatchPurchaseOrderResult, WithDBError<BatchPurchaseOrderResult>>
        })
        .map_err(|error| error.to_inner_error())
        .or_else(|error| match error {
            WithDBError::DatabaseError(repository_error) => Err(repository_error),
            WithDBError::Error(batch_response) => Ok(batch_response),
        })?;

    Ok(result)
}
