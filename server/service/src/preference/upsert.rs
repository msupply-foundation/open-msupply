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
    pub show_contact_tracing: Option<bool>,
    pub display_population_based_forecasting: Option<bool>,
    pub display_vaccine_in_doses: Option<Vec<StorePrefUpdate<bool>>>,
    pub manage_vvm_status: Option<Vec<StorePrefUpdate<bool>>>,
    pub sort_by_vvm_status: Option<Vec<StorePrefUpdate<bool>>>,
}

pub fn upsert_preferences(
    ctx: &ServiceContext,
    UpsertPreferences {
        show_contact_tracing: show_contact_tracing_input,
        display_population_based_forecasting: display_population_based_forecasting_input,
        display_vaccine_in_doses: display_vaccine_in_doses_input,
        manage_vvm_status: manage_vvm_status_input,
        sort_by_vvm_status: sort_by_vvm_status_input,
    }: UpsertPreferences,
) -> Result<(), UpsertPreferenceError> {
    let PreferenceProvider {
        show_contact_tracing,
        display_population_based_forecasting,
        display_vaccine_in_doses,
        manage_vvm_status,
        sort_by_vvm_status,
    }: PreferenceProvider = get_preference_provider();

    ctx.connection
        .transaction_sync(|connection| {
            // Call upsert for each preference, if input is Some

            if let Some(input) = show_contact_tracing_input {
                show_contact_tracing.upsert(connection, input, None)?;
            }

            if let Some(input) = display_population_based_forecasting_input {
                display_population_based_forecasting.upsert(connection, input, None)?;
            }

            // For a store pref, input could be array of store IDs and values - iterate and insert...
            if let Some(input) = display_vaccine_in_doses_input {
                for update in input.into_iter() {
                    display_vaccine_in_doses.upsert(
                        connection,
                        update.value,
                        Some(update.store_id),
                    )?;
                }
            }

            if let Some(input) = manage_vvm_status_input {
                for update in input.into_iter() {
                    manage_vvm_status.upsert(connection, update.value, Some(update.store_id))?;
                }
            }

            if let Some(input) = sort_by_vvm_status_input {
                for update in input.into_iter() {
                    sort_by_vvm_status.upsert(connection, update.value, Some(update.store_id))?;
                }
            }

            Ok(())
        })
        .map_err(|error: TransactionError<UpsertPreferenceError>| error.to_inner_error())?;

    Ok(())
}
