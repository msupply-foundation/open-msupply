use repository::{RepositoryError, StockRelocationLineRow};

use crate::{
    service_provider::ServiceContext, BatchMutationsProcessor, InputWithResult, WithDBError,
};

use super::{
    delete::{delete_stock_relocation_line, DeleteStockRelocationLineError},
    upsert::{
        upsert_stock_relocation_line, UpsertStockRelocationLine, UpsertStockRelocationLineError,
    },
};

#[derive(Clone, Debug, Default)]
pub struct BatchStockRelocationLine {
    pub upsert: Option<Vec<UpsertStockRelocationLine>>,
    pub delete: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub type UpsertLinesResult = Vec<
    InputWithResult<
        UpsertStockRelocationLine,
        Result<StockRelocationLineRow, UpsertStockRelocationLineError>,
    >,
>;
pub type DeleteLinesResult =
    Vec<InputWithResult<String, Result<String, DeleteStockRelocationLineError>>>;

#[derive(Debug, Default)]
pub struct BatchStockRelocationLineResult {
    pub upsert: UpsertLinesResult,
    pub delete: DeleteLinesResult,
}

pub fn batch_stock_relocation_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: BatchStockRelocationLine,
) -> Result<BatchStockRelocationLineResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchStockRelocationLineResult::default();

            let processor = BatchMutationsProcessor::new(ctx);

            let (has_errors, result) = processor.do_mutations(input.delete, |ctx, id| {
                delete_stock_relocation_line(ctx, store_id, id)
            });
            results.delete = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = processor.do_mutations(input.upsert, |ctx, line| {
                upsert_stock_relocation_line(ctx, store_id, line)
            });
            results.upsert = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            Ok(results)
                as Result<
                    BatchStockRelocationLineResult,
                    WithDBError<BatchStockRelocationLineResult>,
                >
        })
        .map_err(|error| error.to_inner_error())
        .or_else(|error| match error {
            WithDBError::DatabaseError(repository_error) => Err(repository_error),
            WithDBError::Error(batch_response) => Ok(batch_response),
        })?;

    Ok(result)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_location_1, MockDataInserts},
        test_db::setup_all,
        StockLineRow, StockRelocationLineRowRepository, Upsert,
    };
    use util::uuid::uuid;

    use crate::service_provider::{ServiceContext, ServiceProvider};
    use crate::stock_relocation::insert::InsertStockRelocation;
    use crate::stock_relocation::validate::ValidateMovementError;

    use super::*;

    fn stock_line(id: &str) -> StockLineRow {
        StockLineRow {
            id: id.to_string(),
            item_id: "item_a".to_string(),
            store_id: "store_a".to_string(),
            pack_size: 1.0,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            ..Default::default()
        }
    }

    async fn setup(test: &str) -> (ServiceProvider, ServiceContext) {
        let (_, _, connection_manager, _) = setup_all(test, MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        (service_provider, context)
    }

    async fn new_movement(service_provider: &ServiceProvider, ctx: &ServiceContext) -> String {
        let id = uuid();
        service_provider
            .stock_relocation_service
            .insert_stock_relocation(
                ctx,
                "store_a",
                InsertStockRelocation {
                    id: id.clone(),
                    comment: None,
                },
            )
            .unwrap();
        id
    }

    fn upsert(
        movement_id: &str,
        stock_line_id: &str,
        number_of_packs: f64,
    ) -> UpsertStockRelocationLine {
        UpsertStockRelocationLine {
            id: uuid(),
            stock_relocation_id: movement_id.to_string(),
            stock_line_id: stock_line_id.to_string(),
            number_of_packs,
            destination_location_id: Some(mock_location_1().id),
        }
    }

    #[actix_rt::test]
    async fn batch_stock_relocation_line_success() {
        let (service_provider, ctx) = setup("batch_stock_relocation_line_success").await;
        stock_line("a_sl").upsert(&ctx.connection).unwrap();
        stock_line("b_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;
        let line_repo = StockRelocationLineRowRepository::new(&ctx.connection);
        let movement_id = new_movement(&service_provider, &ctx).await;

        let line_a = upsert(&movement_id, "a_sl", 4.0);
        let line_b = upsert(&movement_id, "b_sl", 4.0);
        let result = service
            .batch_stock_relocation_line(
                &ctx,
                "store_a",
                BatchStockRelocationLine {
                    upsert: Some(vec![line_a.clone(), line_b.clone()]),
                    ..Default::default()
                },
            )
            .unwrap();
        assert!(result.upsert.iter().all(|r| r.result.is_ok()));
        assert_eq!(
            line_repo
                .find_many_by_stock_relocation_id(&movement_id)
                .unwrap()
                .len(),
            2
        );

        let result = service
            .batch_stock_relocation_line(
                &ctx,
                "store_a",
                BatchStockRelocationLine {
                    upsert: Some(vec![upsert(&movement_id, "a_sl", 6.0)]),
                    delete: Some(vec![line_b.id.clone()]),
                    ..Default::default()
                },
            )
            .unwrap();
        assert!(result.delete.iter().all(|r| r.result.is_ok()));
        assert!(result.upsert.iter().all(|r| r.result.is_ok()));
        assert!(line_repo.find_one_by_id(&line_b.id).unwrap().is_none());
    }
}
