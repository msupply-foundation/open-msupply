//! A store's supply interval and safety buffer, from its facility record (the store name's
//! `properties`). Their sum is a general internal order's default target months of stock,
//! and the [`CanChangeTargetMonthsOfStock`] preference can fix the target
//! to it.

use crate::preference::{CanChangeTargetMonthsOfStock, Preference};
use repository::{
    EqualFilter, NameFilter, NameRepository, NameRowRepository, RepositoryError, StorageConnection,
    StoreRowRepository,
};
use serde_json::{Map, Value};

/// A general order's target months on a store with no supply interval.
pub const DEFAULT_TARGET_MONTHS_OF_STOCK: f64 = 1.0;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SupplyIntervalAndBuffer {
    pub supply_interval_months: f64,
    /// Zero when the facility record carries none
    pub safety_buffer_months: f64,
}

impl SupplyIntervalAndBuffer {
    /// Supply interval + safety buffer
    pub fn total_months(&self) -> f64 {
        self.supply_interval_months + self.safety_buffer_months
    }

    /// None without a supply interval.
    fn from_properties(properties: &Map<String, Value>) -> Option<Self> {
        Some(SupplyIntervalAndBuffer {
            supply_interval_months: properties.get("supply_interval")?.as_f64()?,
            safety_buffer_months: properties
                .get("buffer_stock")
                .and_then(Value::as_f64)
                .unwrap_or_default(),
        })
    }
}

/// The `properties` of the facility record of the name matching `filter`, empty when it has
/// none or they don't parse.
fn name_properties(
    connection: &StorageConnection,
    store_id: &str,
    filter: NameFilter,
) -> Result<Map<String, Value>, RepositoryError> {
    Ok(NameRepository::new(connection)
        .query_by_filter(store_id, filter)?
        .pop()
        .and_then(|name| name.properties)
        .and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default())
}

