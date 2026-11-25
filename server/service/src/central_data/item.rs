use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, choice_cell, collect, keep_or_saved},
    field_changes,
    lookup::{InMemory, active_first, find_record, find_reference},
    name_with_code,
    sheet::Value,
};
use crate::{
    i64_to_u32,
    item::upsert::{UpsertItemError, upsert_resolved_item},
};
use repository::{
    ItemFilter, ItemRepository, ItemRow, ItemRowRepository, ItemSortField, ItemType,
    LocationTypeRow, LocationTypeRowRepository, Pagination, RepositoryError, Sort,
    StorageConnection, StringFilter, UnitRow, UnitRowRepository, VENCategory,
};
use util::uuid::uuid;

const ID: &str = "id";
const CODE: &str = "code";
const NAME: &str = "name";
const UNIT_NAME: &str = "unit_name";
const UNIT_ID: &str = "unit_id";
const STRENGTH: &str = "strength";
const VEN_CATEGORY: &str = "ven_category";
const DEFAULT_PACK_SIZE: &str = "default_pack_size";
const TYPE: &str = "type";
const IS_ACTIVE: &str = "is_active";
const IS_VACCINE: &str = "is_vaccine";
const VACCINE_DOSES: &str = "vaccine_doses";
const LOCATION_TYPE_CODE: &str = "restricted_location_type_code";
const LOCATION_TYPE_ID: &str = "restricted_location_type_id";
const VOLUME_PER_PACK: &str = "volume_per_pack";
const UNIVERSAL_CODE: &str = "universal_code";

const COLUMNS: &[&str] = &[
    ID,
    CODE,
    NAME,
    UNIT_NAME,
    UNIT_ID,
    STRENGTH,
    VEN_CATEGORY,
    DEFAULT_PACK_SIZE,
    TYPE,
    IS_ACTIVE,
    IS_VACCINE,
    VACCINE_DOSES,
    LOCATION_TYPE_CODE,
    LOCATION_TYPE_ID,
    VOLUME_PER_PACK,
    UNIVERSAL_CODE,
];

const EXPORT_PAGE: u32 = 1000;

const VEN_CATEGORIES: &[(&str, VENCategory)] = &[
    ("V", VENCategory::V),
    ("E", VENCategory::E),
    ("N", VENCategory::N),
    ("NOT_ASSIGNED", VENCategory::NotAssigned),
];

const TYPES: &[(&str, ItemType)] = &[
    ("STOCK", ItemType::Stock),
    ("SERVICE", ItemType::Service),
    ("NON_STOCK", ItemType::NonStock),
];

/// Matched by `id`, else `code`. On an update a blank cell keeps the value, except in the
/// optional columns, where it clears it. A blank `is_vaccine` keeps it, though optional, and so
/// does a vaccine's blank `vaccine_doses`.
pub(super) struct ItemTable;

impl ImportTable for ItemTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::Item
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            CODE,
            NAME,
            UNIT_NAME,
            UNIT_ID,
            STRENGTH,
            LOCATION_TYPE_CODE,
            LOCATION_TYPE_ID,
            UNIVERSAL_CODE,
        ]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        let references = References::load(connection)?;
        let repo = ItemRepository::new(connection);
        let filter = item_filter(filter);
        let mut rows = Vec::new();
        // A page at a time, so the catalogue's legacy JSON isn't all held at once.
        loop {
            let page = repo.query(
                Pagination {
                    offset: rows.len() as u32,
                    limit: EXPORT_PAGE,
                },
                Some(filter.clone()),
                Some(Sort {
                    key: ItemSortField::Code,
                    desc: Some(false),
                }),
                None,
            )?;
            let done = page.len() < EXPORT_PAGE as usize;
            rows.extend(
                page.into_iter()
                    .map(|item| cells(&item.item_row, &references)),
            );
            if done {
                return Ok(rows);
            }
        }
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let repo = ItemRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(String::new(), Some(item_filter(filter)))?),
            total: i64_to_u32(repo.count(String::new(), None)?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        _start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(ItemSheet {
            references: References::load(connection)?,
        }))
    }
}

struct ItemSheet {
    references: References,
}

