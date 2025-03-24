use serde::Deserialize;

use super::Preference;

#[derive(Clone, Default, Deserialize)]
pub struct ComplexPref {
    pub something_here: i32,
    pub something_else: String,
}

impl Preference<ComplexPref> for ComplexPref {
    fn key() -> &'static str {
        "complex_pref"
    }
}
