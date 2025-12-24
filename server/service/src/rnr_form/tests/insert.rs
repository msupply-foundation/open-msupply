#[cfg(test)]
mod insert {
    use crate::rnr_form::insert::{InsertRnRForm, InsertRnRFormError};
    use crate::service_provider::ServiceProvider;
    use chrono::{Duration, NaiveDate};
    use repository::mock::common::FullMockMasterList;
    use repository::mock::{
        mock_immunisation_program_a, mock_name_b, mock_name_store_b, mock_name_store_c,
        mock_period, mock_period_2_a, mock_period_2_b, mock_period_2_c, mock_period_2_d,
        mock_rnr_form_a, mock_rnr_form_a_line_a, mock_rnr_form_b, mock_rnr_form_b_line_a,
        mock_store_a, mock_store_b, MockData,
    };
    use repository::mock::{mock_program_b, MockDataInserts};
    use repository::test_db::setup_all_with_data;
    use repository::{
        ContextRow, InvoiceLineRow, InvoiceRow, InvoiceStatus, InvoiceType, ItemRow, ItemType,
        MasterListLineRow, MasterListNameJoinRow, MasterListRow, NameStoreJoinRow, NameTagRow,
        PeriodRow, ProgramRow, RnRFormLineRow, RnRFormLineRowRepository, RnRFormRow,
        RnRFormRowRepository, RnRFormStatus, StockLineRow,
    };
    use tokio::time::Instant;
    use util::{date_now, date_now_with_offset};

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
                .full_master_lists(),
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;

