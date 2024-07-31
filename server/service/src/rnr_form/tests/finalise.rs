#[cfg(test)]
mod finalise {
    use repository::mock::{mock_rnr_form_a, mock_rnr_form_b, mock_store_a};
    use repository::mock::{mock_store_b, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::{
        EqualFilter, RequisitionFilter, RequisitionLineFilter, RequisitionLineRepository,
        RequisitionRepository, RequisitionRowRepository, RequisitionStatus,
        RnRFormLineRowRepository, RnRFormRowRepository, RnRFormStatus,
    };

    use crate::rnr_form::finalise::{FinaliseRnRForm, FinaliseRnRFormError};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn finalise_rnr_form_errors() {
        let (_, _, connection_manager, _) =
            setup_all("finalise_rnr_form_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
    }

    #[actix_rt::test]
    async fn finalise_rnr_form_success() {
        let (_, _, connection_manager, _) =
            setup_all("finalise_rnr_form_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        let last_requisition_number = RequisitionRowRepository::new(&context.connection)
            .find_max_requisition_number(repository::RequisitionType::Request, &mock_store_a().id)
            .unwrap()
            .unwrap_or_default();

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

        // Check the internal order (requisition) has been created

        let requisition = RequisitionRepository::new(&context.connection)
            .query_one(
                RequisitionFilter::new()
                    .requisition_number(EqualFilter::equal_to_i64(last_requisition_number + 1)),
            )
            .unwrap()
            .unwrap();

        // Check the status of the internal order is 'Sent'
        assert_eq!(requisition.requisition_row.status, RequisitionStatus::Sent);

        // Check the store of the internal order is the same as the RnR form
        assert_eq!(requisition.requisition_row.store_id, mock_store_a().id);

        // Check the same number of lines in the internal order as the RnR form
        let rnr_line_count = RnRFormLineRowRepository::new(&context.connection)
            .find_many_by_rnr_form_id(&mock_rnr_form_b().id)
            .unwrap()
            .len();
        let requisition_line_count = RequisitionLineRepository::new(&context.connection)
            .count(Some(RequisitionLineFilter::new().requisition_id(
                EqualFilter::equal_to(&requisition.requisition_row.id),
            )))
            .unwrap() as usize;

        assert_eq!(rnr_line_count, requisition_line_count);
    }
}
