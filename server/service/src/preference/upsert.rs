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

    // Store preferences
    pub manage_vaccines_in_doses: Option<Vec<StorePrefUpdate<bool>>>,
    pub manage_vvm_status_for_stock: Option<Vec<StorePrefUpdate<bool>>>,
    pub order_in_packs: Option<Vec<StorePrefUpdate<bool>>>,
    pub show_purchase_order_and_goods_received: Option<Vec<StorePrefUpdate<bool>>>,
    pub sort_by_vvm_status_then_expiry: Option<Vec<StorePrefUpdate<bool>>>,
    pub use_simplified_mobile_ui: Option<Vec<StorePrefUpdate<bool>>>,
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

        // Store preferences
        manage_vaccines_in_doses: manage_vaccines_in_doses_input,
        manage_vvm_status_for_stock: manage_vvm_status_for_stock_input,
        order_in_packs: order_in_packs_input,
        show_purchase_order_and_goods_received: show_purchase_order_and_goods_received_input,
        sort_by_vvm_status_then_expiry: sort_by_vvm_status_then_expiry_input,
        use_simplified_mobile_ui: use_simplified_mobile_ui_input,
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

        // Store preferences
        manage_vaccines_in_doses,
        manage_vvm_status_for_stock,
        order_in_packs,
        show_purchase_order_and_goods_received,
        sort_by_vvm_status_then_expiry,
        use_simplified_mobile_ui,
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

            if let Some(input) = show_purchase_order_and_goods_received_input {
                for update in input.into_iter() {
                    show_purchase_order_and_goods_received.upsert(
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

            Ok(())
        })
        .map_err(|error: TransactionError<UpsertPreferenceError>| error.to_inner_error())?;

    Ok(())
}