        let store_id = &mock_store_a().id;
        // RnRFormAlreadyExists
        assert_eq!(
            service.insert_rnr_form(
                &context,
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // RNR form A already exists with this period
                    period_id: mock_period_2_b().id,
                }
            ),
            Err(InsertRnRFormError::RnRFormAlreadyExistsForPeriod)
        );

        // PeriodNotNextInSequence
        assert_eq!(
            service.insert_rnr_form(
                &context,
                store_id,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // Previous form was from period A, skipping period B
                    period_id: mock_period_2_a().id,
                }
            ),
            Err(InsertRnRFormError::PeriodMustBeLaterThanLastUsed)
        );

        // PreviousRnRFormNotFinalised
        assert_eq!(
            service.insert_rnr_form(
                &context,
                store_id,
                InsertRnRForm {
                    id: "new_id".to_string(),
                    supplier_id: mock_name_store_c().id,
                    program_id: mock_program_b().id,
                    // RNR form for period A still in draft
                    period_id: mock_period_2_c().id,
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
                    name_id: String::from("name_store_c"),
                    store_id: String::from("store_b"),
                    name_is_customer: false,
                    name_is_supplier: true,
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
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
                    period_id: mock_period_2_d().id,
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
        assert_eq!(form_lines[0].item_link_id, "item_query_test1");
        // Uses final balance from prev R&R for initial balance of new one
        assert_eq!(
            form_lines[0].initial_balance,
            mock_rnr_form_b_line_a().final_balance
        );
        // AMC considers previous form
        assert_eq!(
            form_lines[0].average_monthly_consumption,
            3.9822024471635147
        ); // 5 (Form A) + 7 (Form B) + 0 (this period) / 3 ... decimals due to more/less than 30 days in period

        // Can create same supplier/program/period in a different store
        // Also - there are no previous forms in store B - checking can start from period C
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
                    period_id: mock_period_2_c().id,
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn insert_rnr_skip_period() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_rnr_skip_period",
            MockDataInserts::none()
                .stores()
                .name_store_joins()
                .items()
                .periods()
                .program_requisition_settings()
                .full_master_lists(),
            MockData {
                // make supplier store C visible in store A
                name_store_joins: vec![NameStoreJoinRow {
                    id: String::from("name_store_a_join_c"),
                    name_id: String::from("name_store_c"),
                    store_id: String::from("store_a"),
                    name_is_customer: false,
                    name_is_supplier: true,
                }],
                rnr_forms: vec![RnRFormRow {
                    status: RnRFormStatus::Finalised,
                    ..mock_rnr_form_a()
                }],
                rnr_form_lines: vec![mock_rnr_form_a_line_a()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
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
                    period_id: mock_period_2_d().id,
                },
            )
            .unwrap();

        let mut form_lines = RnRFormLineRowRepository::new(&context.connection)
            .find_many_by_rnr_form_id("new_rnr_id")
            .unwrap();
        assert_eq!(form_lines.len(), 1);

        let created_line = form_lines.pop().unwrap();
        let blank_line = RnRFormLineRow {
            id: created_line.id.to_string(),
            rnr_form_id: created_line.rnr_form_id.to_string(),
            item_link_id: created_line.item_link_id.to_string(),
            ..Default::default()
        };

        assert_eq!(
            created_line, blank_line,
            "all the values should be defaults, i.e. 0, empty strings or none"
        );
    }

    #[actix_rt::test]
    async fn insert_rnr_form_performance_test() {
        const NUM_MASTER_LIST_ITEMS: usize = 1000;
        const NUM_PERIODS: usize = 36;
        const NUM_HISTORICAL_FORMS: usize = 24;

        let mut perf_test_items = Vec::new();
        let mut stock_lines = Vec::new();
        let mut master_list_lines = Vec::new();

        for i in 0..NUM_MASTER_LIST_ITEMS {
            let item = ItemRow {
                id: format!("perf_item_{i}"),
                name: format!("perf test item {i}"),
                code: format!("{i:05}"),
                r#type: ItemType::Stock,
                ..Default::default()
            };

            let master_list_line = MasterListLineRow {
                id: format!("perf_master_list_line_{i}"),
                item_link_id: item.id.clone(),
                master_list_id: "perf_master_list".to_string(),
                ..Default::default()
            };

            let stock_line = StockLineRow {
                id: format!("perf_stock_line_{i}"),
                item_link_id: item.id.clone(),
                store_id: mock_store_a().id.clone(),
                available_number_of_packs: 50.0 + (i as f64 % 100.0) * 5.0,
                total_number_of_packs: 60.0 + (i as f64 % 100.0) * 6.0,
                ..Default::default()
            };

            perf_test_items.push(item);
            master_list_lines.push(master_list_line);
            stock_lines.push(stock_line);
        }

        let mut test_periods = Vec::new();
        let base_date = NaiveDate::from_ymd_opt(2018, 1, 1).unwrap();

        for i in 0..NUM_PERIODS {
            let start_date = base_date + Duration::days(i as i64 * 30);
            let end_date = start_date + Duration::days(29);

            test_periods.push(PeriodRow {
                id: format!("{i}"),
                name: format!("{}", i + 1),
                period_schedule_id: "mock_period_schedule_2".to_string(),
                start_date,
                end_date,
            });
        }

        let mut historical_forms = Vec::new();
        let mut historical_form_lines = Vec::new();
        let mut historical_invoices = Vec::new();
        let mut historical_invoice_lines = Vec::new();

        for period_idx in 0..NUM_HISTORICAL_FORMS {
            let form_id = format!("{period_idx}");
            let period_id = format!("{period_idx}");

            let rnr_form = RnRFormRow {
                id: form_id.clone(),
                store_id: mock_store_a().id.clone(),
                name_link_id: "name_store_c".to_string(),
                period_id: period_id.clone(),
                program_id: mock_program_b().id.clone(),
                status: RnRFormStatus::Finalised,
                created_datetime: base_date.and_hms_opt(0, 0, 0).unwrap()
                    + Duration::days(period_idx as i64 * 30),
                ..Default::default()
            };
            historical_forms.push(rnr_form);

            let invoice_id = format!("{period_idx}");
            let invoice = InvoiceRow {
                id: invoice_id.clone(),
                name_link_id: "name_store_c".to_string(),
                store_id: mock_store_a().id.clone(),
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::Verified,
                created_datetime: base_date.and_hms_opt(0, 0, 0).unwrap()
                    + Duration::days(period_idx as i64 * 30 + 15),
                ..Default::default()
            };
            historical_invoices.push(invoice);

            for (item_idx, item) in perf_test_items.iter().enumerate() {
                let item_category = item_idx % 10;
                let base_consumption = match item_category {
                    0..=2 => 15.0 + (item_idx % 20) as f64,
                    3..=5 => 8.0 + (item_idx % 15) as f64,
                    6..=8 => 3.0 + (item_idx % 10) as f64,
                    _ => 1.0 + (item_idx % 5) as f64,
                };

                let seasonal_factor = 0.7 + (period_idx % 12) as f64 * 0.05;
                let consumption = base_consumption * seasonal_factor;

                let initial_balance = if period_idx == 0 {
                    200.0 + (item_idx % 100) as f64
                } else {
                    100.0 + (item_idx % 50) as f64
                };

                // Restocking
                let received = if period_idx % 6 == 0 {
                    consumption * 4.0
                } else if period_idx % 3 == 0 {
                    consumption * 2.0
                } else {
                    0.0
                };

                let final_balance = (initial_balance + received - consumption).max(0.0);

                let form_line = RnRFormLineRow {
                    id: format!("{period_idx}_{item_idx}"),
                    rnr_form_id: form_id.clone(),
                    item_link_id: item.id.clone(),
                    initial_balance,
                    snapshot_quantity_received: received,
                    snapshot_quantity_consumed: consumption,
                    final_balance,
                    average_monthly_consumption: consumption,
                    adjusted_quantity_consumed: consumption,
                    ..Default::default()
                };
                historical_form_lines.push(form_line);

                if consumption > 0.0 {
                    let invoice_line = InvoiceLineRow {
                        id: format!("{period_idx}_{item_idx}"),
                        invoice_id: invoice_id.clone(),
                        item_link_id: item.id.clone(),
                        number_of_packs: consumption,
                        ..Default::default()
                    };
                    historical_invoice_lines.push(invoice_line);
                }
            }
        }

        let test_period_start = base_date + Duration::days(NUM_HISTORICAL_FORMS as i64 * 30);
        let test_period_end = test_period_start + Duration::days(29);
        let consumption_date = test_period_end - Duration::days(15);

        let test_invoice_id = "consumption_invoice".to_string();
        let test_invoice = InvoiceRow {
            id: test_invoice_id.clone(),
            name_link_id: "name_store_c".to_string(),
            store_id: mock_store_a().id.clone(),
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Picked,
            picked_datetime: Some(consumption_date.and_hms_opt(12, 0, 0).unwrap()),
            created_datetime: consumption_date.and_hms_opt(10, 0, 0).unwrap(),
            ..Default::default()
        };
        historical_invoices.push(test_invoice);

        for i in 0..NUM_MASTER_LIST_ITEMS.min(500) {
            let consumption = 10.0 + (i % 10) as f64 * 5.0;
            let invoice_line = InvoiceLineRow {
                id: format!("consumption_line_{i}"),
                invoice_id: test_invoice_id.clone(),
                item_link_id: format!("perf_item_{i}"),
                r#type: repository::InvoiceLineType::StockOut,
                number_of_packs: consumption,
                pack_size: 1.0,
                ..Default::default()
            };
            historical_invoice_lines.push(invoice_line);
        }

        let perf_master_list = FullMockMasterList {
            master_list: MasterListRow {
                id: "perf_master_list".to_string(),
                name: "perf test master list".to_string(),
                code: "perf_ML".to_string(),
                is_active: true,
                ..Default::default()
            },
            joins: vec![
                MasterListNameJoinRow {
                    id: "perf_master_list_join_store_a".to_string(),
                    master_list_id: "perf_master_list".to_string(),
                    name_id: "name_store_a".to_string(),
                },
                MasterListNameJoinRow {
                    id: "perf_master_list_join_store_c".to_string(),
                    master_list_id: "perf_master_list".to_string(),
                    name_id: "name_store_c".to_string(),
                },
            ],
            lines: master_list_lines.clone(),
        };

        let program_context = ContextRow {
            id: "program_context".to_string(),
            name: "program context".to_string(),
        };

        let updated_program_b = ProgramRow {
            master_list_id: Some("perf_master_list".to_string()),
            ..mock_program_b()
        };

        let perf_name_tag = NameTagRow {
            id: "perf_name_tag".to_string(),
            name: "perf test supplier tag".to_string(),
        };

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_rnr_form_perf_test",
            MockDataInserts::none()
                .stores()
                .name_store_joins()
                .periods()
                .items()
                .full_master_lists()
                .program_requisition_settings(),
            MockData {
                items: perf_test_items,
                periods: test_periods,
                programs: vec![updated_program_b],
                full_master_lists: vec![perf_master_list],
                stock_lines,
                rnr_forms: historical_forms,
                rnr_form_lines: historical_form_lines,
                invoices: historical_invoices,
                invoice_lines: historical_invoice_lines,
                contexts: vec![program_context],
                name_tags: vec![perf_name_tag],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;

        let test_start = Instant::now();

        let new_period_id = format!("{NUM_HISTORICAL_FORMS}");
        service
            .insert_rnr_form(
                &context,
                &mock_store_a().id,
                InsertRnRForm {
                    id: "perf_test_new_form".to_string(),
                    supplier_id: "name_store_c".to_string(),
                    program_id: mock_program_b().id,
                    period_id: new_period_id,
                },
            )
            .unwrap();

        let test_time = test_start.elapsed();

        println!("R&R with {NUM_MASTER_LIST_ITEMS} items took: {test_time:?}");
        assert!(test_time.as_secs_f64() < 2.0);
    }
}
