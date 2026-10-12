use repository::{PreferenceRow, RepositoryError, StorageConnection};
use serde::{Serialize, de::DeserializeOwned};

use strum::{Display, EnumString};
use thiserror::Error;

use super::{
    query_preference::{
        query_global, query_overriding_stores, query_store, query_store_with_global_default,
    },
    upsert_helpers::{delete_store, upsert_global, upsert_store},
};

#[derive(Clone, Display, EnumString)]
#[strum(serialize_all = "snake_case")]
pub enum PrefKey {
    // Global preferences
    AllowTrackingOfStockByDonor,
    AuthorisePurchaseOrder,
    CustomTranslations,
    CustomTranslationsV2,
    GenderOptions,
    PreventTransfersMonthsBeforeInitialisation,
    ShowContactTracing,
    SyncRecordsDisplayThreshold,
    WarningForExcessRequest,
    AdjustForNumberOfDaysOutOfStock,
    DaysInMonth,
    ExpiredStockPreventIssue,
    ExpiredStockIssueThreshold,
    ItemMarginOverridesSupplierMargin,
    TransferStockToInternalCustomersAtCostPrice,
    IsGaps,
    DisplayPopulationBasedForecasting,
    GlobalTableConfigs,
    Backdating,
    ReceivePaymentsFromPrescriptions,
    GlobalLogo,
    DecimalPlacesForNumbers,

    // Store preferences
    BlindStocktake,
    ManageVaccinesInDoses,
    ManageVvmStatusForStock,
    OrderInPacks,
    UseProcurementFunctionality,
    SortByVvmStatusThenExpiry,
    UseSimplifiedMobileUi,
    DisableManualReturns,
    RequisitionAutoFinalise,
    InboundShipmentAutoVerify,
    CanCreateInternalOrderFromARequisition,
    SelectDestinationStoreForAnInternalOrder,
    ExternalInboundShipmentLinesMustBeAuthorised,
    NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts,
    NumberOfMonthsThresholdToShowLowStockAlertsForProducts,
    NumberOfMonthsThresholdToShowOverStockAlertsForProducts,
    FirstThresholdForExpiringItems,
    SecondThresholdForExpiringItems,
    SkipIntermediateStatusesInOutbound,
    StoreCustomColour,
    WarnWhenMissingRecentStocktake,
    InvoiceStatusOptions,
    ShowIndicativePriceInRequisitions,
    DoNotPrintPlaceholderLineLabels,
}

#[derive(Clone, Debug, PartialEq)]
pub enum PreferenceType {
    Global,
    Store,
    // User,
    // Machine,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Scope {
    Global,
    Store(String),
    StoreOverride(String),
}

#[derive(Clone, PartialEq)]
pub enum PreferenceValueType {
    Boolean,
    Integer,
    Float,
    MultiChoice,
    // specific type to CustomTranslations preference
    CustomTranslations,
    CustomTranslationsV2,
    WarnWhenMissingRecentStocktakeData,
    BackdatingData,
    String,
    Colour,
    Image,
    // MultilineString,
    // Add scalar or custom value types here - mapped to frontend renderers
}

#[derive(Clone, Error, Debug, PartialEq)]
pub enum PreferenceError {
    #[error(transparent)]
    DatabaseError(RepositoryError),
    #[error("Failed to deserialize preference {0} from value {1}: {2}")]
    DeserializeError(String, String, String),
    #[error("Failed to convert preference {0} to JSON value: {1}")]
    ConversionError(String, String),
    #[error("Store ID is required for store preference")]
    StoreIdNotProvided,
}

#[derive(Clone, Error, Debug, PartialEq)]
pub enum UpsertPreferenceError {
    #[error(transparent)]
    DatabaseError(RepositoryError),
    #[error("Failed to serialize preference {0}: {1}")]
    SerializeError(String, String),
    #[error("Not running as central server")]
    NotACentralServer,
    #[error("Store ID is required for store preference")]
    StoreIdNotProvided,
    #[error("Invalid value for preference {0}: {1}")]
    InvalidValue(String, String),
    #[error("Preference {0} cannot be overridden per store")]
    NotOverridable(String),
}

pub trait Preference: Sync + Send {
    type Value: Default + DeserializeOwned + Serialize;

    fn key(&self) -> PrefKey;

