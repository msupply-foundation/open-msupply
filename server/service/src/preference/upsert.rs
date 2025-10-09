use std::collections::BTreeMap;

use super::{get_preference_provider, Preference, PreferenceProvider, UpsertPreferenceError};
use crate::service_provider::ServiceContext;
use repository::{GenderType, TransactionError};

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
    pub use_days_in_month: Option<bool>,
    pub adjust_for_number_of_days_out_of_stock: Option<bool>,
    pub days_in_month: Option<i32>,
    pub exclude_transfers: Option<bool>,

    // Store preferences
    pub manage_vaccines_in_doses: Option<Vec<StorePrefUpdate<bool>>>,
    pub manage_vvm_status_for_stock: Option<Vec<StorePrefUpdate<bool>>>,
    pub order_in_packs: Option<Vec<StorePrefUpdate<bool>>>,
    pub use_procurement_functionality: Option<Vec<StorePrefUpdate<bool>>>,
    pub sort_by_vvm_status_then_expiry: Option<Vec<StorePrefUpdate<bool>>>,
    pub use_simplified_mobile_ui: Option<Vec<StorePrefUpdate<bool>>>,
    pub disable_manual_returns: Option<Vec<StorePrefUpdate<bool>>>,
    pub can_create_internal_order_from_a_requisition: Option<Vec<StorePrefUpdate<bool>>>,
    pub select_destination_store_for_an_internal_order: Option<Vec<StorePrefUpdate<bool>>>,
    pub number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
        Option<Vec<StorePrefUpdate<i32>>>,
    pub number_of_months_threshold_to_show_low_stock_alerts_for_products:
        Option<Vec<StorePrefUpdate<i32>>>,
    pub first_threshold_for_expiring_items: Option<Vec<StorePrefUpdate<i32>>>,
    pub second_threshold_for_expiring_items: Option<Vec<StorePrefUpdate<i32>>>,
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
        use_days_in_month: use_days_in_month_input,
        adjust_for_number_of_days_out_of_stock: adjust_for_number_of_days_out_of_stock_input,
        days_in_month: days_in_month_input,
        exclude_transfers: exclude_transfers_input,

        // Store preferences
        manage_vaccines_in_doses: manage_vaccines_in_doses_input,
        manage_vvm_status_for_stock: manage_vvm_status_for_stock_input,
        order_in_packs: order_in_packs_input,
        use_procurement_functionality: show_purchase_orders_and_goods_received_input,
        sort_by_vvm_status_then_expiry: sort_by_vvm_status_then_expiry_input,
        use_simplified_mobile_ui: use_simplified_mobile_ui_input,
        disable_manual_returns: disable_manual_returns_input,
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
        use_days_in_month,
        adjust_for_number_of_days_out_of_stock,
        days_in_month,
        exclude_transfers,

        // Store preferences
        manage_vaccines_in_doses,
        manage_vvm_status_for_stock,
        order_in_packs,
        use_procurement_functionality,
        sort_by_vvm_status_then_expiry,
        use_simplified_mobile_ui,
        disable_manual_returns,
        can_create_internal_order_from_a_requisition,
        select_destination_store_for_an_internal_order,
        number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products,
        number_of_months_threshold_to_show_low_stock_alerts_for_products,
        first_threshold_for_expiring_items,
        second_threshold_for_expiring_items,
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

            if let Some(input) = use_days_in_month_input {
                use_days_in_month.upsert(connection, input, None)?;
            }

            if let Some(input) = adjust_for_number_of_days_out_of_stock_input {
                adjust_for_number_of_days_out_of_stock.upsert(connection, input, None)?;
            }

            if let Some(input) = days_in_month_input {
                days_in_month.upsert(connection, input, None)?;
            }

            if let Some(input) = exclude_transfers_input {
                exclude_transfers.upsert(connection, input, None)?;
            }

            // Store preferences, input could be array of store IDs and values - iterate and insert...
            if let Some(input) = manage_vaccines_in_doses_input {
                for update in input.into_iter() {
                    manage_vaccines_in_doses.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = manage_vvm_status_for_stock_input {
                for update in input.into_iter() {
                    manage_vvm_status_for_stock.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = order_in_packs_input {
                for update in input.into_iter() {
                    order_in_packs.upsert(connection, update.value, Some(update.store_id))?;
                }
            }

            if let Some(input) = show_purchase_orders_and_goods_received_input {
                for update in input.into_iter() {
                    use_procurement_functionality.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = sort_by_vvm_status_then_expiry_input {
                for update in input.into_iter() {
                    sort_by_vvm_status_then_expiry.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = use_simplified_mobile_ui_input {
                for update in input.into_iter() {
                    use_simplified_mobile_ui.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = disable_manual_returns_input {
                for update in input.into_iter() {
                    disable_manual_returns.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = can_create_internal_order_from_a_requisition_input {
                for update in input.into_iter() {
                    can_create_internal_order_from_a_requisition.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = select_destination_store_for_an_internal_order_input {
                for update in input.into_iter() {
                    select_destination_store_for_an_internal_order.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products_input {
                for update in input.into_iter() {
                    number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = number_of_months_threshold_to_show_low_stock_alerts_for_products_input {
                for update in input.into_iter() {
                    number_of_months_threshold_to_show_low_stock_alerts_for_products.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = first_threshold_for_expiring_items_input {
                for update in input.into_iter() {
                    first_threshold_for_expiring_items.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = second_threshold_for_expiring_items_input {
                for update in input.into_iter() {
                    second_threshold_for_expiring_items.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            Ok(())
        })
        .map_err(|error: TransactionError<UpsertPreferenceError>| error.to_inner_error())?;

    Ok(())
}
