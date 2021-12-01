use self::{
    delete::{delete_location, DeleteLocationError},
    insert::{insert_location, InsertLocationError},
    query::{get_location, get_locations},
    update::{update_location, UpdateLocationError},
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use domain::{
    location::{
        DeleteLocation, InsertLocation, Location, LocationFilter, LocationSort, UpdateLocation,
    },
    PaginationOption,
};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
mod validate;

pub trait LocationServiceTrait: Sync + Send {
    fn get_locations(
        &self,
        pagination: Option<PaginationOption>,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
        ctx: &ServiceContext,
    ) -> Result<ListResult<Location>, ListError> {
        get_locations(pagination, filter, sort, ctx)
    }

    fn get_location(
        &self,
        id: String,
        ctx: &ServiceContext,
    ) -> Result<Location, SingleRecordError> {
        get_location(id, ctx)
    }

    fn delete_location(
        &self,
        input: DeleteLocation,
        ctx: &ServiceContext,
    ) -> Result<String, DeleteLocationError> {
        delete_location(input, ctx)
    }

    fn insert_location(
        &self,
        input: InsertLocation,
        ctx: &ServiceContext,
    ) -> Result<Location, InsertLocationError> {
        insert_location(input, ctx)
    }

    fn update_location(
        &self,
        input: UpdateLocation,
        ctx: &ServiceContext,
    ) -> Result<Location, UpdateLocationError> {
        update_location(input, ctx)
    }
}

pub struct LocationService {}
impl LocationServiceTrait for LocationService {}

#[cfg(test)]
mod tests;
