#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::{mock_printer_a, MockData, MockDataInserts},
        printer::PrinterFilter,
        test_db::setup_all_with_data,
        PrinterRow,
    };

    #[actix_rt::test]
    async fn query_printer() {
        let (mock_data, connection, connection_manager, _) = setup_all_with_data(
            "test_printer_query",
            MockDataInserts::all(),
            MockData {
                printer: vec![PrinterRow {
                    id: mock_printer_a().id,
                    description: mock_printer_a().description,
                    address: mock_printer_a().address,
                    port: mock_printer_a().port,
                    label_width: mock_printer_a().label_width,
                    label_height: mock_printer_a().label_height,
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let service = service_provider.printer_service;

        let printer = mock_data["base"].printer.clone();

        //Get All Printers
        let result = service
            .get_printers(&connection, Some(PrinterFilter::new()))
            .unwrap();

        assert_eq!(result, printer);
    }
}
