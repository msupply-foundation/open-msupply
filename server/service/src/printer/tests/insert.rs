#[cfg(test)]
mod test {
    use crate::{
        printer::{InsertPrinter, InsertPrinterError},
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{mock_printer_a, MockDataInserts},
        printer::{PrinterFilter, PrinterRepository},
        test_db::setup_all,
        EqualFilter, PrinterRow,
    };

    #[actix_rt::test]
    async fn printer_insert_errors() {
        let (_, _, connection_manager, _) =
            setup_all("printer_insert_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_printer_a().id, "".to_string())
            .unwrap();
        let service = service_provider.printer_service;

        //Printer id already exists
        let result = service.insert_printer(
            &context,
            InsertPrinter {
                id: "Printer1".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(result, Err(InsertPrinterError::DuplicatePrinterId));

        //Printer description already exists
        let result = service.insert_printer(
            &context,
            InsertPrinter {
                description: "Room one".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(result, Err(InsertPrinterError::DuplicatePrinterDescription));

        //Printer address already exists
        let result = service.insert_printer(
            &context,
            InsertPrinter {
                address: "111.222.1.222".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(result, Err(InsertPrinterError::DuplicatePrinterAddress));
    }

    #[actix_rt::test]
    async fn insert_printer_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_printer_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let printer_repository = PrinterRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_printer_a().id, "".to_string())
            .unwrap();
        let service = service_provider.printer_service;

        let result_printer = PrinterRow {
            id: "new_id".to_owned(),
            description: "new_description".to_owned(),
            address: "new_address".to_owned(),
            port: 8000.to_owned(),
            label_width: 50.to_owned(),
            label_height: 70.to_owned(),
        };

        assert_eq!(
            service.insert_printer(
                &context,
                InsertPrinter {
                    id: "new_id".to_owned(),
                    description: "new_description".to_owned(),
                    address: "new_address".to_owned(),
                    port: 8000.to_owned(),
                    label_width: 50.to_owned(),
                    label_height: 70.to_owned(),
                },
            ),
            Ok(result_printer.clone())
        );

        assert_eq!(
            printer_repository
                .query_by_filter(PrinterFilter::new().id(EqualFilter::equal_to("new_id")))
                .unwrap(),
            vec![result_printer]
        );
    }
}
