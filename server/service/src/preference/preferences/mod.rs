pub mod show_contact_tracing;
pub use show_contact_tracing::*;
pub mod display_population_based_forecasting;
pub use display_population_based_forecasting::*;
pub mod display_vaccines_in_doses;
pub use display_vaccines_in_doses::*;
pub mod sort_by_vvm_status_then_expiry;
pub use sort_by_vvm_status_then_expiry::*;
pub mod manage_vvm_status_for_stock;
pub use manage_vvm_status_for_stock::*;
pub mod allow_tracking_of_stock_by_donor;
pub use allow_tracking_of_stock_by_donor::*;
pub mod use_simplified_mobile_ui;
pub use use_simplified_mobile_ui::*;

pub struct PreferenceProvider {
    // Global preferences
    pub allow_tracking_of_stock_by_donor: AllowTrackingOfStockByDonor,
    pub display_population_based_forecasting: DisplayPopulationBasedForecasting,
    pub show_contact_tracing: ShowContactTracing,
    // Store preferences
    pub display_vaccines_in_doses: DisplayVaccinesInDoses,
    pub manage_vvm_status_for_stock: ManageVvmStatusForStock,
    pub sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
    pub use_simplified_mobile_ui: UseSimplifiedMobileUI,
}

pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        // Global preferences
        allow_tracking_of_stock_by_donor: AllowTrackingOfStockByDonor,
        display_population_based_forecasting: DisplayPopulationBasedForecasting,
        show_contact_tracing: ShowContactTracing,
        // Store preferences
        display_vaccines_in_doses: DisplayVaccinesInDoses,
        manage_vvm_status_for_stock: ManageVvmStatusForStock,
        sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
        use_simplified_mobile_ui: UseSimplifiedMobileUI,
    }
}
