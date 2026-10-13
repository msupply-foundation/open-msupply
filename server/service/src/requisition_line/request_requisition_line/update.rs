use crate::{
    NullableUpdate,
    campaign::check_campaign_exists_including_deleted,
    location::query::get_available_volume_by_location_type,
    requisition::{
        common::check_requisition_row_exists,
        request_requisition::{
            ForecastInputs, ForecastMethodUnavailableReason, apply_forecast, order_demand,
            recompute_ancillary_dependants, suggested_quantity as request_suggested_quantity,
        },
    },
    requisition_line::{
        common::check_requisition_line_exists, query::get_requisition_line,
        request_requisition_line::activity_stock_on_hand,
    },
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
    validate::check_other_party_store_is_disabled,
};

use repository::{
    EqualFilter, ForecastMethod, LineForecast, ReasonOptionFilter, ReasonOptionRepository,
    ReasonOptionType, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    StorageConnection,
    requisition_row::{RequisitionStatus, RequisitionType},
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateRequestRequisitionLine {
    pub id: String,
    pub requested_quantity: Option<f64>,
    pub comment: Option<String>,
    pub option_id: Option<String>,
    /// Changing the method recomputes the line's forecast and suggested quantity, and the
    /// Ancillary-ratio lines it feeds
    pub forecast_method: Option<ForecastMethod>,
    pub campaign_id: Option<NullableUpdate<String>>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateRequestRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    UpdatedRequisitionLineDoesNotExist,
    RequisitionDoesNotExist,
    ReasonNotProvided(RequisitionLine),
    ForecastMethodNotAvailable(ForecastMethodUnavailableReason),
    CampaignDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateRequestRequisitionLineError;

pub fn update_request_requisition_line(
    ctx: &ServiceContext,
    input: UpdateRequestRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (requisition_line_row, requisition_row, new_forecast, new_stock_on_hand) =
                validate(connection, &ctx.store_id, &input)?;
            // Either recompute changes the line's suggestion, and so the Ancillary-ratio
            // lines that are a multiple of it
            let suggestion_changed = new_forecast.is_some() || new_stock_on_hand.is_some();
            let updated_requisition_line_row = generate(
                ctx,
                requisition_line_row,
                &requisition_row,
                new_forecast,
                new_stock_on_hand,
                input,
            )?;

            RequisitionLineRowRepository::new(connection)
                .upsert_one(&updated_requisition_line_row)?;

            if suggestion_changed {
                recompute_ancillary_dependants(
                    connection,
                    &ctx.store_id,
                    &requisition_row,
                    vec![updated_requisition_line_row.item_id.clone()],
                )?;
            }

            get_requisition_line(ctx, &updated_requisition_line_row.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateRequestRequisitionLine,
) -> Result<
    (
        RequisitionLineRow,
        RequisitionRow,
        Option<LineForecast>,
        Option<f64>,
    ),
    OutError,
> {
    let requisition_line = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?;
    let requisition_line_row = requisition_line.clone().requisition_line_row;
    let store_preference = get_store_preferences(connection, store_id)?;

    let requisition_row =
        check_requisition_row_exists(connection, &requisition_line_row.requisition_id)?
            .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    if requisition_row.status != RequisitionStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if check_other_party_store_is_disabled(connection, store_id, &requisition_row.name_id)? {
        return Err(OutError::CannotEditRequisition);
    }

    if let Some(NullableUpdate {
        value: Some(campaign_id),
    }) = &input.campaign_id
        && !check_campaign_exists_including_deleted(connection, campaign_id)?
    {
        return Err(OutError::CampaignDoesNotExist);
    }

    // An activity change re-reads what this store actually holds FOR that activity, since
    // the line's stock on hand is what the suggestion is computed against: stock held for
    // a campaign is not available to routine immunisation and must not be counted as
    // though it were. Clearing the activity restores the whole-store figure, so a line
    // with no activity behaves exactly as it always did. Choosing the activity a line
    // already carries changes nothing and re-reads nothing.
    let new_stock_on_hand = match &input.campaign_id {
        Some(NullableUpdate { value }) if *value != requisition_line_row.campaign_id => {
            Some(activity_stock_on_hand(
                connection,
                store_id,
                &requisition_line_row.item_id,
                value.as_deref(),
            )?)
        }
        _ => None,
    };

    // A method change computes the line's new forecast; choosing its current method changes
    // nothing, so a line keeps a method that has since become unavailable
    let new_forecast = match &input.forecast_method {
        Some(method) if *method != requisition_line_row.forecast_method => {
            let order_lines: Vec<RequisitionLineRow> = RequisitionLineRepository::new(connection)
                .query_by_filter(
                    RequisitionLineFilter::new()
                        .requisition_id(EqualFilter::equal_to(requisition_row.id.to_string())),
                )?
                .into_iter()
                .map(|line| line.requisition_line_row)
                .collect();
            let order = order_demand(&order_lines);
            let item_id = &requisition_line_row.item_id;
            let inputs = ForecastInputs::load(connection, store_id, &[item_id.clone()])?;

            if let Some(reason) = inputs.unavailable_reason(method, item_id, &order) {
                return Err(OutError::ForecastMethodNotAvailable(reason));
            }
            Some(inputs.forecast(
                method.clone(),
                item_id,
                requisition_line_row.average_monthly_consumption,
                &order,
            ))
        }
        _ => None,
    };

    // A reason explains a departure from the suggestion the update leaves: recomputed
    // when this update changes either input to it — the forecast's monthly consumption,
    // or the stock on hand an activity change re-scopes — else the stored one
    let suggested_quantity = if new_forecast.is_some() || new_stock_on_hand.is_some() {
        request_suggested_quantity(
            &requisition_row,
            new_forecast
                .as_ref()
                .map_or(requisition_line_row.forecast_monthly_consumption, |f| {
                    f.monthly_consumption
                }),
            new_stock_on_hand.unwrap_or(requisition_line_row.available_stock_on_hand),
        )
    } else {
        requisition_line_row.suggested_quantity
    };

    if store_preference.use_consumption_and_stock_from_customers_for_internal_orders
        && requisition_row.program_id.is_some()
    {
        let reason_options = ReasonOptionRepository::new(connection).query_by_filter(
            ReasonOptionFilter::new()
                .r#type(ReasonOptionType::equal_to(
                    &ReasonOptionType::RequisitionLineVariance,
                ))
                .is_active(true),
        )?;

        if !reason_options.is_empty()
            && input
                .requested_quantity
                .is_some_and(|requested| requested != suggested_quantity)
            && input.option_id.is_none()
        {
            return Err(OutError::ReasonNotProvided(requisition_line));
        }
    }

    Ok((
        requisition_line_row,
        requisition_row,
        new_forecast,
        new_stock_on_hand,
    ))
}

fn generate(
    ctx: &ServiceContext,
    existing: RequisitionLineRow,
    requisition_row: &RequisitionRow,
    new_forecast: Option<LineForecast>,
    new_stock_on_hand: Option<f64>,
    UpdateRequestRequisitionLine {
        id: _,
        requested_quantity: updated_requested_quantity,
        comment: updated_comment,
        option_id,
        forecast_method: _,
        campaign_id,
    }: UpdateRequestRequisitionLine,
) -> Result<RequisitionLineRow, RepositoryError> {
    let mut existing = existing;
    // The re-scoped stock on hand lands FIRST: it is an input to the suggestion, and
    // apply_forecast below recomputes that suggestion by reading it off the line.
    if let Some(stock_on_hand) = new_stock_on_hand {
        existing.available_stock_on_hand = stock_on_hand;
        existing.suggested_quantity = request_suggested_quantity(
            requisition_row,
            existing.forecast_monthly_consumption,
            stock_on_hand,
        );
    }
    if let Some(forecast) = new_forecast {
        apply_forecast(&mut existing, forecast, requisition_row);
    }

    let available_volume_by_type = get_available_volume_by_location_type(
        &ctx.connection,
        &ctx.store_id,
        &[existing.item_id.clone()],
    )?
    .get(&existing.item_id)
    .cloned()
    .unwrap_or_default();

    Ok(RequisitionLineRow {
        requested_quantity: updated_requested_quantity.unwrap_or(existing.requested_quantity),
        comment: updated_comment.or(existing.comment),
        option_id: option_id.or(existing.option_id),
        campaign_id: campaign_id.map_or(existing.campaign_id, |update| update.value),
        available_volume: available_volume_by_type.available_volume,
        location_type_id: available_volume_by_type.restricted_location_type_id.clone(),
        ..existing
    })
}

impl From<RepositoryError> for UpdateRequestRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateRequestRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        NullableUpdate,
        requisition::request_requisition::{
            GenerateSuggestedQuantity, generate_suggested_quantity,
        },
        requisition_line::request_requisition_line::{
            UpdateRequestRequisitionLine, UpdateRequestRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        EqualFilter, RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow,
        RequisitionLineRowRepository, StockLineRow, StockLineRowRepository, StockOnHandFilter,
        StockOnHandRepository, StorePreferenceRow, StorePreferenceRowRepository,
        mock::{
            MockData, MockDataInserts, mock_campaign_a,
            mock_full_new_response_requisition_for_update_test, mock_item_a,
            mock_request_draft_requisition_calculation_test, mock_request_program_requisition,
            mock_requisition_variance_reason_option, mock_sent_request_requisition_line,
            mock_store_a, mock_store_b,
        },
        test_db::{setup_all, setup_all_with_data},
    };

    fn progam_request_line() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "program_request_line".to_string(),
            requisition_id: mock_request_program_requisition().id.clone(),
            item_id: mock_item_a().id.clone(),
            suggested_quantity: 10.0,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn update_request_requisition_line_errors() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_request_requisition_line_errors",
            MockDataInserts::all(),
            MockData {
                requisition_lines: vec![progam_request_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: mock_sent_request_requisition_line().id.clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: mock_full_new_response_requisition_for_update_test().lines[0]
                        .id
                        .clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // ReasonNotProvided
        context.store_id = mock_store_a().id;
        let store_pref = StorePreferenceRow {
            id: mock_store_a().id.clone(),
            use_consumption_and_stock_from_customers_for_internal_orders: true,
            ..Default::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&store_pref)
            .unwrap();
        let requisition_lines =
            RequisitionLineRepository::new(&connection)
                .query_by_filter(RequisitionLineFilter::new().requisition_id(
                    EqualFilter::equal_to(progam_request_line().requisition_id.clone().to_owned()),
                ))
                .unwrap();

        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: progam_request_line().id,
                    requested_quantity: Some(15.0),
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReasonNotProvided(
                requisition_lines[0].clone()
            ))
        );
    }

    #[actix_rt::test]
    async fn update_request_requisition_line_campaign() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_request_requisition_line_campaign",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        let test_line = mock_request_draft_requisition_calculation_test().lines[0].clone();
        let requisition = mock_request_draft_requisition_calculation_test().requisition;
        let stored = || {
            RequisitionLineRowRepository::new(&connection)
                .find_one_by_id(&test_line.id)
                .unwrap()
                .unwrap()
        };

        // One batch of the line's item held FOR the campaign, against whatever else the
        // store holds of it: the point of the scoping is that these two differ.
        let campaign_packs = 7.0;
        StockLineRowRepository::new(&connection)
            .upsert_one(&StockLineRow {
                id: "campaign_stock".to_string(),
                item_id: test_line.item_id.clone(),
                store_id: mock_store_a().id,
                campaign_id: Some(mock_campaign_a().id),
                pack_size: 1.0,
                available_number_of_packs: campaign_packs,
                total_number_of_packs: campaign_packs,
                ..Default::default()
            })
            .unwrap();

        let whole_store_soh = StockOnHandRepository::new(&connection)
            .query_one(
                StockOnHandFilter::new()
                    .store_id(EqualFilter::equal_to(mock_store_a().id))
                    .item_id(EqualFilter::equal_to(test_line.item_id.clone())),
            )
            .unwrap()
            .map(|row| row.available_stock_on_hand)
            .unwrap_or(0.0);
        // The scoping only means anything if the campaign holds less than the store does
        assert!(whole_store_soh > campaign_packs);

        let suggested_for = |stock_on_hand: f64| {
            generate_suggested_quantity(GenerateSuggestedQuantity {
                forecast_monthly_consumption: test_line.forecast_monthly_consumption,
                available_stock_on_hand: stock_on_hand,
                min_months_of_stock: requisition.min_months_of_stock,
                max_months_of_stock: requisition.max_months_of_stock,
            })
        };

        service
            .update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    campaign_id: Some(NullableUpdate {
                        value: Some(mock_campaign_a().id.clone()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();
        // Held for a campaign: ONLY that campaign's stock counts as available, and the
        // suggestion follows from it (issue 595)
        assert_eq!(stored().campaign_id, Some(mock_campaign_a().id));
        assert_eq!(stored().available_stock_on_hand, campaign_packs);
        assert_eq!(stored().suggested_quantity, suggested_for(campaign_packs));

        // An unrelated edit re-reads nothing — the line keeps its activity and its figures
        service
            .update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    comment: Some("untouched".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(stored().campaign_id, Some(mock_campaign_a().id));
        assert_eq!(stored().available_stock_on_hand, campaign_packs);

        service
            .update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    campaign_id: Some(NullableUpdate { value: None }),
                    ..Default::default()
                },
            )
            .unwrap();
        // Cleared: back to counting the whole store, exactly as before the activity
        assert_eq!(stored().campaign_id, None);
        assert_eq!(stored().available_stock_on_hand, whole_store_soh);
        assert_eq!(stored().suggested_quantity, suggested_for(whole_store_soh));

        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    campaign_id: Some(NullableUpdate {
                        value: Some("does_not_exist".to_string()),
                    }),
                    ..Default::default()
                },
            ),
            Err(ServiceError::CampaignDoesNotExist)
        );

        // A refused update leaves the line's figures alone
        assert_eq!(stored().available_stock_on_hand, whole_store_soh);
    }

    #[actix_rt::test]
    async fn update_request_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_request_requisition_line_success",
            MockDataInserts::all(),
            MockData {
                requisition_lines: vec![progam_request_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        let test_line = mock_request_draft_requisition_calculation_test().lines[0].clone();

        service
            .update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    requested_quantity: Some(99.0),
                    comment: Some("comment".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id(&test_line.id)
            .unwrap()
            .unwrap();

        assert_eq!(
            line,
            RequisitionLineRow {
                requested_quantity: 99.0,
                comment: Some("comment".to_string()),
                ..test_line
            }
        );

        // Success suggested != requested with reason provided
        let store_pref = StorePreferenceRow {
            id: mock_store_a().id.clone(),
            use_consumption_and_stock_from_customers_for_internal_orders: true,
            ..Default::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&store_pref)
            .unwrap();

        let program_line_id = progam_request_line().id;
        service
            .update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: program_line_id.clone(),
                    requested_quantity: Some(15.0),
                    option_id: Some(mock_requisition_variance_reason_option().id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        let program_line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id(&program_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            program_line,
            RequisitionLineRow {
                requested_quantity: 15.0,
                option_id: Some(mock_requisition_variance_reason_option().id.clone()),
                ..progam_request_line()
            }
        )
    }
}
