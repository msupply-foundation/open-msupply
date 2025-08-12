use std::collections::BTreeMap;

use crate::types::patient::GenderType;
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

    pub async fn gender_options(&self) -> Result<Vec<GenderType>> {
        let domain_genders = self.load_preference(&self.preferences.gender_options)?;
        let genders = domain_genders.iter().map(GenderType::from_domain).collect();
        Ok(genders)
    }

    pub async fn show_contact_tracing(&self) -> Result<bool> {
        self.load_preference(&self.preferences.show_contact_tracing)
    }

    pub async fn use_campaigns(&self) -> Result<bool> {
        self.load_preference(&self.preferences.use_campaigns)
    }

    pub async fn custom_translations(&self) -> Result<BTreeMap<String, String>> {
        self.load_preference(&self.preferences.custom_translations)
    }

    pub async fn sync_records_display_threshold(&self) -> Result<i32> {
        self.load_preference(&self.preferences.sync_records_display_threshold)
    }

    pub async fn authorise_purchase_order(&self) -> Result<bool> {
        self.load_preference(&self.preferences.authorise_purchase_order)
    }

    pub async fn prevent_transfers_months_before_initialisation(&self) -> Result<i32> {
        self.load_preference(
            &self
                .preferences
                .prevent_transfers_months_before_initialisation,
        )
    }

    // Store preferences
    pub async fn manage_vaccines_in_doses(&self) -> Result<bool> {
        self.load_preference(&self.preferences.manage_vaccines_in_doses)
    }

    pub async fn manage_vvm_status_for_stock(&self) -> Result<bool> {
        self.load_preference(&self.preferences.manage_vvm_status_for_stock)
    }

    pub async fn order_in_packs(&self) -> Result<bool> {
        self.load_preference(&self.preferences.order_in_packs)
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
    GenderOptions,
    ShowContactTracing,
    UseCampaigns,
    CustomTranslations,
    SyncRecordsDisplayThreshold,
    AuthorisePurchaseOrder,
    PreventTransfersMonthsBeforeInitialisation,
    // Store preferences
    ManageVaccinesInDoses,
    ManageVvmStatusForStock,
    OrderInPacks,
    SortByVvmStatusThenExpiry,
    UseSimplifiedMobileUi,
}

impl PreferenceKey {
    pub fn from_domain(pref_key: &PrefKey) -> Self {
        match pref_key {
            // Global preferences
            PrefKey::AllowTrackingOfStockByDonor => PreferenceKey::AllowTrackingOfStockByDonor,
            PrefKey::GenderOptions => PreferenceKey::GenderOptions,
            PrefKey::ShowContactTracing => PreferenceKey::ShowContactTracing,
            PrefKey::UseCampaigns => PreferenceKey::UseCampaigns,
            PrefKey::CustomTranslations => PreferenceKey::CustomTranslations,
            PrefKey::SyncRecordsDisplayThreshold => PreferenceKey::SyncRecordsDisplayThreshold,
            PrefKey::AuthorisePurchaseOrder => PreferenceKey::AuthorisePurchaseOrder,
            PrefKey::PreventTransfersMonthsBeforeInitialisation => {
                PreferenceKey::PreventTransfersMonthsBeforeInitialisation
            }
            // Store preferences
            PrefKey::ManageVaccinesInDoses => PreferenceKey::ManageVaccinesInDoses,
            PrefKey::ManageVvmStatusForStock => PreferenceKey::ManageVvmStatusForStock,
            PrefKey::OrderInPacks => PreferenceKey::OrderInPacks,
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
    MultiChoice,
    CustomTranslations, // Specific type for CustomTranslations preference
}

impl PreferenceValueNodeType {
    pub fn from_domain(domain_type: &PreferenceValueType) -> Self {
        match domain_type {
            PreferenceValueType::Boolean => PreferenceValueNodeType::Boolean,
            PreferenceValueType::Integer => PreferenceValueNodeType::Integer,
            PreferenceValueType::MultiChoice => PreferenceValueNodeType::MultiChoice,
            PreferenceValueType::CustomTranslations => PreferenceValueNodeType::CustomTranslations,
        }
    }
}
