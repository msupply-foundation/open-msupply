use async_graphql::*;
use repository::PreferenceRow;
use service::preference::{
    preferences::{complex_pref::ComplexPref, PreferenceDescription, Preferences},
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
    pub async fn preferred_store_name(&self) -> &String {
        &self.preferences.preferred_store_name
    }
    pub async fn months_of_stock(&self) -> &i32 {
        &self.preferences.months_of_stock
    }

    pub async fn complex_pref(&self) -> ComplexPrefNode {
        ComplexPrefNode::from_domain(self.preferences.complex.clone())
    }
}

impl PreferencesNode {
    pub fn from_domain(prefs: Preferences) -> PreferencesNode {
        PreferencesNode { preferences: prefs }
    }
}

/// Sub-node for a more complex preference
pub struct ComplexPrefNode {
    pub complex_pref: ComplexPref,
}

#[Object]
impl ComplexPrefNode {
    pub async fn something_here(&self) -> &i32 {
        &self.complex_pref.something_here
    }

    pub async fn something_else(&self) -> &String {
        &self.complex_pref.something_else
    }
}

impl ComplexPrefNode {
    pub fn from_domain(complex_pref: ComplexPref) -> ComplexPrefNode {
        ComplexPrefNode { complex_pref }
    }
}

// Central only node types:

/// Describes a preference, how it is configured
pub struct PreferenceDescriptionNode {
    pub pref: Box<dyn PreferenceDescription>,
}

#[Object]
impl PreferenceDescriptionNode {
    pub async fn key(&self) -> String {
        self.pref.key()
    }

    pub async fn global_only(&self) -> bool {
        self.pref.global_only()
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

    // /// JSON serialized value
    pub async fn value(&self) -> &String {
        &self.preference.value
    }

    pub async fn store_id(&self) -> Option<String> {
        self.preference.store_id.clone()
    }
}
