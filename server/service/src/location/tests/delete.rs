#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, InvoiceLineFilter, InvoiceLineRepository,
        LocationFilter, LocationRepository, StockLineFilter, StockLineRepository,
    };

    use crate::{
        location::delete::{DeleteLocation, DeleteLocationError, LocationInUse},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn location_service_delete_errors() {
        let (_, _, connection_manager, _) =
            setup_all("location_service_delete_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let stock_line_repository = StockLineRepository::new(&connection);
        let invoice_line_repository = InvoiceLineRepository::new(&connection);

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        let locations_not_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(EqualFilter::not_equal_to("store_a")))
            .unwrap();

        // Location does not exist
        assert_eq!(
            service.delete_location(
                &context,
                DeleteLocation {
                    id: "invalid".to_owned(),
                },
            ),
            Err(DeleteLocationError::LocationDoesNotExist)
        );

        // Location for another store
        assert_eq!(
            service.delete_location(
                &context,
                DeleteLocation {
                    id: locations_not_in_store[0].location_row.id.clone(),
                },
            ),
            Err(DeleteLocationError::LocationDoesNotBelongToCurrentStore)
        );

        // Location is not empty (invoice lines in use)
        let location_id = "location_1".to_owned();
        let stock_lines = stock_line_repository
            .query_by_filter(
                StockLineFilter::new().location_id(EqualFilter::equal_to(&location_id)),
            )
            .unwrap();
        let invoice_lines = invoice_line_repository
            .query_by_filter(
                InvoiceLineFilter::new().location_id(EqualFilter::equal_to(&location_id)),
            )
            .unwrap();

        assert_eq!(
            service.delete_location(&context, DeleteLocation { id: location_id }),
            Err(DeleteLocationError::LocationInUse(LocationInUse {
                stock_lines,
                invoice_lines
            }))
        );

        // Location is not empty (stock_lines in use)
        let location_id = "location_on_hold".to_owned();
        let stock_lines = stock_line_repository
            .query_by_filter(
                StockLineFilter::new().location_id(EqualFilter::equal_to(&location_id)),
            )
            .unwrap();
        let invoice_lines = invoice_line_repository
            .query_by_filter(
                InvoiceLineFilter::new().location_id(EqualFilter::equal_to(&location_id)),
            )
            .unwrap();

        assert_eq!(
            service.delete_location(&context, DeleteLocation { id: location_id }),
            Err(DeleteLocationError::LocationInUse(LocationInUse {
                stock_lines,
                invoice_lines
            }))
        );
    }
    #[actix_rt::test]
    async fn location_service_delete_success() {
        let (_, _, connection_manager, _) =
            setup_all("location_service_delete_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        assert_eq!(
            service.delete_location(
                &context,
                DeleteLocation {
                    id: "location_2".to_owned()
                },
            ),
            Ok("location_2".to_owned())
        );

        assert_eq!(
            location_repository
                .query_by_filter(LocationFilter::new().id(EqualFilter::equal_to("location_2")))
                .unwrap(),
            vec![]
        );
    }
}
