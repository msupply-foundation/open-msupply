use repository::TransactionError;

use crate::service_provider::ServiceContext;

use super::{get_preference_provider, Preference, PreferenceProvider, UpsertPreferenceError};

#[derive(Debug, PartialEq, Clone)]
pub struct StorePrefUpdate<T> {
    pub store_id: String,
    pub value: T,
}

#[derive(Debug, PartialEq, Clone)]
pub struct UpsertPreferences {
    // Global preferences
    pub allow_tracking_of_received_stock_by_donor: Option<bool>,
    pub show_contact_tracing: Option<bool>,
    pub display_population_based_forecasting: Option<bool>,
    // Store preferences
    pub display_vaccines_in_doses: Option<Vec<StorePrefUpdate<bool>>>,
    pub manage_vvm_status_for_stock: Option<Vec<StorePrefUpdate<bool>>>,
    pub sort_by_vvm_status_then_expiry: Option<Vec<StorePrefUpdate<bool>>>,
}

pub fn upsert_preferences(
    ctx: &ServiceContext,
    UpsertPreferences {
        // Global preferences
        allow_tracking_of_received_stock_by_donor: allow_tracking_of_received_stock_by_donor_input,
        display_population_based_forecasting: display_population_based_forecasting_input,
        show_contact_tracing: show_contact_tracing_input,
        // Store preferences
        display_vaccines_in_doses: display_vaccines_in_doses_input,
        manage_vvm_status_for_stock: manage_vvm_status_for_stock_input,
        sort_by_vvm_status_then_expiry: sort_by_vvm_status_then_expiry_input,
    }: UpsertPreferences,
) -> Result<(), UpsertPreferenceError> {
    let PreferenceProvider {
        // Global preferences
        allow_tracking_of_received_stock_by_donor,
        display_population_based_forecasting,
        show_contact_tracing,
        // Store preferences
        display_vaccines_in_doses,
        manage_vvm_status_for_stock,
        sort_by_vvm_status_then_expiry,
    }: PreferenceProvider = get_preference_provider();

    ctx.connection
        .transaction_sync(|connection| {
            // Global preferences
            if let Some(input) = allow_tracking_of_received_stock_by_donor_input {
                allow_tracking_of_received_stock_by_donor.upsert(connection, input, None)?;
            }

            if let Some(input) = display_population_based_forecasting_input {
                display_population_based_forecasting.upsert(connection, input, None)?;
            }

            if let Some(input) = show_contact_tracing_input {
                show_contact_tracing.upsert(connection, input, None)?;
            }

            // Store peferences, input could be array of store IDs and values - iterate and insert...
            if let Some(input) = display_vaccines_in_doses_input {
                for update in input.into_iter() {
                    display_vaccines_in_doses.upsert(
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

            if let Some(input) = sort_by_vvm_status_then_expiry_input {
                for update in input.into_iter() {
                    sort_by_vvm_status_then_expiry.upsert(
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
