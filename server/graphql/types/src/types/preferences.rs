use async_graphql::*;
use repository::PreferenceRow;
use service::preference::{
    preferences::{Preference, Preferences},
    PreferencesByKeyResult,
};

/// Defines the preferences object for a store
pub struct PreferencesNode {
    pub preferences: Preferences,
}

#[Object]
impl PreferencesNode {
    pub async fn show_contact_tracing(&self) -> &bool {
        &self.preferences.show_contact_tracing
    }
}

impl PreferencesNode {
    pub fn from_domain(prefs: Preferences) -> PreferencesNode {
        PreferencesNode { preferences: prefs }
    }
}

// Central only node types:

/// Describes a preference, how it is configured
pub struct PreferenceDescriptionNode {
    pub pref: Box<dyn Preference<Value = bool>>,
}

#[Object]
impl PreferenceDescriptionNode {
    pub async fn key(&self) -> &str {
        self.pref.key()
    }

    pub async fn json_schema(&self) -> serde_json::Value {
        self.pref.json_schema()
    }

    pub async fn ui_schema(&self) -> serde_json::Value {
        self.pref.ui_schema()
    }

    pub async fn serialised_default(&self) -> String {
        self.pref.serialised_default()
    }
}

/// Usually a store would access preferences via the PreferencesNode - this is for central access,
/// to view preferences across all stores
pub struct PreferencesByKeyNode {
    pub result: PreferencesByKeyResult,
}

#[Object]
impl PreferencesByKeyNode {
    pub async fn global(&self) -> Option<PreferenceNode> {
        self.result
            .global
            .clone()
            .map(|preference| PreferenceNode { preference })
    }

    pub async fn per_store(&self) -> Vec<PreferenceNode> {
        self.result
            .per_store
            .clone()
            .into_iter()
            .map(|preference| PreferenceNode { preference })
            .collect()
    }
}
pub struct PreferenceNode {
    pub preference: PreferenceRow,
}

#[Object]
impl PreferenceNode {
    pub async fn id(&self) -> &String {
        &self.preference.id
    }

    pub async fn key(&self) -> &String {
        &self.preference.key
    }

    /// JSON serialized value
    pub async fn value(&self) -> &String {
        &self.preference.value
    }

    pub async fn store_id(&self) -> Option<String> {
        self.preference.store_id.clone()
    }
}
