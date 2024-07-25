#[cfg(test)]
mod generate_rnr_form_lines {
    use chrono::NaiveDate;
    use repository::mock::{
        item_query_test1, mock_item_a, mock_master_list_program_b, mock_name_invad,
        mock_period_2_a, mock_rnr_form_a, MockData,
    };
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all_with_data;
    use repository::{
        EqualFilter, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
        RnRFormLineRow, StockLineRow,
    };

    use crate::rnr_form::generate_rnr_form_lines::{
        generate_rnr_form_lines, get_adjusted_quantity_consumed, get_earliest_expiry,
        get_opening_balance, get_stock_out_duration, get_usage_map, UsageStats,
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
                // During the R&R period (jan 24)
                invoices: vec![
                    invoice_adjust_up(),
                    invoice_outbound(),
                    invoice_inbound(),
                    invoice_adjust_down(),
                    // TODO: SOMETHING ON THE 31st!
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
                    available_number_of_packs: 3.0,
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
                average_monthly_consumption: 3.0,
                initial_balance: 2.0,
                quantity_received: 5.0,
                quantity_consumed: 3.0,
                stock_out_duration: 8,
                adjustments: -1.0,
                adjusted_quantity_consumed: 3.0 * 30.0 / 22.0, // TODO, should be 31/23!
                final_balance: 3.0,
                maximum_quantity: 6.0,
                requested_quantity: 3.0,
                expiry_date: None,
                comment: None,
                confirmed: false,
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
            30,
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
                    available_number_of_packs: 10.0,
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
                // Current stock on hand for item, 10 packs
                stock_lines: vec![StockLineRow {
                    item_link_id: item_query_test1().id,
                    store_id: mock_store_a().id,
                    pack_size: 1.0,
                    available_number_of_packs: 10.0,
                    ..Default::default()
                }],
                ..MockData::default()
            },
        )
        .await;

        let result = get_stock_out_duration(
            &connection,
            &mock_store_a().id,
            &item_query_test1().id,
            NaiveDate::from_ymd_opt(2024, 1, 31).unwrap().into(),
            31,
            5.0, // closing balance
        )
        .unwrap();

        assert_eq!(result, 8);
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
        // if stock_out for whole period, adjusted quantity consumed is 0
        // (there shouldn't be any consumption if there's a stock out, but we'll set it to 4 for testing purposes)
        assert_eq!(get_adjusted_quantity_consumed(10, 10, 4.0), 0.0);

        // if no stock out, adjusted matches consumption
        assert_eq!(get_adjusted_quantity_consumed(10, 0, 4.0), 4.0);

        // adjusts consumption for a partial stock out
        assert_eq!(get_adjusted_quantity_consumed(10, 5, 4.0), 8.0);
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
            verified_datetime: NaiveDate::from_ymd_opt(2024, 1, 24)
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