    fn key_str(&self) -> String {
        self.key().to_string()
    }

    fn preference_type(&self) -> PreferenceType;

    fn allows_store_override(&self) -> bool {
        false
    }

    fn value_type(&self) -> PreferenceValueType;

    fn scope(&self, store_id: Option<String>) -> Option<Scope> {
        match (self.preference_type(), store_id) {
            (PreferenceType::Store, Some(store_id)) => Some(Scope::Store(store_id)),
            (PreferenceType::Store, None) => None,
            (PreferenceType::Global, Some(store_id)) if self.allows_store_override() => {
                Some(Scope::StoreOverride(store_id))
            }
            (PreferenceType::Global, _) => Some(Scope::Global),
        }
    }

    fn query(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<Option<PreferenceRow>, PreferenceError> {
        let key = self.key_str();
        let pref = match self
            .scope(store_id)
            .ok_or(PreferenceError::StoreIdNotProvided)?
        {
            Scope::Global => query_global(connection, &key)?,
            Scope::Store(store_id) => query_store(connection, &key, &store_id)?,
            Scope::StoreOverride(store_id) => {
                query_store_with_global_default(connection, &key, &store_id)?
            }
        };

        Ok(pref)
    }

    fn default_value(&self) -> Self::Value {
        Self::Value::default()
    }

    fn deserialize(&self, data: &str) -> Result<Self::Value, serde_json::Error> {
        serde_json::from_str::<Self::Value>(data)
    }

    fn load(
        &self,
        connection: &StorageConnection,
        // As we implement user/machine prefs, also accept those optional ids
        // self.query will determine which are actually required
        store_id: Option<String>,
    ) -> Result<Self::Value, PreferenceError> {
        let pref = self.query(connection, store_id)?;
        match pref {
            None => Ok(self.default_value()),
            Some(pref) => {
                let text_pref = pref.value.as_str();

                self.deserialize(text_pref).map_err(|e| {
                    PreferenceError::DeserializeError(pref.key, pref.value, e.to_string())
                })
            }
        }
    }

    // Implement custom upsert if you need further validation
    fn upsert(
        &self,
        connection: &StorageConnection,
        value: Self::Value,
        store_id: Option<String>,
    ) -> Result<(), UpsertPreferenceError> {
        let serialised_value = serde_json::to_string(&value).map_err(|e| {
            UpsertPreferenceError::SerializeError(self.key_str().to_string(), e.to_string())
        })?;

        match self
            .scope(store_id)
            .ok_or(UpsertPreferenceError::StoreIdNotProvided)?
        {
            Scope::Global => upsert_global(connection, self.key_str(), serialised_value)?,
            Scope::Store(store_id) | Scope::StoreOverride(store_id) => {
                upsert_store(connection, self.key_str(), serialised_value, store_id)?
            }
        };

        Ok(())
    }

    /// Drop a store's override, returning the store to the global value — the
    /// only way back once a store has pinned its own. Refused for anything
    /// else: a plain store preference has no global row to fall back to, so
    /// clearing it would silently mean "the built-in default" instead.
    fn clear_store_override(
        &self,
        connection: &StorageConnection,
        store_id: String,
    ) -> Result<(), UpsertPreferenceError> {
        match self.scope(Some(store_id)) {
            Some(Scope::StoreOverride(store_id)) => {
                delete_store(connection, self.key_str(), store_id)
            }
            _ => Err(UpsertPreferenceError::NotOverridable(self.key_str())),
        }
    }

    fn as_description(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<PreferenceDescription, PreferenceError> {
        let to_json = |value: Self::Value| {
            serde_json::to_value(value).map_err(|e| {
                PreferenceError::ConversionError(self.key_str().to_string(), e.to_string())
            })
        };
        let value = to_json(self.load(connection, store_id.clone())?)?;

        // Where the value came from. Only a global preference a store may
        // override can differ from the global row, so only that one describes
        // its provenance: for a store, whether this store pins its own value
        // and what it would return to; globally, which stores pin one.
        let (store_override, overriding_stores) = match self.scope(store_id) {
            Some(Scope::StoreOverride(store_id)) => (
                Some(StoreOverrideDescription {
                    is_overridden: query_store(connection, &self.key_str(), &store_id)?.is_some(),
                    global_value: to_json(self.load(connection, None)?)?,
                }),
                None,
            ),
            Some(Scope::Global) if self.allows_store_override() => (
                None,
                Some(query_overriding_stores(connection, &self.key_str())?),
            ),
            _ => (None, None),
        };

        Ok(PreferenceDescription {
            key: self.key(),
            value_type: self.value_type(),
            value,
            store_override,
            overriding_stores,
        })
    }
}

pub struct PreferenceDescription {
    pub key: PrefKey,
    pub value_type: PreferenceValueType,
    /// WARNING: Type loss - holds any kind of pref value (for edit UI).
    /// Use the PreferenceProvider to load the strictly typed value.
    pub value: serde_json::Value,
    /// Set only when a STORE listing carries a global preference that store
    /// may override — how the store arrives at `value`.
    pub store_override: Option<StoreOverrideDescription>,
    /// Set only when a GLOBAL listing carries a preference stores may
    /// override — the stores that pin their own value, empty where none do.
    /// Carries the stores themselves rather than a count of them: the page
    /// names them on demand, and a count it had to trust separately could
    /// disagree with the names it shows.
    pub overriding_stores: Option<Vec<OverridingStore>>,
}

/// One store that pins its own value for an overridable global preference,
/// named for the global listing.
#[derive(Clone, Debug, PartialEq)]
pub struct OverridingStore {
    pub store_id: String,
    pub store_name: String,
}

/// How one store arrives at an overridable global preference's value.
#[derive(Clone, Debug, PartialEq)]
pub struct StoreOverrideDescription {
    /// Whether this store pins its own value rather than following the global
    /// one.
    pub is_overridden: bool,
    /// The global value the store follows, or would return to by clearing the
    /// override. Same type loss as `value`.
    pub global_value: serde_json::Value,
}

impl PreferenceError {
    /// Collapse to a `RepositoryError` for call sites that surface
    /// `RepositoryError` (most service validation). A failed preference load
    /// almost always means the database is unavailable, in which case the
    /// inner error is preserved; other variants are wrapped as a DB error so
    /// the failure is propagated loudly rather than silently defaulted.
    pub fn into_repository_error(self) -> RepositoryError {
        match self {
            PreferenceError::DatabaseError(error) => error,
            other => RepositoryError::as_db_error("failed to load preference", other),
        }
    }
}

impl From<RepositoryError> for PreferenceError {
    fn from(error: RepositoryError) -> Self {
        PreferenceError::DatabaseError(error)
    }
}
impl From<RepositoryError> for UpsertPreferenceError {
    fn from(error: RepositoryError) -> Self {
        UpsertPreferenceError::DatabaseError(error)
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use repository::PreferenceRow;
    use repository::mock::{MockDataInserts, mock_store_a};
    use repository::test_db::setup_all;

    #[actix_rt::test]
    async fn test_preference() {
        #[derive(Debug, PartialEq)]
        struct TestPref;

        impl Preference for TestPref {
            type Value = i32;

            fn default_value(&self) -> Self::Value {
                42
            }

            fn key(&self) -> PrefKey {
                PrefKey::ShowContactTracing
            }
            fn preference_type(&self) -> PreferenceType {
                PreferenceType::Store
            }
            fn value_type(&self) -> PreferenceValueType {
                PreferenceValueType::Integer
            }
            fn query(
                &self,
                _connection: &StorageConnection,
                store_id: Option<String>,
            ) -> Result<Option<PreferenceRow>, PreferenceError> {
                let mock_pref = PreferenceRow {
                    id: "show_contact_tracing_store_a".to_string(),
                    key: self.key_str().to_string(),
                    value: r#"6"#.to_string(),
                    store_id: Some(mock_store_a().id),
                };

                match store_id {
                    Some(id) if id == mock_store_a().id => Ok(Some(mock_pref)),
                    _ => Ok(None),
                }
            }
        }

        let (_, connection, _, _) = setup_all("load_preference", MockDataInserts::none()).await;

        let store_id = mock_store_a().id;

        // Should return 6 (mocked value for store A)
        let pref2 = TestPref.load(&connection, Some(store_id)).unwrap();
        assert_eq!(pref2, 6);

        // Should return default (42) (no loaded pref in mock above for store B)
        let pref = TestPref
            .load(&connection, Some("store_b".to_string()))
            .unwrap();
        assert_eq!(pref, 42);
    }
}
