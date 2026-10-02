//! Barcodes (decisions/2026-09-30_barcodes.md).
//!
//! - A confirmed barcode (`barcode`) says a barcode is for an item. Only central
//!   writes them, and every site receives them. Several may share a value, one
//!   per item.
//! - A proposal (`barcode_proposal`) is a barcode a store learned: a user picked an
//!   item for it. It syncs up to central only, where it's reviewed on the item.
//! - A scan matches confirmed barcodes plus proposals made by stores on this
//!   site.
//!
//! Every barcode is stored in its standard form (`util::barcode`), so callers pass
//! a barcode as it was scanned or typed.
use std::collections::{HashMap, HashSet};

use chrono::Utc;
use repository::{
    barcode::{Barcode, BarcodeFilter, BarcodeRepository},
    barcode_proposal::{BarcodeProposalFilter, BarcodeProposalRepository},
    BarcodeProposalRow, BarcodeProposalRowRepository, BarcodeRow, BarcodeRowRepository,
    EqualFilter, ItemFilter, ItemRepository, ItemRowRepository, RepositoryError, StorageConnection,
    StoreRowRepository,
};
use util::{barcode::standard_barcode, uuid::uuid};

use crate::{
    item::item::check_item_exists, processors::ProcessorType, service_provider::ServiceContext,
    sync::CentralServerConfig, NullableUpdate,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BarcodeStatus {
    Confirmed,
    Proposed,
}

/// What a scan of a barcode finds: a confirmed barcode, or a proposal made on this
/// site.
#[derive(Debug, Clone, PartialEq)]
pub struct BarcodeMatch {
    pub status: BarcodeStatus,
    /// The confirmed barcode's id, or the proposal's
    pub id: String,
    pub value: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
}

impl BarcodeMatch {
    fn confirmed(row: BarcodeRow) -> Self {
        BarcodeMatch {
            status: BarcodeStatus::Confirmed,
            id: row.id,
            value: row.value,
            item_id: row.item_id,
            pack_size: row.pack_size,
            manufacturer_id: row.manufacturer_id,
        }
    }

    fn proposed(row: BarcodeProposalRow) -> Self {
        BarcodeMatch {
            status: BarcodeStatus::Proposed,
            id: row.id,
            value: row.value,
            item_id: row.item_id,
            pack_size: row.pack_size,
            manufacturer_id: row.manufacturer_id,
        }
    }
}

pub struct ProposeBarcodeInput {
    /// As scanned or typed
    pub barcode: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum ProposeBarcodeError {
    /// Nothing is left of the barcode once trimmed
    InvalidBarcode,
    /// The item doesn't exist or isn't visible in this store
    InvalidItem,
    DatabaseError(RepositoryError),
}

pub struct InsertBarcodeInput {
    /// As scanned or typed
    pub barcode: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
}

pub struct UpdateBarcodeInput {
    pub id: String,
    /// Moves the barcode to another item
    pub item_id: Option<String>,
    pub pack_size: Option<NullableUpdate<f64>>,
}

#[derive(Debug, PartialEq)]
pub enum ManageBarcodeError {
    /// Only central confirms, changes or removes barcodes
    NotCentralServer,
    InvalidBarcode,
    InvalidItem,
    BarcodeDoesNotExist,
    ProposalDoesNotExist,
    /// Moving the barcode to an item that already has it
    BarcodeAlreadyExistsForItem,
    DatabaseError(RepositoryError),
}

#[derive(Debug, PartialEq)]
pub enum DeleteBarcodeProposalError {
    /// No proposal with this id was made on this site
    ProposalDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteBarcodeProposalError {
    fn from(error: RepositoryError) -> Self {
        DeleteBarcodeProposalError::DatabaseError(error)
    }
}

impl From<RepositoryError> for ProposeBarcodeError {
    fn from(error: RepositoryError) -> Self {
        ProposeBarcodeError::DatabaseError(error)
    }
}

impl From<RepositoryError> for ManageBarcodeError {
    fn from(error: RepositoryError) -> Self {
        ManageBarcodeError::DatabaseError(error)
    }
}

pub trait BarcodeServiceTrait: Sync + Send {
    fn get_barcode(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<Option<Barcode>, RepositoryError> {
        get_barcode(&ctx.connection, id)
    }

    /// Everything a scan of `barcode` matches, for items visible in this store or
    /// with stock in it:
    /// confirmed barcodes first, then proposals made on this site, one match per
    /// item. Empty for a barcode nobody has mapped yet.
    fn barcode_matches(
        &self,
        ctx: &ServiceContext,
        barcode: &str,
    ) -> Result<Vec<BarcodeMatch>, RepositoryError> {
        let Some(value) = standard_barcode(barcode) else {
            return Ok(Vec::new());
        };
        let confirmed = BarcodeRepository::new(&ctx.connection)
            .query_by_filter(
                BarcodeFilter::new()
                    .value(EqualFilter::equal_to(value.clone()))
                    .is_deleted(false),
            )?
            .into_iter()
            .map(|barcode| BarcodeMatch::confirmed(barcode.barcode_row));
        let proposed =
            site_proposals(&ctx.connection, &ctx.store_id)?.value(EqualFilter::equal_to(value));
        let proposed = BarcodeProposalRepository::new(&ctx.connection)
            .query_by_filter(proposed)?
            .into_iter()
            .map(BarcodeMatch::proposed);

        let mut seen_items = HashSet::new();
        let matches: Vec<BarcodeMatch> = confirmed
            .chain(proposed)
            .filter(|m| seen_items.insert(m.item_id.clone()))
            .collect();

        let item_ids: Vec<String> = matches.iter().map(|m| m.item_id.clone()).collect();
        let visible: HashSet<String> = ItemRepository::new(&ctx.connection)
            .query_by_filter(
                ItemFilter::new()
                    .id(EqualFilter::equal_any(item_ids))
                    .visible_or_on_hand(true),
                Some(ctx.store_id.clone()),
            )?
            .into_iter()
            .map(|item| item.item_row.id)
            .collect();

        Ok(matches
            .into_iter()
            .filter(|m| visible.contains(&m.item_id))
            .collect())
    }

    /// The item's confirmed barcodes, not including removed ones
    fn item_barcodes(
        &self,
        ctx: &ServiceContext,
        item_id: &str,
    ) -> Result<Vec<Barcode>, RepositoryError> {
        BarcodeRepository::new(&ctx.connection).query_by_filter(
            BarcodeFilter::new()
                .item_id(EqualFilter::equal_to(item_id.to_string()))
                .is_deleted(false),
        )
    }

    /// Proposals for the item that central hasn't decided on: every store's on
    /// central, this site's elsewhere. Once a barcode is confirmed for the item, or
    /// central removes it, its proposals drop out.
    fn item_barcode_proposals(
        &self,
        ctx: &ServiceContext,
        item_id: &str,
    ) -> Result<Vec<BarcodeProposalRow>, RepositoryError> {
        let filter = if CentralServerConfig::is_central_server() {
            BarcodeProposalFilter::new()
        } else {
            site_proposals(&ctx.connection, &ctx.store_id)?
        }
        .item_id(EqualFilter::equal_to(item_id.to_string()));

        let decided: HashSet<String> = BarcodeRepository::new(&ctx.connection)
            .query_by_filter(
                BarcodeFilter::new().item_id(EqualFilter::equal_to(item_id.to_string())),
            )?
            .into_iter()
            .map(|barcode| barcode.barcode_row.value)
            .collect();

        Ok(BarcodeProposalRepository::new(&ctx.connection)
            .query_by_filter(filter)?
            .into_iter()
            .filter(|proposal| !decided.contains(&proposal.value))
            .collect())
    }

    /// Records that a user picked `item_id` for `barcode` in this store. Proposing
    /// the same barcode for the same item again updates the store's proposal. Does
    /// nothing when the barcode is already confirmed for the item, and returns
    /// that confirmed barcode.
    fn propose_barcode(
        &self,
        ctx: &ServiceContext,
        input: ProposeBarcodeInput,
    ) -> Result<BarcodeMatch, ProposeBarcodeError> {
        let result = ctx
            .connection
            .transaction_sync(|connection| {
                let value =
                    standard_barcode(&input.barcode).ok_or(ProposeBarcodeError::InvalidBarcode)?;
                if !check_item_exists(connection, ctx.store_id.clone(), &input.item_id)? {
                    return Err(ProposeBarcodeError::InvalidItem);
                }

                if let Some(confirmed) = BarcodeRowRepository::new(connection)
                    .find_one_by_value_and_item(&value, &input.item_id)?
                    .filter(|barcode| barcode.deleted_datetime.is_none())
                {
                    return Ok(BarcodeMatch::confirmed(confirmed));
                }

                let repo = BarcodeProposalRowRepository::new(connection);
                let now = Utc::now().naive_utc();
                let proposal = match repo.find_one_by_store_value_and_item(
                    &ctx.store_id,
                    &value,
                    &input.item_id,
                )? {
                    Some(existing) => BarcodeProposalRow {
                        pack_size: input.pack_size.or(existing.pack_size),
                        manufacturer_id: input.manufacturer_id.or(existing.manufacturer_id),
                        user_id: ctx.user_id.clone(),
                        updated_datetime: now,
                        ..existing
                    },
                    None => BarcodeProposalRow {
                        id: uuid(),
                        value,
                        item_id: input.item_id,
                        pack_size: input.pack_size,
                        manufacturer_id: input.manufacturer_id,
                        store_id: ctx.store_id.clone(),
                        user_id: ctx.user_id.clone(),
                        created_datetime: now,
                        updated_datetime: now,
                    },
                };
                repo.upsert_one(&proposal)?;
                Ok(BarcodeMatch::proposed(proposal))
            })
            .map_err(|error| error.to_inner_error())?;

        // A proposal from one of central's own stores can confirm a barcode too
        ctx.processors_trigger
            .trigger_processor(ProcessorType::BarcodeAutoConfirm);
        Ok(result)
    }

    /// Withdraws a proposal made by a store on this site, e.g. one that picked the
    /// wrong item. It stops matching here, and the delete syncs up so central stops
    /// reviewing it and auto-confirm stops counting it. A barcode already confirmed
    /// from it stays confirmed. Proposing it again makes a new proposal.
    fn delete_barcode_proposal(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<String, DeleteBarcodeProposalError> {
        ctx.connection
            .transaction_sync(|connection| {
                let on_this_site = site_proposals(connection, &ctx.store_id)?
                    .id(EqualFilter::equal_to(id.to_string()));
                if BarcodeProposalRepository::new(connection)
                    .query_by_filter(on_this_site)?
                    .is_empty()
                {
                    return Err(DeleteBarcodeProposalError::ProposalDoesNotExist);
                }
                BarcodeProposalRowRepository::new(connection).delete(id)?;
                Ok(id.to_string())
            })
            .map_err(|error| error.to_inner_error())
    }

    /// Central adds a confirmed barcode, or brings back a removed one. Adding one
    /// that's already there updates its pack size and manufacturer.
    fn insert_barcode(
        &self,
        ctx: &ServiceContext,
        input: InsertBarcodeInput,
    ) -> Result<Barcode, ManageBarcodeError> {
        ctx.connection
            .transaction_sync(|connection| {
                check_central()?;
                let value =
                    standard_barcode(&input.barcode).ok_or(ManageBarcodeError::InvalidBarcode)?;
                if ItemRowRepository::new(connection)
                    .find_one_by_id(&input.item_id)?
                    .is_none()
                {
                    return Err(ManageBarcodeError::InvalidItem);
                }
                let row = confirm(
                    connection,
                    &value,
                    &input.item_id,
                    input.pack_size,
                    input.manufacturer_id,
                )?;
                read_barcode(connection, &row.id)
            })
            .map_err(|error| error.to_inner_error())
    }

    /// Central confirms a store's proposal
    fn confirm_barcode_proposal(
        &self,
        ctx: &ServiceContext,
        proposal_id: &str,
    ) -> Result<Barcode, ManageBarcodeError> {
        ctx.connection
            .transaction_sync(|connection| {
                check_central()?;
                let proposal = BarcodeProposalRowRepository::new(connection)
                    .find_one_by_id(proposal_id)?
                    .ok_or(ManageBarcodeError::ProposalDoesNotExist)?;
                let row = confirm(
                    connection,
                    &proposal.value,
                    &proposal.item_id,
                    proposal.pack_size,
                    proposal.manufacturer_id,
                )?;
                read_barcode(connection, &row.id)
            })
            .map_err(|error| error.to_inner_error())
    }

    /// Central changes a confirmed barcode's pack size, or moves it to another item
    fn update_barcode(
        &self,
        ctx: &ServiceContext,
        input: UpdateBarcodeInput,
    ) -> Result<Barcode, ManageBarcodeError> {
        ctx.connection
            .transaction_sync(|connection| {
                check_central()?;
                let repo = BarcodeRowRepository::new(connection);
                let existing = repo
                    .find_one_by_id(&input.id)?
                    .filter(|barcode| barcode.deleted_datetime.is_none())
                    .ok_or(ManageBarcodeError::BarcodeDoesNotExist)?;
                let pack_size = match input.pack_size {
                    Some(NullableUpdate { value }) => value,
                    None => existing.pack_size,
                };

                let item_id = match input.item_id {
                    Some(item_id) if item_id != existing.item_id => item_id,
                    _ => {
                        let row = BarcodeRow {
                            pack_size,
                            ..existing
                        };
                        repo.upsert_one(&row)?;
                        return read_barcode(connection, &row.id);
                    }
                };

                if ItemRowRepository::new(connection)
                    .find_one_by_id(&item_id)?
                    .is_none()
                {
                    return Err(ManageBarcodeError::InvalidItem);
                }

                let moved = match repo.find_one_by_value_and_item(&existing.value, &item_id)? {
                    Some(target) if target.deleted_datetime.is_none() => {
                        return Err(ManageBarcodeError::BarcodeAlreadyExistsForItem)
                    }
                    // The item had this barcode and central removed it: bring that
                    // row back instead, as (value, item) is unique
                    Some(removed) => {
                        repo.upsert_one(&BarcodeRow {
                            deleted_datetime: Some(Utc::now().naive_utc()),
                            ..existing.clone()
                        })?;
                        BarcodeRow {
                            pack_size,
                            manufacturer_id: existing.manufacturer_id,
                            deleted_datetime: None,
                            ..removed
                        }
                    }
                    None => BarcodeRow {
                        item_id,
                        pack_size,
                        ..existing
                    },
                };
                repo.upsert_one(&moved)?;
                read_barcode(connection, &moved.id)
            })
            .map_err(|error| error.to_inner_error())
    }

    /// Central removes a confirmed barcode. The row stays, so stores agreeing on
    /// it don't confirm it again.
    fn delete_barcode(&self, ctx: &ServiceContext, id: &str) -> Result<String, ManageBarcodeError> {
        ctx.connection
            .transaction_sync(|connection| {
                check_central()?;
                let repo = BarcodeRowRepository::new(connection);
                let existing = repo
                    .find_one_by_id(id)?
                    .filter(|barcode| barcode.deleted_datetime.is_none())
                    .ok_or(ManageBarcodeError::BarcodeDoesNotExist)?;
                repo.upsert_one(&BarcodeRow {
                    deleted_datetime: Some(Utc::now().naive_utc()),
                    ..existing
                })?;
                Ok(id.to_string())
            })
            .map_err(|error| error.to_inner_error())
    }
}

pub struct BarcodeService {}
impl BarcodeServiceTrait for BarcodeService {}

pub fn get_barcode(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<Barcode>, RepositoryError> {
    Ok(BarcodeRepository::new(connection)
        .query_by_filter(BarcodeFilter::new().id(EqualFilter::equal_to(id.to_string())))?
        .pop())
}

fn read_barcode(connection: &StorageConnection, id: &str) -> Result<Barcode, ManageBarcodeError> {
    get_barcode(connection, id)?.ok_or(ManageBarcodeError::DatabaseError(RepositoryError::NotFound))
}

fn check_central() -> Result<(), ManageBarcodeError> {
    if CentralServerConfig::is_central_server() {
        Ok(())
    } else {
        Err(ManageBarcodeError::NotCentralServer)
    }
}

/// Proposals made by stores on the same site as `store_id`
fn site_proposals(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<BarcodeProposalFilter, RepositoryError> {
    let site_id = StoreRowRepository::new(connection)
        .find_one_by_id(store_id)?
        .ok_or(RepositoryError::NotFound)?
        .site_id;
    Ok(BarcodeProposalFilter::new().site_id(site_id))
}

/// Confirms `value` for the item, bringing back a removed row for it if there is
/// one
fn confirm(
    connection: &StorageConnection,
    value: &str,
    item_id: &str,
    pack_size: Option<f64>,
    manufacturer_id: Option<String>,
) -> Result<BarcodeRow, RepositoryError> {
    let repo = BarcodeRowRepository::new(connection);
    let row = match repo.find_one_by_value_and_item(value, item_id)? {
        Some(existing) => BarcodeRow {
            pack_size: pack_size.or(existing.pack_size),
            manufacturer_id: manufacturer_id.or(existing.manufacturer_id),
            deleted_datetime: None,
            ..existing
        },
        None => BarcodeRow {
            id: uuid(),
            value: value.to_string(),
            item_id: item_id.to_string(),
            pack_size,
            manufacturer_id,
            deleted_datetime: None,
        },
    };
    repo.upsert_one(&row)?;
    Ok(row)
}

/// How many different sites must propose a barcode for an item before central
/// confirms it without review. Sites, not stores: stores on one site already
/// share their proposals, so a second store there agreeing checks nothing.
pub(crate) const SITES_TO_AUTO_CONFIRM: usize = 2;

/// Confirms `value` for the item when enough sites have proposed it, unless
/// central already confirmed something for the barcode or removed it for this
/// item. Copies the pack size and manufacturer when every proposal agrees on
/// them. Returns the new confirmed barcode.
pub(crate) fn auto_confirm(
    connection: &StorageConnection,
    value: &str,
    item_id: &str,
) -> Result<Option<BarcodeRow>, RepositoryError> {
    let barcodes = BarcodeRepository::new(connection)
        .query_by_filter(BarcodeFilter::new().value(EqualFilter::equal_to(value.to_string())))?;
    let already_decided = barcodes.iter().any(|barcode| {
        barcode.barcode_row.deleted_datetime.is_none() || barcode.barcode_row.item_id == item_id
    });
    if already_decided {
        return Ok(None);
    }

    let proposals = BarcodeProposalRepository::new(connection).query_by_filter(
        BarcodeProposalFilter::new()
            .value(EqualFilter::equal_to(value.to_string()))
            .item_id(EqualFilter::equal_to(item_id.to_string())),
    )?;
    let store_ids: Vec<String> = proposals.iter().map(|p| p.store_id.clone()).collect();
    let sites: HashSet<i32> = StoreRowRepository::new(connection)
        .find_many_by_id(&store_ids)?
        .into_iter()
        .map(|store| store.site_id)
        .collect();
    if sites.len() < SITES_TO_AUTO_CONFIRM {
        return Ok(None);
    }

    let pack_size =
        agreed(proposals.iter().map(|p| p.pack_size.map(f64::to_bits))).map(f64::from_bits);
    let manufacturer_id = agreed(proposals.iter().map(|p| p.manufacturer_id.clone()));
    Ok(Some(confirm(
        connection,
        value,
        item_id,
        pack_size,
        manufacturer_id,
    )?))
}

/// The value every proposal gives, if they all give the same one
fn agreed<T: Eq + std::hash::Hash>(values: impl Iterator<Item = Option<T>>) -> Option<T> {
    let mut counts: HashMap<Option<T>, usize> = HashMap::new();
    for value in values {
        *counts.entry(value).or_default() += 1;
    }
    if counts.len() != 1 {
        return None;
    }
    counts.into_keys().next().flatten()
}

#[cfg(test)]
mod test;
