use crate::service_provider::ServiceContext;
use repository::{
    PrescriptionRequestLine, PrescriptionRequestLineFilter, PrescriptionRequestLineRow, RepositoryError,
};

pub mod delete;
pub mod query;
pub mod upsert;

use self::delete::{delete_prescription_request_line, DeletePrescriptionRequestLineError};
use self::query::get_prescription_request_lines;
use self::upsert::{
    upsert_prescription_request_line, UpsertPrescriptionRequestLine, UpsertPrescriptionRequestLineError,
};

pub trait PrescriptionRequestLineServiceTrait: Sync + Send {
    fn get_prescription_request_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        filter: PrescriptionRequestLineFilter,
    ) -> Result<Vec<PrescriptionRequestLine>, RepositoryError> {
        get_prescription_request_lines(ctx, store_id, filter)
    }

    fn upsert_prescription_request_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpsertPrescriptionRequestLine,
    ) -> Result<PrescriptionRequestLineRow, UpsertPrescriptionRequestLineError> {
        upsert_prescription_request_line(ctx, store_id, input)
    }

    fn delete_prescription_request_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: String,
    ) -> Result<String, DeletePrescriptionRequestLineError> {
        delete_prescription_request_line(ctx, store_id, id)
    }
}

pub struct PrescriptionRequestLineService;
impl PrescriptionRequestLineServiceTrait for PrescriptionRequestLineService {}
