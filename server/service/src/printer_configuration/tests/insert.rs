#[cfg(test)]
mod test {
    use crate::{
        printer_configuration::{InsertPrinterConfiguration, InsertPrinterConfigurationError},
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{mock_printer_configuration_a, MockDataInserts},
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn printer_configuration_service_update_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "printer_configuration_service_update_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_printer_configuration_a().id, "".to_string())
            .unwrap();
        let service = service_provider.printer_configuration_service;

        //Printer does not exist
        let result = service.insert_printer_configuration(
            &context,
            InsertPrinterConfiguration {
                id: "Printer1".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(
            result,
            Err(InsertPrinterConfigurationError::DuplicatePrinterConfiguration)
        );
    }
}
