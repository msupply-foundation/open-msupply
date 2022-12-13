use chrono::Duration;
use chrono::NaiveDate;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel::sql_types::*;
use diesel::QueryDsl;
use diesel::{sql_query, RunQueryDsl};
use repository::DBType;
use repository::RepositoryError;
use repository::StorageConnection;

#[derive(Debug, PartialEq, Clone)]
struct TableAndFieldName {
    table_name: &'static str,
    field_name: &'static str,
}

fn get_timestamp_fields() -> Vec<TableAndFieldName> {
    vec![
        ("name", "created_datetime"),
        ("invoice", "created_datetime"),
        ("invoice", "shipped_datetime"),
        ("invoice", "allocated_datetime"),
        ("invoice", "picked_datetime"),
        ("invoice", "delivered_datetime"),
        ("invoice", "verified_datetime"),
        ("location_movement", "enter_datetime"),
        ("location_movement", "exit_datetime"),
        ("requisition", "created_datetime"),
        ("requisition", "sent_datetime"),
        ("requisition", "finalised_datetime"),
        ("requisition_line", "snapshot_datetime"),
        ("stocktake", "created_datetime"),
        ("stocktake", "finalised_datetime"),
        ("sync_log", "started_datetime"),
        ("sync_log", "finished_datetime"),
        ("sync_log", "prepare_initial_started_datetime"),
        ("sync_log", "prepare_initial_finished_datetime"),
        ("sync_log", "push_started_datetime"),
        ("sync_log", "push_finished_datetime"),
        ("sync_log", "pull_central_started_datetime"),
        ("sync_log", "pull_central_finished_datetime"),
        ("sync_log", "pull_remote_started_datetime"),
        ("sync_log", "pull_remote_finished_datetime"),
        ("sync_log", "integration_started_datetime"),
        ("sync_log", "integration_finished_datetime"),
        ("activity_log", "datetime"),
        ("location_movement", "enter_datetime"),
        ("location_movement", "exit_datetime"),
    ]
    .iter()
    .map(|(table_name, field_name)| TableAndFieldName {
        table_name,
        field_name,
    })
    .collect()
}

#[cfg(test)]
#[cfg(feature = "postgres")]
fn get_exclude_timestamp_fields() -> Vec<TableAndFieldName> {
    vec![
        ("sync_buffer", "received_datetime"),
        ("sync_buffer", "integration_datetime"),
    ]
    .iter()
    .map(|(table_name, field_name)| TableAndFieldName {
        table_name,
        field_name,
    })
    .collect()
}

fn get_date_fields() -> Vec<TableAndFieldName> {
    vec![
        ("name", "date_of_birth"),
        ("stock_line", "expiry_date"),
        ("requisition", "expected_delivery_date"),
        ("invoice_line", "expiry_date"),
        ("stocktake", "stocktake_date"),
        ("stocktake_line", "expiry_date"),
        ("sync_out", "created_at"),
    ]
    .iter()
    .map(|(table_name, field_name)| TableAndFieldName {
        table_name,
        field_name,
    })
    .collect()
}

#[cfg(test)]
#[cfg(feature = "postgres")]
fn get_exclude_date_fields() -> Vec<TableAndFieldName> {
    vec![("invoice_line_stock_movement", "expiry_date")]
        .iter()
        .map(|(table_name, field_name)| TableAndFieldName {
            table_name,
            field_name,
        })
        .collect()
}

#[derive(QueryableByName, Debug, PartialEq)]
struct IdAndTimestamp {
    #[sql_type = "Text"]
    id: String,
    #[sql_type = "Timestamp"]
    dt: NaiveDateTime,
}

