use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct PromptForBatchAndExpiryOnInboundShipments;

impl Preference for PromptForBatchAndExpiryOnInboundShipments {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::PromptForBatchAndExpiryOnInboundShipments
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
