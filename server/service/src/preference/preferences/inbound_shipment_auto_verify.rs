use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct InboundShipmentAutoVerify;

impl Preference for InboundShipmentAutoVerify {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::InboundShipmentAutoVerify
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
