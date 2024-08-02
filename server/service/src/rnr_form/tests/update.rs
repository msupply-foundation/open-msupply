#[cfg(test)]
mod update {
    use chrono::NaiveDate;
    use repository::mock::MockDataInserts;
    use repository::mock::{
        mock_rnr_form_a, mock_rnr_form_a_line_a, mock_rnr_form_b, mock_rnr_form_b_line_a,
        mock_store_a, mock_store_b,
    };
    use repository::test_db::setup_all;
    use repository::{RnRFormLineRow, RnRFormLineRowRepository};

    use crate::rnr_form::update::{
        UpdateRnRForm, UpdateRnRFormError, UpdateRnRFormLine, UpdateRnRFormLineError,
    };
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn update_rnr_form_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_rnr_form_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.rnr_form_service;
        let store_id = mock_store_a().id;

        // RnRFormDoesNotExist
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(UpdateRnRFormError::RnRFormDoesNotExist)
        );

        // RnRFormDoesNotBelongToStore
        assert_eq!(
            service.update_rnr_form(
                &context,
                &mock_store_b().id, // Different store
                UpdateRnRForm {
                    id: mock_rnr_form_a().id,
                    ..Default::default()
                }
            ),
            Err(UpdateRnRFormError::RnRFormDoesNotBelongToStore)
        );

        // RnRFormAlreadyFinalised
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: mock_rnr_form_a().id,
                    ..Default::default()
                }
            ),
            Err(UpdateRnRFormError::RnRFormAlreadyFinalised)
        );

        // LineDoesNotExist
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: "invalid".to_string(),
                        ..Default::default()
                    }]
                }
            ),
            Err(UpdateRnRFormError::LineError {
                line_id: "invalid".to_string(),
                error: UpdateRnRFormLineError::LineDoesNotExist
            })
        );

        // LineDoesNotBelongToForm
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_a_line_a().id,
                        ..Default::default()
                    }]
                }
            ),
            Err(UpdateRnRFormError::LineError {
                line_id: mock_rnr_form_a_line_a().id,
                error: UpdateRnRFormLineError::LineDoesNotBelongToRnRForm
            })
        );

        // ValuesDoNotBalance
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
                        adjustments: Some(0.0),
                        quantity_received: Some(1.0),
                        quantity_consumed: Some(1.0),
                        initial_balance: 10.0,
                        final_balance: 6.0, // initial is 10, so +1 -1 should equal 10
                        ..Default::default()
                    }]
                }
            ),
            Err(UpdateRnRFormError::LineError {
                line_id: mock_rnr_form_b_line_a().id,
                error: UpdateRnRFormLineError::ValuesDoNotBalance
            })
        );

        // StockOutDurationExceedsPeriod
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
                        stock_out_duration: 100, // period is only a month
                        initial_balance: 10.0,
                        final_balance: 7.0,
                        ..Default::default()
                    }]
                }
            ),
            Err(UpdateRnRFormError::LineError {
                line_id: mock_rnr_form_b_line_a().id,
                error: UpdateRnRFormLineError::StockOutDurationExceedsPeriod
            })
        );

        // FinalBalanceCannotBeNegative
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
                        initial_balance: 0.0,
                        quantity_consumed: Some(7.0),
                        quantity_received: Some(0.0),
                        adjustments: Some(0.0),
                        final_balance: -7.0,
                        ..Default::default()
                    }]
                }
            ),
            Err(UpdateRnRFormError::LineError {
                line_id: mock_rnr_form_b_line_a().id,
                error: UpdateRnRFormLineError::FinalBalanceCannotBeNegative
            })
        );

        // CannotRequestNegativeQuantity
        assert_eq!(
            service.update_rnr_form(
                &context,
                &store_id,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
                        initial_balance: 10.0,
                        final_balance: 7.0,
                        requested_quantity: -10.0,
                        ..Default::default()
                    }]
                }
            ),
            Err(UpdateRnRFormError::LineError {
                line_id: mock_rnr_form_b_line_a().id,
                error: UpdateRnRFormLineError::CannotRequestNegativeQuantity
            })
        );
    }

    #[actix_rt::test]
    async fn update_rnr_form_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_rnr_form_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        let _result = service_provider
            .rnr_form_service
            .update_rnr_form(
                &context,
                &mock_store_a().id,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
                        quantity_received: Some(4.0),
                        quantity_consumed: Some(8.0),
                        comment: Some("hello".to_string()),
                        confirmed: true,
                        initial_balance: 10.0,
                        final_balance: 5.0,
                        requested_quantity: 13.0,
                        expiry_date: NaiveDate::from_ymd_opt(2021, 1, 1),
                        ..Default::default()
                    }],
                },
            )
            .unwrap();

        let updated_line = RnRFormLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_rnr_form_b_line_a().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            updated_line,
            RnRFormLineRow {
                id: mock_rnr_form_b_line_a().id,
                rnr_form_id: mock_rnr_form_b().id,
                item_id: mock_rnr_form_b_line_a().item_id,
                initial_balance: 10.0,
                snapshot_quantity_received: 5.0,
                snapshot_quantity_consumed: 7.0,
                snapshot_adjustments: -1.0,
                final_balance: 5.0,
                entered_quantity_received: Some(4.0),
                entered_quantity_consumed: Some(8.0),
                requested_quantity: 13.0,
                comment: Some("hello".to_string()),
                confirmed: true,
                expiry_date: NaiveDate::from_ymd_opt(2021, 1, 1),
                average_monthly_consumption: 0.0,
                entered_adjustments: None,
                adjusted_quantity_consumed: 0.0,
                stock_out_duration: 0,
                maximum_quantity: 0.0,
                previous_average_monthly_consumption: 0.0,
            }
        );
    }
}
