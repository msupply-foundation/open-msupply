#[cfg(test)]
mod test_update {
    use repository::mock::{mock_store_a, mock_store_b};
    use repository::EqualFilter;
    use repository::{
        mock::{
            mock_finalised_response_requisition, mock_new_response_requisition_for_update_test,
            mock_new_response_requisition_test, mock_sent_request_requisition, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineFilter, InvoiceLineRepository, InvoiceRowRepository,
    };
    use util::inline_init;

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

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.create_requisition_shipment(
                &context,
                CreateRequisitionShipment {
                    response_requisition_id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.create_requisition_shipment(
                &context,
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
                CreateRequisitionShipment {
                    response_requisition_id: mock_sent_request_requisition().id,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.create_requisition_shipment(
                &context,
                CreateRequisitionShipment {
                    response_requisition_id: mock_new_response_requisition_for_update_test().id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn create_requisition_shipment_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "create_requisition_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // Check existing invoice is accounted for
        let invoice = service
            .create_requisition_shipment(
                &context,
                CreateRequisitionShipment {
                    response_requisition_id: mock_new_response_requisition_test().requisition.id,
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice.invoice_row.id)
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

        invoice_lines.sort_by(|a, b| {
            a.invoice_line_row
                .item_link_id
                .cmp(&b.invoice_line_row.item_link_id)
        });

        assert_eq!(invoice_lines.len(), 2);

        assert_eq!(invoice_lines[0].invoice_line_row.number_of_packs, 44.0);
        assert_eq!(invoice_lines[1].invoice_line_row.number_of_packs, 100.0);

        // NothingRemainingToSupply
        assert_eq!(
            service.create_requisition_shipment(
                &context,
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
                inline_init(|r: &mut UpdateResponseRequisitionLine| {
                    r.id = mock_new_response_requisition_test().lines[0].id.clone();
                    r.supply_quantity = Some(100.0);
                }),
            )
            .unwrap();

        let invoice = service
            .create_requisition_shipment(
                &context,
                CreateRequisitionShipment {
                    response_requisition_id: mock_new_response_requisition_test().requisition.id,
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice.invoice_row.id)
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

        invoice_lines.sort_by(|a, b| {
            a.invoice_line_row
                .item_link_id
                .cmp(&b.invoice_line_row.item_link_id)
        });

        assert_eq!(invoice_lines.len(), 1);

        assert_eq!(invoice_lines[0].invoice_line_row.number_of_packs, 50.0);
    }
}
