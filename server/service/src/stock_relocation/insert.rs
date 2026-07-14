use chrono::Utc;
use repository::{
    NumberRowType, RepositoryError, StockRelocationRow, StockRelocationRowRepository,
    StockRelocationStatus, TransactionError,
};

use crate::number::next_number;
use crate::service_provider::ServiceContext;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertStockRelocation {
    pub id: String,
    pub comment: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertStockRelocationError {
    StockRelocationAlreadyExists,
    DatabaseError(RepositoryError),
}

pub fn insert_stock_relocation(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertStockRelocation,
) -> Result<StockRelocationRow, InsertStockRelocationError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = StockRelocationRowRepository::new(connection);
            if repo.find_one_by_id(&input.id)?.is_some() {
                return Err(InsertStockRelocationError::StockRelocationAlreadyExists);
            }

            let number = next_number(connection, &NumberRowType::StockRelocation, store_id)?;

            let row = StockRelocationRow {
                id: input.id,
                store_id: store_id.to_string(),
                stock_movement_number: number,
                status: StockRelocationStatus::New,
                created_datetime: Utc::now().naive_utc(),
                created_by: ctx.user_id.clone(),
                confirmed_datetime: None,
                finalised_datetime: None,
                comment: input.comment,
            };
            repo.upsert_one(&row)?;

            Ok(row)
        })
        .map_err(|error: TransactionError<InsertStockRelocationError>| error.to_inner_error())
}

impl From<RepositoryError> for InsertStockRelocationError {
    fn from(error: RepositoryError) -> Self {
        InsertStockRelocationError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{mock::MockDataInserts, test_db::setup_all, StockRelocationStatus};
    use util::uuid::uuid;

    use crate::service_provider::{ServiceContext, ServiceProvider};

    use super::*;

    async fn setup(test: &str) -> (ServiceProvider, ServiceContext) {
        let (_, _, connection_manager, _) = setup_all(test, MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        (service_provider, context)
    }

    #[actix_rt::test]
    async fn insert_stock_relocation_creates_empty_movement() {
        let (service_provider, ctx) = setup("insert_stock_relocation_creates_empty_movement").await;
        let service = &service_provider.stock_relocation_service;

        let first = service
            .insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation {
                    id: uuid(),
                    comment: Some("relocate to cold room".to_string()),
                },
            )
            .unwrap();

        assert_eq!(first.status, StockRelocationStatus::New);
        assert_eq!(first.created_by, "user_account_a");
        assert_eq!(first.finalised_datetime, None);
        assert_eq!(first.comment.as_deref(), Some("relocate to cold room"));
        assert_eq!(first.stock_movement_number, 1);

        let second = service
            .insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation {
                    id: uuid(),
                    comment: None,
                },
            )
            .unwrap();
        assert_eq!(second.stock_movement_number, 2);
    }

    #[actix_rt::test]
    async fn insert_stock_relocation_rejects_duplicate_id() {
        let (service_provider, ctx) = setup("insert_stock_relocation_rejects_duplicate_id").await;
        let service = &service_provider.stock_relocation_service;

        let id = uuid();
        service
            .insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation {
                    id: id.clone(),
                    comment: None,
                },
            )
            .unwrap();

        assert_eq!(
            service.insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation { id, comment: None }
            ),
            Err(InsertStockRelocationError::StockRelocationAlreadyExists)
        );
    }
}
