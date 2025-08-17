use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ShowPurchaseOrderAndGoodsReceived;

impl Preference for ShowPurchaseOrderAndGoodsReceived {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ShowPurchaseOrderAndGoodsReceived
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
