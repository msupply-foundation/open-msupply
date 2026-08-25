use self::delete::{delete_prescription_order, DeletePrescriptionOrderError};
use self::insert::{
    insert_prescription_order, InsertPrescriptionOrder, InsertPrescriptionOrderError,
};
use self::query::{get_prescription_order, get_prescription_orders};
use self::update::{
    update_prescription_order, UpdatePrescriptionOrder, UpdatePrescriptionOrderError,
};
use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    PaginationOption, PrescriptionOrder, PrescriptionOrderFilter, PrescriptionOrderRow,
    PrescriptionOrderSort, RepositoryError,
};

pub mod delete;
pub mod generate;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

pub trait PrescriptionOrderServiceTrait: Sync + Send {
    fn get_prescription_orders(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<PrescriptionOrderFilter>,
        sort: Option<PrescriptionOrderSort>,
    ) -> Result<ListResult<PrescriptionOrder>, ListError> {
        get_prescription_orders(ctx, store_id, pagination, filter, sort)
    }

    fn get_prescription_order(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        id: &str,
    ) -> Result<Option<PrescriptionOrder>, RepositoryError> {
        get_prescription_order(ctx, store_id, id)
    }

    fn insert_prescription_order(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertPrescriptionOrder,
    ) -> Result<PrescriptionOrderRow, InsertPrescriptionOrderError> {
        insert_prescription_order(ctx, store_id, input)
    }

    fn update_prescription_order(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdatePrescriptionOrder,
    ) -> Result<PrescriptionOrderRow, UpdatePrescriptionOrderError> {
        update_prescription_order(ctx, store_id, input)
    }

    fn delete_prescription_order(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: String,
    ) -> Result<String, DeletePrescriptionOrderError> {
        delete_prescription_order(ctx, store_id, id)
    }
}

pub struct PrescriptionOrderService;
impl PrescriptionOrderServiceTrait for PrescriptionOrderService {}
