#[cfg(test)]
mod test_update {
    use chrono::{NaiveDate, Utc};
    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_full_new_response_requisition_for_update_test, mock_name_store_c,
            mock_request_draft_requisition_calculation_test, mock_request_program_requisition,
            mock_sent_request_requisition, mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        requisition_row::RequisitionStatus,
        test_db::{setup_all, setup_all_with_data},
        ActivityLogRowRepository, ActivityLogType, NameRow, NameStoreJoinRow,
        RequisitionLineRowRepository, RequisitionRowRepository,
    };

    use crate::{
        requisition::request_requisition::{
            UpdateRequestRequisition, UpdateRequestRequisitionError as ServiceError,
            UpdateRequestRequisitionStatus,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_request_requisition_errors() {
        fn not_visible() -> NameRow {
            NameRow {
                id: "not_visible".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier() -> NameRow {
            NameRow {
                id: "not_a_supplier".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "not_a_supplier_join".to_string(),
                name_link_id: not_a_supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: false,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_request_requisition_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_supplier()],
                name_store_joins: vec![not_a_supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_sent_request_requisition().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_full_new_response_requisition_for_update_test()
                        .requisition
                        .id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                    other_party_id: Some("invalid".to_string()),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                    other_party_id: Some(not_visible().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                    other_party_id: Some(not_a_supplier().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditProgramRequisitionInformation
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_request_program_requisition().id,
                    max_months_of_stock: Some(5.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditProgramRequisitionInformation)
        );
    }

    #[actix_rt::test]
    async fn update_request_requisition_success() {
        let (_, connection, connection_manager, _) =
            setup_all("update_request_requisition_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let before_update = Utc::now().naive_utc();

        // Simple update (without recalculation)
        let result = service
            .update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                    colour: Some("new colour".to_string()),
                    status: Some(UpdateRequestRequisitionStatus::Sent),
                    their_reference: Some("new their_reference".to_string()),
                    comment: Some("new comment".to_string()),
                    max_months_of_stock: None,
                    min_months_of_stock: None,
                    other_party_id: Some(mock_name_store_c().id),
                    expected_delivery_date: Some(NaiveDate::from_ymd_opt(2022, 1, 3).unwrap()),
                    original_customer_id: None,
                },
            )
            .unwrap();

        let after_update = Utc::now().naive_utc();

        let updated_row = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&result.requisition_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(updated_row, {
            let mut expected = updated_row.clone();
            expected.colour = Some("new colour".to_string());
            expected.status = RequisitionStatus::Sent;
            expected.their_reference = Some("new their_reference".to_string());
            expected.comment = Some("new comment".to_string());
            expected.name_link_id = mock_name_store_c().id;
            expected.expected_delivery_date = Some(NaiveDate::from_ymd_opt(2022, 1, 3).unwrap());
            expected
        });

        let sent_datetime = updated_row.sent_datetime.unwrap();
        assert!(sent_datetime > before_update && sent_datetime < after_update);

        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&updated_row.id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::RequisitionStatusSent)
            .unwrap();
        assert_eq!(log.r#type, ActivityLogType::RequisitionStatusSent);

        // Recalculate stock

        let calculation_requisition = mock_request_draft_requisition_calculation_test();

        service
            .update_request_requisition(
                &context,
                UpdateRequestRequisition {
                    id: calculation_requisition.requisition.id.clone(),
                    max_months_of_stock: Some(20.0),
                    ..Default::default()
                },
            )
            .unwrap();

        let requisition_line_row_repo = RequisitionLineRowRepository::new(&connection);

        // Calculated
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[0].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 19.0);

        // Average monthly consumption = 0
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[1].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 0.0);

        // Above threshold MOS
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[2].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 0.0);

        // Above max MOS
        let line = requisition_line_row_repo
            .find_one_by_id(&calculation_requisition.lines[3].id)
            .unwrap()
            .unwrap();
        assert_eq!(line.suggested_quantity, 0.0);
    }
}
