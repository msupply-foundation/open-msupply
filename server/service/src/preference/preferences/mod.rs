pub mod show_contact_tracing;
pub use show_contact_tracing::*;

pub struct Preferences {
    pub show_contact_tracing: bool,
}
