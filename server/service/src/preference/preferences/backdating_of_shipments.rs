use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct BackdatingOfShipments;

#[derive(Default, Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackdatingOfShipmentsData {
    pub enabled: bool,
    pub max_days: i32,
}

impl Preference for BackdatingOfShipments {
    type Value = BackdatingOfShipmentsData;

    fn key(&self) -> PrefKey {
        PrefKey::BackdatingOfShipments
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::BackdatingOfShipmentsData
    }
}
