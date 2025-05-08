use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct DisplayPopulationBasedForecasting;

impl Preference for DisplayPopulationBasedForecasting {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::DisplayPopulationBasedForecasting
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
