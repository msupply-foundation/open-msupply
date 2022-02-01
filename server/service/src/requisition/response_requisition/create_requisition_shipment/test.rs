#[cfg(test)]
mod test_update {
    use domain::EqualFilter;
    use repository::{
        mock::{
            mock_draft_response_requisition_for_update_test, mock_finalised_response_requisition,
            mock_new_response_requisition_test, mock_sent_request_requisition, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineFilter, InvoiceLineRepository, InvoiceRepository,
    };

    use crate::{
        requisition::response_requisition::{
            CreateRequisitionShipment, CreateRequisitionShipmentError as ServiceError,
        },
        requisition_line::response_requisition_line::UpdateResponseRequisitionLine,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn create_requisition_shipment_errors() {
        let (_, _, connection_manager, _) =
            setup_all("create_requisition_shipment_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequistionDoesNotExist
        assert_eq!(
            service.create_requisition_shipment(
                &context,
                "store_a",
                CreateRequisitionShipment {
                    response_requisition_id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequistionDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.create_requisition_shipment(
                &context,
                "store_b",
                CreateRequisitionShipment {
                    response_requisition_id: mock_draft_response_requisition_for_update_test().id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.create_requisition_shipment(
                &context,
                "store_a",
                CreateRequisitionShipment {
                    response_requisition_id: mock_finalised_response_requisition().id,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.create_requisition_shipment(
                &context,
                "store_a",
                CreateRequisitionShipment {
                    response_requisition_id: mock_sent_request_requisition().id,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );
    }

    #[actix_rt::test]
    async fn create_requisition_shipment_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "create_requisition_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // Check existing invoice is accounted for
        let invoice = service
            .create_requisition_shipment(
                &context,
                "store_a",
                CreateRequisitionShipment {
                    response_requisition_id: mock_new_response_requisition_test().requisition.id,
                },
            )
            .unwrap();

        let invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&invoice.id)
            .unwrap();

        assert_eq!(
            invoice.requisition_id,
            Some(mock_new_response_requisition_test().requisition.id)
        );

        let mut invoice_lines = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&invoice.id)),
            )
            .unwrap();

        invoice_lines.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(invoice_lines.len(), 2);

        assert_eq!(invoice_lines[0].number_of_packs, 44);
        assert_eq!(invoice_lines[1].number_of_packs, 100);

        // NothingRemainingToSupply
        assert_eq!(
            service.create_requisition_shipment(
                &context,
                "store_a",
                CreateRequisitionShipment {
                    response_requisition_id: mock_new_response_requisition_test().requisition.id,
                },
            ),
            Err(ServiceError::NothingRemainingToSupply)
        );

        // Supply some more
        service_provider
            .requisition_line_service
            .update_response_requisition_line(
                &context,
                "store_a",
                UpdateResponseRequisitionLine {
                    id: mock_new_response_requisition_test().lines[0].id.clone(),
                    supply_quantity: Some(100),
                },
            )
            .unwrap();

        let invoice = service
            .create_requisition_shipment(
                &context,
                "store_a",
                CreateRequisitionShipment {
                    response_requisition_id: mock_new_response_requisition_test().requisition.id,
                },
            )
            .unwrap();

        let invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&invoice.id)
            .unwrap();

        assert_eq!(
            invoice.requisition_id,
            Some(mock_new_response_requisition_test().requisition.id)
        );

        let mut invoice_lines = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&invoice.id)),
            )
            .unwrap();

        invoice_lines.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(invoice_lines.len(), 1);

        assert_eq!(invoice_lines[0].number_of_packs, 50);
    }
}
