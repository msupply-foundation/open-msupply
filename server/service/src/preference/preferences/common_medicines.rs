use std::collections::{HashMap, HashSet};

use repository::{
    ItemLinkRow, ItemLinkRowRepository, ItemRow, ItemRowRepository, ItemType, RepositoryError,
    StorageConnection,
};

use crate::{
    preference::{
        PrefKey, Preference, PreferenceError, PreferenceType, PreferenceValueType,
        UpsertPreferenceError, upsert_helpers::upsert_store,
    },
    sync::CentralServerConfig,
};

/// A medicine card has room for this many one-press amounts.
pub const MAX_COMMON_MEDICINE_AMOUNTS: usize = 3;

/// One medicine on the Simple dispensing screen, with the amounts staff give
/// most often. Amounts are in the item's own unit (e.g. tablets), and an empty
/// list means the card asks for the amount instead.
///
/// The preference's JSON holds item ids, not item link ids, so they follow an
/// item merge by being looked up through `item_link` on every save and load:
/// `item_id` is always the item a merge kept. Two medicines that a merge makes
/// the same item become one, the first in the list.
#[derive(Default, Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonMedicine {
    pub item_id: String,
    pub amounts: Vec<f64>,
}

/// The medicines a store shows as cards on the Simple dispensing screen, in
/// the order they are shown (#2188).
pub struct CommonMedicines;

impl Preference for CommonMedicines {
    type Value = Vec<CommonMedicine>;

    fn key(&self) -> PrefKey {
        PrefKey::CommonMedicines
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::CommonMedicines
    }

    // Custom load so a list saved before an item merge shows the kept item.
    fn load(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<Self::Value, PreferenceError> {
        let Some(pref) = self.query(connection, store_id)? else {
            return Ok(self.default_value());
        };
        let medicines = self
            .deserialize(&pref.value)
            .map_err(|e| PreferenceError::DeserializeError(pref.key, pref.value, e.to_string()))?;
        let kept_as = kept_item_ids(connection, &medicines)?;

        Ok(as_kept_items(medicines, &kept_as))
    }

    // Custom upsert to validate the list. Until the settings editor exists the
    // list is set through the API, so this is the only check.
    fn upsert(
        &self,
        connection: &StorageConnection,
        value: Self::Value,
        store_id: Option<String>,
    ) -> Result<(), UpsertPreferenceError> {
        let store_id = store_id.ok_or(UpsertPreferenceError::StoreIdNotProvided)?;
        // A remote site can't save preferences at all, so say that rather
        // than what is wrong with the list.
        if !CentralServerConfig::is_central_server() {
            return Err(UpsertPreferenceError::NotACentralServer);
        }

        let value = checked_common_medicines(connection, value)?;

        let serialised_value = serde_json::to_string(&value)
            .map_err(|e| UpsertPreferenceError::SerializeError(self.key_str(), e.to_string()))?;

        upsert_store(connection, self.key_str(), serialised_value, store_id)
    }
}

/// Refuses a list the cards can't show, and returns it with each medicine as
/// the item a merge kept. Each medicine has to be an active stock item,
/// because the cards only read those. A database error stays a database
/// error, not a fault in the list.
fn checked_common_medicines(
    connection: &StorageConnection,
    medicines: Vec<CommonMedicine>,
) -> Result<Vec<CommonMedicine>, UpsertPreferenceError> {
    let invalid = |reason: String| {
        UpsertPreferenceError::InvalidValue(PrefKey::CommonMedicines.to_string(), reason)
    };
    let mut seen = HashSet::new();

    for CommonMedicine { item_id, amounts } in &medicines {
        if !seen.insert(item_id.as_str()) {
            return Err(invalid(format!("item {item_id} is listed more than once")));
        }
        if amounts.len() > MAX_COMMON_MEDICINE_AMOUNTS {
            return Err(invalid(format!(
                "item {item_id} has {} amounts, at most {MAX_COMMON_MEDICINE_AMOUNTS} are allowed",
                amounts.len()
            )));
        }
        if let Some(amount) = amounts.iter().find(|a| !(a.is_finite() && **a > 0.0)) {
            return Err(invalid(format!(
                "item {item_id} has amount {amount}, amounts must be above zero"
            )));
        }
    }

    // One query for the merges and one for the items, for the whole list
    let kept_as = kept_item_ids(connection, &medicines)?;
    let kept_ids: Vec<String> = kept_as.values().cloned().collect();
    let items: HashMap<String, ItemRow> = ItemRowRepository::new(connection)
        .find_many_by_id(&kept_ids)?
        .into_iter()
        .map(|item| (item.id.clone(), item))
        .collect();

    for CommonMedicine { item_id, .. } in &medicines {
        let Some(item) = kept_as.get(item_id).and_then(|kept| items.get(kept)) else {
            return Err(invalid(format!("item {item_id} does not exist")));
        };
        // Deleting an item only marks it inactive
        if !item.is_active {
            return Err(invalid(format!("item {item_id} is inactive")));
        }
        if item.r#type != ItemType::Stock {
            return Err(invalid(format!("item {item_id} is not a stock item")));
        }
    }

