#[cfg(test)]
mod finalise {
    use repository::mock::{mock_item_c, mock_rnr_form_a, mock_rnr_form_b, mock_store_a, MockData};
    use repository::mock::{mock_store_b, MockDataInserts};
    use repository::test_db::{setup_all, setup_all_with_data};
    use repository::{
        EqualFilter, RequisitionFilter, RequisitionLineFilter, RequisitionLineRepository,
        RequisitionRepository, RequisitionStatus, RnRFormLineRow, RnRFormLineRowRepository,
        RnRFormRowRepository, RnRFormStatus,
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
        let (_, _, connection_manager, _) =
            setup_all("finalise_rnr_form_success", MockDataInserts::all()).await;

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
            .query_one(RequisitionFilter::new().id(EqualFilter::equal_to(
                updated_row.linked_requisition_id.as_ref().unwrap(),
            )))
            .unwrap()
            .unwrap();

        // Check the status of the internal order is 'Sent'
        assert_eq!(requisition.requisition_row.status, RequisitionStatus::Sent);
        assert_eq!(
            requisition.requisition_row.their_reference,
            Some("form B reference".to_string())
        );

        // Check the store of the internal order is the same as the RnR form
        assert_eq!(requisition.requisition_row.store_id, mock_store_a().id);

        // Check the same number of lines in the internal order as the RnR form
        let rnr_lines = RnRFormLineRowRepository::new(&context.connection)
            .find_many_by_rnr_form_id(&mock_rnr_form_b().id)
            .unwrap();

        let rnr_line_count = rnr_lines.len();
        let requisition_line_count = RequisitionLineRepository::new(&context.connection)
            .count(Some(RequisitionLineFilter::new().requisition_id(
                EqualFilter::equal_to(&requisition.requisition_row.id),
            )))
            .unwrap() as usize;

        assert_eq!(rnr_line_count, requisition_line_count);

        assert!(rnr_lines.iter().all(|l| l.requisition_line_id.is_some()));
    }
}
