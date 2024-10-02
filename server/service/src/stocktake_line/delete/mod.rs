mod validate;
pub use validate::*;

use repository::{RepositoryError, StocktakeLineRowRepository, TransactionError};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub enum DeleteStocktakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StocktakeLineDoesNotExist,
    CannotEditFinalised,
    StocktakeIsLocked,
}

/// Returns the id of the deleted stocktake_line
pub fn delete_stocktake_line(
    ctx: &ServiceContext,
    stocktake_line_id: String,
) -> Result<String, DeleteStocktakeLineError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &stocktake_line_id)?;
            StocktakeLineRowRepository::new(connection).delete(&stocktake_line_id)?;
            Ok(())
        })
        .map_err(|error: TransactionError<DeleteStocktakeLineError>| error.to_inner_error())?;
    Ok(stocktake_line_id.to_string())
}

impl From<RepositoryError> for DeleteStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteStocktakeLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod stocktake_line_test {
    use repository::{
        mock::{
            mock_locked_stocktake_line, mock_stocktake_line_a, mock_stocktake_line_finalised,
            mock_store_a, MockDataInserts,
        },
        test_db::setup_all,
    };

    use crate::{
        service_provider::ServiceProvider, stocktake_line::delete::DeleteStocktakeLineError,
    };

    #[actix_rt::test]
    async fn delete_stocktake_line() {
        let (_, _, connection_manager, _) =
            setup_all("delete_stocktake_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stocktake_line_service;

        // error: stocktake line does not exist
        let error = service
            .delete_stocktake_line(&context, "invalid".to_string())
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::StocktakeLineDoesNotExist);

        // error: invalid store
        context.store_id = "invalid".to_string();
        let existing_line = mock_stocktake_line_a();
        let error = service
            .delete_stocktake_line(&context, existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::InvalidStore);
        // error: invalid store
        let existing_line = mock_stocktake_line_a();
        let error = service
            .delete_stocktake_line(&context, existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::InvalidStore);

        // error CannotEditFinalised
        context.store_id = mock_store_a().id;
        let existing_line = mock_stocktake_line_finalised();
        let error = service
            .delete_stocktake_line(&context, existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::CannotEditFinalised);

        // error StocktakeIsLocked
        let existing_line = mock_locked_stocktake_line();
        let error = service
            .delete_stocktake_line(&context, existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::StocktakeIsLocked);

        // success
        let existing_line = mock_stocktake_line_a();
        let deleted_id = service
            .delete_stocktake_line(&context, existing_line.id.clone())
            .unwrap();
        assert_eq!(existing_line.id, deleted_id);
        assert_eq!(
            service
                .get_stocktake_line(&context, "invalid", existing_line.id)
                .unwrap(),
            None
        );
    }
}
