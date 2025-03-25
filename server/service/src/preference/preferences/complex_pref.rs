use serde::Deserialize;

use super::Preference;

#[derive(Clone, Default, Deserialize)]
pub struct ComplexPref {
    pub something_here: i32,
    pub something_else: String,
}

pub struct ComplexOne;

impl Preference for ComplexOne {
    type Value = ComplexPref;

    fn key() -> &'static str {
        "complex_one"
    }

    fn json_forms_input_type() -> String {
        "believe me i made a custom renderer called this".to_string()
    }
}
