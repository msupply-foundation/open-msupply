use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};
use repository::GenderType;

pub struct GenderOptions;

impl Preference for GenderOptions {
    type Value = Vec<GenderType>;

    fn key(&self) -> PrefKey {
        PrefKey::GenderOptions
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::MultiChoice
    }

    fn default_value(&self) -> Self::Value {
        vec![
            GenderType::Female,
            GenderType::Male,
            GenderType::Transgender,
            GenderType::TransgenderMale,
            GenderType::TransgenderFemale,
            GenderType::Unknown,
            GenderType::NonBinary,
        ]
    }
}
