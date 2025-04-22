use repository::RepositoryError;

use crate::{preference::preferences::ShowContactTracing, service_provider::ServiceContext};

use super::{preferences::Preferences, Preference};

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let prefs = Preferences {
        show_contact_tracing: ShowContactTracing.load(connection, Some(store_id.to_string()))?,
    };

    Ok(prefs)
}

// TODO: Value = bool obviously won't work when we have non-bool preferences
// Genericising involves boxing Value as Any, i.e. type loss, but I think we will move away
// from this method in cooldown anyway, so just leaving like this for now
pub fn get_preference_descriptions() -> Vec<Box<dyn Preference<Value = bool>>> {
    vec![Box::new(ShowContactTracing)]
}
