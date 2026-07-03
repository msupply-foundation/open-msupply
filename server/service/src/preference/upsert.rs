use std::collections::BTreeMap;

use super::{get_preference_provider, Preference, PreferenceProvider, UpsertPreferenceError};
use crate::{
    preference::{BackdatingData, CustomTranslationsV2Value, WarnWhenMissingRecentStocktakeData},
    service_provider::ServiceContext,
};
use repository::{GenderType, InvoiceStatus, StorageConnection, TransactionError};

#[derive(Debug, PartialEq, Clone)]
pub struct StorePrefUpdate<T> {
    pub store_id: String,
    pub value: T,
}

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpsertPreferences {
    // Global preferences
    pub allow_tracking_of_stock_by_donor: Option<bool>,
    pub authorise_purchase_order: Option<bool>,
    /// Legacy v1 custom translations (flat, applied to all languages). Edited
    /// directly via the "legacy" namespace in the v2 editor; not auto-derived.
    pub custom_translations: Option<BTreeMap<String, String>>,
    pub custom_translations_v2: Option<CustomTranslationsV2Value>,
    pub gender_options: Option<Vec<GenderType>>,
    pub prevent_transfers_months_before_initialisation: Option<i32>,
    pub show_contact_tracing: Option<bool>,
    pub sync_records_display_threshold: Option<i32>,
    pub warning_for_excess_request: Option<bool>,
    pub adjust_for_number_of_days_out_of_stock: Option<bool>,
    pub days_in_month: Option<f64>,
    pub expired_stock_prevent_issue: Option<bool>,
    pub expired_stock_issue_threshold: Option<i32>,
    pub item_margin_overrides_supplier_margin: Option<bool>,
    pub is_gaps: Option<bool>,
    pub display_population_based_forecasting: Option<bool>,
    pub global_table_configs: Option<serde_json::Value>,
    pub backdating: Option<BackdatingData>,

    // Store preferences
    pub manage_vaccines_in_doses: Option<Vec<StorePrefUpdate<bool>>>,
    pub manage_vvm_status_for_stock: Option<Vec<StorePrefUpdate<bool>>>,
    pub order_in_packs: Option<Vec<StorePrefUpdate<bool>>>,
    pub use_procurement_functionality: Option<Vec<StorePrefUpdate<bool>>>,
    pub sort_by_vvm_status_then_expiry: Option<Vec<StorePrefUpdate<bool>>>,
    pub use_simplified_mobile_ui: Option<Vec<StorePrefUpdate<bool>>>,
    pub disable_manual_returns: Option<Vec<StorePrefUpdate<bool>>>,
    pub requisition_auto_finalise: Option<Vec<StorePrefUpdate<bool>>>,
    pub inbound_shipment_auto_verify: Option<Vec<StorePrefUpdate<bool>>>,
    pub can_create_internal_order_from_a_requisition: Option<Vec<StorePrefUpdate<bool>>>,
    pub select_destination_store_for_an_internal_order: Option<Vec<StorePrefUpdate<bool>>>,
    pub external_inbound_shipment_lines_must_be_authorised: Option<Vec<StorePrefUpdate<bool>>>,
    pub require_reason_when_receiving_expired_stock: Option<Vec<StorePrefUpdate<bool>>>,
    pub number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
        Option<Vec<StorePrefUpdate<i32>>>,
    pub number_of_months_threshold_to_show_low_stock_alerts_for_products:
        Option<Vec<StorePrefUpdate<f64>>>,
    pub number_of_months_threshold_to_show_over_stock_alerts_for_products:
        Option<Vec<StorePrefUpdate<f64>>>,
    pub first_threshold_for_expiring_items: Option<Vec<StorePrefUpdate<i32>>>,
    pub second_threshold_for_expiring_items: Option<Vec<StorePrefUpdate<i32>>>,
    pub warn_when_missing_recent_stocktake:
        Option<Vec<StorePrefUpdate<WarnWhenMissingRecentStocktakeData>>>,
    pub store_custom_colour: Option<Vec<StorePrefUpdate<String>>>,
    pub invoice_status_options: Option<Vec<StorePrefUpdate<Vec<InvoiceStatus>>>>,
    pub show_indicative_price_in_requisitions: Option<Vec<StorePrefUpdate<bool>>>,
}

