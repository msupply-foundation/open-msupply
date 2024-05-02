#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_stock_line_a, mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
        StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{service_provider::ServiceProvider, stock_line::UpdateStockLine, NullableUpdate};

    type ServiceError = crate::stock_line::UpdateStockLineError;

    #[actix_rt::test]
    async fn update_stock_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_stock_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stock_line_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.update_stock_line(
                &context,
                inline_init(|r: &mut UpdateStockLine| {
                    r.id = "invalid".to_string();
                })
            ),
            Err(ServiceError::StockDoesNotExist)
        );

        // LocationDoesNotExist
        assert_eq!(
            service.update_stock_line(
                &context,
                inline_init(|r: &mut UpdateStockLine| {
                    r.id = mock_stock_line_a().id;
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                })
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // StockDoesNotBelongToStore
        context.store_id = "store_b".to_string();
        assert_eq!(
            service.update_stock_line(
                &context,
                inline_init(|r: &mut UpdateStockLine| {
                    r.id = mock_stock_line_a().id;
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                })
            ),
            Err(ServiceError::StockDoesNotBelongToStore)
        );
    }

    #[actix_rt::test]
    async fn update_stock_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("update_stock_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stock_line_service;

        // Success
        service
            .update_stock_line(
                &context,
                inline_init(|r: &mut UpdateStockLine| {
                    r.id = mock_stock_line_a().id;
                    r.location = Some(NullableUpdate {
                        value: Some("location_1".to_string()),
                    });
                }),
            )
            .unwrap();

        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id_old(&mock_stock_line_a().id)
            .unwrap();

        assert_eq!(
            stock_line,
            inline_edit(&stock_line, |mut l| {
                l.location_id = Some("location_1".to_string());
                l
            })
        );
    }
}
