use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "prescription_request_occupation_prominent"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The builtin custom-field seeder (`service/src/custom_field/builtin.rs`)
        // shipped `prescription_request_occupation` as VISIBLE from 33c81efa04
        // until f15c79bbfd (26 Aug – 7 Sep 2026: `v3.02.0-RC-prescriptions-3`
        // and the `v3.02.00-develop` builds of that window); the spec and product want it PROMINENT, beside the
        // other three request fields on the detail header (issue #932). The
        // seeder writes `display_mode` on create only — it belongs to the
        // deployment after that — so fixing the registry does not reach a
        // database that was already seeded. This one-off lifts those rows.
        //
        // Only rows still holding the seeded default move. HIDDEN is a
        // deployment's explicit choice and stays. A deployment that chose
        // VISIBLE on purpose is indistinguishable from the stale default, and
        // the field existed with that default for only a couple of weeks of
        // RC builds, so the stale default is by far the likelier reading.
        //
        // Matched by (custom_field_id, scope), the table's UNIQUE natural key,
        // rather than by row id. The seeder names the row `<key>__<scope>`, but
        // that is its own convention, not something the table enforces, and a
        // row that arrived another way can carry a different id (the e2e
        // datafile's hand-authored rows use `<key>__scope_<scope>`).
        //
        // `custom_field_scope` is central-authored and reaches remotes over v7
        // through the changelog, so central's flip needs a changelog row or
        // remotes that were already past the original insert would never hear
        // of it. Remotes run this fragment too, and their row must not be
        // pushed back (central rejects remote pushes of this table), so the
        // row is stamped with the central server's site id — falling back to 0,
        // the OMS-central convention — exactly as
        // `populate_missing_changelog_for_form_schema` does. The push filter
        // only sends rows authored on the pushing site, so that stamp keeps it
        // local on a remote while central distributes it as its own.
        sql!(
            connection,
            r#"
            INSERT INTO changelog (table_name, record_id, row_action, source_site_id)
            SELECT 'custom_field_scope', s.id, 'UPSERT',
                COALESCE(
                    (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'),
                    0
                )
            FROM custom_field_scope s
            WHERE s.custom_field_id = 'prescription_request_occupation'
              AND s.scope = 'prescription_request'
              AND s.display_mode = 'VISIBLE';

            UPDATE custom_field_scope
            SET display_mode = 'PROMINENT'
            WHERE custom_field_id = 'prescription_request_occupation'
              AND scope = 'prescription_request'
              AND display_mode = 'VISIBLE';
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::prelude::*;

    table! {
        custom_field_scope (id) {
            id -> Text,
            display_mode -> Text,
        }
    }

    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            row_action -> Text,
            store_id -> Nullable<Text>,
            source_site_id -> Nullable<Integer>,
            transfer_store_id -> Nullable<Text>,
            patient_link_id -> Nullable<Text>,
        }
    }

    fn display_mode(connection: &StorageConnection, id: &str) -> String {
        custom_field_scope::table
            .filter(custom_field_scope::id.eq(id))
            .select(custom_field_scope::display_mode)
            .first::<String>(connection.lock().connection())
            .unwrap()
    }

    fn changelog_count(connection: &StorageConnection, record_id: &str) -> i64 {
        changelog::table
            .filter(changelog::table_name.eq("custom_field_scope"))
            .filter(changelog::record_id.eq(record_id))
            .count()
            .get_result::<i64>(connection.lock().connection())
            .unwrap()
    }

    #[actix_rt::test]
    async fn migration_prescription_request_occupation_prominent() {
        let previous_version = v3_02_00::V3_02_00.version();
        let version = v3_04_00::V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_prescription_request_occupation_prominent"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        // The occupation row as a 3.02 build seeded before f15c79bbfd left it
        // (the seeder's id, stale VISIBLE default), a sibling builtin that is legitimately VISIBLE on the
        // same scope, and the same field on a scope it never applied to — only
        // the first may move. The central site id is set as it is on a site
        // that has synced.
        sql!(
            &connection,
            r#"
            INSERT INTO custom_field (id, key, name, value_type, kind) VALUES
                ('prescription_request_occupation', 'prescription_request_occupation', 'Occupation', 'TEXT', 'BUILTIN'),
                ('prescription_request_weight', 'prescription_request_weight', 'Weight', 'REAL', 'BUILTIN');
            INSERT INTO custom_field_scope (id, custom_field_id, scope, display_mode, sort_order) VALUES
                ('prescription_request_occupation__prescription_request', 'prescription_request_occupation', 'prescription_request', 'VISIBLE', '5300'),
                ('prescription_request_weight__prescription_request', 'prescription_request_weight', 'prescription_request', 'VISIBLE', '5100'),
                ('prescription_request_occupation__name', 'prescription_request_occupation', 'name', 'VISIBLE', '5300');
            INSERT INTO key_value_store (id, value_int) VALUES
                ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', 42);
            "#
        )
        .unwrap();

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        let occupation = "prescription_request_occupation__prescription_request";
        assert_eq!(display_mode(&connection, occupation), "PROMINENT");
        assert_eq!(
            display_mode(
                &connection,
                "prescription_request_weight__prescription_request"
            ),
            "VISIBLE",
            "another field's VISIBLE row must not move"
        );
        assert_eq!(
            display_mode(&connection, "prescription_request_occupation__name"),
            "VISIBLE",
            "occupation on another scope must not move"
        );

        // The flipped row is announced to remotes as a keyless central row,
        // stamped with the central site id; the untouched rows are not.
        assert_eq!(changelog_count(&connection, occupation), 1);
        assert_eq!(
            changelog_count(
                &connection,
                "prescription_request_weight__prescription_request"
            ),
            0
        );
        let row = changelog::table
            .filter(changelog::table_name.eq("custom_field_scope"))
            .filter(changelog::record_id.eq(occupation))
            .select((
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
                changelog::transfer_store_id,
                changelog::patient_link_id,
            ))
            .first::<(
                String,
                Option<String>,
                Option<i32>,
                Option<String>,
                Option<String>,
            )>(connection.lock().connection())
            .unwrap();
        assert_eq!(row, ("UPSERT".to_string(), None, Some(42), None, None));

        // A deployment's explicit choice survives: hidden stays hidden, and a
        // row that already holds PROMINENT emits nothing more.
        sql!(
            &connection,
            r#"
            UPDATE custom_field_scope SET display_mode = 'HIDDEN'
            WHERE id = 'prescription_request_occupation__prescription_request';
            "#
        )
        .unwrap();
        super::Migrate.migrate(&connection).unwrap();
        assert_eq!(display_mode(&connection, occupation), "HIDDEN");
        assert_eq!(
            changelog_count(&connection, occupation),
            1,
            "a row that did not move must not emit changelog"
        );
    }
}
