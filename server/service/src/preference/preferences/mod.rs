use repository::RepositoryError;

pub mod types;
pub use types::*;

mod show_contact_tracing;
use show_contact_tracing::*;

use crate::service_provider::ServiceContext;

struct PreferenceRegistry {
    pub show_contact_tracing: ShowContactTracing,
}

fn get_preference_registry() -> PreferenceRegistry {
    PreferenceRegistry {
        show_contact_tracing: ShowContactTracing,
    }
}

pub struct Preferences {
    pub show_contact_tracing: bool,
}

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let PreferenceRegistry {
        show_contact_tracing,
    } = get_preference_registry();

    let prefs = Preferences {
        show_contact_tracing: show_contact_tracing.load(connection, store_id)?,
    };

    Ok(prefs)
}

pub fn get_preference_descriptions() -> Vec<Box<dyn PreferenceDescription>> {
    let PreferenceRegistry {
        show_contact_tracing,
    } = get_preference_registry();

    vec![Box::new(show_contact_tracing)]
}
