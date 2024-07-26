#[cfg(test)]
mod finalise {
    use repository::mock::MockDataInserts;
    use repository::mock::{
        mock_rnr_form_a, mock_rnr_form_a_line_a, mock_rnr_form_b, mock_rnr_form_b_line_a,
        mock_store_a,
    };
    use repository::test_db::setup_all;
    use repository::{RnRFormLineRow, RnRFormLineRowRepository};

    use crate::rnr_form::update::{
        UpdateRnRForm, UpdateRnRFormError, UpdateRnRFormLine, UpdateRnRFormLineError,
    };
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

        // RnRFormDoesNotExist
        assert_eq!(
            service.update_rnr_form(
                &context,
                UpdateRnRForm {
                    id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(UpdateRnRFormError::RnRFormDoesNotExist)
        );

        // RnRFormAlreadyFinalised
        assert_eq!(
            service.update_rnr_form(
                &context,
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
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
                        adjustments: Some(0.0),
                        quantity_received: Some(1.0),
                        quantity_consumed: Some(1.0),
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

        // CannotRequestNegativeQuantity
        assert_eq!(
            service.update_rnr_form(
                &context,
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
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
    async fn finalise_rnr_form_success() {
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
                UpdateRnRForm {
                    id: mock_rnr_form_b().id,
                    lines: vec![UpdateRnRFormLine {
                        id: mock_rnr_form_b_line_a().id,
                        quantity_received: Some(4.0),
                        quantity_consumed: Some(8.0),
                        comment: Some("hello".to_string()),
                        confirmed: true,
                        final_balance: 5.0,
                        requested_quantity: 13.0,
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
                initial_balance: mock_rnr_form_b_line_a().initial_balance,
                snapshot_quantity_received: 5.0,
                snapshot_quantity_consumed: 7.0,
                snapshot_adjustments: -1.0,
                final_balance: 5.0,
                entered_quantity_received: Some(4.0),
                entered_quantity_consumed: Some(8.0),
                requested_quantity: 13.0,
                comment: Some("hello".to_string()),
                confirmed: true,
                average_monthly_consumption: 0.0,
                entered_adjustments: None,
                adjusted_quantity_consumed: 0.0,
                stock_out_duration: 0,
                maximum_quantity: 0.0,
                expiry_date: None,
            }
        );
    }
}