/// The tables an item refers to, for rows to find their unit and location type in and the cells
/// that show their names. Both are small, and their sheets come before the item sheet, so they
/// don't change while it runs.
struct References {
    units: InMemory<UnitRow>,
    location_types: InMemory<LocationTypeRow>,
}

impl References {
    fn load(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        Ok(Self {
            units: InMemory::new(UnitRowRepository::new(connection).find_all()?),
            location_types: InMemory::new(LocationTypeRowRepository::new(connection).find_all()?),
        })
    }
}

impl SheetImport for ItemSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let ven_category = collect(&mut errors, row.choice(VEN_CATEGORY, VEN_CATEGORIES));
        let default_pack_size = collect(&mut errors, row.number(DEFAULT_PACK_SIZE));
        let r#type = collect(&mut errors, row.choice(TYPE, TYPES));
        let is_active = collect(&mut errors, row.bool(IS_ACTIVE));
        let is_vaccine = collect(&mut errors, row.bool(IS_VACCINE));
        let vaccine_doses = collect(&mut errors, row.int(VACCINE_DOSES));
        let volume_per_pack = collect(&mut errors, row.number(VOLUME_PER_PACK));
        let unit_id = collect(
            &mut errors,
            find_reference(&self.references.units, row, UNIT_NAME, UNIT_ID, |units| {
                active_first(units, |unit| unit.is_active)
            })?,
        );
        let location_type_id = collect(
            &mut errors,
            find_reference(
                &self.references.location_types,
                row,
                LOCATION_TYPE_CODE,
                LOCATION_TYPE_ID,
                std::convert::identity,
            )?,
        );
        let id = row.text(ID);
        let code = row.text(CODE);

        // Without its record, the row's other checks would treat it as a new item.
        let existing = match find_record(
            &ItemRowRepository::new(connection),
            row,
            CODE,
            id.as_deref(),
            code.as_deref(),
            |saved| &saved.name,
            std::convert::identity,
        )? {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };
        let saved = existing.as_ref();

        let code = keep_or_saved(code, saved.map(|item| item.code.as_str()));
        let name = keep_or_saved(row.text(NAME), saved.map(|item| item.name.as_str()));
        let ven_category = row.optional(
            VEN_CATEGORY,
            ven_category,
            saved.map(|item| item.ven_category.clone()),
        );
        let default_pack_size = default_pack_size.or(saved.map(|item| item.default_pack_size));
        let r#type = r#type.or(saved.map(|item| item.r#type.clone()));
        let is_active = is_active.or(saved.map(|item| item.is_active));
        // Blank keeps a saved vaccine one; a new item defaults to not a vaccine.
        let is_vaccine = is_vaccine
            .or(saved.map(|item| item.is_vaccine))
            .unwrap_or(false);
        // Required only for a vaccine.
        let vaccine_doses = match (vaccine_doses, is_vaccine) {
            (None, true) => saved.map(|item| item.vaccine_doses),
            (doses, _) => {
                Some(row.optional(VACCINE_DOSES, doses, saved.map(|item| item.vaccine_doses)))
            }
        };
        let volume_per_pack = row.optional(
            VOLUME_PER_PACK,
            volume_per_pack,
            saved.map(|item| item.volume_per_pack),
        );
        row.require_for_new(
            &mut errors,
            "item",
            &[
                (CODE, code.is_none()),
                (NAME, name.is_none()),
                (DEFAULT_PACK_SIZE, default_pack_size.is_none()),
                (TYPE, r#type.is_none()),
                (IS_ACTIVE, is_active.is_none()),
            ],
        );
        // Missing only for a new vaccine.
        row.require_for_new(
            &mut errors,
            "vaccine",
            &[(VACCINE_DOSES, vaccine_doses.is_none())],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let item = ItemRow {
            id: saved
                .map(|item| item.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            code: code.unwrap_or_default(),
            name: name.unwrap_or_default(),
            unit_id: unit_id.unwrap_or_else(|| saved.and_then(|item| item.unit_id.clone())),
            strength: row.optional_text(STRENGTH, saved.and_then(|item| item.strength.as_deref())),
            ven_category,
            default_pack_size: default_pack_size.unwrap_or_default(),
            r#type: r#type.unwrap_or(ItemType::Stock),
            is_active: is_active.unwrap_or_default(),
            is_vaccine,
            vaccine_doses: vaccine_doses.unwrap_or_default(),
            restricted_location_type_id: location_type_id
                .unwrap_or_else(|| saved.and_then(|item| item.restricted_location_type_id.clone())),
            volume_per_pack,
            universal_code: row.optional_text(
                UNIVERSAL_CODE,
                saved.and_then(|item| item.universal_code.as_deref()),
            ),
            // No column: `upsert_resolved_item` keeps the saved one.
            legacy_record: String::new(),
            custom_fields: saved.and_then(|item| item.custom_fields.clone()),
        };

        let change = Change::between(existing.as_ref(), &item, |item| item.is_active);
        if change != Change::Unchanged {
            upsert_resolved_item(connection, saved, &item)
                .map_err(|error| upsert_failure(row, error))?;
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| {
                    field_changes(
                        COLUMNS,
                        cells(&saved, &self.references),
                        cells(&item, &self.references),
                    )
                })
                .unwrap_or_default(),
            record: name_with_code(&item.name, &item.code),
            record_id: item.id,
            change,
        })
    }
}

