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
        connection: StorageConnection,
        store_id: Option<String>,
        pref_type: PreferenceType,
    ) -> Result<Vec<PreferenceDescription>, PreferenceError> {
        let PreferenceProvider {
            show_contact_tracing,
            display_vaccine_in_doses,
        } = self.get_preference_provider();

        let input = AppendIfTypeInputs {
            pref_type,
            connection,
            store_id: store_id.clone(),
        };

        let mut descriptions: Vec<PreferenceDescription> = Vec::new();

        // Add each pref here
        append_if_type(show_contact_tracing, &mut descriptions, &input)?;
        append_if_type(display_vaccine_in_doses, &mut descriptions, &input)?;

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

struct AppendIfTypeInputs {
    pref_type: PreferenceType,
    connection: StorageConnection,
    store_id: Option<String>,
}

fn append_if_type(
    pref: impl Preference,
    pref_descriptions: &mut Vec<PreferenceDescription>,
    AppendIfTypeInputs {
        pref_type,
        connection,
        store_id,
    }: &AppendIfTypeInputs,
) -> Result<(), PreferenceError> {
    if &pref.preference_type() == pref_type {
        pref_descriptions.push(pref.as_description(connection, store_id.clone())?);
    }
    Ok(())
}
