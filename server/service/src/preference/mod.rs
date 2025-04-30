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
        } = self.get_preference_provider();

        let descriptions = preference_descriptions(
            connection,
            store_id,
            pref_type,
            vec![
                // Add each pref here
                show_contact_tracing,
            ],
        )?;

        Ok(descriptions)
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

fn preference_descriptions(
    connection: &StorageConnection,
    store_id: Option<String>,
    pref_type: PreferenceType,
    prefs: Vec<impl Preference>,
) -> Result<Vec<PreferenceDescription>, PreferenceError> {
    prefs
        .into_iter()
        .filter(|pref| pref.preference_type() == pref_type)
        .map(|pref| {
            let value = pref.load(connection, store_id.clone())?;

            let value = serde_json::to_value(value).map_err(|e| {
                PreferenceError::ConversionError(pref.key_str().to_string(), e.to_string())
            })?;

            Ok(PreferenceDescription {
                key: pref.key(),
                value_type: pref.value_type(),
                value,
            })
        })
        .collect()
}