/// One per column, as the export writes them and the preview shows them.
fn cells(item: &ItemRow, references: &References) -> Vec<Value> {
    let unit_name = item
        .unit_id
        .as_deref()
        .and_then(|id| references.units.get(id))
        .map(|unit| unit.name.clone());
    let location_type_code = item
        .restricted_location_type_id
        .as_deref()
        .and_then(|id| references.location_types.get(id))
        .map(|location_type| location_type.code.clone());
    vec![
        item.id.clone().into(),
        item.code.clone().into(),
        item.name.clone().into(),
        unit_name.into(),
        item.unit_id.clone().into(),
        item.strength.clone().into(),
        choice_cell(VEN_CATEGORIES, &item.ven_category),
        Value::Number(item.default_pack_size),
        choice_cell(TYPES, &item.r#type),
        item.is_active.into(),
        item.is_vaccine.into(),
        item.vaccine_doses.into(),
        location_type_code.into(),
        item.restricted_location_type_id.clone().into(),
        Value::Number(item.volume_per_pack),
        item.universal_code.clone().into(),
    ]
}

fn upsert_failure(row: &Row, error: UpsertItemError) -> RowFailure {
    match error {
        UpsertItemError::CodeRequired => row.error(CODE, "code is required").into(),
        UpsertItemError::NameRequired => row.error(NAME, "name is required").into(),
        // Unreachable here: `find_record` turns a saved code into a match or a conflict first.
        UpsertItemError::DuplicateCode { other_id } => row
            .error(CODE, format!("item {other_id} has this code"))
            .into(),
        UpsertItemError::DefaultPackSizeNotPositive => row
            .error(DEFAULT_PACK_SIZE, "default_pack_size must be above 0")
            .into(),
        UpsertItemError::NegativeVaccineDoses => row
            .error(VACCINE_DOSES, "vaccine_doses can't be negative")
            .into(),
        UpsertItemError::NegativeVolumePerPack => row
            .error(VOLUME_PER_PACK, "volume_per_pack can't be negative")
            .into(),
        // Not checked here: `find_reference` finds them among the saved records.
        UpsertItemError::UnitNotFound => row
            .not_found(row.reference_column(UNIT_NAME, UNIT_ID))
            .into(),
        UpsertItemError::LocationTypeNotFound => row
            .not_found(row.reference_column(LOCATION_TYPE_CODE, LOCATION_TYPE_ID))
            .into(),
        UpsertItemError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// Items can be many, so they're filtered and counted in SQL.
fn item_filter(filter: &ExportFilter) -> ItemFilter {
    let mut item_filter = ItemFilter::new();
    if let Some(text) = filter.contains.as_deref().map(str::trim)
        && !text.is_empty()
    {
        item_filter = item_filter.code_or_name(StringFilter::like(text));
    }
    if let Some(is_active) = filter.is_active {
        item_filter = item_filter.is_active(is_active);
    }
    item_filter
}
