use repository::{PreferenceRow, RepositoryError, StorageConnection};
use serde::{de::DeserializeOwned, Serialize};

use strum::{Display, EnumString};
use thiserror::Error;

use super::{
    query_preference::{query_global, query_store},
    upsert_helpers::{upsert_global, upsert_store},
};

#[derive(Clone, Display, EnumString)]
#[strum(serialize_all = "snake_case")]
pub enum PrefKey {
    // Global preferences
    AllowTrackingOfStockByDonor,
    AuthorisePurchaseOrder,
    AuthoriseGoodsReceived,
    CustomTranslations,
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
    IsGaps,

    // Store preferences
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
}

#[derive(Clone, Debug, PartialEq)]
pub enum PreferenceType {
    Global,
    Store,
    // User,
    // Machine,
}

#[derive(Clone, PartialEq)]
pub enum PreferenceValueType {
    Boolean,
    Integer,
    MultiChoice,
    // specific type to CustomTranslations preference
    CustomTranslations,
    WarnWhenMissingRecentStocktakeData,
    String,
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
}

pub trait Preference: Sync + Send {
    type Value: Default + DeserializeOwned + Serialize;

    fn key(&self) -> PrefKey;

    fn key_str(&self) -> String {
        self.key().to_string()
    }

    fn preference_type(&self) -> PreferenceType;

    fn value_type(&self) -> PreferenceValueType;

    fn query(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<Option<PreferenceRow>, PreferenceError> {
        let pref = match self.preference_type() {
            PreferenceType::Global => query_global(connection, &self.key_str())?,
            PreferenceType::Store => {
                let store_id = store_id.ok_or(PreferenceError::StoreIdNotProvided)?;
                query_store(connection, &self.key_str(), &store_id)?
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

        match self.preference_type() {
            PreferenceType::Global => upsert_global(connection, self.key_str(), serialised_value)?,
            PreferenceType::Store => {
                let store_id = store_id.ok_or(UpsertPreferenceError::StoreIdNotProvided)?;
                upsert_store(connection, self.key_str(), serialised_value, store_id)?;
            }
        };

        Ok(())
    }

    fn as_description(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<PreferenceDescription, PreferenceError> {
        let value = self.load(connection, store_id)?;

        let value = serde_json::to_value(value).map_err(|e| {
            PreferenceError::ConversionError(self.key_str().to_string(), e.to_string())
        })?;

        Ok(PreferenceDescription {
            key: self.key(),
            value_type: self.value_type(),
            value,
        })
    }
}

pub struct PreferenceDescription {
    pub key: PrefKey,
    pub value_type: PreferenceValueType,
    /// WARNING: Type loss - holds any kind of pref value (for edit UI).
    /// Use the PreferenceProvider to load the strictly typed value.
    pub value: serde_json::Value,
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
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::PreferenceRow;

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
