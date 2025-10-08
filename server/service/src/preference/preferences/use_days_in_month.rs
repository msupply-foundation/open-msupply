use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct UseDaysInMonth;

impl Preference for UseDaysInMonth {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::UseDaysInMonth
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
