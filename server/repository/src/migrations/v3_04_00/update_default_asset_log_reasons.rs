use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_default_asset_log_reasons"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Brings the "Not functioning" reasons seeded in v2_00_00 in line with
        // the list UNICEF specified (issue #1287): "Multiple temperature
        // breaches" was filed under Not in use and is renamed and moved, and
        // "Solar panel failure" and "Other" are added. "Other" requires a
        // comment, so the log still says what the reason was.
        //
        // Every site runs this fragment and ends up with the same rows by these
        // fixed ids. ON CONFLICT keeps the inserts safe on a site that already
        // has them.
        //
        // Sites don't upgrade together, though, and `asset_log.reason_id` is
        // foreign-key checked on pull: a log carrying a reason the receiving
        // site doesn't have yet integrates with its reason cleared, and stays
        // that way after the site upgrades. So `asset_log_reason` (central-
        // authored, central-distributed) also gets changelog rows, letting an
        // upgraded central send these three to remotes that haven't upgraded.
        // They're stamped with the central server's site id, falling back to 0,
        // the OMS-central convention, as `prescription_request_occupation_prominent`
        // does, so a remote running this fragment never pushes them back.
        sql!(
            connection,
            r#"
            UPDATE asset_log_reason
            SET asset_log_status = 'NOT_FUNCTIONING', reason = 'Multiple temperature excursions'
            WHERE id = '2f734462-c76d-4b08-b8d2-40b250538d46';

            INSERT INTO asset_log_reason (id, asset_log_status, reason, comments_required)
            VALUES ('ba800d96-2cf6-44e8-8fbb-41fedb154265', 'NOT_FUNCTIONING', 'Solar panel failure', FALSE),
            ('646c80b2-2ff7-4c50-916b-18ff3df5cfb5', 'NOT_FUNCTIONING', 'Other', TRUE)
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO changelog (table_name, record_id, row_action, source_site_id)
            SELECT 'asset_log_reason', r.id, 'UPSERT',
                COALESCE(
                    (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'),
                    0
                )
            FROM asset_log_reason r
            WHERE r.id IN (
                '2f734462-c76d-4b08-b8d2-40b250538d46',
                'ba800d96-2cf6-44e8-8fbb-41fedb154265',
                '646c80b2-2ff7-4c50-916b-18ff3df5cfb5'
            );
            "#
        )?;

        Ok(())
    }
}
