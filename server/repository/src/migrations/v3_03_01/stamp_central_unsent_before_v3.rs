use crate::{migrations::*, StorageConnection};
use diesel::{
    dsl::{max, not, sql},
    prelude::*,
    sql_types::{Integer, Nullable},
};

// Local copies of the columns used, as in the 3.3.1 schema, so later schema changes
// don't affect this migration.
table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> Text,
        record_id -> Text,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
    }
}

table! {
    report (id) {
        id -> Text,
        is_custom -> Bool,
    }
}

allow_tables_to_appear_in_same_query!(changelog, report);

diesel::alias!(changelog as latest: Latest);

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "stamp_central_unsent_before_v3"
    }

    /// Stamp central's id on its own 2.x changelog rows in v6 tables.
    ///
    /// 2.x wrote central's own edits with no source_site_id. The 2.x pull still sent them
    /// to remotes, but the 3.x pull filter (`source_site_id != remote`) never matches a
    /// null, so edits a remote hadn't pulled before central upgraded never reach it.
    /// Stamping in place is enough: each remote pulls from its own cursor, so it only
    /// gets the rows it hadn't pulled.
    ///
    /// Only each record's latest row is stamped, as a pull only sends the latest row per
    /// record. If a remote edited the record after central, nothing is stamped, so the
    /// remote doesn't pull central's older edit.
    ///
    /// Standard reports are left out, as each site loads them from its own build.
    ///
    /// Only runs on central upgrading from 2.x. Central can't be detected directly, so
    /// skip any site with a v6 push cursor, which every 2.x remote has and central never
    /// does. A remote that started below 2.0 has no v6 push cursor either, so the version
    /// check skips it.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_on_2x = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| {
                *version >= Version::from_str("2.0.0") && *version < Version::from_str("3.0.0")
            });
        if !started_on_2x || has_v6_push_cursor(connection)? {
            return Ok(());
        }

        let Some(site_id) = key_value_int(connection, "SETTINGS_SYNC_SITE_ID")? else {
            // Not initialised, so nothing to stamp
            return Ok(());
        };

        // Latest changelog cursor per record, whatever its source
        let latest_per_record = latest
            .filter(
                latest
                    .field(changelog::table_name)
                    .eq_any(CENTRAL_SENT_TABLES),
            )
            .group_by((
                latest.field(changelog::table_name),
                latest.field(changelog::record_id),
            ))
            .select(max(latest.field(changelog::cursor)).assume_not_null());

        let standard_report_ids = report::table
            .filter(report::is_custom.eq(false))
            .select(report::id);

        diesel::update(changelog::table)
            .filter(changelog::source_site_id.is_null())
            .filter(changelog::is_sync_update.eq(false))
            .filter(changelog::cursor.eq_any(latest_per_record))
            .filter(not(changelog::table_name
                .eq("report")
                .and(changelog::record_id.eq_any(standard_report_ids))))
            .set(changelog::source_site_id.eq(site_id))
            .execute(connection.lock().connection())?;

        Ok(())
    }
}

/// v6 tables central writes its own rows in. Hard-coded so later sync style changes
/// don't change what this does to an older database.
const CENTRAL_SENT_TABLES: &[&str] = &[
    // Central data
    "ancillary_item",
    "asset_catalogue_item",
    "asset_catalogue_type",
    "asset_category",
    "asset_class",
    "asset_log_reason",
    "asset_property",
    "backend_plugin",
    "campaign",
    "demographic",
    "form_schema",
    "frontend_plugin",
    "help_document",
    "item_variant",
    "name_oms_fields",
    "name_property",
    "packaging_variant",
    "property",
    "report",
    "vaccine_course",
    "vaccine_course_dose",
    "vaccine_course_item",
    "vaccine_course_store_config",
    // Sent to every site
    "sync_file_reference",
    // Store or patient data central can also edit
    "asset",
    "asset_internal_location",
    "asset_log",
    "vaccination",
    "plugin_data",
    "preference",
    // Not sent to remotes outside initialisation, stamped so the rows match 3.x
    "bundled_item",
    "contact_form",
    "encounter",
    "rnr_form",
    "rnr_form_line",
    "system_log",
];

/// `value_int` for a key_value_store key, null when the key isn't set.
fn key_value_int(connection: &StorageConnection, key: &str) -> anyhow::Result<Option<i32>> {
    // Subquery so a missing key reads as null. The key is inlined because on Postgres
    // the id column is an enum, which doesn't compare with a text bind parameter.
    let value = diesel::select(sql::<Nullable<Integer>>(&format!(
        "(SELECT value_int FROM key_value_store WHERE id = '{key}')"
    )))
    .get_result(connection.lock().connection())?;
    Ok(value)
}

/// Whether there's a v6 push cursor. Only remotes write one.
fn has_v6_push_cursor(connection: &StorageConnection) -> anyhow::Result<bool> {
    let cursor_key: Option<i32> = diesel::select(sql::<Nullable<Integer>>(
        "(SELECT 1 FROM key_value_store WHERE id = 'SYNC_PUSH_CURSOR_V6')",
    ))
    .get_result(connection.lock().connection())?;
    Ok(cursor_key.is_some())
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_21_01::V2_21_01, v3_03_01::V3_03_01, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*};

    use super::changelog;

    #[actix_rt::test]
    async fn stamps_latest_central_rows_on_central_upgrading_from_2x() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_stamp_central_unsent",
            version: Some(V2_21_01.version()),
            ..Default::default()
        })
        .await;

        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_SITE_ID', 5);
                INSERT INTO report (id, name, template, context, is_custom) VALUES
                    ('report_standard', 'Standard', '', 'INBOUND_SHIPMENT', FALSE);
                -- Clear the row the 2.x changelog trigger wrote for the report
                DELETE FROM changelog;
                INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update, source_site_id) VALUES
                    ('vaccine_course', 'edited_twice', 'UPSERT', NULL, FALSE, NULL),
                    ('vaccine_course', 'edited_twice', 'UPSERT', NULL, FALSE, NULL),
                    ('report', 'report_standard', 'UPSERT', NULL, FALSE, NULL),
                    ('report', 'report_deleted', 'DELETE', NULL, FALSE, NULL),
                    -- Edited by central, then by a remote
                    ('asset_log', 'edited_by_remote', 'UPSERT', 'store_remote', FALSE, NULL),
                    ('asset_log', 'edited_by_remote', 'UPSERT', 'store_remote', TRUE, 6);
                "#,
            )
            .unwrap();

        migrate(
            &connection,
            Some(V3_03_01.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        let ids = [
            "edited_twice",
            "report_standard",
            "report_deleted",
            "edited_by_remote",
        ];
        let stamps: Vec<(String, Option<i32>)> = changelog::table
            .filter(changelog::record_id.eq_any(ids))
            .order(changelog::cursor)
            .select((changelog::record_id, changelog::source_site_id))
            .load(connection.lock().connection())
            .unwrap();
        let expected = [
            ("edited_twice", None),
            ("edited_twice", Some(5)),
            ("report_standard", None),
            ("report_deleted", Some(5)),
            ("edited_by_remote", None),
            ("edited_by_remote", Some(6)),
        ]
        .map(|(id, source)| (id.to_string(), source));
        assert_eq!(stamps, expected);
    }
}
