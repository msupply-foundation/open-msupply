use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow, StoreRow, TransactLineRow,
    TransactRow, UserAccountRow,
};

use async_trait::async_trait;

pub trait Repository {}

#[derive(Debug)]
pub struct RepositoryError {
    msg: String,
}

#[async_trait]
pub trait ItemRepository: Sync + Send {
    async fn insert_one(&self, item: &ItemRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<ItemRow, RepositoryError>;
}

#[async_trait]
pub trait ItemLineRepository: Sync + Send {
    async fn insert_one(&self, item_line: &ItemLineRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<ItemLineRow, RepositoryError>;
}

#[async_trait]
pub trait NameRepository: Sync + Send {
    async fn insert_one(&self, name: &NameRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<NameRow, RepositoryError>;
}

#[async_trait]
pub trait RequisitionRepository: Sync + Send {
    async fn insert_one(&self, requisition: &RequisitionRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<RequisitionRow, RepositoryError>;
}

#[async_trait]
pub trait RequisitionLineRepository: Sync + Send {
    async fn insert_one(
        &self,
        requisition_line: &RequisitionLineRow,
    ) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<RequisitionLineRow, RepositoryError>;
    async fn find_many_by_requisition_id(
        &self,
        requisition_id: &str,
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError>;
}

#[async_trait]
pub trait StoreRepository: Sync + Send {
    async fn insert_one(&self, store: &StoreRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<StoreRow, RepositoryError>;
}

#[async_trait]
pub trait TransactRepository: Sync + Send {
    async fn insert_one(&self, transact: &TransactRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<TransactRow, RepositoryError>;
}

#[async_trait]
pub trait CustomerInvoiceRepository: Sync + Send {
    async fn find_many_by_name_id(
        &self,
        name_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError>;
    async fn find_many_by_store_id(
        &self,
        store_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError>;
}

#[async_trait]
pub trait TransactLineRepository: Sync + Send {
    async fn insert_one(&self, transact_line: &TransactLineRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<TransactLineRow, RepositoryError>;
    async fn find_many_by_transact_id(
        &self,
        transact_id: &str,
    ) -> Result<Vec<TransactLineRow>, RepositoryError>;
}

#[async_trait]
pub trait UserAccountRepository: Sync + Send {
    async fn insert_one(&self, user_account: &UserAccountRow) -> Result<(), RepositoryError>;
    async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, RepositoryError>;
}

mod mock;
mod pgsqlx;

pub use mock::{
    CustomerInvoiceMockRepository, ItemLineMockRepository, ItemMockRepository, MockRepository,
    NameMockRepository, RequisitionLineMockRepository, RequisitionMockRepository,
    StoreMockRepository, TransactLineMockRepository, TransactMockRepository,
    UserAccountMockRepository,
};
pub use pgsqlx::{
    CustomerInvoicePgSqlxRepository, ItemLinePgSqlxRepository, ItemPgSqlxRepository,
    NamePgSqlxRepository, PgSqlxRepository, RequisitionLinePgSqlxRepository,
    RequisitionPgSqlxRepository, StorePgSqlxRepository, TransactLinePgSqlxRepository,
    TransactPgSqlxRepository, UserAccountPgSqlxRepository,
};