/// The `properties` of the store's own facility record.
pub(crate) fn store_properties(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Map<String, Value>, RepositoryError> {
    // The store's own name row, read directly: the name query would also build
    // every name visible in the store on SQLite (#1355). As before, a disabled
    // store's properties are ignored.
    Ok(StoreRowRepository::new(connection)
        .find_one_by_id(store_id)?
        .filter(|store| !store.is_disabled)
        .map(|store| NameRowRepository::new(connection).find_one_oms_fields_by_id(&store.name_id))
        .transpose()?
        .flatten()
        .and_then(|name| name.properties)
        .and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default())
}

/// The store's supply interval and safety buffer, None when its facility record carries no
/// supply interval.
pub fn store_supply_interval_and_buffer(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Option<SupplyIntervalAndBuffer>, RepositoryError> {
    Ok(SupplyIntervalAndBuffer::from_properties(&store_properties(
        connection, store_id,
    )?))
}

/// The supply interval and safety buffer of the name `name_id` (e.g. a customer ordering
/// from `store_id`).
pub fn name_supply_interval_and_buffer(
    connection: &StorageConnection,
    store_id: &str,
    name_id: &str,
) -> Result<Option<SupplyIntervalAndBuffer>, RepositoryError> {
    Ok(SupplyIntervalAndBuffer::from_properties(&name_properties(
        connection,
        store_id,
        NameFilter::new().id(EqualFilter::equal_to(name_id.to_string())),
    )?))
}

/// A new general order's target months: the store's supply interval + safety buffer, else
/// [`DEFAULT_TARGET_MONTHS_OF_STOCK`].
pub fn default_target_months_of_stock(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<f64, RepositoryError> {
    Ok(store_supply_interval_and_buffer(connection, store_id)?
        .map(|interval| interval.total_months())
        .unwrap_or(DEFAULT_TARGET_MONTHS_OF_STOCK))
}

/// The supply interval and safety buffer a general order's target is fixed to: the store's,
/// when it has a supply interval and the
/// [`CanChangeTargetMonthsOfStock`] preference is off. None when the target can change.
pub fn fixed_target_months_of_stock(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Option<SupplyIntervalAndBuffer>, RepositoryError> {
    let can_change = CanChangeTargetMonthsOfStock
        .load(connection, Some(store_id.to_string()))
        .unwrap_or(true);
    if can_change {
        return Ok(None);
    }
    store_supply_interval_and_buffer(connection, store_id)
}

#[cfg(test)]
mod test {
    use crate::{
        requisition::request_requisition::{
            InsertRequestRequisition, UpdateRequestRequisition,
            UpdateRequestRequisitionError as UpdateError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        NameRowRepository, PreferenceRow, PreferenceRowRepository,
        mock::{
            MockDataInserts, mock_name_store_a, mock_name_store_c, mock_store_a,
            mock_user_account_a,
        },
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn general_order_target_months_follow_the_store_supply_interval() {
        let (_, connection, connection_manager, _) = setup_all(
            "general_order_target_months_follow_the_store_supply_interval",
            MockDataInserts::all(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.requisition_service;

        let set_properties = |properties: Option<&str>| {
            NameRowRepository::new(&connection)
                .update_properties(&mock_name_store_a().id, &properties.map(str::to_string))
                .unwrap();
        };
        let insert = |id: &str, max_months_of_stock: Option<f64>| {
            service
                .insert_request_requisition(
                    &context,
                    InsertRequestRequisition {
                        id: id.to_string(),
                        other_party_id: mock_name_store_c().id,
                        max_months_of_stock,
                        ..Default::default()
                    },
                )
                .unwrap()
                .requisition_row
                .max_months_of_stock
        };
        let update = |max: Option<f64>, min: Option<f64>| {
            service
                .update_request_requisition(
                    &context,
                    UpdateRequestRequisition {
                        id: "with_supply_interval".to_string(),
                        max_months_of_stock: max,
                        min_months_of_stock: min,
                        ..Default::default()
                    },
                )
                .map(|requisition| requisition.requisition_row.max_months_of_stock)
        };

        // No supply interval: 1 month
        set_properties(None);
        assert_eq!(insert("no_supply_interval", None), 1.0);

        // A supply interval and buffer: their sum, whatever it is; a given target wins
        set_properties(Some(r#"{"supply_interval": 3, "buffer_stock": 0.5}"#));
        assert_eq!(insert("with_supply_interval", None), 3.5);
        assert_eq!(insert("given_target", Some(2.0)), 2.0);
        // No buffer counts as zero
        set_properties(Some(r#"{"supply_interval": 7}"#));
        assert_eq!(insert("no_buffer", None), 7.0);
        set_properties(Some(r#"{"supply_interval": 3, "buffer_stock": 0.5}"#));

        // The preference unset: the target changes
        assert_eq!(update(Some(4.0), None), Ok(4.0));

        // Off: a change is rejected; resending the current target or changing the
        // threshold isn't
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "can_change_target_months_of_stock_store_a".to_string(),
                key: "can_change_target_months_of_stock".to_string(),
                value: "false".to_string(),
                store_id: Some(mock_store_a().id),
            })
            .unwrap();
        assert_eq!(
            update(Some(5.0), None),
            Err(UpdateError::CannotChangeTargetMonthsOfStock)
        );
        assert_eq!(update(Some(4.0), Some(1.0)), Ok(4.0));
        assert_eq!(update(None, Some(2.0)), Ok(4.0));
        // A target set before the store fixed it can move onto the store's, and not back off
        assert_eq!(update(Some(3.5), None), Ok(3.5));
        assert_eq!(
            update(Some(4.0), None),
            Err(UpdateError::CannotChangeTargetMonthsOfStock)
        );
        // and a new order takes the store's supply interval + safety buffer, whatever
        // target is sent
        assert_eq!(insert("fixed_given_target", Some(1.0)), 3.5);
        assert_eq!(insert("fixed_no_target", None), 3.5);

        // Off on a store with no supply interval: the target changes
        set_properties(None);
        assert_eq!(update(Some(2.0), None), Ok(2.0));
    }
}