pub fn upsert_preferences(
    ctx: &ServiceContext,
    UpsertPreferences {
        // Global preferences
        allow_tracking_of_stock_by_donor: allow_tracking_of_stock_by_donor_input,
        authorise_purchase_order: authorise_purchase_order_input,
        custom_translations: custom_translations_input,
        custom_translations_v2: custom_translations_v2_input,
        gender_options: gender_options_input,
        prevent_transfers_months_before_initialisation:
            prevent_transfers_months_before_initialisation_input,
        show_contact_tracing: show_contact_tracing_input,
        sync_records_display_threshold: sync_records_display_threshold_input,
        adjust_for_number_of_days_out_of_stock: adjust_for_number_of_days_out_of_stock_input,
        days_in_month: days_in_month_input,
        expired_stock_prevent_issue: expired_stock_prevent_issue_input,
        expired_stock_issue_threshold: expired_stock_issue_threshold_input,
        item_margin_overrides_supplier_margin: item_margin_overrides_supplier_margin_input,
        is_gaps: is_gaps_input,
        display_population_based_forecasting: display_population_based_forecasting_input,
        global_table_configs: global_table_configs_input,
        backdating: backdating_input,

        // Store preferences
        manage_vaccines_in_doses: manage_vaccines_in_doses_input,
        manage_vvm_status_for_stock: manage_vvm_status_for_stock_input,
        order_in_packs: order_in_packs_input,
        use_procurement_functionality: show_purchase_orders_input,
        sort_by_vvm_status_then_expiry: sort_by_vvm_status_then_expiry_input,
        use_simplified_mobile_ui: use_simplified_mobile_ui_input,
        disable_manual_returns: disable_manual_returns_input,
        requisition_auto_finalise: requisition_auto_finalise_input,
        inbound_shipment_auto_verify: inbound_shipment_auto_verify_input,
        warning_for_excess_request: warning_for_excess_request_input,
        can_create_internal_order_from_a_requisition:
            can_create_internal_order_from_a_requisition_input,
        select_destination_store_for_an_internal_order:
            select_destination_store_for_an_internal_order_input,
        external_inbound_shipment_lines_must_be_authorised: external_inbound_shipment_lines_must_be_authorised_input,
        require_reason_when_receiving_expired_stock: require_reason_when_receiving_expired_stock_input,
        number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
            number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products_input,
        number_of_months_threshold_to_show_low_stock_alerts_for_products:
            number_of_months_threshold_to_show_low_stock_alerts_for_products_input,
        number_of_months_threshold_to_show_over_stock_alerts_for_products:
            number_of_months_threshold_to_show_over_stock_alerts_for_products_input,
        first_threshold_for_expiring_items: first_threshold_for_expiring_items_input,
        second_threshold_for_expiring_items: second_threshold_for_expiring_items_input,
        warn_when_missing_recent_stocktake: warn_when_missing_recent_stocktake_input,
        store_custom_colour: store_custom_colour_input,
        invoice_status_options: invoice_status_options_input,
        show_indicative_price_in_requisitions: show_indicative_price_in_requisitions_input,
    }: UpsertPreferences,
) -> Result<(), UpsertPreferenceError> {
    let PreferenceProvider {
        // Global preferences
        allow_tracking_of_stock_by_donor,
        authorise_purchase_order,
        custom_translations,
        custom_translations_v2,
        gender_options,
        prevent_transfers_months_before_initialisation,
        show_contact_tracing,
        sync_records_display_threshold,
        adjust_for_number_of_days_out_of_stock,
        days_in_month,
        expired_stock_prevent_issue,
        expired_stock_issue_threshold,
        item_margin_overrides_supplier_margin,
        is_gaps,
        display_population_based_forecasting,
        global_table_configs,
        backdating,

        // Store preferences
        manage_vaccines_in_doses,
        manage_vvm_status_for_stock,
        order_in_packs,
        use_procurement_functionality,
        sort_by_vvm_status_then_expiry,
        use_simplified_mobile_ui,
        disable_manual_returns,
        requisition_auto_finalise,
        inbound_shipment_auto_verify,
        warning_for_excess_request,
        can_create_internal_order_from_a_requisition,
        select_destination_store_for_an_internal_order,
        number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products,
        number_of_months_threshold_to_show_low_stock_alerts_for_products,
        number_of_months_threshold_to_show_over_stock_alerts_for_products,
        first_threshold_for_expiring_items,
        second_threshold_for_expiring_items,
        warn_when_missing_recent_stocktake,
        store_custom_colour,
        invoice_status_options,
        external_inbound_shipment_lines_must_be_authorised,
        require_reason_when_receiving_expired_stock,
        show_indicative_price_in_requisitions,
    }: PreferenceProvider = get_preference_provider();

    ctx.connection
        .transaction_sync(|connection| {
            // Global preferences
            if let Some(input) = allow_tracking_of_stock_by_donor_input {
                allow_tracking_of_stock_by_donor.upsert(connection, input, None)?;
            }

            if let Some(input) = authorise_purchase_order_input {
                authorise_purchase_order.upsert(connection, input, None)?;
            }

            if let Some(input) = gender_options_input {
                gender_options.upsert(connection, input, None)?;
            }

            if let Some(input) = custom_translations_input {
                custom_translations.upsert(connection, input, None)?;
            }

            if let Some(input) = custom_translations_v2_input {
                // v2 is saved independently of v1. The legacy v1 map is only
                // changed via the direct `custom_translations` input above
                // (the "legacy" namespace in the editor).
                custom_translations_v2.upsert(connection, input, None)?;
            }

            if let Some(input) = prevent_transfers_months_before_initialisation_input {
                prevent_transfers_months_before_initialisation.upsert(connection, input, None)?;
            }

            if let Some(input) = show_contact_tracing_input {
                show_contact_tracing.upsert(connection, input, None)?;
            }

            if let Some(input) = sync_records_display_threshold_input {
                sync_records_display_threshold.upsert(connection, input, None)?;
            }

            if let Some(input) = warning_for_excess_request_input {
                warning_for_excess_request.upsert(connection, input, None)?;
            }

            if let Some(input) = adjust_for_number_of_days_out_of_stock_input {
                adjust_for_number_of_days_out_of_stock.upsert(connection, input, None)?;
            }

            if let Some(input) = days_in_month_input {
                days_in_month.upsert(connection, input, None)?;
            }
            if let Some(input) = expired_stock_prevent_issue_input {
                expired_stock_prevent_issue.upsert(connection, input, None)?;
            }
            
            if let Some(input) = expired_stock_issue_threshold_input {
                expired_stock_issue_threshold.upsert(connection, input, None)?;
            }

            if let Some(input) = is_gaps_input { 
                is_gaps.upsert(connection, input, None)?;
            }
            
            if let Some(input) = item_margin_overrides_supplier_margin_input {
                item_margin_overrides_supplier_margin.upsert(connection, input, None)?;
            }

            if let Some(input) = display_population_based_forecasting_input {
                display_population_based_forecasting.upsert(connection, input, None)?;
            }
            
            if let Some(input) = global_table_configs_input {
                global_table_configs.upsert(connection, input, None)?;
            }

            if let Some(input) = backdating_input {
                backdating.upsert(connection, input, None)?;
            }

            // Store preferences, input could be array of store IDs and values - iterate and insert...
            if let Some(inputs) = manage_vaccines_in_doses_input {
                upsert_store_input(connection, manage_vaccines_in_doses, inputs)?;
            }

            if let Some(inputs) = manage_vvm_status_for_stock_input {
                upsert_store_input(connection, manage_vvm_status_for_stock, inputs)?;
            }

            if let Some(inputs) = order_in_packs_input {
                upsert_store_input(connection, order_in_packs, inputs)?;
            }

            if let Some(inputs) = show_purchase_orders_input {
                upsert_store_input(connection, use_procurement_functionality, inputs)?;
            }

            if let Some(inputs) = sort_by_vvm_status_then_expiry_input {
                upsert_store_input(connection, sort_by_vvm_status_then_expiry, inputs)?;
            }

            if let Some(inputs) = use_simplified_mobile_ui_input {
                upsert_store_input(connection, use_simplified_mobile_ui, inputs)?;
            }
            if let Some(inputs) = disable_manual_returns_input {
                upsert_store_input(connection, disable_manual_returns, inputs)?;
            }

            if let Some(inputs) = requisition_auto_finalise_input {
                upsert_store_input(connection, requisition_auto_finalise, inputs)?;
            }
      
            if let Some(inputs) = inbound_shipment_auto_verify_input {
                upsert_store_input(connection, inbound_shipment_auto_verify, inputs)?;
            }

            if let Some(inputs) = can_create_internal_order_from_a_requisition_input {
                upsert_store_input(
                    connection,
                    can_create_internal_order_from_a_requisition,
                    inputs,
                )?;

            }

            if let Some(inputs) = select_destination_store_for_an_internal_order_input {
                upsert_store_input(
                    connection,
                    select_destination_store_for_an_internal_order,
                    inputs,
                )?;
            }

            if let Some(input) = external_inbound_shipment_lines_must_be_authorised_input {
                upsert_store_input(connection, external_inbound_shipment_lines_must_be_authorised, input)?;
            }

            if let Some(input) = require_reason_when_receiving_expired_stock_input {
                upsert_store_input(connection, require_reason_when_receiving_expired_stock, input)?;
            }

            if let Some(input) = number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products_input {
                upsert_store_input(
                    connection,
                    number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products,
                    input,
                )?;
            }

             if let Some(input) = number_of_months_threshold_to_show_low_stock_alerts_for_products_input {
                upsert_store_input(
                    connection,
                    number_of_months_threshold_to_show_low_stock_alerts_for_products,
                    input,
                )?;
            }

            if let Some(input) = number_of_months_threshold_to_show_over_stock_alerts_for_products_input {
                upsert_store_input(
                    connection,
                    number_of_months_threshold_to_show_over_stock_alerts_for_products,
                    input,
                )?;
            }
            
            if let Some(input) = first_threshold_for_expiring_items_input {
                upsert_store_input(
                    connection,
                    first_threshold_for_expiring_items,
                    input,
                )?;
            }

            if let Some(input) = second_threshold_for_expiring_items_input {
                upsert_store_input(
                    connection,
                    second_threshold_for_expiring_items,
                    input,
                )?;
            }

            if let Some(input) = warn_when_missing_recent_stocktake_input {
                upsert_store_input(
                    connection,
                    warn_when_missing_recent_stocktake,
                    input,
                )?;
            }

            if let Some(input) = store_custom_colour_input {
                upsert_store_input(connection, store_custom_colour, input)?;
            }

            if let Some(input) = invoice_status_options_input {
                upsert_store_input(connection, invoice_status_options, input)?;
            }

            if let Some(input) = show_indicative_price_in_requisitions_input {
                upsert_store_input(connection, show_indicative_price_in_requisitions, input)?;
            }

            Ok(())
        })
        .map_err(|error: TransactionError<UpsertPreferenceError>| error.to_inner_error())?;

    Ok(())
}

