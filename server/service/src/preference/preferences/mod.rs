use repository::RepositoryError;

pub mod types;
pub use types::*;
pub mod load_preference;
pub use load_preference::*;

mod show_contact_tracing;
use show_contact_tracing::*;

use crate::service_provider::ServiceContext;

pub struct Preferences {
    pub show_contact_tracing: bool,
}

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let prefs = Preferences {
        show_contact_tracing: ShowContactTracing.load(connection, store_id)?,
    };

    Ok(prefs)
}

// TODO: Value = bool obviously won't work when we have non-bool preferences
// Genericising involves boxing Value as Any, i.e. type loss, but I think we will move away
// from this method in cooldown anyway, so just leaving like this for now
pub fn get_preference_descriptions() -> Vec<Box<dyn Preference<Value = bool>>> {
    vec![Box::new(ShowContactTracing)]
}
