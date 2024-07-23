#[cfg(test)]
mod generate_rnr_form_lines {
    use chrono::NaiveDate;
    use repository::mock::{
        item_query_test1, mock_master_list_program_b, mock_period_2_a, mock_rnr_form_a, MockData,
    };
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all_with_data;
    use repository::{
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, PeriodRow,
    };

    use crate::rnr_form::generate_rnr_form_lines::{generate_rnr_form_lines, get_lookback_months};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn test_generate_rnr_form_lines() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_generate_rnr_form_lines",
            MockDataInserts::all(),
            MockData {
                invoices: vec![InvoiceRow {
                    id: "amc_invoice".to_string(),
                    name_link_id: "name_store_b".to_string(),
                    store_id: mock_store_a().id,
                    r#type: InvoiceType::OutboundShipment,
                    status: InvoiceStatus::Shipped,
                    // During the rnr period
                    picked_datetime: NaiveDate::from_ymd_opt(2024, 1, 17)
                        .unwrap()
                        .and_hms_opt(10, 0, 0),
                    ..Default::default()
                }],
                invoice_lines: vec![InvoiceLineRow {
                    id: "amc_invoice_line".to_string(),
                    invoice_id: "amc_invoice".to_string(),
                    item_link_id: item_query_test1().id,
                    stock_line_id: None,
                    pack_size: 1.0,
                    r#type: InvoiceLineType::StockOut,
                    number_of_packs: 3.0,
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
            &rnr_form_id,
            &mock_master_list_program_b().master_list.id,
            mock_period_2_a(),
        )
        .unwrap();

        assert_eq!(result.len(), 1);
        let line = &result[0];

        assert_eq!(line.rnr_form_id, rnr_form_id);
        assert_eq!(line.item_id, item_query_test1().id);
        assert_eq!(line.average_monthly_consumption, 3.0);
        assert_eq!(line.maximum_quantity, 6.0);
        assert_eq!(line.maximum_quantity, 6.0);
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
