use crate::service_provider::ServiceContext;
use repository::{PreferenceRow, RepositoryError};

pub mod types;
pub use types::*;
mod load_preference;

pub mod preferences;
pub use preferences::*;
pub mod upsert;

pub use upsert::*;

pub trait PreferenceServiceTrait: Sync + Send {
    fn get_preference_registry(&self) -> PreferenceRegistry {
        PreferenceRegistry {
            show_contact_tracing: ShowContactTracing,
        }
    }

    // TODO: implement filtering by pref type
    fn get_preference_descriptions(&self) -> Vec<PreferenceDescription> {
        let PreferenceRegistry {
            show_contact_tracing,
        } = &self.get_preference_registry();

        // TODO: filter by type
        let all_prefs_descriptions = vec![
            // Add for each pref
            PreferenceDescription::from_preference(show_contact_tracing),
        ];

        all_prefs_descriptions
    }

    fn upsert(
        &self,
        ctx: &ServiceContext,
        input: UpsertPreference,
    ) -> Result<PreferenceRow, RepositoryError> {
        upsert_preference(ctx, input)
    }
}

pub struct PreferenceService {}
impl PreferenceServiceTrait for PreferenceService {}
