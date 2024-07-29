#[cfg(test)]
mod insert {
    use chrono::Duration;
    use repository::mock::{
        mock_immunisation_program_a, mock_name_b, mock_name_store_b, mock_name_store_c,
        mock_period, mock_period_2_a, mock_period_2_b, mock_period_2_c, mock_rnr_form_a,
        mock_rnr_form_b, mock_rnr_form_b_line_a, mock_store_a, mock_store_b, MockData,
    };
    use repository::mock::{mock_program_b, MockDataInserts};
    use repository::test_db::setup_all_with_data;
    use repository::{
        NameStoreJoinRow, PeriodRow, RnRFormLineRowRepository, RnRFormRow, RnRFormRowRepository,
        RnRFormStatus,
    };
    use util::{date_now, date_now_with_offset};

    use crate::rnr_form::insert::{InsertRnRForm, InsertRnRFormError};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn insert_rnr_form_errors() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_rnr_form_errors",
            MockDataInserts::none()
                .stores()
                .name_store_joins()
                .items()
                .periods()
                .program_requisition_settings()
                .full_master_list(),
            MockData {
                periods: vec![PeriodRow {
                    id: "future_period".to_string(),
                    name: "Future closing".to_string(),
                    period_schedule_id: "mock_period_schedule_2".to_string(),
                    start_date: date_now(),
                    end_date: date_now_with_offset(Duration::days(1)),
                }],
                rnr_forms: vec![RnRFormRow {
                    status: RnRFormStatus::Draft,
                    ..mock_rnr_form_a()
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;

        let store_id = &mock_store_a().id;
        // RnRFormAlreadyExists
        assert_eq!(
            service.insert_rnr_form(
                &context,
                &store_id,
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
                &store_id,
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
                &store_id,
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
                &store_id,
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
                &store_id,
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
                &store_id,
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
                &store_id,
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
                &store_id,
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

        // PeriodNotClosed
        assert_eq!(
            service.insert_rnr_form(
                &context,
                &store_id,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // set to close a day from now()
                    period_id: "future_period".to_string(),
                }
            ),
            Err(InsertRnRFormError::PeriodNotClosed)
        );

        // RnRFormAlreadyExistsForPeriod
        assert_eq!(
            service.insert_rnr_form(
                &context,
                &store_id,
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

        // PeriodNotNextInSequence
        assert_eq!(
            service.insert_rnr_form(
                &context,
                &store_id,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // Previous form was from period A, skipping period B
                    period_id: mock_period_2_c().id,
                }
            ),
            Err(InsertRnRFormError::PeriodNotNextInSequence)
        );

        // PreviousRnRFormNotFinalised
        assert_eq!(
            service.insert_rnr_form(
                &context,
                &store_id,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // RNR form for period A still in draft
                    period_id: mock_period_2_b().id,
                }
            ),
            Err(InsertRnRFormError::PreviousRnRFormNotFinalised)
        );
    }

    #[actix_rt::test]
    async fn insert_rnr_form_success() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_rnr_form_success",
            MockDataInserts::all(),
            MockData {
                // make supplier store C visible in store B
                name_store_joins: vec![NameStoreJoinRow {
                    id: String::from("name_store_b_join_c"),
                    name_link_id: String::from("name_store_c"),
                    store_id: String::from("store_b"),
                    name_is_customer: false,
                    name_is_supplier: true,
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Update previous form to finalised
        RnRFormRowRepository::new(&context.connection)
            .upsert_one(&RnRFormRow {
                status: RnRFormStatus::Finalised,
                ..mock_rnr_form_b()
            })
            .unwrap();

        // Can create
        let _result = service_provider
            .rnr_form_service
            .insert_rnr_form(
                &context,
                &mock_store_a().id,
                InsertRnRForm {
                    id: "new_rnr_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    period_id: mock_period_2_c().id,
                },
            )
            .unwrap();

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
        // Uses final balance from prev R&R for initial balance of new one
        assert_eq!(
            form_lines[0].initial_balance,
            mock_rnr_form_b_line_a().final_balance
        );

        // Can create same supplier/program/period in a different store
        // Also - there are no previous forms in store B - checking can start from period B
        context.store_id = mock_store_b().id;

        let _result = service_provider
            .rnr_form_service
            .insert_rnr_form(
                &context,
                &mock_store_b().id,
                InsertRnRForm {
                    id: "same_but_diff_store".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    period_id: mock_period_2_b().id,
                },
            )
            .unwrap();
    }
}
