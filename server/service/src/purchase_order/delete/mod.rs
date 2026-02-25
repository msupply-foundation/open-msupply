use repository::{ActivityLogType, PurchaseOrderRowRepository, RepositoryError, TransactionError};

pub mod validate;

use validate::validate;

use crate::{
    activity_log::activity_log_entry,
    purchase_order::common::get_lines_for_purchase_order,
    purchase_order_line::delete::{delete_purchase_order_line, DeletePurchaseOrderLineError},
    service_provider::ServiceContext,
    WithDBError,
};

type OutError = DeletePurchaseOrderError;

pub fn delete_purchase_order(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<String, DeletePurchaseOrderError> {
    let purchase_order_id =
        ctx.connection
            .transaction_sync(|connection| {
                validate(&id, store_id, connection)?;

                let lines = get_lines_for_purchase_order(connection, &id)?;
                for line in lines {
                    delete_purchase_order_line(ctx, line.purchase_order_line_row.id.clone())
                        .map_err(|error| OutError::LineDeleteError {
                            line_id: line.purchase_order_line_row.id,
                            error,
                        })?;
                }

                activity_log_entry(
                    ctx,
                    ActivityLogType::PurchaseOrderDeleted,
                    Some(id.to_string()),
                    None,
                    None,
                )?;

                match PurchaseOrderRowRepository::new(connection).delete(&id) {
                    Ok(_) => Ok(id.clone()),
                    Err(error) => Err(OutError::DatabaseError(error)),
                }
            })
            .map_err(|error| error.to_inner_error())?;

    Ok(purchase_order_id)
}

#[derive(Debug, PartialEq, Clone)]
pub enum DeletePurchaseOrderError {
    PurchaseOrderDoesNotExist,
    DatabaseError(RepositoryError),
    NotThisStorePurchaseOrder,
    CannotDeletePurchaseOrder,
    LineDeleteError {
        line_id: String,
        error: DeletePurchaseOrderLineError,
    },
}

impl From<RepositoryError> for DeletePurchaseOrderError {
    fn from(error: RepositoryError) -> Self {
        DeletePurchaseOrderError::DatabaseError(error)
    }
}

impl From<TransactionError<DeletePurchaseOrderError>> for DeletePurchaseOrderError {
    fn from(error: TransactionError<DeletePurchaseOrderError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                DeletePurchaseOrderError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl<ERR> From<WithDBError<ERR>> for DeletePurchaseOrderError
where
    ERR: Into<DeletePurchaseOrderError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_purchase_order_a, mock_purchase_order_c, mock_purchase_order_d, mock_store_a,
            MockDataInserts,
        },
        test_db::setup_all,
        PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus,
    };

    use crate::{
        purchase_order::delete::DeletePurchaseOrderError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_purchase_order_errors() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_purchase_order_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.purchase_order_service;

        // PurchaseOrderDoesNotExist
        assert_eq!(
            service.delete_purchase_order(&context, &mock_store_a().id, "invalid".to_string()),
            Err(ServiceError::PurchaseOrderDoesNotExist)
        );

        // NotThisStorePurchaseOrder
        assert_eq!(
            service.delete_purchase_order(&context, &mock_store_a().id, mock_purchase_order_d().id),
            Err(ServiceError::NotThisStorePurchaseOrder)
        );

        // CannotDeletePurchaseOrder - test with a FINALISED status purchase order
        assert_eq!(
            service.delete_purchase_order(&context, &mock_store_a().id, mock_purchase_order_c().id),
            Err(ServiceError::CannotDeletePurchaseOrder)
        );

        // CannotDeletePurchaseOrder - test with a CONFIRMED status purchase order
        let confirmed_purchase_order = PurchaseOrderRow {
            id: "test_purchase_order_confirmed".to_string(),
            store_id: mock_store_a().id,
            status: PurchaseOrderStatus::Confirmed,
            supplier_name_id: "name_a".to_string(),
            purchase_order_number: 1111111111,
            ..Default::default()
        };

        // Insert the confirmed purchase order for testing
        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&confirmed_purchase_order)
            .unwrap();

        assert_eq!(
            service.delete_purchase_order(
                &context,
                &mock_store_a().id,
                confirmed_purchase_order.id
            ),
            Err(ServiceError::CannotDeletePurchaseOrder)
        );
    }

    #[actix_rt::test]
    async fn delete_purchase_order_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_purchase_order_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.purchase_order_service;

        let purchase_order_id = service
            .delete_purchase_order(&context, &mock_store_a().id, mock_purchase_order_a().id)
            .unwrap();

        // Test entry has been deleted
        assert_eq!(
            PurchaseOrderRowRepository::new(&connection)
                .find_one_by_id(&purchase_order_id)
                .unwrap(),
            None
        );
    }
}
