use super::Preference;

pub struct ShowContactTracing;

impl Preference for ShowContactTracing {
    type Value = bool;

    fn key() -> &'static str {
        "show_contact_tracing"
    }

    fn json_forms_input_type() -> String {
        "boolean".to_string()
    }
}
