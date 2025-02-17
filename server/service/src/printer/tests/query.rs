#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::{mock_printer_a, mock_printer_b, MockData, MockDataInserts},
        printer::PrinterFilter,
        test_db::setup_all_with_data,
    };

    #[actix_rt::test]
    async fn query_printer() {
        let (mock_data, connection, connection_manager, _) = setup_all_with_data(
            "test_printer_query",
            MockDataInserts::all(),
            MockData {
                printer: vec![mock_printer_a(), mock_printer_b()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let service = service_provider.printer_service;

        let printers = mock_data["base"].printer.clone();

        //Get All Printers
        let result = service
            .get_printers(&connection, Some(PrinterFilter::new()))
            .unwrap();

        assert_eq!(result, printers);
    }
}
