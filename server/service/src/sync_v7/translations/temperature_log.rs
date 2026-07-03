use repository::{
    syncv7::SyncRecordSerializeError, ChangeLogInsertRow, StorageConnection, TemperatureLogRow,
    TemperatureLogRowRepository, Upsert,
};

use crate::sync_v7::serde::DeserializeResult;

// De-duplicate temperature logs.
//
// Multiple devices can load the same FridgeTag and sync. Each device assigns
// its own `id` to what is physically the same reading, so a site would
// otherwise integrate one row per device and the Logs list shows duplicates
// (issue #11238). A reading is uniquely identified by its sensor and the
// instant it was taken, so we collapse an incoming log onto the record that
// already exists for the same (sensor_id, datetime): we rewrite the incoming
// `id` (and the changelog record_id) to the existing one, so the upsert lands
// on the existing row rather than inserting a second one.
//
// We upsert rather than ignore so later changes still apply — e.g. a device
// may sync the reading first and only later attach a `temperature_breach_id`.
//
// This runs in every sync context (central and remote): two devices in the
// same facility sync into the same site, so the duplicate must be collapsed
// wherever it lands. The collapse is idempotent — when the existing row is the
// same reading, rewriting to its id is a no-op for an already-canonical row.
pub(crate) fn translate_temperature_log(
    connection: &StorageConnection,
    mut changelog_insert: ChangeLogInsertRow,
    data: &serde_json::Value,
) -> DeserializeResult {
    let mut row: TemperatureLogRow = serde_json::from_value(data.clone())
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;

    if let Some(existing_id) = TemperatureLogRowRepository::new(connection)
        .find_id_by_sensor_and_datetime(&row.sensor_id, row.datetime)?
    {
        if existing_id != row.id {
            // A different device already recorded this reading — collapse onto
            // the existing row by upserting under its id.
            row.id = existing_id.clone();
            changelog_insert.record_id = existing_id;
        }
    }

    Ok(vec![(Box::new(row) as Box<dyn Upsert>, changelog_insert)])
}

#[cfg(test)]
mod test {
    use super::*;
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_sensor_1, MockDataInserts},
        test_db::setup_all,
        ChangelogTableName, RowActionType, TemperatureBreachRow, TemperatureBreachRowRepository,
    };

    const SENSOR_ID: &str = "sensor_1";
    const STORE_ID: &str = "store_a";

    fn datetime() -> chrono::NaiveDateTime {
        NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(12, 0, 0)
            .unwrap()
    }

    fn changelog_for(id: &str) -> ChangeLogInsertRow {
        ChangeLogInsertRow {
            table_name: ChangelogTableName::TemperatureLog,
            record_id: id.to_string(),
            row_action: RowActionType::Upsert,
            ..Default::default()
        }
    }

    /// Mock data already provides `sensor_1` / `store_a`; seed one existing
    /// temperature_log so the natural key (sensor_id, datetime) is taken.
    fn seed_existing(connection: &StorageConnection, existing_id: &str) {
        TemperatureLogRowRepository::new(connection)
            ._upsert_one(&incoming(existing_id))
            .unwrap();
    }

    fn incoming(id: &str) -> TemperatureLogRow {
        TemperatureLogRow {
            id: id.into(),
            sensor_id: SENSOR_ID.into(),
            store_id: STORE_ID.into(),
            datetime: datetime(),
            temperature: 5.0,
            ..Default::default()
        }
    }

    /// Stores (and their name dependency) plus sensors give us valid FKs for
    /// `mock_sensor_1` (`sensor_1` in `store_a`).
    fn mock_inserts() -> MockDataInserts {
        // Keep `mock_sensor_1` referenced so the const stays in sync with mocks.
        assert_eq!(mock_sensor_1().id, SENSOR_ID);
        assert_eq!(mock_sensor_1().store_id, STORE_ID);
        MockDataInserts::none().stores().sensors()
    }

    /// Downcast the single (row, changelog) the translator produced.
    fn only(result: DeserializeResult) -> (TemperatureLogRow, ChangeLogInsertRow) {
        let mut out = result.unwrap();
        assert_eq!(out.len(), 1);
        let (mut upsert, changelog) = out.pop().unwrap();
        let row = upsert
            .as_mut_any()
            .and_then(|any| any.downcast_mut::<TemperatureLogRow>())
            .unwrap()
            .clone();
        (row, changelog)
    }

    #[actix_rt::test]
    async fn collapses_duplicate_onto_existing_id_and_keeps_new_fields() {
        let (_, connection, _, _) =
            setup_all("tl_v7_collapses_duplicate", mock_inserts()).await;
        // Existing record has no breach attached yet.
        seed_existing(&connection, "device_a_log");

        // A second device syncs the same reading, but this time with a breach
        // linked (breaches are computed/attached after the initial log sync).
        TemperatureBreachRowRepository::new(&connection)
            ._upsert_one(&TemperatureBreachRow {
                id: "breach_1".into(),
                sensor_id: SENSOR_ID.into(),
                store_id: STORE_ID.into(),
                start_datetime: datetime(),
                ..Default::default()
            })
            .unwrap();
        let mut row = incoming("device_b_log");
        row.temperature_breach_id = Some("breach_1".into());
        let data = serde_json::to_value(&row).unwrap();

        let (translated, changelog) =
            only(translate_temperature_log(&connection, changelog_for(&row.id), &data));

        // Upsert lands on the existing record, not a second row...
        assert_eq!(translated.id, "device_a_log");
        assert_eq!(changelog.record_id, "device_a_log");
        // ...and carries the new breach link so the existing row gets updated.
        assert_eq!(translated.temperature_breach_id, Some("breach_1".into()));
    }

    #[actix_rt::test]
    async fn keeps_same_id_reupsert() {
        let (_, connection, _, _) =
            setup_all("tl_v7_keeps_same_id", mock_inserts()).await;
        seed_existing(&connection, "device_a_log");

        // Same id arriving again is a normal re-sync, not a duplicate.
        let row = incoming("device_a_log");
        let data = serde_json::to_value(&row).unwrap();

        let (translated, changelog) =
            only(translate_temperature_log(&connection, changelog_for(&row.id), &data));

        assert_eq!(translated.id, "device_a_log");
        assert_eq!(changelog.record_id, "device_a_log");
    }

    #[actix_rt::test]
    async fn keeps_new_reading() {
        let (_, connection, _, _) = setup_all("tl_v7_keeps_new", mock_inserts()).await;
        seed_existing(&connection, "device_a_log");

        // A different datetime is a genuinely new reading, not a duplicate.
        let mut row = incoming("device_b_log");
        row.datetime = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(13, 0, 0)
            .unwrap();
        let data = serde_json::to_value(&row).unwrap();

        let (translated, changelog) =
            only(translate_temperature_log(&connection, changelog_for(&row.id), &data));

        // Keeps its own id — not collapsed onto the existing reading.
        assert_eq!(translated.id, "device_b_log");
        assert_eq!(changelog.record_id, "device_b_log");
    }

    #[actix_rt::test]
    async fn no_existing_reading_keeps_own_id() {
        let (_, connection, _, _) = setup_all("tl_v7_no_existing", mock_inserts()).await;
        // Nothing seeded — the first device's reading is the canonical one.

        let row = incoming("device_a_log");
        let data = serde_json::to_value(&row).unwrap();

        let (translated, changelog) =
            only(translate_temperature_log(&connection, changelog_for(&row.id), &data));

        assert_eq!(translated.id, "device_a_log");
        assert_eq!(changelog.record_id, "device_a_log");
    }
}
