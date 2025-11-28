use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ShowIndicativeUnitPriceInRequisitions;

impl Preference for ShowIndicativeUnitPriceInRequisitions {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ShowIndicativeUnitPriceInRequisitions
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
