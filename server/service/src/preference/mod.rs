use crate::service_provider::ServiceContext;

pub mod types;
pub use types::*;
mod query_preference;

pub mod preferences;
pub use preferences::*;
pub mod upsert;
pub mod upsert_helpers;

pub use upsert::*;

pub trait PreferenceServiceTrait: Sync + Send {
    fn get_preference_registry(&self) -> PreferenceRegistry {
        get_preference_registry()
    }

    fn get_preference_descriptions(&self, pref_type: PreferenceType) -> Vec<PreferenceDescription> {
        let PreferenceRegistry {
            show_contact_tracing,
            display_population_based_forecasting,
        } = &self.get_preference_registry();

        let all_prefs_descriptions = vec![
            // Add each pref here
            PreferenceDescription::from_preference(show_contact_tracing),
            PreferenceDescription::from_preference(display_population_based_forecasting),
        ];

        all_prefs_descriptions
            .into_iter()
            .filter(|pref| pref.preference_type == pref_type)
            .collect()
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
