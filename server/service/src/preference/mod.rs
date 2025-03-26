use crate::service_provider::ServiceContext;
use preferences::{
    get_preference_descriptions, get_preferences, PreferenceDescription, Preferences,
};
use repository::{
    EqualFilter, Preference, PreferenceFilter, PreferenceRepository, RepositoryError,
};

pub mod preferences;

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

    fn get_preference_descriptions(&self) -> Vec<Box<dyn PreferenceDescription>> {
        get_preference_descriptions()
    }

    fn get_preferences_by_key(
        &self,
        ctx: &ServiceContext,
        key: &str,
    ) -> Result<Vec<Preference>, RepositoryError> {
        PreferenceRepository::new(&ctx.connection)
            .query_by_filter(PreferenceFilter::new().key(EqualFilter::equal_to(key)))
    }
}

pub struct PreferenceService {}
impl PreferenceServiceTrait for PreferenceService {}
