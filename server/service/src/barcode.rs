//! Barcodes (decisions/2026-09-30_barcodes.md, Option 6).
//!
//! - A confirmed barcode is the `barcode` of a packaging variant: this barcode is
//!   for this packaging of this item. Only central sets them, and every site
//!   receives them with the variants. Several items may share a barcode.
//! - Central confirms a barcode onto an existing packaging variant, as a new
//!   packaging level of an existing item variant, or, by default, onto the item's
//!   auto-created variant for the manufacturer: a hidden item variant that only
//!   holds barcodes, created the first time it's needed.
//! - Removing a barcode leaves a deleted packaging variant that keeps it, so
//!   central's decision is remembered: auto-confirm won't put it back.
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
    BarcodeProposalRow, BarcodeProposalRowRepository, EqualFilter, ItemFilter, ItemRepository,
    ItemRowRepository, NameRowRepository, RepositoryError, StorageConnection, StoreRowRepository,
    barcode_proposal::{BarcodeProposalFilter, BarcodeProposalRepository},
    item_variant::{
        item_variant::{ItemVariantFilter, ItemVariantRepository},
        item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
        packaging_variant::{PackagingVariantFilter, PackagingVariantRepository},
        packaging_variant_row::{PackagingVariantRow, PackagingVariantRowRepository},
    },
};
use util::{
    barcode::{display_barcode, standard_barcode},
    uuid::uuid,
};

