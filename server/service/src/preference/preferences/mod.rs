use repository::RepositoryError;

pub mod types;
pub use types::*;

pub mod complex_pref;
use complex_pref::*;
mod months_of_stock;
use months_of_stock::*;
mod show_contact_tracing;
use show_contact_tracing::*;

use crate::service_provider::ServiceContext;

struct PreferenceRegistry {
    pub show_contact_tracing: ShowContactTracing,
    pub complex_one: ComplexOne,
    pub months_of_stock: MonthsOfStock,
}

fn get_preference_registry() -> PreferenceRegistry {
    PreferenceRegistry {
        show_contact_tracing: ShowContactTracing,
        complex_one: ComplexOne,
        months_of_stock: MonthsOfStock,
    }
}

pub struct Preferences {
    pub show_contact_tracing: bool,
    pub complex: ComplexPref,
    pub months_of_stock: i32,
}

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let PreferenceRegistry {
        show_contact_tracing,
        complex_one,
        months_of_stock,
    } = get_preference_registry();

    let prefs = Preferences {
        show_contact_tracing: show_contact_tracing.load(connection, store_id)?,
        complex: complex_one.load(connection, store_id)?,
        months_of_stock: months_of_stock.load(connection, store_id)?,
    };

    Ok(prefs)
}

pub fn get_preference_descriptions() -> Vec<Box<dyn PreferenceDescription>> {
    let PreferenceRegistry {
        show_contact_tracing,
        complex_one,
        months_of_stock,
    } = get_preference_registry();

    vec![
        Box::new(show_contact_tracing),
        Box::new(complex_one),
        Box::new(months_of_stock),
    ]
}

