use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// When enabled, receiving expired stock on an inbound shipment requires a
/// reason (why the expired stock is being accepted). The shipment cannot be
/// received/verified while any expired line is missing a reason.
pub struct RequireReasonWhenReceivingExpiredStock;

impl Preference for RequireReasonWhenReceivingExpiredStock {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::RequireReasonWhenReceivingExpiredStock
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
