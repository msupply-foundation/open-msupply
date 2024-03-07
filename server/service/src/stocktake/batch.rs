use repository::StocktakeLine;

use crate::{stocktake_line::*, BatchMutationsProcessor, InputWithResult, WithDBError};

use super::*;

#[derive(Clone)]
pub struct BatchStocktake {
    pub insert_stocktake: Option<Vec<InsertStocktake>>,
    pub insert_line: Option<Vec<InsertStocktakeLine>>,
    pub update_line: Option<Vec<UpdateStocktakeLine>>,
    pub delete_line: Option<Vec<String>>,
    pub update_stocktake: Option<Vec<UpdateStocktake>>,
    pub delete_stocktake: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub type InsertStocktakesResult =
    Vec<InputWithResult<InsertStocktake, Result<Stocktake, InsertStocktakeError>>>;

pub type InsertStocktakeLinesResult =
    Vec<InputWithResult<InsertStocktakeLine, Result<StocktakeLine, InsertStocktakeLineError>>>;

pub type UpdateStocktakeLinesResult =
    Vec<InputWithResult<UpdateStocktakeLine, Result<StocktakeLine, UpdateStocktakeLineError>>>;

pub type DeleteStocktakeLinesResult =
    Vec<InputWithResult<String, Result<String, DeleteStocktakeLineError>>>;

pub type UpdateStocktakesResult =
    Vec<InputWithResult<UpdateStocktake, Result<Stocktake, UpdateStocktakeError>>>;

pub type DeleteStocktakesResult =
    Vec<InputWithResult<String, Result<String, DeleteStocktakeError>>>;

#[derive(Debug, Default)]
pub struct BatchStocktakeResult {
    pub insert_stocktake: InsertStocktakesResult,
    pub insert_line: InsertStocktakeLinesResult,
    pub update_line: UpdateStocktakeLinesResult,
    pub delete_line: DeleteStocktakeLinesResult,
    pub update_stocktake: UpdateStocktakesResult,
    pub delete_stocktake: DeleteStocktakesResult,
}

pub fn batch_stocktake(
    ctx: &ServiceContext,
    input: BatchStocktake,
) -> Result<BatchStocktakeResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchStocktakeResult::default();

            let mutations_processor = BatchMutationsProcessor::new(ctx);

            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.insert_stocktake, insert_stocktake);
            results.insert_stocktake = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.insert_line, insert_stocktake_line);
            results.insert_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.update_line, update_stocktake_line);
            results.update_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.delete_line, delete_stocktake_line);
            results.delete_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.update_stocktake, update_stocktake);
            results.update_stocktake = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.delete_stocktake, delete_stocktake);
            results.delete_stocktake = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            Ok(results) as Result<BatchStocktakeResult, WithDBError<BatchStocktakeResult>>
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
        mock::{mock_item_a, mock_stocktake_finalised, mock_store_a, MockDataInserts},
        test_db::setup_all,
        StocktakeLineRowRepository, StocktakeRowRepository,
    };
    use util::inline_init;

    use crate::{
        service_provider::ServiceProvider, stocktake::*, stocktake_line::InsertStocktakeLine,
        InputWithResult,
    };

    #[actix_rt::test]
    async fn batch_stocktake_service() {
        let (_, connection, connection_manager, _) =
            setup_all("batch_stocktake_service", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stocktake_service;

        let delete_stocktake_input = mock_stocktake_finalised().id;

        let mut input = BatchStocktake {
            insert_stocktake: Some(vec![inline_init(|input: &mut InsertStocktake| {
                input.id = "new_id".to_string();
            })]),
            insert_line: Some(vec![inline_init(|input: &mut InsertStocktakeLine| {
                input.stocktake_id = "new_id".to_string();
                input.id = "new_line_id".to_string();
                input.item_id = Some(mock_item_a().id);
            })]),
            update_line: None,
            delete_line: None,
            update_stocktake: None,
            delete_stocktake: Some(vec![delete_stocktake_input.clone()]),
            continue_on_error: None,
        };

        // Test rollback
        let result = service.batch_stocktake(&context, input.clone()).unwrap();

        assert_eq!(
            result.delete_stocktake,
            vec![InputWithResult {
                input: delete_stocktake_input,
                result: Err(DeleteStocktakeError::CannotEditFinalised {})
            }]
        );

        assert_eq!(
            StocktakeRowRepository::new(&connection)
                .find_one_by_id("new_id")
                .unwrap(),
            None
        );

        assert_eq!(
            StocktakeLineRowRepository::new(&connection)
                .find_one_by_id("new_line_id")
                .unwrap(),
            None
        );

        // Test no rollback
        input.continue_on_error = Some(true);

        service.batch_stocktake(&context, input).unwrap();

        assert_ne!(
            StocktakeRowRepository::new(&connection)
                .find_one_by_id("new_id")
                .unwrap(),
            None
        );

        assert_ne!(
            StocktakeLineRowRepository::new(&connection)
                .find_one_by_id("new_line_id")
                .unwrap(),
            None
        );
    }
}
