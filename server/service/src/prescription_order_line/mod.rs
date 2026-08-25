use crate::service_provider::ServiceContext;
use repository::{
    PrescriptionOrderLine, PrescriptionOrderLineFilter, PrescriptionOrderLineRow, RepositoryError,
};

pub mod delete;
pub mod query;
pub mod upsert;

use self::delete::{delete_prescription_order_line, DeletePrescriptionOrderLineError};
use self::query::get_prescription_order_lines;
use self::upsert::{
    upsert_prescription_order_line, UpsertPrescriptionOrderLine, UpsertPrescriptionOrderLineError,
};

pub trait PrescriptionOrderLineServiceTrait: Sync + Send {
    fn get_prescription_order_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        filter: PrescriptionOrderLineFilter,
    ) -> Result<Vec<PrescriptionOrderLine>, RepositoryError> {
        get_prescription_order_lines(ctx, store_id, filter)
    }

    fn upsert_prescription_order_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpsertPrescriptionOrderLine,
    ) -> Result<PrescriptionOrderLineRow, UpsertPrescriptionOrderLineError> {
        upsert_prescription_order_line(ctx, store_id, input)
    }

    fn delete_prescription_order_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: String,
    ) -> Result<String, DeletePrescriptionOrderLineError> {
        delete_prescription_order_line(ctx, store_id, id)
    }
}

pub struct PrescriptionOrderLineService;
impl PrescriptionOrderLineServiceTrait for PrescriptionOrderLineService {}