#[derive(QueryableByName, Debug, PartialEq)]
struct IdAndDate {
    #[sql_type = "Text"]
    id: String,
    #[sql_type = "Date"]
    d: NaiveDate,
}
#[derive(Debug, PartialEq)]
struct AllDateValues {
    timestamps: Vec<(IdAndTimestamp, TableAndFieldName)>,
    dates: Vec<(IdAndDate, TableAndFieldName)>,
}
pub struct RefreshDatesRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RefreshDatesRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RefreshDatesRepository { connection }
    }

    pub fn refresh_dates(
        &self,
        reference_date: NaiveDateTime,
    ) -> Result<Option<(NaiveDateTime, u32)>, RepositoryError> {
        let all_date_values = self.get_all_date_values()?;
        let (updated_values, max_timestamp, days_adjustment) =
            match self.get_new_date_values(reference_date, all_date_values) {
                Some(result) => result,
                None => return Ok(None),
            };

        self.update_timestamps(updated_values.timestamps)?;
        self.update_dates(updated_values.dates)?;
        Ok(Some((max_timestamp, days_adjustment)))
    }

    fn get_new_date_values(
        &self,
        reference_date: NaiveDateTime,
        mut all_date_values: AllDateValues,
    ) -> Option<(AllDateValues, NaiveDateTime, u32)> {
        let max_record = all_date_values.timestamps.iter().max_by_key(|row| row.0.dt);
        let max_timestamp = max_record
            .clone()
            .map(|row| row.0.dt)
            .unwrap_or(reference_date.clone());

        let days_difference = (reference_date - max_timestamp).num_days() - 1;

        if days_difference < 0 {
            println!(
                "Reference date {} - 1 day is lower then max data date {} for record: {:#?}",
                reference_date, max_timestamp, max_record
            );
            return None;
        }

        let adjustment = Duration::days(days_difference);

        for mut timestamp in all_date_values.timestamps.iter_mut() {
            timestamp.0.dt = timestamp.0.dt + adjustment
        }

        for mut date in all_date_values.dates.iter_mut() {
            date.0.d = date.0.d + adjustment
        }

        Some((all_date_values, max_timestamp, days_difference as u32))
    }

    fn get_all_date_values(&self) -> Result<AllDateValues, RepositoryError> {
        let mut timestamps = Vec::new();
        for table_and_field_name in get_timestamp_fields() {
            for row in self
                .get_timestamps(
                    table_and_field_name.table_name,
                    table_and_field_name.field_name,
                )?
                .into_iter()
            {
                timestamps.push((row, table_and_field_name.clone()))
            }
        }

        let mut dates = Vec::new();
        for table_and_field_name in get_date_fields() {
            for row in self
                .get_dates(
                    table_and_field_name.table_name,
                    table_and_field_name.field_name,
                )?
                .into_iter()
            {
                dates.push((row, table_and_field_name.clone()))
            }
        }

        Ok(AllDateValues { timestamps, dates })
    }

    fn get_timestamps(
        &self,
        table_name: &str,
        field_name: &str,
    ) -> Result<Vec<IdAndTimestamp>, RepositoryError> {
        let query = format!(
            "select id, {} as dt from {} where {0} is not null",
            field_name, table_name
        );

        Ok(sql_query(&query).load::<IdAndTimestamp>(&self.connection.connection)?)
    }

    fn update_timestamps(
        &self,
        timestamps: Vec<(IdAndTimestamp, TableAndFieldName)>,
    ) -> Result<(), RepositoryError> {
        for (
            IdAndTimestamp { id, dt },
            TableAndFieldName {
                table_name,
                field_name,
            },
        ) in timestamps
        {
            let query = format!(
                "update {} set {} = '{}' where id = '{}'",
                table_name,
                field_name,
                serialise_timestamp(dt),
                id
            );

            sql_query(&query).execute(&self.connection.connection)?;
        }

        Ok(())
    }

    fn get_dates(
        &self,
        table_name: &str,
        field_name: &str,
    ) -> Result<Vec<IdAndDate>, RepositoryError> {
        let query = format!(
            "select id, {} as d from {} where {0} is not null",
            field_name, table_name
        );

        Ok(sql_query(&query).load::<IdAndDate>(&self.connection.connection)?)
    }

    fn update_dates(
        &self,
        dates: Vec<(IdAndDate, TableAndFieldName)>,
    ) -> Result<(), RepositoryError> {
        for (
            IdAndDate { id, d },
            TableAndFieldName {
                table_name,
                field_name,
            },
        ) in dates
        {
            let query = format!(
                "update {} set {} = '{}' where id = '{}'",
                table_name,
                field_name,
                serialise_date(d),
                id
            );

            sql_query(&query).execute(&self.connection.connection)?;
        }

        Ok(())
    }
}

