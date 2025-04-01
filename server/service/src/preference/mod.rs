use crate::service_provider::ServiceContext;
use preferences::{get_preferences, Preferences};
use repository::RepositoryError;

pub mod preferences;

pub trait PreferenceServiceTrait: Sync + Send {
    fn get_preferences(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<Preferences, RepositoryError> {
        get_preferences(ctx, store_id)
    }
}

pub struct PreferenceService {}
impl PreferenceServiceTrait for PreferenceService {}
