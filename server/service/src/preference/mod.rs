use crate::service_provider::ServiceContext;
use preferences::PreferenceRegistry;
use repository::{PreferenceRow, RepositoryError};

pub mod types;
pub use types::*;
mod load_preference;

pub mod preferences;
pub mod query;
pub mod upsert;

pub use query::*;
pub use upsert::*;

pub trait PreferenceServiceTrait: Sync + Send {
    fn get_preference_registry(&self) -> PreferenceRegistry {
        get_preference_registry()
    }

    fn get_preference_descriptions(&self) -> Vec<Box<dyn Preference<Value = bool>>> {
        get_preference_descriptions()
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
