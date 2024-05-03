use chrono::Utc;
use repository::{
    DatetimeFilter, EqualFilter, RepositoryError, StorageConnection, SyncBufferAction,
    SyncBufferFilter, SyncBufferRepository, SyncBufferRow, SyncBufferRowRepository,
};
use util::inline_edit;

pub(crate) struct SyncBuffer<'a> {
    query_repository: SyncBufferRepository<'a>,
    row_repository: SyncBufferRowRepository<'a>,
}

impl<'a> SyncBuffer<'a> {
    pub(crate) fn new(connection: &'a StorageConnection) -> SyncBuffer<'a> {
        SyncBuffer {
            query_repository: SyncBufferRepository::new(connection),
            row_repository: SyncBufferRowRepository::new(connection),
        }
    }

    pub(crate) fn record_successful_integration(
        &self,
        row: &SyncBufferRow,
    ) -> Result<(), RepositoryError> {
        self.row_repository.upsert_one(&inline_edit(row, |mut r| {
            r.integration_datetime = Some(Utc::now().naive_utc());
            r.integration_error = None;
            r
        }))
    }

    pub(crate) fn record_integration_error(
        &self,
        row: &SyncBufferRow,
        error: &anyhow::Error,
    ) -> Result<(), RepositoryError> {
        self.row_repository.upsert_one(&inline_edit(row, |mut r| {
            r.integration_datetime = Some(Utc::now().naive_utc());
            r.integration_error = Some(format!("{:?}", &error));
            r
        }))
    }

    pub(crate) fn get_ordered_sync_buffer_records(
        &self,
        action: SyncBufferAction,
        ordered_table_names: &[&str],
        source_site_id: Option<i32>,
    ) -> Result<Vec<SyncBufferRow>, RepositoryError> {
        let ordered_table_names = ordered_table_names.iter().map(|r| *r);
        // Get ordered table names, for  upsert we sort in referential constraint order
        // and for delete in reverse of referential constraint order
        let order: Vec<&str> = match action {
            SyncBufferAction::Upsert => ordered_table_names.collect(),
            SyncBufferAction::Delete => ordered_table_names.rev().collect(),
            SyncBufferAction::Merge => ordered_table_names.collect(),
        };

        let mut result = Vec::new();

        for legacy_table_name in order {
            let mut rows = self.query_repository.query_by_filter(
                SyncBufferFilter::new()
                    .table_name(EqualFilter::equal_to(legacy_table_name))
                    .action(action.equal_to())
                    .integration_datetime(DatetimeFilter::is_null(true))
                    .source_site_id(match source_site_id {
                        Some(site_id) => EqualFilter::equal_to_i32(site_id),
                        None => EqualFilter::i32_is_null(true),
                    }),
            )?;
            result.append(&mut rows);
        }

        Ok(result)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        SyncBufferAction, SyncBufferRow, SyncBufferRowRepository,
    };
    use util::{inline_init, Defaults};

    use crate::sync::translations::{all_translators, pull_integration_order};

    use super::SyncBuffer;

    fn row_1() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "1".to_string();
            r.table_name = "transact".to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_2() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "2".to_string();
            r.table_name = "trans_line".to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_3() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "3".to_string();
            r.table_name = "store".to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_4() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "4".to_string();
            r.table_name = "name".to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_5() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "5".to_string();
            r.table_name = "list_master".to_string();
            r.received_datetime = Defaults::naive_date_time();
            r.action = SyncBufferAction::Delete;
        })
    }

    fn row_6() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "6".to_string();
            r.table_name = "list_master_line".to_string();
            r.received_datetime = Defaults::naive_date_time();
            r.action = SyncBufferAction::Delete;
        })
    }
    fn site_1_row_1() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "1-1".to_string();
            r.table_name = "list_master".to_string();
            r.received_datetime = Defaults::naive_date_time();
            r.action = SyncBufferAction::Delete;
            r.source_site_id = Some(1);
        })
    }

    fn site_1_row_2() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "1-2".to_string();
            r.table_name = "list_master_line".to_string();
            r.received_datetime = Defaults::naive_date_time();
            r.action = SyncBufferAction::Delete;
            r.source_site_id = Some(1);
        })
    }

    #[actix_rt::test]
    async fn test_sync_buffer_service() {
        let translations = all_translators();
        let table_order = pull_integration_order(&translations);

        let (_, connection, _, _) = setup_all_with_data(
            "test_sync_buffer_service",
            MockDataInserts::none(),
            inline_init(|r: &mut MockData| {
                r.sync_buffer_rows = vec![
                    row_1(),
                    row_2(),
                    row_3(),
                    row_4(),
                    row_5(),
                    row_6(),
                    site_1_row_1(),
                    site_1_row_2(),
                ];
            }),
        )
        .await;

        let buffer = SyncBuffer::new(&connection);

        // ORDER/ACTION
        let in_referential_order = buffer
            .get_ordered_sync_buffer_records(
                repository::SyncBufferAction::Upsert,
                &table_order,
                None,
            )
            .unwrap();

        assert_eq!(
            in_referential_order,
            vec![row_4(), row_3(), row_1(), row_2()]
        );

        let in_reverse_referential_order = buffer
            .get_ordered_sync_buffer_records(
                repository::SyncBufferAction::Delete,
                &table_order,
                None,
            )
            .unwrap();

        assert_eq!(in_reverse_referential_order, vec![row_6(), row_5()]);

        // ERROR
        buffer
            .record_integration_error(&row_1(), &anyhow::anyhow!("Error 1"))
            .unwrap();
        buffer
            .record_integration_error(&row_2(), &anyhow::anyhow!("Error 2"))
            .unwrap();

        let result = buffer
            .get_ordered_sync_buffer_records(
                repository::SyncBufferAction::Upsert,
                &table_order,
                None,
            )
            .unwrap();

        assert_eq!(result, vec![row_4(), row_3()]);

        let row_1 = SyncBufferRowRepository::new(&connection)
            .find_one_by_record_id(&row_1().record_id)
            .unwrap()
            .unwrap();

        assert_eq!(row_1.integration_error, Some("Error 1".to_string()));

        // INTEGRATED
        buffer.record_successful_integration(&row_3()).unwrap();

        let result = buffer
            .get_ordered_sync_buffer_records(
                repository::SyncBufferAction::Upsert,
                &table_order,
                None,
            )
            .unwrap();

        assert_eq!(result, vec![row_4()]);

        buffer.record_successful_integration(&row_4()).unwrap();

        let result = buffer
            .get_ordered_sync_buffer_records(
                repository::SyncBufferAction::Upsert,
                &table_order,
                None,
            )
            .unwrap();

        assert_eq!(result, vec![]);

        // GETS BUFFER ROWS FOR REMOTE SITE
        let remote_site_id = 1;
        let in_reverse_referential_order = buffer
            .get_ordered_sync_buffer_records(
                repository::SyncBufferAction::Delete,
                &table_order,
                Some(remote_site_id),
            )
            .unwrap();

        assert_eq!(
            in_reverse_referential_order,
            vec![site_1_row_2(), site_1_row_1()]
        );
    }
}
