use async_graphql::*;
use repository::PreferenceRow;
use service::preference::preferences::{Preference, Preferences};

/// Defines the preferences object for a store
pub struct PreferencesNode {
    pub preferences: Preferences,
}

#[Object]
impl PreferencesNode {
    pub async fn show_contact_tracing(&self) -> &bool {
        &self.preferences.show_contact_tracing
    }

    pub async fn allow_tracking_of_received_stock_by_donor(&self) -> &bool {
        &self.preferences.allow_tracking_of_received_stock_by_donor
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
