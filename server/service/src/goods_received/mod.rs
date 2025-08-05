use repository::{
    GoodsReceivedFilter, GoodsReceivedRepository, GoodsReceivedRow, GoodsReceivedSort,
    RepositoryError, StorageConnection,
};

pub trait GoodsReceivedServiceTrait: Sync + Send {
    fn get_goods_received(
        &self,
        connection: &StorageConnection,
        filter: Option<GoodsReceivedFilter>,
        sort: Option<GoodsReceivedSort>,
    ) -> Result<Vec<GoodsReceivedRow>, RepositoryError>;
}

pub struct GoodsReceivedService;

impl GoodsReceivedServiceTrait for GoodsReceivedService {
    fn get_goods_received(
        &self,
        connection: &StorageConnection,
        filter: Option<GoodsReceivedFilter>,
        sort: Option<GoodsReceivedSort>,
    ) -> Result<Vec<GoodsReceivedRow>, RepositoryError> {
        let repo = GoodsReceivedRepository::new(connection);
        repo.query(repository::Pagination::new(), filter, sort)
    }
}
