use actix_web::web::Data;
use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use service::{
    UploadedFile, UploadedFileConversionError,
    auth::{Resource, ResourceAccessRequest},
    central_data_io::{
        ExportCount, ExportError, ExportFilter, ExportTable, FieldChange, ImportError,
        ImportSummary, MAX_IMPORT_ROWS, RowChange, TableChanges, cells::RowError, sheet::MAX_CELLS,
    },
    service_provider::ServiceProvider,
    static_files::{StaticFileCategory, StaticFileService},
};

#[derive(Default, Clone)]
pub struct CentralDataQueries;

#[Object]
impl CentralDataQueries {
    /// Writes nothing.
    pub async fn import_preview(
        &self,
        ctx: &Context<'_>,
        file_id: String,
    ) -> Result<CentralDataImportResponse> {
        import(ctx, file_id, false).await
    }

    pub async fn export_counts(
        &self,
        ctx: &Context<'_>,
        tables: Vec<CentralDataExportTableInput>,
    ) -> Result<CentralDataExportCountsNode> {
        validate(ctx)?;
        let service_provider = ctx.service_provider();
        let context = service_provider.basic_context()?;
        let tables: Vec<ExportTable> = tables.into_iter().map(Into::into).collect();
        let counts = service_provider
            .central_data_service
            .export_counts(&context, &tables)
            .map_err(StandardGraphqlError::from_repository_error)?;
        Ok(CentralDataExportCountsNode {
            tables: counts
                .into_iter()
                .map(|ExportCount { table, count }| CentralDataExportCountNode {
                    table: table.into(),
                    matching: count.matching,
                    total: count.total,
                })
                .collect(),
            max_rows: MAX_IMPORT_ROWS as u32,
        })
    }
}

#[derive(Default, Clone)]
pub struct CentralDataMutations;

#[Object]
impl CentralDataMutations {
    /// Returns a file id for /files. Refused over the import cap.
    pub async fn export(
        &self,
        ctx: &Context<'_>,
        tables: Vec<CentralDataExportTableInput>,
    ) -> Result<CentralDataExportResponse> {
        validate(ctx)?;
        let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
        let base_dir = ctx.get_settings().server.base_dir.clone();
        let tables: Vec<ExportTable> = tables.into_iter().map(Into::into).collect();

        // Blocking pool: under HTTP/2 a client's requests share one actix worker.
        let file_id = tokio::task::spawn_blocking(move || -> Result<Result<String, usize>> {
            let context = service_provider.basic_context()?;
            let bytes = match service_provider
                .central_data_service
                .export(&context, &tables)
            {
                Ok(bytes) => bytes,
                Err(ExportError::TooManyRows { row_count }) => return Ok(Err(row_count)),
                Err(error) => {
                    return Err(StandardGraphqlError::InternalError(format!("{error:?}")).extend());
                }
            };
            let file = StaticFileService::new(&base_dir)
                .and_then(|files| {
                    files.store_file("central_data.xlsx", StaticFileCategory::Temporary, &bytes)
                })
                .map_err(|error| {
                    StandardGraphqlError::InternalError(format!("{error:#}")).extend()
                })?;
            Ok(Ok(file.id))
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)??;

        Ok(match file_id {
            Ok(file_id) => CentralDataExportResponse::Response(CentralDataExportNode { file_id }),
            Err(row_count) => CentralDataExportResponse::Error(CentralDataExportError {
                error: CentralDataExportErrorInterface::TooManyRows(TooManyRows { row_count }),
            }),
        })
    }

    /// The upload with each row's errors in an `error` column, as a file id for /files.
    pub async fn errors_file(
        &self,
        ctx: &Context<'_>,
        file_id: String,
    ) -> Result<CentralDataErrorsFileResponse> {
        errors_file(ctx, file_id).await
    }

    /// Applies nothing if any row has an error.
    pub async fn import(
        &self,
        ctx: &Context<'_>,
        file_id: String,
    ) -> Result<CentralDataImportResponse> {
        import(ctx, file_id, true).await
    }
}

fn validate(ctx: &Context<'_>) -> Result<()> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ImportExportCentralData,
            store_id: None,
            require_central_standalone: true,
        },
    )?;
    Ok(())
}

