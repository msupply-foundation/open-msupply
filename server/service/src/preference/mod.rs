use crate::service_provider::ServiceContext;

pub mod types;
use repository::StorageConnection;
pub use types::*;
mod query_preference;

pub mod preferences;
pub use preferences::*;
pub mod upsert;
pub mod upsert_helpers;

pub use upsert::*;

pub trait PreferenceServiceTrait: Sync + Send {
    fn get_preference_provider(&self) -> PreferenceProvider {
        get_preference_provider()
    }

    fn get_preference_descriptions(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
        pref_type: PreferenceType,
    ) -> Result<Vec<PreferenceDescription>, PreferenceError> {
        let PreferenceProvider {
            show_contact_tracing,
            allow_tracking_of_received_stock_by_donor,
        } = self.get_preference_provider();

        let all_prefs_descriptions = vec![
            // Add each pref here
            show_contact_tracing.as_description(connection, store_id.clone())?,
            allow_tracking_of_received_stock_by_donor.as_description(connection, store_id)?,
        ];

        Ok(all_prefs_descriptions
            .into_iter()
            .filter(|pref| pref.preference_type == pref_type)
            .collect())
    }

    fn upsert(
        &self,
        ctx: &ServiceContext,
        input: UpsertPreferences,
    ) -> Result<(), UpsertPreferenceError> {
        upsert_preferences(ctx, input)
    }
}

pub struct PreferenceService {}
impl PreferenceServiceTrait for PreferenceService {}
