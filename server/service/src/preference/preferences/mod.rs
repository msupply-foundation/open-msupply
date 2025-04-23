pub mod show_contact_tracing;
pub use show_contact_tracing::*;

pub struct PreferenceRegistry {
    pub show_contact_tracing: ShowContactTracing,
}

pub fn get_preference_registry() -> PreferenceRegistry {
    PreferenceRegistry {
        show_contact_tracing: ShowContactTracing,
    }
}
