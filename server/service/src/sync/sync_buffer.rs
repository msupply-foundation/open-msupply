use super::translations::LegacyTableName;
use chrono::Utc;
use repository::{
    DatetimeFilter, EqualFilter, RepositoryError, StorageConnection, SyncBufferAction,
    SyncBufferFilter, SyncBufferRepository, SyncBufferRow, SyncBufferRowRepository,
};
use util::inline_edit;

// Ordered by referencial constraints
const TRANSLATION_AND_INTEGRATION_ORDER: &[&str] = &[
    LegacyTableName::NAME,
    LegacyTableName::UNIT,
    LegacyTableName::ITEM,
    LegacyTableName::STORE,
    LegacyTableName::STORE_PREFERENCE,
    LegacyTableName::LIST_MASTER,
    LegacyTableName::LIST_MASTER_LINE,
    LegacyTableName::LIST_MASTER_NAME_JOIN,
    LegacyTableName::REPORT,
    LegacyTableName::LOCATION,
    LegacyTableName::ITEM_LINE,
    LegacyTableName::TRANSACT,
    LegacyTableName::TRANS_LINE,
    LegacyTableName::STOCKTAKE,
    LegacyTableName::STOCKTAKE_LINE,
    LegacyTableName::REQUISITION,
    LegacyTableName::REQUISITION_LINE,
    LegacyTableName::NAME_STORE_JOIN,
    LegacyTableName::OM_ACTIVITY_LOG,
    LegacyTableName::INVENTORY_ADJUSTMENT_REASON,
];

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
    ) -> Result<Vec<SyncBufferRow>, RepositoryError> {
        // Get ordered table names, for  upsert we sort in referential constraint order
        // and for delete in reverse of referential constraint order
        let ordered_table_names = TRANSLATION_AND_INTEGRATION_ORDER.iter().map(|r| *r);
        let order: Vec<&str> = match action {
            SyncBufferAction::Upsert => ordered_table_names.collect(),
            SyncBufferAction::Delete => ordered_table_names.rev().collect(),
            SyncBufferAction::Merge => unimplemented!(),
        };

        let mut result = Vec::new();

        for legacy_table_name in order {
            let mut rows = self.query_repository.query_by_filter(
                SyncBufferFilter::new()
                    .table_name(EqualFilter::equal_to(legacy_table_name))
                    .action(action.equal_to())
                    .integration_datetime(DatetimeFilter::is_null(true)),
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

    use crate::sync::translations::LegacyTableName;

    use super::SyncBuffer;

    fn row_1() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "1".to_string();
            r.table_name = LegacyTableName::TRANSACT.to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_2() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "2".to_string();
            r.table_name = LegacyTableName::TRANS_LINE.to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_3() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "3".to_string();
            r.table_name = LegacyTableName::STORE.to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_4() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "4".to_string();
            r.table_name = LegacyTableName::NAME.to_string();
            r.received_datetime = Defaults::naive_date_time();
        })
    }

    fn row_5() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "5".to_string();
            r.table_name = LegacyTableName::LIST_MASTER.to_string();
            r.received_datetime = Defaults::naive_date_time();
            r.action = SyncBufferAction::Delete;
        })
    }

    fn row_6() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "6".to_string();
            r.table_name = LegacyTableName::LIST_MASTER_LINE.to_string();
            r.received_datetime = Defaults::naive_date_time();
            r.action = SyncBufferAction::Delete;
        })
    }

    #[actix_rt::test]
    async fn test_sync_buffer_service() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_sync_buffer_service",
            MockDataInserts::none(),
            inline_init(|r: &mut MockData| {
                r.sync_buffer_rows = vec![row_1(), row_2(), row_3(), row_4(), row_5(), row_6()];
            }),
        )
        .await;

        let buffer = SyncBuffer::new(&connection);

        // ORDER/ACTION
        let in_referencial_order = buffer
            .get_ordered_sync_buffer_records(repository::SyncBufferAction::Upsert)
            .unwrap();

        assert_eq!(
            in_referencial_order,
            vec![row_4(), row_3(), row_1(), row_2()]
        );

        let in_reverese_referencial_order = buffer
            .get_ordered_sync_buffer_records(repository::SyncBufferAction::Delete)
            .unwrap();

        assert_eq!(in_reverese_referencial_order, vec![row_6(), row_5()]);

        // ERROR
        buffer
            .record_integration_error(&row_1(), &anyhow::anyhow!("Error 1"))
            .unwrap();
        buffer
            .record_integration_error(&row_2(), &anyhow::anyhow!("Error 2"))
            .unwrap();

        let result = buffer
            .get_ordered_sync_buffer_records(repository::SyncBufferAction::Upsert)
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
            .get_ordered_sync_buffer_records(repository::SyncBufferAction::Upsert)
            .unwrap();

        assert_eq!(result, vec![row_4()]);

        buffer.record_successful_integration(&row_4()).unwrap();

        let result = buffer
            .get_ordered_sync_buffer_records(repository::SyncBufferAction::Upsert)
            .unwrap();

        assert_eq!(result, vec![]);
    }
}
