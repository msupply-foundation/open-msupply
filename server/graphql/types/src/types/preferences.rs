use async_graphql::*;
use repository::StorageConnection;
use service::preference::{
    preferences::PreferenceProvider, PrefKey, Preference, PreferenceDescription, PreferenceType,
    PreferenceValueType,
};

pub struct PreferencesNode {
    pub connection: StorageConnection,
    pub store_id: Option<String>,
    pub preferences: PreferenceProvider,
}

#[Object]
impl PreferencesNode {
    // Global preferences
    pub async fn allow_tracking_of_stock_by_donor(&self) -> Result<bool> {
        self.load_preference(&self.preferences.allow_tracking_of_stock_by_donor)
    }

    pub async fn show_contact_tracing(&self) -> Result<bool> {
        self.load_preference(&self.preferences.show_contact_tracing)
    }

    // Store preferences
    pub async fn manage_vaccines_in_doses(&self) -> Result<bool> {
        self.load_preference(&self.preferences.manage_vaccines_in_doses)
    }

    pub async fn manage_vvm_status_for_stock(&self) -> Result<bool> {
        self.load_preference(&self.preferences.manage_vvm_status_for_stock)
    }

    pub async fn sort_by_vvm_status_then_expiry(&self) -> Result<bool> {
        self.load_preference(&self.preferences.sort_by_vvm_status_then_expiry)
    }

    pub async fn use_simplified_mobile_ui(&self) -> Result<bool> {
        self.load_preference(&self.preferences.use_simplified_mobile_ui)
    }
}

impl PreferencesNode {
    pub fn from_domain(
        connection: StorageConnection,
        store_id: Option<String>,
        prefs: PreferenceProvider,
    ) -> PreferencesNode {
        PreferencesNode {
            connection,
            store_id,
            preferences: prefs,
        }
    }

    pub fn load_preference<T>(&self, pref: &impl Preference<Value = T>) -> Result<T> {
        let result = pref.load(&self.connection, self.store_id.clone())?;
        Ok(result)
    }
}

pub struct PreferenceDescriptionNode {
    pub pref: PreferenceDescription,
}

#[Object]
impl PreferenceDescriptionNode {
    pub async fn key(&self) -> PreferenceKey {
        PreferenceKey::from_domain(&self.pref.key)
    }

    pub async fn value_type(&self) -> PreferenceValueNodeType {
        PreferenceValueNodeType::from_domain(&self.pref.value_type)
    }

    /// WARNING: Type loss - holds any kind of pref value (for edit UI).
    /// Use the PreferencesNode to load the strictly typed value.
    pub async fn value(&self) -> &serde_json::Value {
        &self.pref.value
    }
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
#[graphql(rename_items = "camelCase")]
// These keys (once camelCased) should match fields of PreferencesNode
pub enum PreferenceKey {
    // Global preferences
    AllowTrackingOfStockByDonor,
    ShowContactTracing,
    // Store preferences
    ManageVaccinesInDoses,
    ManageVvmStatusForStock,
    SortByVvmStatusThenExpiry,
    UseSimplifiedMobileUi,
}

impl PreferenceKey {
    pub fn from_domain(pref_key: &PrefKey) -> Self {
        match pref_key {
            // Global preferences
            PrefKey::AllowTrackingOfStockByDonor => PreferenceKey::AllowTrackingOfStockByDonor,
            PrefKey::ShowContactTracing => PreferenceKey::ShowContactTracing,
            // Store preferences
            PrefKey::ManageVaccinesInDoses => PreferenceKey::ManageVaccinesInDoses,
            PrefKey::ManageVvmStatusForStock => PreferenceKey::ManageVvmStatusForStock,
            PrefKey::SortByVvmStatusThenExpiry => PreferenceKey::SortByVvmStatusThenExpiry,
            PrefKey::UseSimplifiedMobileUi => PreferenceKey::UseSimplifiedMobileUi,
        }
    }
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
pub enum PreferenceNodeType {
    Global,
    Store,
}

impl PreferenceNodeType {
    pub fn to_domain(self) -> PreferenceType {
        match self {
            PreferenceNodeType::Global => PreferenceType::Global,
            PreferenceNodeType::Store => PreferenceType::Store,
        }
    }
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
pub enum PreferenceValueNodeType {
    Boolean,
    Integer,
}

impl PreferenceValueNodeType {
    pub fn from_domain(domain_type: &PreferenceValueType) -> Self {
        match domain_type {
            PreferenceValueType::Boolean => PreferenceValueNodeType::Boolean,
            PreferenceValueType::Integer => PreferenceValueNodeType::Integer,
        }
    }
}
