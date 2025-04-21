use crate::service_provider::ServiceContext;
use preferences::{get_preference_descriptions, get_preferences, Preference, Preferences};
use repository::{PreferenceRow, RepositoryError};

pub mod types;
pub use types::*;
mod load_preference;
use load_preference::*;

pub mod preferences;
pub mod query;
pub mod upsert;

pub use query::*;
pub use upsert::*;

pub trait PreferenceServiceTrait: Sync + Send {
    // Maybe should be called get_store_preferences, but wanting to maintain
    // distinction from existing store preferences at this stage
    fn get_preferences(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<Preferences, RepositoryError> {
        get_preferences(ctx, store_id)
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
