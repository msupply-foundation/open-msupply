use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct StoreCustomColour;

impl Preference for StoreCustomColour {
    type Value = String;

    fn key(&self) -> PrefKey {
        PrefKey::StoreCustomColour
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::String
    }
}
