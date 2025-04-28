use repository::RepositoryError;

pub mod types;
pub use types::*;

mod allow_tracking_of_received_stock_by_donor;
mod show_contact_tracing;
use crate::service_provider::ServiceContext;
use allow_tracking_of_received_stock_by_donor::*;
use show_contact_tracing::*;

pub struct Preferences {
    pub show_contact_tracing: bool,
    pub allow_tracking_of_received_stock_by_donor: bool,
}

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let prefs = Preferences {
        show_contact_tracing: ShowContactTracing.load(connection, store_id)?,
        allow_tracking_of_received_stock_by_donor: AllowTrackingOfReceivedStockByDonor
            .load(connection, store_id)?,
    };

    Ok(prefs)
}

// TODO: Value = bool obviously won't work when we have non-bool preferences
// Genericising involves boxing Value as Any, i.e. type loss, but I think we will move away
// from this method in cooldown anyway, so just leaving like this for now
pub fn get_preference_descriptions() -> Vec<Box<dyn Preference<Value = bool>>> {
    vec![
        Box::new(ShowContactTracing),
        Box::new(AllowTrackingOfReceivedStockByDonor),
    ]
}
