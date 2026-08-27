use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct DoNotPrintPlaceholderLineLabels;

impl Preference for DoNotPrintPlaceholderLineLabels {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::DoNotPrintPlaceholderLineLabels
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
