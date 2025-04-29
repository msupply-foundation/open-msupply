pub mod show_contact_tracing;
pub use show_contact_tracing::*;
pub mod display_vaccine_in_doses;
pub use display_vaccine_in_doses::*;

pub struct PreferenceProvider {
    // Add each preference here
    pub show_contact_tracing: ShowContactTracing,
    pub display_vaccine_in_doses: DisplayVaccineInDoses,
}

pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        show_contact_tracing: ShowContactTracing,
        display_vaccine_in_doses: DisplayVaccineInDoses,
    }
}