use crate::{
    item::item::check_item_exists, processors::ProcessorType, service_provider::ServiceContext,
    sync::CentralServerConfig,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BarcodeStatus {
    Confirmed,
    Proposed,
}

/// A confirmed barcode: a packaging variant with a barcode, and its item variant
#[derive(Debug, Clone, PartialEq)]
pub struct ConfirmedBarcode {
    pub packaging_variant: PackagingVariantRow,
    pub item_variant: ItemVariantRow,
}

impl ConfirmedBarcode {
    /// The barcode in its standard form
    pub fn value(&self) -> &str {
        self.packaging_variant
            .barcode
            .as_deref()
            .unwrap_or_default()
    }
}

/// What a scan of a barcode finds: a confirmed barcode, or a proposal made on this
/// site
#[derive(Debug, Clone, PartialEq)]
pub struct BarcodeMatch {
    pub status: BarcodeStatus,
    /// The packaging variant's id, or the proposal's
    pub id: String,
    pub value: String,
    pub item_id: String,
    /// Set for a confirmed barcode
    pub item_variant_id: Option<String>,
    /// Set for a confirmed barcode
    pub packaging_variant_id: Option<String>,
    pub pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
}

impl BarcodeMatch {
    pub fn confirmed(barcode: ConfirmedBarcode) -> Self {
        let ConfirmedBarcode {
            packaging_variant,
            item_variant,
        } = barcode;
        BarcodeMatch {
            status: BarcodeStatus::Confirmed,
            id: packaging_variant.id.clone(),
            value: packaging_variant.barcode.unwrap_or_default(),
            item_id: item_variant.item_id,
            item_variant_id: Some(item_variant.id),
            packaging_variant_id: Some(packaging_variant.id),
            pack_size: packaging_variant.pack_size,
            manufacturer_id: item_variant.manufacturer_id,
        }
    }

    fn proposed(row: BarcodeProposalRow) -> Self {
        BarcodeMatch {
            status: BarcodeStatus::Proposed,
            id: row.id,
            value: row.value,
            item_id: row.item_id,
            item_variant_id: None,
            packaging_variant_id: None,
            pack_size: row.pack_size,
            manufacturer_id: row.manufacturer_id,
        }
    }
}

/// Where central puts a barcode it confirms
#[derive(Debug, Clone, PartialEq, Default)]
pub enum BarcodeTarget {
    /// A new packaging variant on the item's auto-created variant for the
    /// manufacturer, creating that variant if the item doesn't have one yet
    #[default]
    AutoCreated,
    /// An existing packaging variant of the item, which has no barcode yet
    PackagingVariant(String),
    /// A new packaging variant on an existing item variant of the item
    ItemVariant(String),
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
    pub target: BarcodeTarget,
}

#[derive(Debug, PartialEq)]
pub enum ManageBarcodeError {
    /// Only central confirms or removes barcodes
    NotCentralServer,
    InvalidBarcode,
    InvalidItem,
    ProposalDoesNotExist,
    /// The packaging variant doesn't exist, has no barcode to remove, or isn't
    /// the item's
    PackagingVariantDoesNotExist,
    /// The item variant doesn't exist or isn't the item's
    ItemVariantDoesNotExist,
    /// The packaging variant already has a barcode
    PackagingVariantHasBarcode,
    /// Another packaging variant of the item already has this barcode
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
    /// Everything a scan of `barcode` matches, for items visible in this store or
    /// with stock in it:
    /// confirmed barcodes first, then proposals made on this site, one proposal
    /// per item and none for an item the barcode is confirmed for. Empty for a
    /// barcode nobody has mapped yet.
    fn barcode_matches(
        &self,
        ctx: &ServiceContext,
        barcode: &str,
    ) -> Result<Vec<BarcodeMatch>, RepositoryError> {
        let Some(value) = standard_barcode(barcode) else {
            return Ok(Vec::new());
        };
        let confirmed = confirmed_barcodes(
            &ctx.connection,
            PackagingVariantFilter::new().barcode(EqualFilter::equal_to(value.clone())),
        )?
        .into_iter()
        .map(BarcodeMatch::confirmed);
        let proposed =
            site_proposals(&ctx.connection, &ctx.store_id)?.value(EqualFilter::equal_to(value));
        let proposed = BarcodeProposalRepository::new(&ctx.connection)
            .query_by_filter(proposed)?
            .into_iter()
            .map(BarcodeMatch::proposed);

        let mut confirmed_items = HashSet::new();
        let mut proposed_items = HashSet::new();
        let matches: Vec<BarcodeMatch> = confirmed
            .chain(proposed)
            .filter(|m| match m.status {
                BarcodeStatus::Confirmed => {
                    confirmed_items.insert(m.item_id.clone());
                    true
                }
                BarcodeStatus::Proposed => {
                    !confirmed_items.contains(&m.item_id)
                        && proposed_items.insert(m.item_id.clone())
                }
            })
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

    /// The item's confirmed barcodes, on auto-created variants or not
    fn item_barcodes(
        &self,
        ctx: &ServiceContext,
        item_id: &str,
    ) -> Result<Vec<ConfirmedBarcode>, RepositoryError> {
        item_confirmed_barcodes(&ctx.connection, item_id)
    }

    /// Proposals for the item that central hasn't confirmed: every store's on
    /// central, this site's elsewhere. Once the barcode is confirmed for the item,
    /// its proposals drop out.
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

        let confirmed: HashSet<String> = item_confirmed_barcodes(&ctx.connection, item_id)?
            .iter()
            .map(|barcode| barcode.value().to_string())
            .collect();

        Ok(BarcodeProposalRepository::new(&ctx.connection)
            .query_by_filter(filter)?
            .into_iter()
            .filter(|proposal| !confirmed.contains(&proposal.value))
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

                if let Some(confirmed) = find_confirmed(connection, &value, &input.item_id)? {
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

    /// Central confirms a barcode for an item without a proposal. Confirming one
    /// the item already has returns it.
    fn insert_barcode(
        &self,
        ctx: &ServiceContext,
        input: InsertBarcodeInput,
    ) -> Result<ConfirmedBarcode, ManageBarcodeError> {
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
                confirm(
                    connection,
                    &ctx.user_id,
                    Confirm {
                        value,
                        item_id: input.item_id,
                        pack_size: input.pack_size,
                        manufacturer_id: input.manufacturer_id,
                    },
                    input.target,
                )
            })
            .map_err(|error| error.to_inner_error())
    }

    /// Central confirms a store's proposal, so the barcode reaches every site
    fn confirm_barcode_proposal(
        &self,
        ctx: &ServiceContext,
        proposal_id: &str,
        target: BarcodeTarget,
    ) -> Result<ConfirmedBarcode, ManageBarcodeError> {
        ctx.connection
            .transaction_sync(|connection| {
                check_central()?;
                let proposal = BarcodeProposalRowRepository::new(connection)
                    .find_one_by_id(proposal_id)?
                    .ok_or(ManageBarcodeError::ProposalDoesNotExist)?;
                confirm(
                    connection,
                    &ctx.user_id,
                    Confirm {
                        value: proposal.value,
                        item_id: proposal.item_id,
                        pack_size: proposal.pack_size,
                        manufacturer_id: proposal.manufacturer_id,
                    },
                    target,
                )
            })
            .map_err(|error| error.to_inner_error())
    }

    /// Central removes a confirmed barcode from its packaging variant, everywhere.
    /// The removal is remembered as a deleted packaging variant with the barcode,
    /// so auto-confirm won't put it back:
    /// - on an auto-created variant the packaging variant only holds the barcode,
    ///   so it's deleted, barcode and all. The auto-created variant is deleted too
    ///   once it has no barcode left; stock and lines linked to it stay linked.
    /// - a real packaging level stays, without the barcode, and a deleted copy of
    ///   it keeps the barcode.
    ///
    /// Returns the packaging variant's id.
    fn delete_barcode(
        &self,
        ctx: &ServiceContext,
        packaging_variant_id: &str,
    ) -> Result<String, ManageBarcodeError> {
        ctx.connection
            .transaction_sync(|connection| {
                check_central()?;
                let repo = PackagingVariantRowRepository::new(connection);
                let existing = repo
                    .find_one_by_id(packaging_variant_id)?
                    .filter(|packaging_variant| {
                        packaging_variant.deleted_datetime.is_none()
                            && packaging_variant.barcode.is_some()
                    })
                    .ok_or(ManageBarcodeError::PackagingVariantDoesNotExist)?;
                let item_variant_repo = ItemVariantRowRepository::new(connection);
                let item_variant = item_variant_repo
                    .find_one_by_id(&existing.item_variant_id)?
                    .ok_or(ManageBarcodeError::DatabaseError(RepositoryError::NotFound))?;

                if !item_variant.is_auto_created {
                    repo.upsert_one(&PackagingVariantRow {
                        barcode: None,
                        ..existing.clone()
                    })?;
                    repo.upsert_one(&PackagingVariantRow {
                        id: uuid(),
                        deleted_datetime: Some(Utc::now().naive_utc()),
                        ..existing.clone()
                    })?;
                    return Ok(existing.id);
                }

                repo.mark_deleted(&existing.id)?;
                let has_barcodes_left = PackagingVariantRepository::new(connection)
                    .query_by_filter(
                        PackagingVariantFilter::new()
                            .item_variant_id(EqualFilter::equal_to(item_variant.id.clone())),
                    )?
                    .iter()
                    .any(|packaging_variant| packaging_variant.barcode.is_some());
                if !has_barcodes_left {
                    item_variant_repo.mark_deleted(&item_variant.id)?;
                }

                Ok(existing.id)
            })
            .map_err(|error| error.to_inner_error())
    }
}

pub struct BarcodeService {}
impl BarcodeServiceTrait for BarcodeService {}

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

/// Packaging variants matching `filter` that have a barcode, with their item
/// variants. Deleted variants are left out; auto-created ones are included.
fn confirmed_barcodes(
    connection: &StorageConnection,
    filter: PackagingVariantFilter,
) -> Result<Vec<ConfirmedBarcode>, RepositoryError> {
    let packaging_variants: Vec<PackagingVariantRow> = PackagingVariantRepository::new(connection)
        .query_by_filter(filter)?
        .into_iter()
        .filter(|packaging_variant| packaging_variant.barcode.is_some())
        .collect();
    let item_variant_ids: Vec<String> = packaging_variants
        .iter()
        .map(|packaging_variant| packaging_variant.item_variant_id.clone())
        .collect();
    let item_variants: HashMap<String, ItemVariantRow> = ItemVariantRowRepository::new(connection)
        .find_many_by_id(&item_variant_ids)?
        .into_iter()
        .filter(|item_variant| item_variant.deleted_datetime.is_none())
        .map(|item_variant| (item_variant.id.clone(), item_variant))
        .collect();

    Ok(packaging_variants
        .into_iter()
        .filter_map(|packaging_variant| {
            let item_variant = item_variants
                .get(&packaging_variant.item_variant_id)?
                .clone();
            Some(ConfirmedBarcode {
                packaging_variant,
                item_variant,
            })
        })
        .collect())
}

fn item_variants(
    connection: &StorageConnection,
    item_id: &str,
) -> Result<Vec<ItemVariantRow>, RepositoryError> {
    Ok(ItemVariantRepository::new(connection)
        .query_by_filter(
            ItemVariantFilter::new()
                .item_id(EqualFilter::equal_to(item_id.to_string()))
                .include_auto_created(),
        )?
        .into_iter()
        .map(|item_variant| item_variant.item_variant_row)
        .collect())
}

fn item_confirmed_barcodes(
    connection: &StorageConnection,
    item_id: &str,
) -> Result<Vec<ConfirmedBarcode>, RepositoryError> {
    let item_variant_ids = item_variants(connection, item_id)?
        .into_iter()
        .map(|item_variant| item_variant.id)
        .collect();
    confirmed_barcodes(
        connection,
        PackagingVariantFilter::new().item_variant_id(EqualFilter::equal_any(item_variant_ids)),
    )
}

/// The item's packaging variant with this barcode, if it has one
pub(crate) fn find_confirmed(
    connection: &StorageConnection,
    value: &str,
    item_id: &str,
) -> Result<Option<ConfirmedBarcode>, RepositoryError> {
    Ok(confirmed_barcodes(
        connection,
        PackagingVariantFilter::new().barcode(EqualFilter::equal_to(value.to_string())),
    )?
    .into_iter()
    .find(|barcode| barcode.item_variant.item_id == item_id))
}

/// Barcodes central removed for the item: deleted packaging variants with the
/// barcode, or ones whose item variant was deleted
fn removed_barcodes(
    connection: &StorageConnection,
    value: &str,
    item_id: &str,
) -> Result<Vec<ConfirmedBarcode>, RepositoryError> {
    let packaging_variants =
        PackagingVariantRowRepository::new(connection).find_many_by_barcode(value)?;
    let item_variant_ids: Vec<String> = packaging_variants
        .iter()
        .map(|packaging_variant| packaging_variant.item_variant_id.clone())
        .collect();
    let item_variants: HashMap<String, ItemVariantRow> = ItemVariantRowRepository::new(connection)
        .find_many_by_id(&item_variant_ids)?
        .into_iter()
        .filter(|item_variant| item_variant.item_id == item_id)
        .map(|item_variant| (item_variant.id.clone(), item_variant))
        .collect();

    Ok(packaging_variants
        .into_iter()
        .filter_map(|packaging_variant| {
            let item_variant = item_variants
                .get(&packaging_variant.item_variant_id)?
                .clone();
            let removed = packaging_variant.deleted_datetime.is_some()
                || item_variant.deleted_datetime.is_some();
            removed.then_some(ConfirmedBarcode {
                packaging_variant,
                item_variant,
            })
        })
        .collect())
}

struct Confirm {
    value: String,
    item_id: String,
    pack_size: Option<f64>,
    manufacturer_id: Option<String>,
}

/// Puts `value` on a packaging variant of the item, per `target`. When the item
/// already has the barcode, returns it if `target` allows for it.
fn confirm(
    connection: &StorageConnection,
    user_id: &str,
    Confirm {
        value,
        item_id,
        pack_size,
        manufacturer_id,
    }: Confirm,
    target: BarcodeTarget,
) -> Result<ConfirmedBarcode, ManageBarcodeError> {
    // A pack size has to be positive on a packaging variant
    let pack_size = pack_size.filter(|pack_size| *pack_size > 0.0);

    if let Some(existing) = find_confirmed(connection, &value, &item_id)? {
        let already_there = match &target {
            BarcodeTarget::AutoCreated => true,
            BarcodeTarget::PackagingVariant(id) => existing.packaging_variant.id == *id,
            BarcodeTarget::ItemVariant(id) => existing.item_variant.id == *id,
        };
        if already_there {
            return Ok(existing);
        }
        return Err(ManageBarcodeError::BarcodeAlreadyExistsForItem);
    }

    let item_variants = item_variants(connection, &item_id)?;
    let packaging_variant_repo = PackagingVariantRowRepository::new(connection);

    let packaging_variant = match target {
        BarcodeTarget::PackagingVariant(id) => {
            let packaging_variant = packaging_variant_repo
                .find_one_by_id(&id)?
                .filter(|packaging_variant| {
                    packaging_variant.deleted_datetime.is_none()
                        && item_variants.iter().any(|item_variant| {
                            item_variant.id == packaging_variant.item_variant_id
                        })
                })
                .ok_or(ManageBarcodeError::PackagingVariantDoesNotExist)?;
            if packaging_variant.barcode.is_some() {
                return Err(ManageBarcodeError::PackagingVariantHasBarcode);
            }
            PackagingVariantRow {
                barcode: Some(value),
                ..packaging_variant
            }
        }
        BarcodeTarget::ItemVariant(id) => {
            let item_variant = item_variants
                .iter()
                .find(|item_variant| item_variant.id == id)
                .ok_or(ManageBarcodeError::ItemVariantDoesNotExist)?;
            new_packaging_variant(&item_variant.id, value, pack_size)
        }
        BarcodeTarget::AutoCreated => 'auto_created: {
            // Confirming a barcode central removed from an auto-created variant
            // brings that packaging variant back, with its item variant, keeping
            // their ids so stock and lines linked to them are linked again
            if let Some(removed) = removed_barcodes(connection, &value, &item_id)?
                .into_iter()
                .find(|removed| removed.item_variant.is_auto_created)
            {
                if removed.item_variant.deleted_datetime.is_some() {
                    ItemVariantRowRepository::new(connection).upsert_one(&ItemVariantRow {
                        deleted_datetime: None,
                        ..removed.item_variant
                    })?;
                }
                break 'auto_created PackagingVariantRow {
                    deleted_datetime: None,
                    ..removed.packaging_variant
                };
            }

            let item_variant = match item_variants.iter().find(|item_variant| {
                item_variant.is_auto_created && item_variant.manufacturer_id == manufacturer_id
            }) {
                Some(item_variant) => item_variant.clone(),
                None => {
                    let item_variant = ItemVariantRow {
                        id: uuid(),
                        name: auto_created_name(connection, manufacturer_id.as_deref())?,
                        item_id: item_id.clone(),
                        manufacturer_id,
                        created_datetime: Utc::now().naive_utc(),
                        created_by: Some(user_id.to_string()),
                        is_auto_created: true,
                        ..Default::default()
                    };
                    ItemVariantRowRepository::new(connection).upsert_one(&item_variant)?;
                    item_variant
                }
            };
            new_packaging_variant(&item_variant.id, value, pack_size)
        }
    };
    packaging_variant_repo.upsert_one(&packaging_variant)?;

    find_confirmed(
        connection,
        packaging_variant.barcode.as_deref().unwrap_or_default(),
        &item_id,
    )?
    .ok_or(ManageBarcodeError::DatabaseError(RepositoryError::NotFound))
}

