use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct DisplayVaccinesInDoses;

impl Preference for DisplayVaccinesInDoses {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::DisplayVaccinesInDoses
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
