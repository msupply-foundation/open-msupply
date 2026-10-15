use repository::{
    ChangeLogInsertRow, StorageConnection, TemperatureDailySummaryRow,
    TemperatureDailySummaryRowRepository, Upsert, syncv7::SyncRecordSerializeError,
};

use crate::sync_v7::serde::DeserializeResult;

// De-duplicate temperature daily summaries, as for temperature logs (see temperature_log.rs).
//
// Multiple devices can load the same FridgeTag and sync, each assigning its own `id` to what is
// the same day's summary. A summary is uniquely identified by its sensor and date (enforced by a
// unique index), so we collapse an incoming summary onto the record that already exists for the
// same (sensor_id, date): we rewrite the incoming `id` (and the changelog record_id) to the
// existing one, so the upsert lands on the existing row rather than failing on the index.
//
// We upsert rather than ignore so a more complete summary of the day still applies.
pub(crate) fn translate_temperature_daily_summary(
    connection: &StorageConnection,
    mut changelog_insert: ChangeLogInsertRow,
    data: &serde_json::Value,
) -> DeserializeResult {
    let mut row: TemperatureDailySummaryRow = serde_json::from_value(data.clone())
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;

    if let Some(existing_id) = TemperatureDailySummaryRowRepository::new(connection)
        .find_id_by_sensor_and_date(&row.sensor_id, row.date)?
        && existing_id != row.id
    {
        row.id = existing_id.clone();
        changelog_insert.record_id = existing_id;
    }

    Ok(vec![(Box::new(row) as Box<dyn Upsert>, changelog_insert)])
}

#[cfg(test)]
mod test {
    use super::*;
    use chrono::NaiveDate;
    use repository::{
        ChangelogTableName, RowActionType,
        mock::{MockDataInserts, mock_sensor_1},
        test_db::setup_all,
    };

    fn incoming(id: &str, average_temperature: f64) -> TemperatureDailySummaryRow {
        TemperatureDailySummaryRow {
            id: id.into(),
            sensor_id: mock_sensor_1().id,
            store_id: mock_sensor_1().store_id,
            date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            average_temperature: Some(average_temperature),
            ..Default::default()
        }
    }

    fn translate(
        connection: &StorageConnection,
        row: &TemperatureDailySummaryRow,
    ) -> (TemperatureDailySummaryRow, ChangeLogInsertRow) {
        let mut out = translate_temperature_daily_summary(
            connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::TemperatureDailySummary,
                record_id: row.id.clone(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
            &serde_json::to_value(row).unwrap(),
        )
        .unwrap();
        assert_eq!(out.len(), 1);
        let (mut upsert, changelog) = out.pop().unwrap();
        let row = upsert
            .as_mut_any()
            .and_then(|any| any.downcast_mut::<TemperatureDailySummaryRow>())
            .unwrap()
            .clone();
        (row, changelog)
    }

    #[actix_rt::test]
    async fn collapses_duplicate_onto_existing_id() {
        let (_, connection, _, _) = setup_all(
            "tds_v7_collapses_duplicate",
            MockDataInserts::none().stores().sensors(),
        )
        .await;
        TemperatureDailySummaryRowRepository::new(&connection)
            ._upsert_one(&incoming("device_a_summary", 4.0))
            .unwrap();

        // Another device's summary of the same day lands on the existing row
        let (row, changelog) = translate(&connection, &incoming("device_b_summary", 4.5));
        assert_eq!(row.id, "device_a_summary");
        assert_eq!(changelog.record_id, "device_a_summary");
        assert_eq!(row.average_temperature, Some(4.5));

        // A summary of a new day keeps its own id
        let (row, _) = translate(
            &connection,
            &TemperatureDailySummaryRow {
                date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                ..incoming("device_b_summary_2", 5.0)
            },
        );
        assert_eq!(row.id, "device_b_summary_2");
    }
}
