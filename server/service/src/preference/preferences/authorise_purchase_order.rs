use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AuthorisePurchaseOrder;

impl Preference for AuthorisePurchaseOrder {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AuthorisePurchaseOrder
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn allows_store_override(&self) -> bool {
        true
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        preference::{
            BlindStocktake, OverridingStore, PreferenceDescription, PreferenceService,
            PreferenceServiceTrait, StoreOverrideDescription, UpsertPreferenceError,
            query_preference::{query_global, query_overriding_stores, query_store},
        },
        sync::test_util_set_is_central_server,
    };
    use repository::{
        mock::{MockDataInserts, mock_name_store_a, mock_name_store_b, mock_store_a, mock_store_b},
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn store_override_falls_back_to_global() {
        let (_, connection, connection_manager, _) = setup_all(
            "authorise_purchase_order_store_override",
            MockDataInserts::none().names().stores(),
        )
        .await;
        test_util_set_is_central_server(true);

        let store_a = mock_store_a().id;
        let store_b = mock_store_b().id;
        let load = |store_id: Option<&str>| {
            AuthorisePurchaseOrder
                .load(&connection, store_id.map(str::to_string))
                .unwrap()
        };

        // Nothing stored: the built-in default, globally and for every store.
        assert!(!load(None));
        assert!(!load(Some(&store_a)));

        // The global value is every store's default.
        AuthorisePurchaseOrder
            .upsert(&connection, true, None)
            .unwrap();
        assert!(load(None));
        assert!(load(Some(&store_a)));
        assert!(load(Some(&store_b)));

        // A store's override wins for that store alone; the global row is untouched.
        AuthorisePurchaseOrder
            .upsert(&connection, false, Some(store_a.clone()))
            .unwrap();
        assert!(!load(Some(&store_a)));
        assert!(load(Some(&store_b)));
        assert!(load(None));

        // One row per scope: the override never overwrites the global row.
        let key = AuthorisePurchaseOrder.key_str();
        assert_eq!(
            query_global(&connection, &key).unwrap().unwrap().value,
            "true"
        );
        assert_eq!(
            query_store(&connection, &key, &store_a)
                .unwrap()
                .unwrap()
                .value,
            "false"
        );
        assert!(query_store(&connection, &key, &store_b).unwrap().is_none());

        // Listed for both scopes, the store list carrying each store's effective value.
        let service = PreferenceService {};
        let is_this = |d: &PreferenceDescription| matches!(d.key, PrefKey::AuthorisePurchaseOrder);
        // The resolver ALWAYS names the caller's store, whatever the listing —
        // so the global listing is exercised both ways: with no store, and
        // with the store that has pinned its own value.
        let describe_global_for = |store_id: Option<&str>| {
            service
                .get_preference_descriptions(
                    connection_manager.connection().unwrap(),
                    store_id.map(str::to_string),
                    PreferenceType::Global,
                )
                .unwrap()
                .into_iter()
                .find(is_this)
                .unwrap()
        };
        let describe_global = || describe_global_for(None);
        let describe_store = |store_id: &str| {
            service
                .get_preference_descriptions(
                    connection_manager.connection().unwrap(),
                    Some(store_id.to_string()),
                    PreferenceType::Store,
                )
                .unwrap()
                .into_iter()
                .find(is_this)
                .unwrap()
        };

        let global = describe_global();
        assert_eq!(global.value, true);
        // The global listing describes the global row alone, and NAMES the
        // stores that have opted out of it — the page needs the names, and a
        // count carried separately could disagree with them.
        assert_eq!(global.store_override, None);
        assert_eq!(
            global.overriding_stores,
            Some(vec![OverridingStore {
                store_id: store_a.clone(),
                store_name: mock_name_store_a().name,
            }])
        );

        // Asked from INSIDE store A — which has pinned false — the global
        // listing still describes the global row. Anything else and an admin
        // editing install-wide values would read, and then overwrite, their
        // own store's exception without ever being told.
        let global_from_store_a = describe_global_for(Some(&store_a));
        assert_eq!(global_from_store_a.value, true);
        assert_eq!(global_from_store_a.store_override, None);
        assert_eq!(
            global_from_store_a.overriding_stores,
            global.overriding_stores
        );

        for (store_id, expected, is_overridden) in
            [(&store_a, false, true), (&store_b, true, false)]
        {
            let store = describe_store(store_id);
            assert_eq!(store.value, expected);
            // Each store says whether it pins its own value, and what it
            // follows (or would return to) either way.
            assert_eq!(
                store.store_override,
                Some(StoreOverrideDescription {
                    is_overridden,
                    global_value: serde_json::json!(true),
                })
            );
            assert_eq!(store.overriding_stores, None);
        }
    }

    #[actix_rt::test]
    async fn clearing_a_store_override_restores_the_global_value() {
        let (_, connection, _, _) = setup_all(
            "clear_authorise_purchase_order_store_override",
            MockDataInserts::none().names().stores(),
        )
        .await;
        test_util_set_is_central_server(true);

        let store_a = mock_store_a().id;
        let key = AuthorisePurchaseOrder.key_str();

        // Authorisation required everywhere, store A opted out.
        AuthorisePurchaseOrder
            .upsert(&connection, true, None)
            .unwrap();
        AuthorisePurchaseOrder
            .upsert(&connection, false, Some(store_a.clone()))
            .unwrap();
        assert!(query_store(&connection, &key, &store_a).unwrap().is_some());

        // Clearing drops the store's row, so the store follows global again —
        // including a LATER global change, which an override would have
        // ignored.
        AuthorisePurchaseOrder
            .clear_store_override(&connection, store_a.clone())
            .unwrap();
        assert!(query_store(&connection, &key, &store_a).unwrap().is_none());
        assert!(
            AuthorisePurchaseOrder
                .load(&connection, Some(store_a.clone()))
                .unwrap()
        );
        AuthorisePurchaseOrder
            .upsert(&connection, false, None)
            .unwrap();
        assert!(
            !AuthorisePurchaseOrder
                .load(&connection, Some(store_a.clone()))
                .unwrap()
        );

        // Clearing an override a store never had is a no-op, not an error: the
        // editor sends "use global" whether or not a row was written.
        AuthorisePurchaseOrder
            .clear_store_override(&connection, store_a.clone())
            .unwrap();

        // The global row is never what a clear removes.
        assert_eq!(
            query_global(&connection, &key).unwrap().unwrap().value,
            "false"
        );

        // Cleared, the store is no longer named on the global page — and two
        // overriding stores are named in store-name order, whatever order
        // their rows were written in.
        assert_eq!(query_overriding_stores(&connection, &key).unwrap(), vec![]);
        let store_b = mock_store_b().id;
        for store in [&store_b, &store_a] {
            AuthorisePurchaseOrder
                .upsert(&connection, true, Some(store.clone()))
                .unwrap();
        }
        assert_eq!(
            query_overriding_stores(&connection, &key).unwrap(),
            vec![
                OverridingStore {
                    store_id: store_a.clone(),
                    store_name: mock_name_store_a().name,
                },
                OverridingStore {
                    store_id: store_b.clone(),
                    store_name: mock_name_store_b().name,
                },
            ]
        );

        // A preference no store may override has no global row to fall back
        // to, so clearing one is refused rather than silently meaning "the
        // built-in default".
        assert_eq!(
            BlindStocktake.clear_store_override(&connection, store_a.clone()),
            Err(UpsertPreferenceError::NotOverridable(
                BlindStocktake.key_str()
            ))
        );
    }
}
