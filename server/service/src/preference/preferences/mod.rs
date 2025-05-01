pub mod show_contact_tracing;
pub use show_contact_tracing::*;
pub mod allow_tracking_of_received_stock_by_donor;
pub use allow_tracking_of_received_stock_by_donor::*;

pub struct PreferenceProvider {
    // Add each preference here
    pub show_contact_tracing: ShowContactTracing,
    pub allow_tracking_of_received_stock_by_donor: AllowTrackingOfReceivedStockByDonor,
}

pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        show_contact_tracing: ShowContactTracing,
        allow_tracking_of_received_stock_by_donor: AllowTrackingOfReceivedStockByDonor,
    }
}