fn new_packaging_variant(
    item_variant_id: &str,
    value: String,
    pack_size: Option<f64>,
) -> PackagingVariantRow {
    PackagingVariantRow {
        id: uuid(),
        name: display_barcode(&value).to_string(),
        item_variant_id: item_variant_id.to_string(),
        // Which packaging level a barcode is for isn't known
        packaging_level: 1,
        pack_size,
        volume_per_unit: None,
        deleted_datetime: None,
        barcode: Some(value),
    }
}

/// Auto-created variants are hidden on current sites, but older ones list them
/// like any other variant, so the name says what they are
fn auto_created_name(
    connection: &StorageConnection,
    manufacturer_id: Option<&str>,
) -> Result<String, RepositoryError> {
    let manufacturer = match manufacturer_id {
        Some(manufacturer_id) => NameRowRepository::new(connection)
            .find_one_by_id(manufacturer_id)?
            .map(|name| name.name),
        None => None,
    };
    Ok(match manufacturer {
        Some(manufacturer) => format!("Barcodes: {manufacturer}"),
        None => "Barcodes".to_string(),
    })
}

/// How many different sites must propose a barcode for an item before central
/// confirms it without review. Sites, not stores: stores on one site already
/// share their proposals, so a second store there agreeing checks nothing.
pub(crate) const SITES_TO_AUTO_CONFIRM: usize = 2;

/// Confirms `value` for the item when enough sites have proposed it, unless a
/// packaging variant already has the barcode, for any item, or central removed it
/// for this item. Uses the pack size
/// and manufacturer when every proposal agrees on them. Returns the new
/// confirmed barcode.
pub(crate) fn auto_confirm(
    connection: &StorageConnection,
    value: &str,
    item_id: &str,
) -> Result<Option<ConfirmedBarcode>, ManageBarcodeError> {
    let already_confirmed = !confirmed_barcodes(
        connection,
        PackagingVariantFilter::new().barcode(EqualFilter::equal_to(value.to_string())),
    )?
    .is_empty();
    if already_confirmed || !removed_barcodes(connection, value, item_id)?.is_empty() {
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
    confirm(
        connection,
        util::constants::SYSTEM_USER_ID,
        Confirm {
            value: value.to_string(),
            item_id: item_id.to_string(),
            pack_size,
            manufacturer_id,
        },
        BarcodeTarget::AutoCreated,
    )
    .map(Some)
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
