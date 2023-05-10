use crate::service_provider::ServiceContext;

use self::insert::{insert_repack, InsertRepack, InsertRepackError};
use repository::Invoice;

pub mod generate;
pub mod insert;
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
}

pub struct RepackService;
impl RepackServiceTrait for RepackService {}