async fn import(
    ctx: &Context<'_>,
    file_id: String,
    commit: bool,
) -> Result<CentralDataImportResponse> {
    validate(ctx)?;
    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let Some(path) = uploaded_path(ctx, file_id)? else {
        return Ok(CentralDataImportResponse::Error(upload_expired()));
    };

    // Blocking pool, to free the worker; the transaction is as long either way.
    let result = tokio::task::spawn_blocking(move || -> Result<_> {
        let context = service_provider.basic_context()?;
        let service = &service_provider.central_data_service;
        Ok(if commit {
            service.import(&context, &path)
        } else {
            service.preview_import(&context, &path)
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    let error = match result {
        Ok(summary) => return Ok(CentralDataImportResponse::Response(summary.into())),
        Err(error) => import_error(error)?,
    };
    Ok(CentralDataImportResponse::Error(CentralDataImportError {
        error,
    }))
}

/// `None` once the upload is deleted, an hour after it's made.
fn uploaded_path(ctx: &Context<'_>, file_id: String) -> Result<Option<std::path::PathBuf>> {
    match (UploadedFile { file_id }).as_static_file(ctx.get_settings()) {
        Ok(file) => Ok(Some(file.to_path_buf())),
        Err(UploadedFileConversionError::FileNotFound) => Ok(None),
        Err(error) => Err(StandardGraphqlError::BadUserInput(error.to_string()).extend()),
    }
}

fn upload_expired() -> CentralDataImportError {
    CentralDataImportError {
        error: CentralDataImportErrorInterface::UploadExpired(UploadExpired),
    }
}

fn import_error(error: ImportError) -> Result<CentralDataImportErrorInterface> {
    match error {
        ImportError::CannotReadFile(description) => Ok(
            CentralDataImportErrorInterface::CannotReadFile(CannotReadFile(description)),
        ),
        ImportError::TooManyRows { row_count } => {
            Ok(CentralDataImportErrorInterface::TooManyRows(TooManyRows {
                row_count,
            }))
        }
        ImportError::TooManyCells { cell_count } => Ok(
            CentralDataImportErrorInterface::TooManyCells(TooManyCells { cell_count }),
        ),
        error => Err(internal_import_error(error)),
    }
}

fn internal_import_error(error: ImportError) -> Error {
    StandardGraphqlError::InternalError(format!("{error:?}")).extend()
}

async fn errors_file(ctx: &Context<'_>, file_id: String) -> Result<CentralDataErrorsFileResponse> {
    validate(ctx)?;
    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let base_dir = ctx.get_settings().server.base_dir.clone();
    let Some(path) = uploaded_path(ctx, file_id)? else {
        return Ok(CentralDataErrorsFileResponse::Error(upload_expired()));
    };

    let result = tokio::task::spawn_blocking(move || -> Result<_> {
        let context = service_provider.basic_context()?;
        Ok(service_provider
            .central_data_service
            .import_errors_file(&context, &path)
            .map(|bytes| {
                StaticFileService::new(&base_dir).and_then(|files| {
                    files.store_file(
                        "central_data_errors.xlsx",
                        StaticFileCategory::Temporary,
                        &bytes,
                    )
                })
            }))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    match result {
        Ok(stored) => {
            let file = stored.map_err(|error| {
                StandardGraphqlError::InternalError(format!("{error:#}")).extend()
            })?;
            Ok(CentralDataErrorsFileResponse::Response(
                CentralDataExportNode { file_id: file.id },
            ))
        }
        Err(error) => Ok(CentralDataErrorsFileResponse::Error(
            CentralDataImportError {
                error: import_error(error)?,
            },
        )),
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "service::central_data_io::CentralDataTable")]
pub enum CentralDataTableNode {
    Unit,
}

#[derive(InputObject)]
pub struct CentralDataExportTableInput {
    pub table: CentralDataTableNode,
    /// Any letter case.
    pub contains: Option<String>,
    /// Ignored by a table with no active flag.
    pub is_active: Option<bool>,
}

impl From<CentralDataExportTableInput> for ExportTable {
    fn from(
        CentralDataExportTableInput {
            table,
            contains,
            is_active,
        }: CentralDataExportTableInput,
    ) -> Self {
        ExportTable {
            table: table.into(),
            filter: ExportFilter {
                contains,
                is_active,
            },
        }
    }
}

#[derive(SimpleObject)]
pub struct CentralDataExportCountsNode {
    pub tables: Vec<CentralDataExportCountNode>,
    /// Across all tables, as for an import.
    pub max_rows: u32,
}

#[derive(SimpleObject)]
pub struct CentralDataExportCountNode {
    pub table: CentralDataTableNode,
    pub matching: u32,
    pub total: u32,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "service::central_data_io::Change")]
pub enum CentralDataChangeNode {
    Inserted,
    Updated,
    Deleted,
    Unchanged,
}

#[derive(SimpleObject)]
pub struct CentralDataExportNode {
    pub file_id: String,
}

#[derive(SimpleObject)]
pub struct CentralDataTableChangesNode {
    pub table: CentralDataTableNode,
    pub inserted: u32,
    pub updated: u32,
    pub deleted: u32,
    pub unchanged: u32,
    /// Heading errors included.
    pub error_count: u32,
}

#[derive(SimpleObject)]
pub struct CentralDataRowErrorNode {
    pub sheet: String,
    /// As Excel shows it.
    pub row: u32,
    pub column: Option<String>,
    pub message: String,
}

#[derive(SimpleObject)]
pub struct CentralDataFieldChangeNode {
    pub column: String,
    pub from: String,
    pub to: String,
}

#[derive(SimpleObject)]
pub struct CentralDataRowChangeNode {
    pub sheet: String,
    /// As Excel shows it.
    pub row: u32,
    /// E.g. the unit's name.
    pub record: String,
    pub change: CentralDataChangeNode,
    /// For an update, the columns that change.
    pub fields: Vec<CentralDataFieldChangeNode>,
}

#[derive(SimpleObject)]
pub struct CentralDataImportNode {
    pub tables: Vec<CentralDataTableChangesNode>,
    /// The first 100; `tables` counts them all.
    pub changes: Vec<CentralDataRowChangeNode>,
    /// The first 100.
    pub errors: Vec<CentralDataRowErrorNode>,
    /// With any, nothing was applied.
    pub error_count: u32,
}

impl From<ImportSummary> for CentralDataImportNode {
    fn from(
        ImportSummary {
            tables,
            changes,
            errors,
            error_count,
            ..
        }: ImportSummary,
    ) -> Self {
        CentralDataImportNode {
            tables: tables
                .into_iter()
                .map(
                    |TableChanges {
                         table,
                         inserted,
                         updated,
                         deleted,
                         unchanged,
                         error_count,
                     }| CentralDataTableChangesNode {
                        table: table.into(),
                        inserted,
                        updated,
                        deleted,
                        unchanged,
                        error_count,
                    },
                )
                .collect(),
            changes: changes
                .into_iter()
                .map(
                    |RowChange {
                         sheet,
                         row,
                         record,
                         change,
                         fields,
                     }| CentralDataRowChangeNode {
                        sheet,
                        row,
                        record,
                        change: change.into(),
                        fields: fields
                            .into_iter()
                            .map(
                                |FieldChange { column, from, to }| CentralDataFieldChangeNode {
                                    column: column.to_string(),
                                    from,
                                    to,
                                },
                            )
                            .collect(),
                    },
                )
                .collect(),
            errors: errors
                .into_iter()
                .map(
                    |RowError {
                         sheet,
                         row,
                         column,
                         message,
                     }| CentralDataRowErrorNode {
                        sheet,
                        row,
                        column,
                        message,
                    },
                )
                .collect(),
            error_count,
        }
    }
}

pub struct CannotReadFile(String);
#[Object(name = "CentralDataCannotReadFile")]
impl CannotReadFile {
    pub async fn description(&self) -> &str {
        &self.0
    }
}

pub struct TooManyRows {
    row_count: usize,
}
#[Object(name = "CentralDataTooManyRows")]
impl TooManyRows {
    pub async fn description(&self) -> &str {
        "More rows than an import allows"
    }

    pub async fn row_count(&self) -> u32 {
        self.row_count as u32
    }

    pub async fn max_rows(&self) -> u32 {
        MAX_IMPORT_ROWS as u32
    }
}

pub struct TooManyCells {
    cell_count: usize,
}
#[Object(name = "CentralDataTooManyCells")]
impl TooManyCells {
    pub async fn description(&self) -> &str {
        "The sheets span more cells than an import allows"
    }

    pub async fn cell_count(&self) -> u32 {
        self.cell_count.try_into().unwrap_or(u32::MAX)
    }

    pub async fn max_cells(&self) -> u32 {
        MAX_CELLS as u32
    }
}

pub struct UploadExpired;
#[Object(name = "CentralDataUploadExpired")]
impl UploadExpired {
    pub async fn description(&self) -> &str {
        "The uploaded file is no longer on the server"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum CentralDataImportErrorInterface {
    CannotReadFile(CannotReadFile),
    TooManyRows(TooManyRows),
    TooManyCells(TooManyCells),
    UploadExpired(UploadExpired),
}

#[derive(SimpleObject)]
pub struct CentralDataImportError {
    pub error: CentralDataImportErrorInterface,
}

#[derive(Union)]
pub enum CentralDataImportResponse {
    Error(CentralDataImportError),
    Response(CentralDataImportNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum CentralDataExportErrorInterface {
    TooManyRows(TooManyRows),
}

#[derive(SimpleObject)]
pub struct CentralDataExportError {
    pub error: CentralDataExportErrorInterface,
}

#[derive(Union)]
pub enum CentralDataExportResponse {
    Error(CentralDataExportError),
    Response(CentralDataExportNode),
}

#[derive(Union)]
pub enum CentralDataErrorsFileResponse {
    Error(CentralDataImportError),
    Response(CentralDataExportNode),
}
