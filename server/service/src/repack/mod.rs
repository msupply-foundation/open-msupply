use crate::service_provider::ServiceContext;

pub use self::insert::{insert_repack, InsertRepack, InsertRepackError};
use self::query::{get_repack, get_repacks_by_stock_line, Repack};
use repository::{Invoice, RepositoryError};

pub mod generate;
pub mod insert;
pub mod query;
pub mod validate;

pub use generate::generate;
pub use validate::validate;

pub trait RepackServiceTrait: Sync + Send {
    fn insert_repack(
        &self,
        ctx: &ServiceContext,
        input: InsertRepack,
    ) -> Result<Invoice, InsertRepackError> {
        insert_repack(ctx, input)
    }

    fn get_repack(
        &self,
        ctx: &ServiceContext,
        invoice_id: &str,
    ) -> Result<Repack, RepositoryError> {
        get_repack(ctx, invoice_id)
    }

    fn get_repacks_by_stock_line(
        &self,
        ctx: &ServiceContext,
        stock_line_id: &str,
    ) -> Result<Vec<Repack>, RepositoryError> {
        get_repacks_by_stock_line(ctx, stock_line_id)
    }
}

pub struct RepackService;
impl RepackServiceTrait for RepackService {}
