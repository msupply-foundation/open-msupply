#[cfg(test)]
mod query {
    use domain::{
        invoice_line::InvoiceLineFilter,
        location::{DeleteLocation, LocationFilter},
        stock_line::StockLineFilter,
    };
    use repository::{
        mock::MockDataInserts, test_db::setup_all, InvoiceLineRepository, LocationRepository,
        StockLineRepository,
    };

    use crate::{
        current_store_id,
        location::delete::{
            DeleteLocationError, DeleteLocationService, DeleteLocationServiceTrait,
        },
        service_provider::ServiceConnection,
    };

    #[actix_rt::test]
    async fn delete_location_service_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_location_service_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let stock_line_repository = StockLineRepository::new(&connection);
        let invoice_line_repository = InvoiceLineRepository::new(&connection);
        let service = DeleteLocationService(ServiceConnection::Connection(
            connection_manager.connection().unwrap(),
        ));

        let locations_not_in_store = location_repository
            .query_by_filter(
                LocationFilter::new().store_id(|f| f.not_equal_to(&current_store_id())),
            )
            .unwrap();

        // Location does not exist
        assert_eq!(
            service.delete_location(DeleteLocation {
                id: "invalid".to_owned(),
            }),
            Err(DeleteLocationError::LocationDoesNotExist)
        );

        // Location for another store
        assert_eq!(
            service.delete_location(DeleteLocation {
                id: locations_not_in_store[0].id.clone(),
            }),
            Err(DeleteLocationError::LocationDoesNotBelongToCurrentStore)
        );

        // Location is not empty (invoice lines in use)
        let location_id = "location_1".to_owned();
        let stock_lines = stock_line_repository
            .query_by_filter(StockLineFilter::new().location_id(|f| f.equal_to(&location_id)))
            .unwrap();
        let invoice_lines = invoice_line_repository
            .query_by_filter(InvoiceLineFilter::new().location_id(|f| f.equal_to(&location_id)))
            .unwrap();

        assert_eq!(
            service.delete_location(DeleteLocation { id: location_id }),
            Err(DeleteLocationError::LocationInUse {
                stock_lines,
                invoice_lines
            })
        );

        // Location is not empty (stock_lines in use)
        let location_id = "location_on_hold".to_owned();
        let stock_lines = stock_line_repository
            .query_by_filter(StockLineFilter::new().location_id(|f| f.equal_to(&location_id)))
            .unwrap();
        let invoice_lines = invoice_line_repository
            .query_by_filter(InvoiceLineFilter::new().location_id(|f| f.equal_to(&location_id)))
            .unwrap();

        assert_eq!(
            service.delete_location(DeleteLocation { id: location_id }),
            Err(DeleteLocationError::LocationInUse {
                stock_lines,
                invoice_lines
            })
        );
    }
    #[actix_rt::test]
    async fn delete_location_service_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_location_service_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service = DeleteLocationService(ServiceConnection::Connection(
            connection_manager.connection().unwrap(),
        ));

        assert_eq!(
            service.delete_location(DeleteLocation {
                id: "location_2".to_owned()
            }),
            Ok("location_2".to_owned())
        );

        assert_eq!(
            location_repository
                .query_by_filter(LocationFilter::new().id(|f| f.equal_to(&"location_2".to_owned())))
                .unwrap(),
            vec![]
        );
    }
}
