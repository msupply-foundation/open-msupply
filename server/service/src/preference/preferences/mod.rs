pub mod show_contact_tracing;
pub use show_contact_tracing::*;

pub struct PreferenceRegistry {
    pub show_contact_tracing: ShowContactTracing,
}
