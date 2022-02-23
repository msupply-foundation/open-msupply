#[cfg(test)]
mod test_update {
    use chrono::Utc;
    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_draft_response_requisition_for_update_test,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition,
            MockDataInserts,
        },
        schema::{RequisitionRow, RequisitionRowStatus},
        test_db::setup_all,
        RequisitionLineRowRepository, RequisitionRowRepository,
    };

    use crate::{
        requisition::request_requisition::{
            UpdateRequestRequisition, UpdateRequestRequisitionError as ServiceError,
            UpdateRequestRequstionStatus,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_request_requisition_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_request_requisition_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.update_request_requisition(
                &context,
                "store_a",
                UpdateRequestRequisition {
                    id: "invalid".to_owned(),
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                    max_months_of_stock: None,
                    min_months_of_stock: None,
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.update_request_requisition(
                &context,
                "store_b",
                UpdateRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                    max_months_of_stock: None,
                    min_months_of_stock: None,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_request_requisition(
                &context,
                "store_a",
                UpdateRequestRequisition {
                    id: mock_sent_request_requisition().id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                    max_months_of_stock: None,
                    min_months_of_stock: None,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.update_request_requisition(
                &context,
                "store_a",
                UpdateRequestRequisition {
                    id: mock_draft_response_requisition_for_update_test().id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                    max_months_of_stock: None,
                    min_months_of_stock: None,
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );
    }

    #[actix_rt::test]
    async fn update_request_requisition_success() {
        let (_, connection, connection_manager, _) =
            setup_all("update_request_requisition_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        let before_update = Utc::now().naive_utc();

        // Simple update (without recalculation)
        let result = service
            .update_request_requisition(
                &context,
                "store_a",
                UpdateRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                    colour: Some("new colour".to_owned()),
                    status: Some(UpdateRequestRequstionStatus::Sent),
                    their_reference: Some("new their_reference".to_owned()),
                    comment: Some("new comment".to_owned()),
                    max_months_of_stock: None,
                    min_months_of_stock: None,
                },
            )
            .unwrap();

        let after_update = Utc::now().naive_utc();

        let RequisitionRow {
            id,
            status,
            sent_datetime,
            colour,
            comment,
            their_reference,
            ..
        } = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&result.requisition_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(id, mock_draft_request_requisition_for_update_test().id);
        assert_eq!(colour, Some("new colour".to_owned()));
        assert_eq!(their_reference, Some("new their_reference".to_owned()));
        assert_eq!(comment, Some("new comment".to_owned()));
        assert_eq!(status, RequisitionRowStatus::Sent);

        let sent_datetime = sent_datetime.unwrap();
        assert!(sent_datetime > before_update && sent_datetime < after_update);

        // Recalculate stock

        let calculation_requisition = mock_request_draft_requisition_calculation_test();

        service
            .update_request_requisition(
                &context,
                "store_a",
                UpdateRequestRequisition {
                    id: calculation_requisition.requisition.id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                    max_months_of_stock: Some(20.0),
                    min_months_of_stock: None,
                },
            )
            .unwrap();

        let requisition_line_row_repo = RequisitionLineRowRepository::new(&connection);

        // Calculated
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[0].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 19);

        // Average monthly consumption = 0
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[1].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 0);

        // Above threshold MOS
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[2].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 0);

        // Above max MOS
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[3].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 0);
    }
}
