use repository::TransactionError;

use crate::service_provider::ServiceContext;

use super::{get_preference_provider, Preference, PreferenceProvider, UpsertPreferenceError};

#[derive(Debug, PartialEq, Clone)]
pub struct UpsertPreferences {
    pub show_contact_tracing: Option<bool>,
    pub display_population_based_forecasting: Option<bool>,
    pub allow_tracking_of_received_stock_by_donor: Option<bool>,
}

pub fn upsert_preferences(
    ctx: &ServiceContext,
    UpsertPreferences {
        show_contact_tracing: show_contact_tracing_input,
        display_population_based_forecasting: display_population_based_forecasting_input,
        allow_tracking_of_received_stock_by_donor: allow_tracking_of_received_stock_by_donor_input,
    }: UpsertPreferences,
) -> Result<(), UpsertPreferenceError> {
    let PreferenceProvider {
        show_contact_tracing,
        display_population_based_forecasting,
        allow_tracking_of_received_stock_by_donor,
    } = get_preference_provider();

    ctx.connection
        .transaction_sync(|connection| {
            // Call upsert for each preference, if input is Some

            if let Some(input) = show_contact_tracing_input {
                show_contact_tracing.upsert(connection, input, None)?;
            }

            if let Some(input) = display_population_based_forecasting_input {
                display_population_based_forecasting.upsert(connection, input, None)?;
            }

            if let Some(input) = allow_tracking_of_received_stock_by_donor_input {
                allow_tracking_of_received_stock_by_donor.upsert(connection, input, None)?;
            }

            // For a store pref, input could be array of store IDs and values - iterate and insert...

            Ok(())
        })
        .map_err(|error: TransactionError<UpsertPreferenceError>| error.to_inner_error())?;

    Ok(())
}
