use crate::{
    NullableUpdate, PluginOrRepositoryError,
    backend_plugin::{
        plugin_provider::{PluginError, PluginInstance},
        types::transform_request_requisition_lines::Context,
    },
    campaign::check_campaign_exists_including_deleted,
    item::check_item_exists,
    requisition::{
        common::check_requisition_row_exists,
        request_requisition::{
            ForecastInputs, ForecastMethodOption, ForecastMethodUnavailableReason, apply_forecast,
            generate_requisition_lines, order_demand, suggested_quantity,
        },
    },
    requisition_line::request_requisition_line::activity_stock_on_hand,
    service_provider::ServiceContext,
};
use repository::{
    EqualFilter, ForecastMethod, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRow, requisition_row::RequisitionType,
};

/// An item's line on a request requisition as the editor's draft would save it, without
/// saving anything: the line already on the order, or the one adding the item would create.
#[derive(Debug, PartialEq, Clone, Default)]
pub struct RequisitionLineForecastPreviewInput {
    pub requisition_id: String,
    pub item_id: String,
    /// The method to preview. None keeps the line's own: an existing line's stored method,
    /// or the default a new line would take
    pub forecast_method: Option<ForecastMethod>,
    /// The activity to preview the line as held for, in the update's own shape: None keeps
    /// the line's own, `Some(None)` previews it as held for nothing in particular
    pub campaign_id: Option<NullableUpdate<String>>,
}

#[derive(Debug, PartialEq, Clone)]
pub struct RequisitionLineForecastPreview {
    /// Never persisted. A new line's id is not the one its insert will use
    pub line: RequisitionLineRow,
    /// The requisition's target months, for the line's target stock
    pub max_months_of_stock: f64,
    pub forecast_method_options: Vec<ForecastMethodOption>,
}

#[derive(Debug, PartialEq)]
pub enum RequisitionLineForecastPreviewError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    NotARequestRequisition,
    ItemDoesNotExist,
    CampaignDoesNotExist,
    ForecastMethodNotAvailable(ForecastMethodUnavailableReason),
    PluginError(PluginError),
    DatabaseError(RepositoryError),
}

type OutError = RequisitionLineForecastPreviewError;

/// Previews the line the editor would save for `item_id` under `forecast_method`. An item
/// already on the order starts from its stored line, so the preview works from the line's
/// statistics snapshot. A new item starts from the line its insert would generate, plugin
/// transform included. A method other than the line's own is applied as a method change
/// would apply it, so saving the draft reproduces the preview.
pub fn get_requisition_line_forecast_preview(
    ctx: &ServiceContext,
    input: RequisitionLineForecastPreviewInput,
) -> Result<RequisitionLineForecastPreview, OutError> {
    let connection = &ctx.connection;
    let requisition = check_requisition_row_exists(connection, &input.requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;
    if requisition.store_id != ctx.store_id {
        return Err(OutError::NotThisStoreRequisition);
    }
    if requisition.r#type != RequisitionType::Request {
        return Err(OutError::NotARequestRequisition);
    }
    if !check_item_exists(connection, ctx.store_id.clone(), &input.item_id)? {
        return Err(OutError::ItemDoesNotExist);
    }
    // Validated as the save validates it — including soft-deleted, so a line already
    // carrying a deleted campaign previews rather than erroring
    if let Some(NullableUpdate {
        value: Some(campaign_id),
    }) = &input.campaign_id
        && !check_campaign_exists_including_deleted(connection, campaign_id)?
    {
        return Err(OutError::CampaignDoesNotExist);
    }

    let order_lines: Vec<RequisitionLineRow> = RequisitionLineRepository::new(connection)
        .query_by_filter(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(requisition.id.to_string())),
        )?
        .into_iter()
        .map(|line| line.requisition_line_row)
        .collect();
    let order = order_demand(&order_lines);

    let mut line = match order_lines
        .into_iter()
        .find(|line| line.item_id == input.item_id)
    {
        Some(line) => line,
        None => {
            let lines = generate_requisition_lines(
                ctx,
                &ctx.store_id,
                &requisition,
                vec![input.item_id.clone()],
                None,
            )?;
            // As the insert does; the plugin data it returns is the insert's to keep
            let (mut lines, _) = PluginInstance::transform_request_requisition_lines(
                Context::InsertRequestRequisitionLine,
                lines,
                &requisition,
            )
            .map_err(OutError::PluginError)?;
            lines.pop().ok_or(OutError::ItemDoesNotExist)?
        }
    };

    // The draft's activity re-scopes the line's stock on hand, and with it the suggestion
    // that is computed against it — exactly as the save does, and BEFORE the method below,
    // which recomputes the suggestion by reading the stock off the line. Same order as the
    // update, so what the editor shows is what saving the draft stores (issue 595).
    if let Some(NullableUpdate { value }) = &input.campaign_id
        && *value != line.campaign_id
    {
        line.campaign_id = value.clone();
        line.available_stock_on_hand =
            activity_stock_on_hand(connection, &ctx.store_id, &input.item_id, value.as_deref())?;
        line.suggested_quantity = suggested_quantity(
            &requisition,
            line.forecast_monthly_consumption,
            line.available_stock_on_hand,
        );
    }

    let inputs = ForecastInputs::load(connection, &ctx.store_id, &[input.item_id.clone()])?;
    if let Some(method) = input.forecast_method {
        // Choosing the line's own method changes nothing, as for a method change
        if method != line.forecast_method {
            if let Some(reason) = inputs.unavailable_reason(&method, &input.item_id, &order) {
                return Err(OutError::ForecastMethodNotAvailable(reason));
            }
            let forecast = inputs.forecast(
                method,
                &input.item_id,
                line.average_monthly_consumption,
                &order,
            );
            apply_forecast(&mut line, forecast, &requisition);
        }
    }

    Ok(RequisitionLineForecastPreview {
        forecast_method_options: inputs.options(&input.item_id, &order),
        max_months_of_stock: requisition.max_months_of_stock,
        line,
    })
}