    Ok(as_kept_items(medicines, &kept_as))
}

/// The item each medicine's id is kept as since any merge, keyed by that id.
/// An id with no item link isn't in the map.
fn kept_item_ids(
    connection: &StorageConnection,
    medicines: &[CommonMedicine],
) -> Result<HashMap<String, String>, RepositoryError> {
    let ids: Vec<String> = medicines.iter().map(|m| m.item_id.clone()).collect();
    let links = ItemLinkRowRepository::new(connection).find_many_by_id(&ids)?;

    Ok(links
        .into_iter()
        .map(|ItemLinkRow { id, item_id }| (id, item_id))
        .collect())
}

/// Each medicine as the item a merge kept. When two become the same item the
/// first keeps its place and amounts, and the later one is dropped.
fn as_kept_items(
    medicines: Vec<CommonMedicine>,
    kept_as: &HashMap<String, String>,
) -> Vec<CommonMedicine> {
    let mut seen = HashSet::new();

    medicines
        .into_iter()
        .filter_map(|CommonMedicine { item_id, amounts }| {
            let item_id = kept_as.get(&item_id).cloned().unwrap_or(item_id);
            seen.insert(item_id.clone())
                .then_some(CommonMedicine { item_id, amounts })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        preference::{
            StorePrefUpdate, UpsertPreferenceError, UpsertPreferences, upsert_preferences,
        },
        service_provider::ServiceProvider,
        sync::test_util_set_is_central_server,
    };
    use repository::{
        PreferenceRowRepository,
        mock::{
            MockDataInserts, mock_item_a, mock_item_b, mock_item_c, mock_item_service_item,
            mock_store_a, mock_store_b,
        },
        test_db::setup_all,
    };

    fn medicine(item_id: &str, amounts: &[f64]) -> CommonMedicine {
        CommonMedicine {
            item_id: item_id.to_string(),
            amounts: amounts.to_vec(),
        }
    }

    #[actix_rt::test]
    async fn common_medicines_are_kept_per_store_in_order() {
        let (_, connection, _, _) =
            setup_all("common_medicines_per_store", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);
        let store_a = mock_store_a().id;
        let store_b = mock_store_b().id;

        // Nothing saved: no cards.
        assert_eq!(
            CommonMedicines.load(&connection, Some(store_a.clone())),
            Ok(vec![])
        );

        // The order given is the order kept, and an empty amount list is
        // allowed (the card asks for the amount instead).
        let list = vec![
            medicine(&mock_item_b().id, &[10.0, 20.0, 30.0]),
            medicine(&mock_item_a().id, &[]),
        ];
        CommonMedicines
            .upsert(&connection, list.clone(), Some(store_a.clone()))
            .unwrap();
        assert_eq!(
            CommonMedicines.load(&connection, Some(store_a.clone())),
            Ok(list)
        );

        // Another store's list is its own.
        assert_eq!(CommonMedicines.load(&connection, Some(store_b)), Ok(vec![]));
    }

    #[actix_rt::test]
    async fn common_medicines_reject_invalid_lists() {
        let (_, connection, _, _) =
            setup_all("common_medicines_invalid", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);
        let store_a = Some(mock_store_a().id);
        let item_a = mock_item_a().id;
        let item_b = mock_item_b().id;

        let is_invalid = |list: Vec<CommonMedicine>| {
            matches!(
                CommonMedicines.upsert(&connection, list, store_a.clone()),
                Err(UpsertPreferenceError::InvalidValue(_, _))
            )
        };

        // The same medicine twice
        assert!(is_invalid(vec![
            medicine(&item_a, &[10.0]),
            medicine(&item_a, &[20.0]),
        ]));
        // More amounts than a card has buttons for
        assert!(is_invalid(vec![medicine(&item_a, &[1.0, 2.0, 3.0, 4.0])]));
        // Zero, negative and not-a-number amounts
        assert!(is_invalid(vec![medicine(&item_a, &[0.0])]));
        assert!(is_invalid(vec![medicine(&item_b, &[-5.0])]));
        assert!(is_invalid(vec![medicine(&item_b, &[f64::NAN])]));
        // An item that doesn't exist
        assert!(is_invalid(vec![medicine("no_such_item", &[10.0])]));
        // A service item: the cards only show stock items
        assert!(is_invalid(vec![medicine(
            &mock_item_service_item().id,
            &[1.0]
        )]));
        // A deleted item, which is kept but marked inactive
        ItemRowRepository::new(&connection)
            .mark_deleted(&item_b)
            .unwrap();
        assert!(is_invalid(vec![
            medicine(&item_a, &[1.0]),
            medicine(&item_b, &[1.0]),
        ]));

        // Nothing was saved by any of the refused lists.
        assert_eq!(
            CommonMedicines.load(&connection, store_a.clone()),
            Ok(vec![])
        );

        // A store preference needs a store.
        assert_eq!(
            CommonMedicines.upsert(&connection, vec![], None),
            Err(UpsertPreferenceError::StoreIdNotProvided)
        );
    }

    #[actix_rt::test]
    async fn common_medicines_follow_an_item_merge() {
        let (_, connection, _, _) =
            setup_all("common_medicines_item_merge", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);
        let store_a = Some(mock_store_a().id);
        let store_b = Some(mock_store_b().id);
        let item_a = mock_item_a().id;
        let item_b = mock_item_b().id;
        let item_c = mock_item_c().id;

        // Store B's list is saved before any merge.
        let before_merge = vec![
            medicine(&item_a, &[1.0]),
            medicine(&item_c, &[]),
            medicine(&item_b, &[2.0]),
        ];
        CommonMedicines
            .upsert(&connection, before_merge, store_b.clone())
            .unwrap();

        // Item A is merged into item B: A's link now points at B.
        ItemLinkRowRepository::new(&connection)
            .upsert_one(&ItemLinkRow {
                id: item_a.clone(),
                item_id: item_b.clone(),
            })
            .unwrap();

        // Read after the merge, A shows as B, in A's place and with A's
        // amounts, and the later B is dropped.
        assert_eq!(
            CommonMedicines.load(&connection, store_b),
            Ok(vec![medicine(&item_b, &[1.0]), medicine(&item_c, &[])])
        );

        // A list naming the merged-away item is saved as the kept one.
        CommonMedicines
            .upsert(
                &connection,
                vec![medicine(&item_a, &[5.0])],
                store_a.clone(),
            )
            .unwrap();
        let saved = PreferenceRowRepository::new(&connection)
            .find_one_by_id(&format!(
                "{}_{}",
                PrefKey::CommonMedicines,
                mock_store_a().id
            ))
            .unwrap()
            .unwrap();
        assert_eq!(
            serde_json::from_str::<Vec<CommonMedicine>>(&saved.value).unwrap(),
            vec![medicine(&item_b, &[5.0])]
        );
    }

    #[actix_rt::test]
    async fn common_medicines_on_a_remote_site_are_refused_before_the_list_is_checked() {
        let (_, connection, _, _) =
            setup_all("common_medicines_remote_site", MockDataInserts::all()).await;
        test_util_set_is_central_server(false);

        // A list that breaks the rules still gets the remote-site refusal.
        assert_eq!(
            CommonMedicines.upsert(
                &connection,
                vec![medicine("no_such_item", &[0.0])],
                Some(mock_store_a().id)
            ),
            Err(UpsertPreferenceError::NotACentralServer)
        );
    }

    #[actix_rt::test]
    async fn common_medicines_for_several_stores_save_nothing_when_one_is_refused() {
        let (_, _, connection_manager, _) =
            setup_all("common_medicines_several_stores", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let store_a = mock_store_a().id;
        let store_b = mock_store_b().id;

        // Store A's list is fine, store B's names an item that doesn't exist.
        let result = upsert_preferences(
            &ctx,
            UpsertPreferences {
                common_medicines: Some(vec![
                    StorePrefUpdate {
                        store_id: store_a.clone(),
                        value: vec![medicine(&mock_item_a().id, &[10.0])],
                    },
                    StorePrefUpdate {
                        store_id: store_b.clone(),
                        value: vec![medicine("no_such_item", &[10.0])],
                    },
                ]),
                ..Default::default()
            },
        );
        assert!(matches!(
            result,
            Err(UpsertPreferenceError::InvalidValue(_, _))
        ));

        // Neither store's list was saved.
        assert_eq!(
            CommonMedicines.load(&ctx.connection, Some(store_a)),
            Ok(vec![])
        );
        assert_eq!(
            CommonMedicines.load(&ctx.connection, Some(store_b)),
            Ok(vec![])
        );
    }

    #[actix_rt::test]
    async fn common_medicines_report_a_database_error_as_one() {
        let (_, connection, _, _) =
            setup_all("common_medicines_database_error", MockDataInserts::all()).await;
        test_util_set_is_central_server(true);

        // Shadow the tables the check reads with temporary ones that lack
        // their columns, so its query fails (on this connection only).
        connection
            .batch_execute(
                "CREATE TEMPORARY TABLE item (unrelated TEXT); \
                 CREATE TEMPORARY TABLE item_link (unrelated TEXT);",
            )
            .unwrap();

        assert!(matches!(
            CommonMedicines.upsert(
                &connection,
                vec![medicine(&mock_item_a().id, &[10.0])],
                Some(mock_store_a().id)
            ),
            Err(UpsertPreferenceError::DatabaseError(_))
        ));
    }
}
