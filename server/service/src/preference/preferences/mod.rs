pub mod show_contact_tracing;
pub use show_contact_tracing::*;
pub mod display_population_based_forecasting;
pub use display_population_based_forecasting::*;
pub mod display_vaccine_in_doses;
pub use display_vaccine_in_doses::*;
pub mod allow_tracking_of_received_stock_by_donor;
pub use allow_tracking_of_received_stock_by_donor::*;

pub struct PreferenceProvider {
    // Add each preference here
    pub show_contact_tracing: ShowContactTracing,
    pub display_population_based_forecasting: DisplayPopulationBasedForecasting,
    pub display_vaccine_in_doses: DisplayVaccineInDoses,
    pub allow_tracking_of_received_stock_by_donor: AllowTrackingOfReceivedStockByDonor,
}

pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        show_contact_tracing: ShowContactTracing,
        display_population_based_forecasting: DisplayPopulationBasedForecasting,
        display_vaccine_in_doses: DisplayVaccineInDoses,
        allow_tracking_of_received_stock_by_donor: AllowTrackingOfReceivedStockByDonor,
    }
}
