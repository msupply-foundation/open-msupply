use repository::{
    ChangeLogInsertRow, StorageConnection, TemperatureSummaryRow, TemperatureSummaryRowRepository,
    Upsert, syncv7::SyncRecordSerializeError,
};

use crate::sync_v7::serde::DeserializeResult;

// De-duplicate temperature summaries, as for temperature logs (see temperature_log.rs).
//
// Multiple devices can load the same FridgeTag and sync, each assigning its own `id` to what is
// the same period's summary. A summary is identified by its sensor, period and start, so we
// collapse an incoming summary onto the record that already exists for the same period: we
// rewrite the incoming `id` (and the changelog record_id) to the existing one, so the upsert lands
// on the existing row rather than inserting a second one.
//
// We upsert rather than ignore so a more complete summary of the period still applies, but skip
// one that ends earlier than what we have: it's from an older read of the sensor (e.g. a device
// syncing after another that read the sensor later), so would replace data with less of it.
pub(crate) fn translate_temperature_summary(
    connection: &StorageConnection,
    mut changelog_insert: ChangeLogInsertRow,
    data: &serde_json::Value,
) -> DeserializeResult {
    let mut row: TemperatureSummaryRow = serde_json::from_value(data.clone())
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;

    if let Some(existing) =
        TemperatureSummaryRowRepository::new(connection).find_one_for_same_period(&row)?
    {
        if row.end_datetime < existing.end_datetime {
            return Ok(vec![]);
        }
        row.id = existing.id.clone();
        changelog_insert.record_id = existing.id;
    }

    Ok(vec![(Box::new(row) as Box<dyn Upsert>, changelog_insert)])
}

#[cfg(test)]
mod test {
    use super::*;
    use chrono::{NaiveDate, NaiveDateTime};
    use repository::{
        ChangelogTableName, RowActionType, TemperatureSummaryPeriod,
        mock::{MockDataInserts, mock_sensor_1},
        test_db::setup_all,
    };

    fn datetime(day: u32, hour: u32) -> NaiveDateTime {
        NaiveDate::from_ymd_opt(2024, 1, day)
            .unwrap()
            .and_hms_opt(hour, 0, 0)
            .unwrap()
    }

    /// A summary of 1 Jan, read at `end_hour` on 1 Jan (or 24 for the whole day)
    fn incoming(id: &str, end_hour: u32, average_temperature: f64) -> TemperatureSummaryRow {
        TemperatureSummaryRow {
            id: id.into(),
            sensor_id: mock_sensor_1().id,
            store_id: mock_sensor_1().store_id,
            period: TemperatureSummaryPeriod::Day,
            start_datetime: datetime(1, 0),
            end_datetime: datetime(1, 0) + chrono::Duration::hours(end_hour.into()),
            average_temperature: Some(average_temperature),
            ..Default::default()
        }
    }

    fn translate(
        connection: &StorageConnection,
        row: &TemperatureSummaryRow,
    ) -> Option<(TemperatureSummaryRow, ChangeLogInsertRow)> {
        let mut out = translate_temperature_summary(
            connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::TemperatureSummary,
                record_id: row.id.clone(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
            &serde_json::to_value(row).unwrap(),
        )
        .unwrap();
        assert!(out.len() <= 1);
        let (mut upsert, changelog) = out.pop()?;
        let row = upsert
            .as_mut_any()
            .and_then(|any| any.downcast_mut::<TemperatureSummaryRow>())
            .unwrap()
            .clone();
        Some((row, changelog))
    }

    #[actix_rt::test]
    async fn collapses_duplicate_onto_existing_id() {
        let (_, connection, _, _) = setup_all(
            "ts_v7_collapses_duplicate",
            MockDataInserts::none().stores().sensors(),
        )
        .await;
        TemperatureSummaryRowRepository::new(&connection)
            ._upsert_one(&incoming("device_a_summary", 12, 4.0))
            .unwrap();

        // Another device's summary of the same day, read later, lands on the existing row
        let (row, changelog) =
            translate(&connection, &incoming("device_b_summary", 24, 4.5)).unwrap();
        assert_eq!(row.id, "device_a_summary");
        assert_eq!(changelog.record_id, "device_a_summary");
        assert_eq!(row.average_temperature, Some(4.5));

        // A summary of a new day keeps its own id
        let (row, _) = translate(
            &connection,
            &TemperatureSummaryRow {
                start_datetime: datetime(2, 0),
                end_datetime: datetime(3, 0),
                ..incoming("device_b_summary_2", 24, 5.0)
            },
        )
        .unwrap();
        assert_eq!(row.id, "device_b_summary_2");

        // As does a summary of a different period starting at the same time
        let (row, _) = translate(
            &connection,
            &TemperatureSummaryRow {
                period: TemperatureSummaryPeriod::Other("WEEK".to_string()),
                end_datetime: datetime(8, 0),
                ..incoming("device_b_week_summary", 24, 5.0)
            },
        )
        .unwrap();
        assert_eq!(row.id, "device_b_week_summary");
    }

    #[actix_rt::test]
    async fn skips_summary_from_older_read() {
        let (_, connection, _, _) = setup_all(
            "ts_v7_skips_older_read",
            MockDataInserts::none().stores().sensors(),
        )
        .await;
        TemperatureSummaryRowRepository::new(&connection)
            ._upsert_one(&incoming("device_a_summary", 15, 4.0))
            .unwrap();

        // A summary of the same day from a read earlier that day is left out
        assert!(translate(&connection, &incoming("device_b_summary", 9, 9.9)).is_none());

        // One from a read at the same time still applies
        let (row, _) = translate(&connection, &incoming("device_b_summary", 15, 4.5)).unwrap();
        assert_eq!(row.id, "device_a_summary");
    }
}
