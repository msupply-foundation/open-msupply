use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct MaximumBackdatingDays;

impl Preference for MaximumBackdatingDays {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::MaximumBackdatingDays
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
