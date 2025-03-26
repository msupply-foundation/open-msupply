use super::Preference;

pub struct PreferredStoreName;

impl Preference for PreferredStoreName {
    type Value = String;

    fn key() -> &'static str {
        "preferred_store_name"
    }

    fn json_forms_input_type() -> String {
        "string".to_string()
    }
}
