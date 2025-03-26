use async_graphql::*;
use repository::Preference;
use service::preference::preferences::{complex_pref::ComplexPref, Preferences};

/// Defines the preferences object for a store
pub struct PreferencesNode {
    pub preferences: Preferences,
}

#[Object]
impl PreferencesNode {
    pub async fn show_contact_tracing(&self) -> &bool {
        &self.preferences.show_contact_tracing
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
    pub key: String,
    pub global_only: bool,
    pub json_forms_input_type: String,
}

#[Object]
impl PreferenceDescriptionNode {
    pub async fn key(&self) -> &String {
        &self.key
    }

    pub async fn global_only(&self) -> &bool {
        &self.global_only
    }

    pub async fn json_forms_input_type(&self) -> &String {
        &self.json_forms_input_type
    }
}

/// Usually a store would access preferences via the PreferencesNode - this is for central access,
/// to view preferences across all stores
pub struct PreferenceNode {
    pub preference: Preference,
}

#[Object]
impl PreferenceNode {
    pub async fn id(&self) -> &String {
        &self.preference.preference_row.id
    }

    pub async fn key(&self) -> &String {
        &self.preference.preference_row.key
    }

    // /// JSON serialized value
    pub async fn value(&self) -> &String {
        &self.preference.preference_row.value
    }

    pub async fn store_id(&self) -> Option<String> {
        self.preference.preference_row.store_id.clone()
    }

    pub async fn store_name(&self) -> Option<String> {
        self.preference
            .name_row
            .as_ref()
            .map(|name| name.name.clone())
    }
}
