#[cfg(test)]
mod test {
    use crate::{
        printer::{UpdatePrinter, UpdatePrinterError},
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{mock_printer_a, mock_printer_b, MockData, MockDataInserts},
        printer::{PrinterFilter, PrinterRepository},
        test_db::setup_all_with_data,
        EqualFilter, PrinterRow,
    };

    #[actix_rt::test]
    async fn printer_update_errors() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "printer_update_errors",
            MockDataInserts::all(),
            MockData {
                printer: vec![mock_printer_b()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_printer_a().id, "".to_string())
            .unwrap();
        let service = service_provider.printer_service;

        //Printer does not exist
        let result = service.update_printer(
            &context,
            UpdatePrinter {
                id: "invalid".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(result, Err(UpdatePrinterError::PrinterDoesNotExist));

        //Printer description already exists
        let result = service.update_printer(
            &context,
            UpdatePrinter {
                id: mock_printer_a().id,
                description: "Room two".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(result, Err(UpdatePrinterError::DuplicatePrinterDescription));

        //Printer address already exists
        let result = service.update_printer(
            &context,
            UpdatePrinter {
                id: mock_printer_a().id,
                address: "111.222.3.444".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(result, Err(UpdatePrinterError::DuplicatePrinterAddress));
    }

    #[actix_rt::test]
    async fn printer_update_success() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "printer_update_success",
            MockDataInserts::all(),
            MockData {
                printer: vec![mock_printer_b()],
                ..Default::default()
            },
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let printer_repository = PrinterRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_printer_a().id, "".to_string())
            .unwrap();
        let service = service_provider.printer_service;

        let result_printer = PrinterRow {
            id: "Printer2".to_owned(),
            description: "Room three".to_owned(),
            address: "222.222.1.222".to_owned(),
            port: 1111.to_owned(),
            label_width: 55.to_owned(),
            label_height: 40.to_owned(),
        };

        assert_eq!(
            service.update_printer(
                &context,
                UpdatePrinter {
                    id: "Printer2".to_owned(),
                    description: "Room three".to_owned(),
                    address: "222.222.1.222".to_owned(),
                    port: 1111.to_owned(),
                    label_width: 55.to_owned(),
                    label_height: 40.to_owned(),
                },
            ),
            Ok(result_printer.clone())
        );

        assert_eq!(
            printer_repository
                .query_by_filter(PrinterFilter::new().id(EqualFilter::equal_to("Printer2")))
                .unwrap(),
            vec![result_printer]
        );
    }
}
