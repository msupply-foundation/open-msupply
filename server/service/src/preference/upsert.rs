use std::collections::BTreeMap;

use super::{get_preference_provider, Preference, PreferenceProvider, UpsertPreferenceError};
use crate::{preference::WarnWhenMissingRecentStocktakeData, service_provider::ServiceContext};
use repository::{GenderType, StorageConnection, TransactionError};

#[derive(Debug, PartialEq, Clone)]
pub struct StorePrefUpdate<T> {
    pub store_id: String,
    pub value: T,
}

#[derive(Debug, PartialEq, Clone)]
pub struct UpsertPreferences {
    // Global preferences
    pub allow_tracking_of_stock_by_donor: Option<bool>,
    pub authorise_goods_received: Option<bool>,
    pub authorise_purchase_order: Option<bool>,
    pub custom_translations: Option<BTreeMap<String, String>>,
    pub gender_options: Option<Vec<GenderType>>,
    pub prevent_transfers_months_before_initialisation: Option<i32>,
    pub show_contact_tracing: Option<bool>,
    pub sync_records_display_threshold: Option<i32>,
    pub warning_for_excess_request: Option<bool>,
    pub adjust_for_number_of_days_out_of_stock: Option<bool>,
    pub days_in_month: Option<f64>,
    pub expired_stock_prevent_issue: Option<bool>,
    pub expired_stock_issue_threshold: Option<i32>,
    pub show_indicative_price_in_requisitions:Option<bool>,
    pub allow_editing_selling_price_on_customer_invoice_lines: Option<bool>,
    pub item_margin_overrides_supplier_margin: Option<bool>,


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
    pub number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
        Option<Vec<StorePrefUpdate<i32>>>,
    pub number_of_months_threshold_to_show_low_stock_alerts_for_products:
        Option<Vec<StorePrefUpdate<i32>>>,
    pub first_threshold_for_expiring_items: Option<Vec<StorePrefUpdate<i32>>>,
    pub second_threshold_for_expiring_items: Option<Vec<StorePrefUpdate<i32>>>,
    pub warn_when_missing_recent_stocktake: Option<Vec<StorePrefUpdate<WarnWhenMissingRecentStocktakeData>>>,
    pub skip_intermediate_statuses_in_outbound: Option<Vec<StorePrefUpdate<bool>>>,
    pub store_custom_colour: Option<Vec<StorePrefUpdate<String>>>,
}

pub fn upsert_preferences(
    ctx: &ServiceContext,
    UpsertPreferences {
        // Global preferences
        allow_tracking_of_stock_by_donor: allow_tracking_of_stock_by_donor_input,
        authorise_goods_received: authorise_goods_received_input,
        authorise_purchase_order: authorise_purchase_order_input,
        custom_translations: custom_translations_input,
        gender_options: gender_options_input,
        prevent_transfers_months_before_initialisation:
            prevent_transfers_months_before_initialisation_input,
        show_contact_tracing: show_contact_tracing_input,
        sync_records_display_threshold: sync_records_display_threshold_input,
        adjust_for_number_of_days_out_of_stock: adjust_for_number_of_days_out_of_stock_input,
        days_in_month: days_in_month_input,
        expired_stock_prevent_issue: expired_stock_prevent_issue_input,
        expired_stock_issue_threshold: expired_stock_issue_threshold_input,
        show_indicative_price_in_requisitions: show_indicative_price_in_requisitions_input,
        allow_editing_selling_price_on_customer_invoice_lines: allow_editing_selling_price_on_customer_invoice_lines_input,
        item_margin_overrides_supplier_margin: item_margin_overrides_supplier_margin_input,

        // Store preferences
        manage_vaccines_in_doses: manage_vaccines_in_doses_input,
        manage_vvm_status_for_stock: manage_vvm_status_for_stock_input,
        order_in_packs: order_in_packs_input,
        use_procurement_functionality: show_purchase_orders_and_goods_received_input,
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
        number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
            number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products_input,
        number_of_months_threshold_to_show_low_stock_alerts_for_products:
            number_of_months_threshold_to_show_low_stock_alerts_for_products_input,
        first_threshold_for_expiring_items: first_threshold_for_expiring_items_input,
        second_threshold_for_expiring_items: second_threshold_for_expiring_items_input,
        warn_when_missing_recent_stocktake: warn_when_missing_recent_stocktake_input,
        skip_intermediate_statuses_in_outbound: skip_intermediate_statuses_in_outbound_input,
        store_custom_colour: store_custom_colour_input,
    }: UpsertPreferences,
) -> Result<(), UpsertPreferenceError> {
    let PreferenceProvider {
        // Global preferences
        allow_tracking_of_stock_by_donor,
        authorise_goods_received,
        authorise_purchase_order,
        custom_translations,
        gender_options,
        prevent_transfers_months_before_initialisation,
        show_contact_tracing,
        sync_records_display_threshold,
        adjust_for_number_of_days_out_of_stock,
        days_in_month,
        expired_stock_prevent_issue,
        expired_stock_issue_threshold,
        show_indicative_price_in_requisitions,
        allow_editing_selling_price_on_customer_invoice_lines, 
        item_margin_overrides_supplier_margin,

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
        first_threshold_for_expiring_items,
        second_threshold_for_expiring_items,
        warn_when_missing_recent_stocktake,
        skip_intermediate_statuses_in_outbound,
        store_custom_colour,
    }: PreferenceProvider = get_preference_provider();

    ctx.connection
        .transaction_sync(|connection| {
            // Global preferences
            if let Some(input) = allow_tracking_of_stock_by_donor_input {
                allow_tracking_of_stock_by_donor.upsert(connection, input, None)?;
            }

            if let Some(input) = authorise_goods_received_input {
                authorise_goods_received.upsert(connection, input, None)?;
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
           
            if let Some(input) = show_indicative_price_in_requisitions_input {
                show_indicative_price_in_requisitions.upsert(connection, input, None)?;
            }
            
            if let Some(input) = allow_editing_selling_price_on_customer_invoice_lines_input {
                allow_editing_selling_price_on_customer_invoice_lines.upsert(connection, input, None)?;
            }

            if let Some(input) = item_margin_overrides_supplier_margin_input {
                item_margin_overrides_supplier_margin.upsert(connection, input, None)?;
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

            if let Some(inputs) = show_purchase_orders_and_goods_received_input {
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

            if let Some(inputs) = skip_intermediate_statuses_in_outbound_input {
                upsert_store_input(connection, skip_intermediate_statuses_in_outbound, inputs)?;
            }
            
            if let Some(input) = store_custom_colour_input {
                upsert_store_input(connection, store_custom_colour, input)?;
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
