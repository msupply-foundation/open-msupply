use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ShowPurchaseOrdersAndGoodsReceived;

impl Preference for ShowPurchaseOrdersAndGoodsReceived {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ShowPurchaseOrdersAndGoodsReceived
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
