#[cfg(test)]
mod finalise {
    use repository::mock::MockDataInserts;
    use repository::mock::{mock_rnr_form_a, mock_rnr_form_b, mock_store_a};
    use repository::test_db::setup_all;
    use repository::{RnRFormRowRepository, RnRFormStatus};

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
                    ..Default::default()
                }
            ),
            Err(FinaliseRnRFormError::RnRFormDoesNotExist)
        );

        // RnRFormAlreadyFinalised
        assert_eq!(
            service.finalise_rnr_form(
                &context,
                &store_id,
                FinaliseRnRForm {
                    id: mock_rnr_form_a().id,
                    ..Default::default()
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
    }
}
