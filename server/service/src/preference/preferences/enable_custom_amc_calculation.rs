use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct EnableCustomAmcCalculation;

impl Preference for EnableCustomAmcCalculation {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::EnableCustomAmcCalculation
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
