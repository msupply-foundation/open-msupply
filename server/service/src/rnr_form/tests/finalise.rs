#[cfg(test)]
mod finalise {
    use repository::mock::{
        mock_item_a, mock_item_b, mock_item_c, mock_rnr_form_a, mock_rnr_form_b, mock_store_a,
        MockData,
    };
    use repository::mock::{mock_store_b, MockDataInserts};
    use repository::test_db::setup_all_with_data;
    use repository::{
        EqualFilter, RequisitionFilter, RequisitionLineFilter, RequisitionLineRepository,
        RequisitionRepository, RequisitionStatus, RnRFormLineRow, RnRFormRowRepository,
        RnRFormStatus,
    };

    use crate::rnr_form::finalise::{FinaliseRnRForm, FinaliseRnRFormError};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn finalise_rnr_form_errors() {
        fn negative_rnr_form_line() -> RnRFormLineRow {
            RnRFormLineRow {
                id: "negative_line".to_string(),
                rnr_form_id: mock_rnr_form_b().id,
                item_link_id: mock_item_c().id,
                final_balance: -5.0,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "finalise_rnr_form_errors",
            MockDataInserts::all(),
            MockData {
                rnr_form_lines: vec![negative_rnr_form_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;
        let store_id = mock_store_a().id;

        // RnRFormDoesNotExist
        assert_eq!(
            service.finalise_rnr_form(
                &context,
                &store_id,
                FinaliseRnRForm {
                    id: "invalid".to_string(),
                }
            ),
            Err(FinaliseRnRFormError::RnRFormDoesNotExist)
        );

        // RnRFormDoesNotBelongToStore
        assert_eq!(
            service.finalise_rnr_form(
                &context,
                &mock_store_b().id, // Different store
                FinaliseRnRForm {
                    id: mock_rnr_form_a().id,
                }
            ),
            Err(FinaliseRnRFormError::RnRFormDoesNotBelongToStore)
        );

        // RnRFormAlreadyFinalised
        assert_eq!(
            service.finalise_rnr_form(
                &context,
                &store_id,
                FinaliseRnRForm {
                    id: mock_rnr_form_a().id,
                }
            ),
            Err(FinaliseRnRFormError::RnRFormAlreadyFinalised)
        );

        // ContainsNegativeLines
        assert_eq!(
            service.finalise_rnr_form(
                &context,
                &store_id,
                FinaliseRnRForm {
                    id: mock_rnr_form_b().id,
                }
            ),
            Err(FinaliseRnRFormError::ContainsNegativeLines)
        );
    }

    #[actix_rt::test]
    async fn finalise_rnr_form_success() {
        fn auto_populated_line() -> RnRFormLineRow {
            RnRFormLineRow {
                id: "auto_populated_line".to_string(),
                rnr_form_id: mock_rnr_form_b().id,
                item_link_id: mock_item_a().id,
                snapshot_quantity_received: 5.0,
                snapshot_quantity_consumed: 7.0,
                snapshot_adjustments: 1.0,
                calculated_requested_quantity: 10.0,
                ..Default::default()
            }
        }
        fn manually_entered_line() -> RnRFormLineRow {
            RnRFormLineRow {
                id: "manually_entered_line".to_string(),
                rnr_form_id: mock_rnr_form_b().id,
                item_link_id: mock_item_b().id,
                entered_quantity_received: Some(10.0),
                entered_quantity_consumed: Some(14.0),
                entered_adjustments: Some(5.0),
                entered_requested_quantity: Some(12.0),
                entered_losses: Some(2.0),
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "finalise_rnr_form_success",
            MockDataInserts::all(),
            MockData {
                rnr_form_lines: vec![auto_populated_line(), manually_entered_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        let _result = service_provider
            .rnr_form_service
            .finalise_rnr_form(
                &context,
                &mock_store_a().id,
                FinaliseRnRForm {
                    id: mock_rnr_form_b().id,
                },
            )
            .unwrap();

        let updated_row = RnRFormRowRepository::new(&context.connection)
            .find_one_by_id(&mock_rnr_form_b().id)
            .unwrap()
            .unwrap();

        assert_eq!(updated_row.status, RnRFormStatus::Finalised);
        assert!(updated_row.linked_requisition_id.is_some());

        // Check the internal order (requisition) has been created

        let requisition = RequisitionRepository::new(&context.connection)
            .query_one(RequisitionFilter::new().id(EqualFilter::equal_to(updated_row.linked_requisition_id.as_ref().unwrap().to_owned())))
            .unwrap()
            .unwrap();

        // Check the status of the internal order is 'Sent'
        assert_eq!(requisition.requisition_row.status, RequisitionStatus::Sent);
        assert_eq!(
            requisition.requisition_row.their_reference,
            Some("form B reference".to_string())
        );
        // No store prefs in default mock data so use OMS defaults (6 and 3 months)
        assert_eq!(requisition.requisition_row.max_months_of_stock, 6.0);
        assert_eq!(requisition.requisition_row.min_months_of_stock, 3.0);

        // Check the store of the internal order is the same as the RnR form
        assert_eq!(requisition.requisition_row.store_id, mock_store_a().id);

        // Check the same number of lines in the internal order as the RnR form
        let requisition_lines = RequisitionLineRepository::new(&context.connection)
            .query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(requisition.requisition_row.id.to_string())),
            )
            .unwrap();

        assert_eq!(requisition_lines.len(), 3); // 1 from rnr_form mock data, plus 2 (above)

        // Check correct data was populated
        let auto_populated_line = &requisition_lines
            .iter()
            .find(|line| {
                line.requisition_line_row.item_link_id == auto_populated_line().item_link_id
            })
            .unwrap()
            .requisition_line_row;

        // Requisition line populated using the snapshot data
        assert_eq!(auto_populated_line.requested_quantity, 10.0);
        assert_eq!(auto_populated_line.incoming_units, 5.0);
        assert_eq!(auto_populated_line.outgoing_units, 7.0);
        assert_eq!(auto_populated_line.addition_in_units, 1.0);

        let manually_entered_line = &requisition_lines
            .iter()
            .find(|line| {
                line.requisition_line_row.item_link_id == manually_entered_line().item_link_id
            })
            .unwrap()
            .requisition_line_row;

        // Requisition line populated using the manually entered data
        assert_eq!(manually_entered_line.requested_quantity, 12.0);
        assert_eq!(manually_entered_line.incoming_units, 10.0);
        assert_eq!(manually_entered_line.outgoing_units, 14.0);
        assert_eq!(manually_entered_line.addition_in_units, 5.0);
        assert_eq!(manually_entered_line.loss_in_units, 2.0);
    }
}
