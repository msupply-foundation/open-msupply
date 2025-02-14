#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::{mock_printer_configuration_a, MockData, MockDataInserts},
        printer_configuration::PrinterConfigurationFilter,
        test_db::setup_all_with_data,
        PrinterConfigurationRow,
    };

    #[actix_rt::test]
    async fn query_printer_configuration() {
        let (mock_data, connection, connection_manager, _) = setup_all_with_data(
            "test_printer_configuration_query",
            MockDataInserts::all(),
            MockData {
                printer_configuration: vec![PrinterConfigurationRow {
                    id: mock_printer_configuration_a().id,
                    description: mock_printer_configuration_a().description,
                    address: mock_printer_configuration_a().address,
                    port: mock_printer_configuration_a().port,
                    label_width: mock_printer_configuration_a().label_width,
                    label_height: mock_printer_configuration_a().label_height,
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let service = service_provider.printer_configuration_service;

        let printer_configuration = mock_data["base"].printer_configuration.clone();

        //Get All Printers
        let result = service
            .get_printer_configurations(&connection, Some(PrinterConfigurationFilter::new()))
            .unwrap();

        assert_eq!(result, printer_configuration);
    }
}