// Couldn't find less hacky way to serialise manually
table! {
    serialize_helper (id) {
        id -> Text,
        d -> Nullable<Date>,
        dt -> Nullable<Timestamp>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[table_name = "serialize_helper"]
pub struct SerializeHelper {
    pub id: String,
    pub d: Option<NaiveDate>,
    pub dt: Option<NaiveDateTime>,
}

fn serialise_timestamp(timestamp: NaiveDateTime) -> String {
    use self::serialize_helper::dsl::*;
    // SELECT "serialize_helper"."id", "serialize_helper"."d", "serialize_helper"."dt" FROM "serialize_helper" WHERE "serialize_helper"."dt" = $1 -- binds: [2021-01-01T00:00:00]
    let debug_string =
        diesel::debug_query::<DBType, _>(&serialize_helper.filter(dt.eq(timestamp))).to_string();

    // ["...", "2021-01-01T00:00:00]"]
    let bind = debug_string.split("[").collect::<Vec<&str>>()[1];
    bind.split("]").collect::<Vec<&str>>()[0].to_string()
}

fn serialise_date(date: NaiveDate) -> String {
    use self::serialize_helper::dsl::*;

    let debug_string =
        diesel::debug_query::<DBType, _>(&serialize_helper.filter(d.eq(date))).to_string();

    // ["...", "2021-01-01T00:00:00]"]
    let bind = debug_string.split("[").collect::<Vec<&str>>()[1];
    bind.split("]").collect::<Vec<&str>>()[0].to_string()
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_item_a, mock_name_a, mock_store_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceRow, InvoiceRowRepository, StockLineRow, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use super::*;

    #[actix_rt::test]
    async fn refresh_dates() {
        fn invoice1() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice1".to_string();
                r.name_id = mock_name_a().id;
                r.store_id = mock_store_a().id;
                r.created_datetime = NaiveDate::from_ymd(2021, 01, 01).and_hms(00, 00, 00);
            })
        }

        fn invoice2() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice2".to_string();
                r.name_id = mock_name_a().id;
                r.store_id = mock_store_a().id;
                r.created_datetime = NaiveDate::from_ymd(2021, 02, 01).and_hms(00, 00, 00);
                r.shipped_datetime = Some(NaiveDate::from_ymd(2021, 01, 01).and_hms(00, 00, 00));
            })
        }

        fn stock_line1() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line1".to_string();
                r.item_id = mock_item_a().id;
                r.store_id = mock_store_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd(2023, 02, 01));
            })
        }

        let (_, connection, _, _) = setup_all_with_data(
            "refresh_dates",
            MockDataInserts::none().stores().names().items().units(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice1(), invoice2()];
                r.stock_lines = vec![stock_line1()];
            }),
        )
        .await;

        let repo = RefreshDatesRepository::new(&connection);
        // Test select timestamp
        let mut result = repo.get_timestamps("invoice", "created_datetime").unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(
            result,
            vec![
                IdAndTimestamp {
                    id: "invoice1".to_string(),
                    dt: NaiveDate::from_ymd(2021, 01, 01).and_hms(00, 00, 00)
                },
                IdAndTimestamp {
                    id: "invoice2".to_string(),
                    dt: NaiveDate::from_ymd(2021, 02, 01).and_hms(00, 00, 00)
                },
            ]
        );

        let mut result = repo.get_timestamps("invoice", "shipped_datetime").unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(
            result,
            vec![IdAndTimestamp {
                id: "invoice2".to_string(),
                dt: NaiveDate::from_ymd(2021, 01, 01).and_hms(00, 00, 00)
            }]
        );

        // Test select date

        let mut result = repo.get_dates("stock_line", "expiry_date").unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(
            result,
            vec![IdAndDate {
                id: "stock_line1".to_string(),
                d: NaiveDate::from_ymd(2023, 02, 01)
            }]
        );

        // Test updated values

        let mut result = repo
            .get_new_date_values(
                // Latest date was 2021, 02, 01, which is 11 days difference from 2021, 02, 12
                // and -1, so should all be adjusted by 10
                NaiveDate::from_ymd(2021, 02, 12).and_hms(00, 00, 00),
                repo.get_all_date_values().unwrap(),
            )
            .unwrap()
            .0;
        result.timestamps.sort_by(|a, b| {
            format!("{}{}", a.1.field_name, a.0.id).cmp(&format!("{}{}", b.1.field_name, b.0.id))
        });
        result.dates.sort_by(|a, b| {
            format!("{}{}", a.1.field_name, a.0.id).cmp(&format!("{}{}", b.1.field_name, b.0.id))
        });

        assert_eq!(
            result,
            AllDateValues {
                timestamps: vec![
                    (
                        IdAndTimestamp {
                            id: "invoice1".to_string(),
                            dt: NaiveDate::from_ymd(2021, 01, 11).and_hms(00, 00, 00)
                        },
                        TableAndFieldName {
                            table_name: "invoice",
                            field_name: "created_datetime"
                        }
                    ),
                    (
                        IdAndTimestamp {
                            id: "invoice2".to_string(),
                            dt: NaiveDate::from_ymd(2021, 02, 11).and_hms(00, 00, 00)
                        },
                        TableAndFieldName {
                            table_name: "invoice",
                            field_name: "created_datetime"
                        }
                    ),
                    (
                        IdAndTimestamp {
                            id: "invoice2".to_string(),
                            dt: NaiveDate::from_ymd(2021, 01, 11).and_hms(00, 00, 00)
                        },
                        TableAndFieldName {
                            table_name: "invoice",
                            field_name: "shipped_datetime"
                        }
                    )
                ],
                dates: vec![(
                    IdAndDate {
                        id: "stock_line1".to_string(),
                        d: NaiveDate::from_ymd(2023, 02, 11)
                    },
                    TableAndFieldName {
                        table_name: "stock_line",
                        field_name: "expiry_date"
                    }
                )]
            }
        );

        // Test refresh dates
        repo.refresh_dates(NaiveDate::from_ymd(2021, 02, 12).and_hms(00, 00, 00))
            .unwrap();

        let invoice1_result = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice1().id)
            .unwrap();

        assert_eq!(
            invoice1_result,
            inline_edit(&invoice1_result, |mut u| {
                u.created_datetime = NaiveDate::from_ymd(2021, 01, 11).and_hms(00, 00, 00);
                u
            })
        );

        let invoice2_result = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice2().id)
            .unwrap();

        assert_eq!(
            invoice2_result,
            inline_edit(&invoice2_result, |mut u| {
                u.created_datetime = NaiveDate::from_ymd(2021, 02, 11).and_hms(00, 00, 00);
                u.shipped_datetime = Some(NaiveDate::from_ymd(2021, 01, 11).and_hms(00, 00, 00));
                u
            })
        );

        let stock_line1_result = StockLineRowRepository::new(&connection)
            .find_one_by_id(&stock_line1().id)
            .unwrap();

        assert_eq!(
            stock_line1_result,
            inline_edit(&stock_line1_result, |mut u| {
                u.expiry_date = Some(NaiveDate::from_ymd(2023, 02, 11));
                u
            })
        );
    }

    #[derive(QueryableByName, Debug, PartialEq)]
    struct TableNameAndFieldRow {
        #[sql_type = "Text"]
        table_name: String,
        #[sql_type = "Text"]
        column_name: String,
    }

    // Testing schema date and timestamp fields against get_timestamp_fields and get_date_fields
    #[cfg(feature = "postgres")]
    #[actix_rt::test]
    async fn all_fields_are_present() {
        let (_, connection, _, _) = repository::test_db::setup_all(
            "all_fields_are_present_timestamps",
            MockDataInserts::none(),
        )
        .await;

        // Timestamps
        let query = r#"
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE data_type = 'timestamp without time zone' 
              AND table_name != '__diesel_schema_migrations'
              AND is_updatable = 'YES'
            "#;

        let schema_table_and_fields = sql_query(query)
            .load::<TableNameAndFieldRow>(&connection.connection)
            .unwrap();

        let mut defined_table_and_fields = get_timestamp_fields();
        defined_table_and_fields.append(&mut get_exclude_timestamp_fields());

        for schema_row in schema_table_and_fields.iter() {
            assert_eq!(
                1,
                defined_table_and_fields
                    .iter()
                    .filter(
                        |defined_row| defined_row.table_name == schema_row.table_name
                            && defined_row.field_name == schema_row.column_name
                    )
                    .count(),
                "Field {:#?} is in schema but not in get_timestamp_fields",
                schema_row
            );
        }

        for defined_row in defined_table_and_fields {
            assert_eq!(
                1,
                schema_table_and_fields
                    .iter()
                    .filter(|schema_row| defined_row.table_name == schema_row.table_name
                        && defined_row.field_name == schema_row.column_name)
                    .count(),
                "Field {:#?} is in get_timestamp_fields but not in schema",
                defined_row
            );
        }

        // Dates
        let query = r#"
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE data_type = 'date' 
          AND table_name != '__diesel_schema_migrations'
          AND is_updatable = 'YES'
        "#;

        let schema_table_and_fields = sql_query(query)
            .load::<TableNameAndFieldRow>(&connection.connection)
            .unwrap();

        let mut defined_table_and_fields = get_date_fields();
        defined_table_and_fields.append(&mut get_exclude_date_fields());

        for schema_row in schema_table_and_fields.iter() {
            assert_eq!(
                1,
                defined_table_and_fields
                    .iter()
                    .filter(
                        |defined_row| defined_row.table_name == schema_row.table_name
                            && defined_row.field_name == schema_row.column_name
                    )
                    .count(),
                "Field {:#?} is in schema but not get_date_fields",
                schema_row
            );
        }

        for defined_row in defined_table_and_fields {
            assert_eq!(
                1,
                schema_table_and_fields
                    .iter()
                    .filter(|schema_row| defined_row.table_name == schema_row.table_name
                        && defined_row.field_name == schema_row.column_name)
                    .count(),
                "Field {:#?} is in get_date_fields but not in schema",
                defined_row
            );
        }
    }
}