fn upsert_store_input<P: Preference>(
    connection: &StorageConnection,
    preference: P,
    input: Vec<StorePrefUpdate<P::Value>>,
) -> Result<(), UpsertPreferenceError> {
    for update in input.into_iter() {
        preference.upsert(connection, update.value, Some(update.store_id))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::preference::{CustomTranslations, CustomTranslationsV2};
    use crate::service_provider::ServiceProvider;
    use crate::sync::test_util_set_is_central_server;
    use repository::mock::MockDataInserts;
    use repository::test_db::setup_all;

    #[actix_rt::test]
    async fn upsert_v2_does_not_touch_v1() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_v2_does_not_touch_v1", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        test_util_set_is_central_server(true);

        // Seed an existing v1 (legacy) map.
        let v1 =
            BTreeMap::from([("button.close".to_string(), "Legacy Close".to_string())]);
        CustomTranslations
            .upsert(&ctx.connection, v1.clone(), None)
            .unwrap();

        // Saving v2 must NOT modify v1 (no auto-derivation).
        let v2: CustomTranslationsV2Value = serde_json::from_value(serde_json::json!({
            "fr": { "common": { "button.close": "Fermer (custom)" } }
        }))
        .unwrap();
        upsert_preferences(
            &ctx,
            UpsertPreferences {
                custom_translations_v2: Some(v2.clone()),
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(CustomTranslationsV2.load(&ctx.connection, None).unwrap(), v2);
        // v1 is untouched
        assert_eq!(CustomTranslations.load(&ctx.connection, None).unwrap(), v1);

        // The legacy v1 map is edited directly via the custom_translations input.
        let new_v1 =
            BTreeMap::from([("button.save".to_string(), "Legacy Save".to_string())]);
        upsert_preferences(
            &ctx,
            UpsertPreferences {
                custom_translations: Some(new_v1.clone()),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(
            CustomTranslations.load(&ctx.connection, None).unwrap(),
            new_v1
        );

        // ...and can be cleared by sending an empty map.
        upsert_preferences(
            &ctx,
            UpsertPreferences {
                custom_translations: Some(BTreeMap::new()),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(CustomTranslations
            .load(&ctx.connection, None)
            .unwrap()
            .is_empty());
    }
}
