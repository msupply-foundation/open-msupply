use repository::{
    PaginationOption, PluginData, PluginDataFilter, PluginDataRepository, PluginDataSort,
    RepositoryError,
};

use crate::i64_to_u32;
use crate::service_provider::ServiceContext;
use crate::{get_default_pagination_unlimited, ListResult};
mod insert;
pub use self::insert::*;
mod update;
pub use self::update::*;
mod delete;
pub use self::delete::*;

pub trait PluginDataServiceTrait: Sync + Send {
    fn get_plugin_data(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<PluginDataFilter>,
        sort: Option<PluginDataSort>,
    ) -> Result<ListResult<PluginData>, RepositoryError> {
        let pagination = get_default_pagination_unlimited(pagination);
        let repository = PluginDataRepository::new(&ctx.connection);

        Ok(ListResult {
            rows: repository.query(pagination, filter.clone(), sort)?,
            count: i64_to_u32(repository.count(filter)?),
        })
    }

    fn insert(
        &self,
        ctx: &ServiceContext,
        input: InsertPluginData,
    ) -> Result<PluginData, InsertPluginDataError> {
        insert(ctx, input)
    }

    fn update(
        &self,
        ctx: &ServiceContext,
        input: UpdatePluginData,
    ) -> Result<PluginData, UpdatePluginDataError> {
        update(ctx, input)
    }

    fn delete(&self, ctx: &ServiceContext, id: &str) -> Result<String, DeletePluginDataError> {
        delete(ctx, id)
    }
}

pub struct PluginDataService {}
impl PluginDataServiceTrait for PluginDataService {}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_store_a, mock_store_b, mock_user_account_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        EqualFilter, PluginDataFilter, PluginDataRow,
    };

    use crate::service_provider::ServiceProvider;

    // Resolver scoping: a store sees its own + global rows, never another store's.
    #[actix_rt::test]
    async fn get_plugin_data_store_scoping() {
        fn row(id: &str, store_id: Option<String>) -> PluginDataRow {
            PluginDataRow {
                id: id.to_string(),
                plugin_code: "plugin_code".to_string(),
                related_record_id: None,
                data_identifier: "StockLine".to_string(),
                store_id,
                data: "test".to_string(),
                datetime: None,
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "get_plugin_data_store_scoping",
            MockDataInserts::all(),
            MockData {
                plugin_data: vec![
                    row("own", Some(mock_store_a().id.clone())),
                    row("other", Some(mock_store_b().id.clone())),
                    row("global", None),
                ],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id.clone(), mock_user_account_a().id)
            .unwrap();
        let service = service_provider.plugin_data_service;

        let mut filter = PluginDataFilter::new();
        filter.store_id = Some(EqualFilter::equal_any_or_null(vec![mock_store_a().id]));

        let mut ids: Vec<String> = service
            .get_plugin_data(&context, None, Some(filter), None)
            .unwrap()
            .rows
            .into_iter()
            .map(|r| r.plugin_data.id)
            .collect();
        ids.sort();

        // Own store + global, but NOT store B's row.
        assert_eq!(ids, vec!["global".to_string(), "own".to_string()]);
    }
}
