use std::collections::BTreeMap;

use crate::types::patient::GenderTypeNode;
use async_graphql::*;
use repository::StorageConnection;
use service::preference::{preferences::PreferenceProvider, Preference, PreferenceDescription};

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

    pub async fn gender_options(&self) -> Result<Vec<GenderTypeNode>> {
        let domain_genders = self.load_preference(&self.preferences.gender_options)?;
        let genders = domain_genders
            .iter()
            .map(|g| GenderTypeNode::from(g.clone()))
            .collect();
        Ok(genders)
    }

    pub async fn authorise_purchase_order(&self) -> Result<bool> {
        self.load_preference(&self.preferences.authorise_purchase_order)
    }

    pub async fn authorise_goods_received(&self) -> Result<bool> {
        self.load_preference(&self.preferences.authorise_goods_received)
    }

    pub async fn custom_translations(&self) -> Result<BTreeMap<String, String>> {
        self.load_preference(&self.preferences.custom_translations)
    }

    pub async fn prevent_transfers_months_before_initialisation(&self) -> Result<i32> {
        self.load_preference(
            &self
                .preferences
                .prevent_transfers_months_before_initialisation,
        )
    }

    pub async fn show_contact_tracing(&self) -> Result<bool> {
        self.load_preference(&self.preferences.show_contact_tracing)
    }

    pub async fn sync_records_display_threshold(&self) -> Result<i32> {
        self.load_preference(&self.preferences.sync_records_display_threshold)
    }

    pub async fn enable_custom_amc_calculation(&self) -> Result<bool> {
        self.load_preference(&self.preferences.enable_custom_amc_calculation)
    }

    pub async fn use_days_in_month(&self) -> Result<bool> {
        self.load_preference(&self.preferences.use_days_in_month)
    }

    pub async fn adjust_for_number_of_days_out_of_stock(&self) -> Result<bool> {
        self.load_preference(&self.preferences.adjust_for_number_of_days_out_of_stock)
    }

    pub async fn days_in_month(&self) -> Result<i32> {
        self.load_preference(&self.preferences.days_in_month)
    }

    pub async fn exclude_transfers(&self) -> Result<bool> {
        self.load_preference(&self.preferences.exclude_transfers)
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

    pub async fn use_procurement_functionality(&self) -> Result<bool> {
        self.load_preference(&self.preferences.use_procurement_functionality)
    }

    pub async fn sort_by_vvm_status_then_expiry(&self) -> Result<bool> {
        self.load_preference(&self.preferences.sort_by_vvm_status_then_expiry)
    }

    pub async fn use_simplified_mobile_ui(&self) -> Result<bool> {
        self.load_preference(&self.preferences.use_simplified_mobile_ui)
    }

    pub async fn disable_manual_returns(&self) -> Result<bool> {
        self.load_preference(&self.preferences.disable_manual_returns)
    }

    pub async fn can_create_internal_order_from_a_requisition(&self) -> Result<bool> {
        self.load_preference(
            &self
                .preferences
                .can_create_internal_order_from_a_requisition,
        )
    }

    pub async fn select_destination_store_for_an_internal_order(&self) -> Result<bool> {
        self.load_preference(
            &self
                .preferences
                .select_destination_store_for_an_internal_order,
        )
    }

    pub async fn number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products(
        &self,
    ) -> Result<i32> {
        self.load_preference(
            &self
                .preferences
                .number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products,
        )
    }

    pub async fn number_of_months_threshold_to_show_low_stock_alerts_for_products(
        &self,
    ) -> Result<i32> {
        self.load_preference(
            &self
                .preferences
                .number_of_months_threshold_to_show_low_stock_alerts_for_products,
        )
    }

    pub async fn first_threshold_for_expiring_items(&self) -> Result<i32> {
        self.load_preference(&self.preferences.first_threshold_for_expiring_items)
    }

    pub async fn second_threshold_for_expiring_items(&self) -> Result<i32> {
        self.load_preference(&self.preferences.second_threshold_for_expiring_items)
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
        PreferenceKey::from(self.pref.key.clone())
    }

    pub async fn value_type(&self) -> PreferenceValueNodeType {
        PreferenceValueNodeType::from(self.pref.value_type.clone())
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
#[graphql(remote = "service::preference::types::PrefKey")]
pub enum PreferenceKey {
    // Global preferences
    AllowTrackingOfStockByDonor,
    AuthoriseGoodsReceived,
    AuthorisePurchaseOrder,
    CustomTranslations,
    GenderOptions,
    PreventTransfersMonthsBeforeInitialisation,
    ShowContactTracing,
    SyncRecordsDisplayThreshold,
    EnableCustomAmcCalculation,
    UseDaysInMonth,
    AdjustForNumberOfDaysOutOfStock,
    DaysInMonth,
    ExcludeTransfers,
    // Store preferences
    ManageVaccinesInDoses,
    ManageVvmStatusForStock,
    OrderInPacks,
    UseProcurementFunctionality,
    SortByVvmStatusThenExpiry,
    UseSimplifiedMobileUi,
    DisableManualReturns,
    CanCreateInternalOrderFromARequisition,
    SelectDestinationStoreForAnInternalOrder,
    NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts,
    NumberOfMonthsThresholdToShowLowStockAlertsForProducts,
    FirstThresholdForExpiringItems,
    SecondThresholdForExpiringItems,
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
#[graphql(remote = "service::preference::types::PreferenceType")]
pub enum PreferenceNodeType {
    Global,
    Store,
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
#[graphql(remote = "service::preference::types::PreferenceValueType")]
pub enum PreferenceValueNodeType {
    Boolean,
    Integer,
    MultiChoice,
    CustomTranslations, // Specific type for CustomTranslations preference
}
