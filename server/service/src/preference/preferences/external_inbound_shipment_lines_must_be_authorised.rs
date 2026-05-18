use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ExternalInboundShipmentLinesMustBeAuthorised;

impl Preference for ExternalInboundShipmentLinesMustBeAuthorised {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ExternalInboundShipmentLinesMustBeAuthorised
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
