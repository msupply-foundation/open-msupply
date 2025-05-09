pub mod show_contact_tracing;
pub use show_contact_tracing::*;
pub mod display_population_based_forecasting;
pub use display_population_based_forecasting::*;
pub mod display_vaccine_in_doses;
pub use display_vaccine_in_doses::*;
pub mod manage_vvm_status;
pub use manage_vvm_status::*;
pub mod sort_by_vvm_status;
pub use sort_by_vvm_status::*;

pub struct PreferenceProvider {
    // Add each preference here
    pub show_contact_tracing: ShowContactTracing,
    pub display_population_based_forecasting: DisplayPopulationBasedForecasting,
    pub display_vaccine_in_doses: DisplayVaccineInDoses,
    pub manage_vvm_status: ManageVvmStatus,
    pub sort_by_vvm_status: SortByVvmStatus,
}

pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        show_contact_tracing: ShowContactTracing,
        display_population_based_forecasting: DisplayPopulationBasedForecasting,
        display_vaccine_in_doses: DisplayVaccineInDoses,
        manage_vvm_status: ManageVvmStatus,
        sort_by_vvm_status: SortByVvmStatus,
    }
}
