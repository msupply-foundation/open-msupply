use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct DisplayVaccineInDoses;

impl Preference for DisplayVaccineInDoses {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::DisplayVaccineInDoses
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
