use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AllowBackdatingOfShipments;

impl Preference for AllowBackdatingOfShipments {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AllowBackdatingOfShipments
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