impl From<RepositoryError> for RequisitionLineForecastPreviewError {
    fn from(error: RepositoryError) -> Self {
        RequisitionLineForecastPreviewError::DatabaseError(error)
    }
}

impl From<PluginOrRepositoryError> for RequisitionLineForecastPreviewError {
    fn from(error: PluginOrRepositoryError) -> Self {
        match error {
            PluginOrRepositoryError::RepositoryError(error) => error.into(),
            PluginOrRepositoryError::PluginError(error) => {
                RequisitionLineForecastPreviewError::PluginError(error)
            }
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        StockLineRow, StockLineRowRepository,
        mock::{
            MockDataInserts, mock_campaign_a, mock_request_draft_requisition_calculation_test,
            mock_store_a,
        },
        test_db::setup_all,
    };

    use super::*;
    use crate::{
        requisition_line::request_requisition_line::UpdateRequestRequisitionLine,
        service_provider::ServiceProvider,
    };

    /// The editor shows a draft activity's figures BEFORE saving it, and saving it must
    /// then store exactly what was shown — one rule, two code paths (issue 595).
    #[actix_rt::test]
    async fn forecast_preview_scopes_stock_to_the_draft_activity() {
        let (_, connection, connection_manager, _) = setup_all(
            "forecast_preview_scopes_stock_to_the_draft_activity",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = &service_provider.requisition_line_service;

        let test_line = mock_request_draft_requisition_calculation_test().lines[0].clone();
        let requisition = mock_request_draft_requisition_calculation_test().requisition;

        // One batch of the item held FOR the campaign, against whatever else the store
        // holds of it — the scoping only means anything while these differ
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

        let preview = |campaign_id| {
            service
                .get_requisition_line_forecast_preview(
                    &ctx,
                    RequisitionLineForecastPreviewInput {
                        requisition_id: requisition.id.clone(),
                        item_id: test_line.item_id.clone(),
                        campaign_id,
                        ..Default::default()
                    },
                )
                .map(|preview| {
                    (
                        preview.line.available_stock_on_hand,
                        preview.line.suggested_quantity,
                    )
                })
        };

        // Asked for nothing, the preview is the line as its snapshot stored it
        let stored = preview(None).unwrap();
        assert_eq!(stored.0, test_line.available_stock_on_hand);
        // Asking for the activity the line ALREADY carries re-reads nothing, so a
        // campaign-less line previewed as campaign-less is still the snapshot
        assert_eq!(
            preview(Some(NullableUpdate { value: None })).unwrap(),
            stored
        );

        // Asked for the campaign, ONLY that campaign's stock counts, and the suggestion
        // is recomputed against it rather than against the snapshot
        let held_for_campaign = preview(Some(NullableUpdate {
            value: Some(mock_campaign_a().id),
        }))
        .unwrap();
        assert_eq!(held_for_campaign.0, campaign_packs);
        assert_ne!(held_for_campaign.1, stored.1);

        // Nothing was saved by previewing it
        assert_eq!(preview(None).unwrap(), stored);

        // And saving the draft stores exactly what the preview showed
        service
            .update_request_requisition_line(
                &ctx,
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    campaign_id: Some(NullableUpdate {
                        value: Some(mock_campaign_a().id),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();
        let saved = RequisitionLineRepository::new(&connection)
            .query_by_filter(
                RequisitionLineFilter::new().id(EqualFilter::equal_to(test_line.id.clone())),
            )
            .unwrap()
            .pop()
            .unwrap()
            .requisition_line_row;
        assert_eq!(
            (saved.available_stock_on_hand, saved.suggested_quantity),
            held_for_campaign
        );

        // Clearing it on the now-campaign line previews the whole store — more of the
        // item than the campaign holds, which is the under-ordering issue 595 is about
        let routine = preview(Some(NullableUpdate { value: None })).unwrap();
        assert!(routine.0 > campaign_packs);

        assert_eq!(
            preview(Some(NullableUpdate {
                value: Some("does_not_exist".to_string()),
            })),
            Err(OutError::CampaignDoesNotExist)
        );
    }
}
