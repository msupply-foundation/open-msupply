#[cfg(test)]
mod query {
    use repository::mock::{
        mock_immunisation_program_a, mock_name_b, mock_name_store_b, mock_name_store_c,
        mock_period, mock_period_2_a, mock_period_2_b, mock_rnr_form_a, mock_store_a,
    };
    use repository::mock::{mock_program_b, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::{RnRFormLineRowRepository, RnRFormRowRepository};

    use crate::rnr_form::insert::{InsertRnRForm, InsertRnRFormError};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn insert_rnr_form_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_rnr_form_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;

        // RnRFormAlreadyExists
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: mock_rnr_form_a().id,
                    ..Default::default()
                }
            ),
            Err(InsertRnRFormError::RnRFormAlreadyExists)
        );

        // SupplierDoesNotExist
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: "not-exists".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertRnRFormError::SupplierDoesNotExist)
        );

        // SupplierNotVisible
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    // not visible in store A
                    supplier_id: mock_name_b().id,
                    ..Default::default()
                }
            ),
            Err(InsertRnRFormError::SupplierNotVisible)
        );

        // NotASupplier
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_b().id,
                    ..Default::default()
                }
            ),
            Err(InsertRnRFormError::NotASupplier)
        );

        // ProgramDoesNotExist
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: "not-exists".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertRnRFormError::ProgramDoesNotExist)
        );

        // ProgramHasNoMasterList
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_immunisation_program_a().id,
                    ..Default::default()
                }
            ),
            Err(InsertRnRFormError::ProgramHasNoMasterList)
        );

        // PeriodDoesNotExist
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    period_id: "not-exists".to_string(),
                }
            ),
            Err(InsertRnRFormError::PeriodDoesNotExist)
        );

        // PeriodNotInProgramSchedule
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // from period_schedule_1, which is not assigned to program B
                    period_id: mock_period().id,
                }
            ),
            Err(InsertRnRFormError::PeriodNotInProgramSchedule)
        );

        // RnRFormAlreadyExistsForPeriod
        assert_eq!(
            service.insert_rnr_form(
                &context,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // RNR form A already exists with this period
                    period_id: mock_period_2_a().id,
                }
            ),
            Err(InsertRnRFormError::RnRFormAlreadyExistsForPeriod)
        );
    }

    #[actix_rt::test]
    async fn insert_rnr_form_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_rnr_form_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let _result = service_provider.rnr_form_service.insert_rnr_form(
            &context,
            InsertRnRForm {
                id: "new_rnr_id".to_string(),
                supplier_id: mock_name_store_c().id,
                program_id: mock_program_b().id,
                period_id: mock_period_2_b().id,
            },
        );

        let form = RnRFormRowRepository::new(&context.connection)
            .find_one_by_id("new_rnr_id")
            .unwrap()
            .unwrap();

        assert_eq!(form.id, "new_rnr_id");

        let form_lines = RnRFormLineRowRepository::new(&context.connection)
            .find_many_by_rnr_form_id("new_rnr_id")
            .unwrap();

        // one line created, from master list
        assert_eq!(form_lines.len(), 1);
        assert_eq!(form_lines[0].item_id, "item_query_test1");
    }
}
