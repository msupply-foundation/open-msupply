use super::Preference;

pub struct ShowContactTracing;

impl Preference for ShowContactTracing {
    type Value = bool;

    fn key(&self) -> &'static str {
        "show_contact_tracing"
    }
}
