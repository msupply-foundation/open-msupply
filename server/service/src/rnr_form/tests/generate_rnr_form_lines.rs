#[cfg(test)]
mod generate_rnr_form_lines {
    use chrono::NaiveDate;
    use repository::mock::{
        item_query_test1, mock_item_a, mock_master_list_program_b, mock_name_invad,
        mock_period_2_a, mock_period_2_b, mock_period_2_c, mock_program_b, mock_rnr_form_a,
        MockData,
    };
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all_with_data;
    use repository::{
        EqualFilter, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
        RnRFormFilter, RnRFormLineRow, RnRFormLowStock, RnRFormRow, StockLineRow,
    };

    use crate::rnr_form::generate_rnr_form_lines::{
        generate_rnr_form_lines, get_adjusted_quantity_consumed, get_amc, get_earliest_expiry,
        get_opening_balance, get_previous_monthly_consumption, get_stock_out_duration,
        get_usage_map, UsageStats,
    };
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn test_generate_rnr_form_lines() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_generate_rnr_form_lines",
            MockDataInserts::none()
                .stores()
                .name_store_joins()
                .items()
                .rnr_forms()
                .full_master_list(),
            MockData {
                // During the R&R period (jan 2024)
                invoices: vec![
                    invoice_adjust_up(),
                    invoice_outbound(),
                    invoice_inbound(),
                    invoice_adjust_down(),
                ],
                invoice_lines: vec![
                    invoice_line_adjust_up(),
                    invoice_line_outbound(),
                    invoice_line_inbound(),
                    invoice_line_adjust_down(),
                ],
                // Current stock on hand for item, 3 packs
                stock_lines: vec![StockLineRow {
                    item_link_id: item_query_test1().id,
                    store_id: mock_store_a().id,
                    pack_size: 1.0,
                    total_number_of_packs: 3.0,
                    ..Default::default()
                }],
                ..MockData::default()
            },
        )
        .await;
        let rnr_form_id = mock_rnr_form_a().id;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        let result = generate_rnr_form_lines(
            &context,
            &context.store_id,
            &rnr_form_id,
            &mock_rnr_form_a().program_id,
            &mock_master_list_program_b().master_list.id,
            mock_period_2_a(),
            None,
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        let line = result[0].clone();
        let line_id = line.id.clone();

        assert_eq!(
            line,
            RnRFormLineRow {
                id: line_id,
                rnr_form_id,
                item_id: item_query_test1().id,
                initial_balance: 2.0,
                snapshot_quantity_received: 5.0,
                snapshot_quantity_consumed: 3.0,
                snapshot_adjustments: -1.0,
                stock_out_duration: 8,
                adjusted_quantity_consumed: 4.043478260869565, // 3.0 * 31 / 23
                // AMC calculated used const NUMBER_OF_DAYS_IN_A_MONTH rather than actual # days in given month...
                // would ideally be same as adjusted_quantity_consumed here...
                average_monthly_consumption: 3.913043478260869,
                previous_monthly_consumption_values: "".to_string(),
                final_balance: 3.0,
                entered_quantity_received: None,
                entered_quantity_consumed: None,
                entered_adjustments: None,
                maximum_quantity: 7.826086956521738, // 2*AMC
                calculated_requested_quantity: 4.826086956521738, // max - final balance
                low_stock: RnRFormLowStock::BelowHalf, // 3 / 7.8
                entered_requested_quantity: None,
                expiry_date: None,
                comment: None,
                confirmed: false,
                approved_quantity: None,
            }
        );
    }

    #[actix_rt::test]
    async fn test_get_usage_map() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_get_usage_map",
            MockDataInserts::none().stores().name_store_joins().items(),
            MockData {
                invoices: vec![
                    invoice_adjust_up(),
                    invoice_outbound(),
                    invoice_inbound(),
                    invoice_adjust_down(),
                ],
                invoice_lines: vec![
                    invoice_line_adjust_up(),
                    invoice_line_outbound(),
                    invoice_line_inbound(),
                    invoice_line_adjust_down(),
                ],
                ..MockData::default()
            },
        )
        .await;

        let result = get_usage_map(
            &connection,
            &mock_store_a().id,
            Some(EqualFilter::equal_to(&item_query_test1().id)),
            31,
            &NaiveDate::from_ymd_opt(2024, 1, 31).unwrap(),
        )
        .unwrap();

        assert_eq!(
            result.get(&item_query_test1().id).unwrap(),
            &UsageStats {
                consumed: 3.0,
                replenished: 5.0,
                adjusted: -1.0,
            }
        );
    }

    #[actix_rt::test]
    async fn test_get_opening_balance() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_get_opening_balance",
            MockDataInserts::none().stores().name_store_joins().items(),
            MockData {
                invoices: vec![invoice_outbound(), invoice_inbound()],
                invoice_lines: vec![
                    // -3
                    invoice_line_outbound(),
                    // +5
                    invoice_line_inbound(),
                ],
                // Current stock on hand for item, 10 packs
                stock_lines: vec![StockLineRow {
                    item_link_id: item_query_test1().id,
                    store_id: mock_store_a().id,
                    pack_size: 1.0,
                    total_number_of_packs: 10.0,
                    ..Default::default()
                }],
                ..MockData::default()
            },
        )
        .await;

        // When previous row provided, use that value
        let result = get_opening_balance(
            &connection,
            Some(&RnRFormLineRow {
                final_balance: 7.0,
                ..Default::default()
            }),
            &mock_store_a().id,
            &item_query_test1().id,
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        )
        .unwrap();
        assert_eq!(result, 7.0);

        // When no previous row, calculate as of starting date
        let result = get_opening_balance(
            &connection,
            None,
            &mock_store_a().id,
            &item_query_test1().id,
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        )
        .unwrap();
        assert_eq!(result, 8.0);
    }

    #[actix_rt::test]
    async fn test_get_stock_out_duration() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_get_stock_out_duration",
            MockDataInserts::none().stores().name_store_joins().items(),
            MockData {
                invoices: vec![invoice_outbound(), invoice_inbound()],
                invoice_lines: vec![
                    // -3 - stock out on the 9th
                    invoice_line_outbound(),
                    // +5 - replenish on the 17th ... so stock out for 8 days
                    invoice_line_inbound(),
                ],
                ..MockData::default()
            },
        )
        .await;

        let result = get_stock_out_duration(
            &connection,
            &mock_store_a().id,
            &item_query_test1().id,
            NaiveDate::from_ymd_opt(2024, 1, 31).unwrap(),
            31,
            5.0, // closing balance
        )
        .unwrap();

        assert_eq!(result, 8);

        // If no transactions, stock out duration is 0
        let result = get_stock_out_duration(
            &connection,
            &mock_store_a().id,
            &mock_item_a().id, // different item, which we have no transactions for
            NaiveDate::from_ymd_opt(2024, 1, 31).unwrap(),
            31,
            0.0, // closing balance
        )
        .unwrap();

        assert_eq!(result, 0);
    }

    #[actix_rt::test]
    async fn test_get_earliest_expiry() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_get_earliest_expiry",
            MockDataInserts::none().stores().name_store_joins().items(),
            MockData {
                // Current stock on hand for item, 10 packs
                stock_lines: vec![
                    StockLineRow {
                        id: "stock_line_1".to_string(),
                        item_link_id: item_query_test1().id,
                        store_id: mock_store_a().id,
                        pack_size: 1.0,
                        available_number_of_packs: 10.0,
                        expiry_date: Some(NaiveDate::from_ymd_opt(2024, 1, 31).unwrap()),
                        ..Default::default()
                    },
                    StockLineRow {
                        id: "stock_line_2".to_string(),
                        item_link_id: item_query_test1().id,
                        store_id: mock_store_a().id,
                        pack_size: 1.0,
                        available_number_of_packs: 3.0,
                        expiry_date: Some(NaiveDate::from_ymd_opt(2024, 12, 31).unwrap()),
                        ..Default::default()
                    },
                    StockLineRow {
                        id: "stock_line_3".to_string(),
                        item_link_id: item_query_test1().id,
                        store_id: mock_store_a().id,
                        pack_size: 1.0,
                        available_number_of_packs: 2.0,
                        expiry_date: None,
                        ..Default::default()
                    },
                    StockLineRow {
                        id: "stock_line_other_item_no_expiry".to_string(),
                        item_link_id: mock_item_a().id,
                        store_id: mock_store_a().id,
                        pack_size: 1.0,
                        available_number_of_packs: 2.0,
                        expiry_date: None,
                        ..Default::default()
                    },
                ],
                ..MockData::default()
            },
        )
        .await;

        // When no stock lines with expiries, return None
        let result =
            get_earliest_expiry(&connection, &mock_store_a().id, &mock_item_a().id).unwrap();
        assert_eq!(result, None);

        // Selects the earliest expiry date
        let result =
            get_earliest_expiry(&connection, &mock_store_a().id, &item_query_test1().id).unwrap();
        assert_eq!(result, Some(NaiveDate::from_ymd_opt(2024, 1, 31).unwrap()));
    }

    #[actix_rt::test]
    async fn test_get_adjusted_quantity_consumed() {
        // if stock_out for whole period, just returns what is consumed
        // (there shouldn't be any consumption if there's a stock out, but we'll set it to 4 for testing purposes)
        assert_eq!(get_adjusted_quantity_consumed(10, 10, 4.0), 4.0);

        // if no stock out, adjusted matches consumption
        assert_eq!(get_adjusted_quantity_consumed(10, 0, 4.0), 4.0);

        // adjusts consumption for a partial stock out
        assert_eq!(get_adjusted_quantity_consumed(10, 5, 4.0), 8.0);
    }

    #[actix_rt::test]
    async fn test_get_previous_monthly_consumption() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_get_previous_monthly_consumption",
            MockDataInserts::all(),
            MockData {
                rnr_forms: vec![
                    RnRFormRow {
                        id: "rnr_form_1".to_string(),
                        name_link_id: "name_store_b".to_string(),
                        store_id: mock_store_a().id,
                        program_id: mock_program_b().id,
                        period_id: mock_period_2_a().id,
                        created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap(),
                        ..Default::default()
                    },
                    RnRFormRow {
                        id: "rnr_form_2".to_string(),
                        name_link_id: "name_store_b".to_string(),
                        store_id: mock_store_a().id,
                        program_id: mock_program_b().id,
                        period_id: mock_period_2_b().id,
                        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap(),
                        ..Default::default()
                    },
                    RnRFormRow {
                        id: "rnr_form_3".to_string(),
                        name_link_id: "name_store_b".to_string(),
                        store_id: mock_store_a().id,
                        program_id: mock_program_b().id,
                        period_id: mock_period_2_c().id,
                        created_datetime: NaiveDate::from_ymd_opt(2024, 3, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap(),
                        ..Default::default()
                    },
                ],
                rnr_form_lines: vec![
                    RnRFormLineRow {
                        id: "rnr_form_1_line_a".to_string(),
                        rnr_form_id: "rnr_form_1".to_string(),
                        item_id: item_query_test1().id,
                        adjusted_quantity_consumed: 1.0,
                        ..Default::default()
                    },
                    RnRFormLineRow {
                        id: "rnr_form_2_line_a".to_string(),
                        rnr_form_id: "rnr_form_2".to_string(),
                        item_id: item_query_test1().id,
                        adjusted_quantity_consumed: 2.0,
                        ..Default::default()
                    },
                    RnRFormLineRow {
                        id: "rnr_form_3_line_a".to_string(),
                        rnr_form_id: "rnr_form_3".to_string(),
                        item_id: item_query_test1().id,
                        adjusted_quantity_consumed: 3.0,
                        ..Default::default()
                    },
                ],
                ..MockData::default()
            },
        )
        .await;

        // When no rnr_forms, map will be empty
        let result = get_previous_monthly_consumption(
            &connection,
            // Filter so that no rnr_forms are returned
            RnRFormFilter::new().id(EqualFilter::equal_to("not-exists")),
        )
        .unwrap();
        assert_eq!(result.get(&item_query_test1().id), None);

        // When only one rnr_form, map includes that one
        let result = get_previous_monthly_consumption(
            &connection,
            // Filter so that no rnr_forms are returned
            RnRFormFilter::new().id(EqualFilter::equal_to("rnr_form_1")),
        )
        .unwrap();
        assert_eq!(
            result.get(&item_query_test1().id),
            // adjusted consumption for the month
            Some(&vec![0.9677419354838709])
        );

        // When many rnr forms, it gets the most recent two
        let result = get_previous_monthly_consumption(
            &connection,
            // Filter so that no rnr_forms are returned
            RnRFormFilter::new().id(EqualFilter::equal_any(vec![
                "rnr_form_1".to_string(),
                "rnr_form_2".to_string(),
                "rnr_form_3".to_string(),
            ])),
        )
        .unwrap();
        assert_eq!(
            result.get(&item_query_test1().id),
            // adjusted consumption for the month
            Some(&vec![2.0689655172413794, 2.9032258064516125])
        );
    }

    #[actix_rt::test]
    async fn test_get_amc() {
        // if no previous AMC average, returns AMC for the current period
        assert_eq!(
            get_amc(
                60,      // 2 month period
                20.0,    // 20 consumed in period
                &vec![]  // no previous AMCs
            ),
            10.0 // AMC should be 10 packs per month
        );

        // if there is a previous AMC average, average that with the current period
        assert_eq!(
            get_amc(
                60,                // 2 month period
                20.0,              // 20 consumed in period
                &vec![15.0, 11.0]  // AMC across previous periods
            ),
            12.0 // 10 per month this period, averaged with 15 and 11
        );
    }

    // ---- TEST DATA ----
    fn invoice_adjust_up() -> InvoiceRow {
        InvoiceRow {
            id: "adjust_up".to_string(),
            name_link_id: mock_name_invad().id,
            store_id: mock_store_a().id,
            r#type: InvoiceType::InventoryAddition,
            status: InvoiceStatus::Verified,
            verified_datetime: NaiveDate::from_ymd_opt(2024, 1, 7)
                .unwrap()
                .and_hms_opt(10, 0, 0),
            ..Default::default()
        }
    }
    fn invoice_line_adjust_up() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "adjust_up_invoice_line".to_string(),
            invoice_id: "adjust_up".to_string(),
            item_link_id: item_query_test1().id,
            pack_size: 1.0,
            r#type: InvoiceLineType::StockIn,
            number_of_packs: 1.0,
            ..Default::default()
        }
    }
    fn invoice_outbound() -> InvoiceRow {
        InvoiceRow {
            id: "outbound".to_string(),
            name_link_id: "name_store_b".to_string(),
            store_id: mock_store_a().id,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Shipped,
            // During the rnr period
            picked_datetime: NaiveDate::from_ymd_opt(2024, 1, 9)
                .unwrap()
                .and_hms_opt(10, 0, 0),
            ..Default::default()
        }
    }
    fn invoice_line_outbound() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "outbound_invoice_line".to_string(),
            invoice_id: "outbound".to_string(),
            item_link_id: item_query_test1().id,
            // check quantities are correct with diff pack sizes
            pack_size: 3.0,
            r#type: InvoiceLineType::StockOut,
            number_of_packs: 1.0,
            ..Default::default()
        }
    }
    fn invoice_inbound() -> InvoiceRow {
        InvoiceRow {
            id: "inbound".to_string(),
            name_link_id: "name_store_b".to_string(),
            store_id: mock_store_a().id,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::Delivered,
            // During the rnr period
            delivered_datetime: NaiveDate::from_ymd_opt(2024, 1, 17)
                .unwrap()
                .and_hms_opt(10, 0, 0),
            ..Default::default()
        }
    }
    fn invoice_line_inbound() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "inbound_invoice_line".to_string(),
            invoice_id: "inbound".to_string(),
            item_link_id: item_query_test1().id,
            pack_size: 1.0,
            r#type: InvoiceLineType::StockIn,
            number_of_packs: 5.0,
            ..Default::default()
        }
    }
    fn invoice_adjust_down() -> InvoiceRow {
        InvoiceRow {
            id: "adjust_down".to_string(),
            name_link_id: mock_name_invad().id,
            store_id: mock_store_a().id,
            r#type: InvoiceType::InventoryReduction,
            status: InvoiceStatus::Verified,
            verified_datetime: NaiveDate::from_ymd_opt(2024, 1, 31)
                .unwrap()
                .and_hms_opt(10, 0, 0),
            ..Default::default()
        }
    }
    fn invoice_line_adjust_down() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "adjust_down_invoice_line".to_string(),
            invoice_id: "adjust_down".to_string(),
            item_link_id: item_query_test1().id,
            pack_size: 1.0,
            r#type: InvoiceLineType::StockOut,
            number_of_packs: 2.0,
            ..Default::default()
        }
    }
}
