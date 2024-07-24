#[cfg(test)]
mod generate_rnr_form_lines {
    use chrono::NaiveDate;
    use repository::mock::{
        item_query_test1, mock_master_list_program_b, mock_name_invad, mock_period_2_a,
        mock_rnr_form_a, MockData,
    };
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all_with_data;
    use repository::{
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, PeriodRow,
        RnRFormLineRow,
    };

    use crate::rnr_form::generate_rnr_form_lines::{generate_rnr_form_lines, get_lookback_months};
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
                // During the R&R period (january)
                invoices: vec![
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
                    },
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
                    },
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
                    },
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
                    },
                ],
                invoice_lines: vec![
                    InvoiceLineRow {
                        id: "adjust_up_invoice_line".to_string(),
                        invoice_id: "adjust_up".to_string(),
                        item_link_id: item_query_test1().id,
                        pack_size: 1.0,
                        r#type: InvoiceLineType::StockIn,
                        number_of_packs: 1.0,
                        ..Default::default()
                    },
                    InvoiceLineRow {
                        id: "outbound_invoice_line".to_string(),
                        invoice_id: "outbound".to_string(),
                        item_link_id: item_query_test1().id,
                        pack_size: 1.0,
                        r#type: InvoiceLineType::StockOut,
                        number_of_packs: 3.0,
                        ..Default::default()
                    },
                    InvoiceLineRow {
                        id: "inbound_invoice_line".to_string(),
                        invoice_id: "inbound".to_string(),
                        item_link_id: item_query_test1().id,
                        pack_size: 1.0,
                        r#type: InvoiceLineType::StockIn,
                        number_of_packs: 5.0,
                        ..Default::default()
                    },
                    InvoiceLineRow {
                        id: "adjust_down_invoice_line".to_string(),
                        invoice_id: "adjust_down".to_string(),
                        item_link_id: item_query_test1().id,
                        pack_size: 1.0,
                        r#type: InvoiceLineType::StockOut,
                        number_of_packs: 2.0,
                        ..Default::default()
                    },
                ],
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
                adjusted_quantity_consumed: 3.0 * 31.0 / 23.0,
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
    async fn test_get_lookback_months() {
        let two_month_period = PeriodRow {
            start_date: NaiveDate::from_ymd_opt(2023, 1, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2023, 3, 1).unwrap(),
            ..Default::default()
        };
        let eighteen_month_period = PeriodRow {
            start_date: NaiveDate::from_ymd_opt(2023, 1, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2024, 7, 1).unwrap(),
            ..Default::default()
        };

        let one_month_over_new_year = PeriodRow {
            start_date: NaiveDate::from_ymd_opt(2023, 12, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            ..Default::default()
        };

        assert_eq!(get_lookback_months(&two_month_period), 2);
        assert_eq!(get_lookback_months(&eighteen_month_period), 18);
        assert_eq!(get_lookback_months(&one_month_over_new_year), 1);
    }
}
