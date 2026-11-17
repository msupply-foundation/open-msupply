use actix_web::web::Data;
use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use service::{
    UploadedFile, UploadedFileConversionError,
    auth::{Resource, ResourceAccessRequest},
    central_data::{
        ExportCount, ExportError, ExportFilter, ExportTable, FieldChange, ImportError,
        ImportSummary, MAX_IMPORT_ROWS, OpenSessions, RowChange, TableChanges, cells::RowError,
        sheet::MAX_CELLS,
    },
    service_provider::ServiceProvider,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
};
use std::path::Path;

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
        let user_id = validate(ctx)?;
        let service_provider = ctx.service_provider();
        let context = service_provider.context(String::new(), user_id)?;
        let tables: Vec<ExportTable> = tables.into_iter().map(Into::into).collect();
        let counts = service_provider
            .central_data_service
            .export_counts(&context, &tables)
            .map_err(export_error)?;
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
        let user_id = validate(ctx)?;
        let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
        let base_dir = ctx.get_settings().server.base_dir.clone();
        let tables: Vec<ExportTable> = tables.into_iter().map(Into::into).collect();

        // Blocking pool: under HTTP/2 a client's requests share one actix worker.
        let file_id = tokio::task::spawn_blocking(move || -> Result<Result<String, usize>> {
            let context = service_provider.context(String::new(), user_id)?;
            let bytes = match service_provider
                .central_data_service
                .export(&context, &tables)
            {
                Ok(bytes) => bytes,
                Err(ExportError::TooManyRows { row_count }) => return Ok(Err(row_count)),
                Err(error) => return Err(export_error(error)),
            };
            Ok(Ok(store_temporary(&base_dir, "central_data.xlsx", &bytes)?))
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

fn export_error(error: ExportError) -> Error {
    match error {
        ExportError::ServerAdminOnly => {
            StandardGraphqlError::Forbidden("Only a server admin can export this table".to_string())
                .extend()
        }
        ExportError::DatabaseError(error) => StandardGraphqlError::from_repository_error(error),
        error => StandardGraphqlError::InternalError(format!("{error:?}")).extend(),
    }
}

/// The user's id, for the import and export to know who runs them.
fn validate(ctx: &Context<'_>) -> Result<String> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ImportExportCentralData,
            store_id: None,
            require_central_standalone: true,
        },
    )?;
    Ok(user.user_id)
}

async fn import(
    ctx: &Context<'_>,
    file_id: String,
    commit: bool,
) -> Result<CentralDataImportResponse> {
    let user_id = validate(ctx)?;
    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let settings = ctx.data_unchecked::<Data<Settings>>().clone();
    let sessions = OpenSessions {
        store: ctx.get_auth_data().session_store.clone(),
        keep: ctx.get_auth_token(),
    };

    // Blocking pool, to free the worker; the transaction is as long either way.
    let result = tokio::task::spawn_blocking(move || -> Result<_> {
        let context = service_provider.context(String::new(), user_id)?;
        let service = &service_provider.central_data_service;
        read_upload(&settings, file_id, |path| {
            if commit {
                service.import(&context, path, &sessions)
            } else {
                service.preview_import(&context, path)
            }
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    let error = match result {
        None => upload_expired(),
        Some(Ok(summary)) => return Ok(CentralDataImportResponse::Response(summary.into())),
        Some(Err(error)) => CentralDataImportError {
            error: import_error(error)?,
        },
    };
    Ok(CentralDataImportResponse::Error(error))
}

/// Runs `read` on the upload. `None` once the upload is deleted, an hour after it's made, even
/// when that happens after the lookup.
fn read_upload<T>(
    settings: &Settings,
    file_id: String,
    read: impl FnOnce(&Path) -> Result<T, ImportError>,
) -> Result<Option<Result<T, ImportError>>> {
    let path = match (UploadedFile { file_id }).as_static_file(settings) {
        Ok(file) => file.to_path_buf(),
        Err(UploadedFileConversionError::FileNotFound) => return Ok(None),
        Err(error) => return Err(StandardGraphqlError::BadUserInput(error.to_string()).extend()),
    };
    match read(&path) {
        Err(ImportError::CannotReadFile(_)) if !path.exists() => Ok(None),
        result => Ok(Some(result)),
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
    let user_id = validate(ctx)?;
    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let settings = ctx.data_unchecked::<Data<Settings>>().clone();

    let file_id = tokio::task::spawn_blocking(move || -> Result<_> {
        let context = service_provider.context(String::new(), user_id)?;
        let Some(result) = read_upload(&settings, file_id, |path| {
            service_provider
                .central_data_service
                .import_errors_file(&context, path)
        })?
        else {
            return Ok(None);
        };
        Ok(Some(match result {
            Ok(bytes) => Ok(store_temporary(
                &settings.server.base_dir,
                "central_data_errors.xlsx",
                &bytes,
            )?),
            Err(error) => Err(error),
        }))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(match file_id {
        None => CentralDataErrorsFileResponse::Error(upload_expired()),
        Some(Ok(file_id)) => {
            CentralDataErrorsFileResponse::Response(CentralDataExportNode { file_id })
        }
        Some(Err(error)) => CentralDataErrorsFileResponse::Error(CentralDataImportError {
            error: import_error(error)?,
        }),
    })
}

/// Returns its id for /files; it's deleted an hour later.
fn store_temporary(base_dir: &str, name: &str, bytes: &[u8]) -> Result<String> {
    StaticFileService::new(base_dir)
        .and_then(|files| files.store_file(name, StaticFileCategory::Temporary, bytes))
        .map(|file| file.id)
        .map_err(|error| StandardGraphqlError::InternalError(format!("{error:#}")).extend())
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "service::central_data::CentralDataTable")]
pub enum CentralDataTableNode {
    Unit,
    LocationType,
    User,
    Item,
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
#[graphql(remote = "service::central_data::Change")]
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
    /// As Excel shows it. Null on a sheet name, which has no row.
    pub row: Option<u32>,
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
        self.row_count.try_into().unwrap_or(u32::MAX)
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

#[cfg(test)]
mod tests {
    use super::*;
    use repository::test_db::get_test_db_settings;
    use service::settings::test_settings;

    fn settings(base_dir: &Path) -> Settings {
        let mut settings = test_settings(get_test_db_settings("unused"), None);
        settings.server.base_dir = base_dir.to_string_lossy().to_string();
        settings
    }

    fn upload(settings: &Settings) -> String {
        StaticFileService::new(&settings.server.base_dir)
            .unwrap()
            .store_file("units.xlsx", StaticFileCategory::Temporary, b"x")
            .unwrap()
            .id
    }

    fn unreadable(_: &Path) -> Result<(), ImportError> {
        Err(ImportError::CannotReadFile("no".to_string()))
    }

    mod graphql {
        use super::super::*;
        use graphql_core::test_helpers::{
            TestGraphqlSettings, run_test_gql_query, setup_graphql_test,
        };
        use repository::{PermissionType, StorageConnectionManager, mock::MockDataInserts};
        use serde_json::{Value, json};
        use service::{
            auth::{
                AuthDeniedKind, AuthError, AuthServiceTrait, PermissionDSL, ResourceAccessRequest,
                ValidatedUser,
            },
            auth_data::AuthData,
            service_provider::ServiceContext,
            sync::{CentralServerConfig, test_util_set_is_central_server},
        };
        use std::sync::{Arc, Mutex};

        type Settings = TestGraphqlSettings<CentralDataQueries, CentralDataMutations>;

        /// Every operation, each asking only for its `__typename`s.
        const OPERATIONS: [&str; 5] = [
            "query { exportCounts(tables: [{ table: UNIT }]) { maxRows } }",
            "query($id: String!) { importPreview(fileId: $id) { __typename ... on CentralDataImportError { error { __typename } } } }",
            "mutation { export(tables: [{ table: UNIT }]) { __typename } }",
            "mutation($id: String!) { errorsFile(fileId: $id) { __typename ... on CentralDataImportError { error { __typename } } } }",
            "mutation($id: String!) { import(fileId: $id) { __typename ... on CentralDataImportError { error { __typename } } } }",
        ];

        async fn setup(db_name: &str) -> (StorageConnectionManager, Settings) {
            let (_, _, connection_manager, settings) = setup_graphql_test(
                CentralDataQueries,
                CentralDataMutations,
                db_name,
                MockDataInserts::none().units(),
            )
            .await;
            (connection_manager, settings)
        }

        async fn run(
            settings: &Settings,
            operation: &str,
            service_provider: Option<ServiceProvider>,
        ) -> Value {
            run_test_gql_query(
                settings,
                operation,
                &Some(json!({ "id": "not_uploaded" })),
                service_provider,
            )
            .await
        }

        /// Records what it was asked for and refuses it, as for a user without the permission.
        #[derive(Clone, Default)]
        struct Refuse(Arc<Mutex<Vec<ResourceAccessRequest>>>);
        impl AuthServiceTrait for Refuse {
            fn validate(
                &self,
                _: &ServiceContext,
                _: &AuthData,
                _: &Option<String>,
                _: &Option<String>,
                request: &ResourceAccessRequest,
            ) -> Result<ValidatedUser, AuthError> {
                self.0.lock().unwrap().push(request.clone());
                Err(AuthError::Denied(AuthDeniedKind::InsufficientPermission {
                    msg: "Missing permission".to_string(),
                    required_permissions: PermissionDSL::HasPermission(
                        PermissionType::EditCentralData,
                    ),
                }))
            }
        }

        // covers: OMS-REG-CDIO-01.4

        #[actix_rt::test]
        async fn refused_unless_the_central_server_is_standalone() {
            let (_, settings) = setup("central_data_graphql_not_standalone").await;
            for is_central in [false, true] {
                test_util_set_is_central_server(is_central);
                for operation in OPERATIONS {
                    let result = run(&settings, operation, None).await;
                    assert_eq!(
                        result["errors"][0]["extensions"]["details"],
                        "Only available on standalone central servers",
                        "{operation}: {result}"
                    );
                }
            }
        }

        // covers: OMS-REG-CDIO-01.32

        #[actix_rt::test]
        async fn refused_without_the_central_data_edit_permission() {
            let (connection_manager, settings) = setup("central_data_graphql_permission").await;
            CentralServerConfig::set_standalone_central();
            for operation in OPERATIONS {
                let refuse = Refuse::default();
                let mut service_provider = ServiceProvider::new(connection_manager.clone());
                service_provider.validation_service = Box::new(refuse.clone());

                let result = run(&settings, operation, Some(service_provider)).await;
                assert_eq!(
                    result["errors"][0]["message"], "Forbidden",
                    "{operation}: {result}"
                );
                assert_eq!(result["data"], Value::Null, "{operation}: {result}");
                let requests = refuse.0.lock().unwrap();
                assert_eq!(requests.len(), 1, "{operation}");
                assert_eq!(requests[0].resource, Resource::ImportExportCentralData);
                assert_eq!(requests[0].store_id, None);
            }
        }

        // covers: OMS-REG-CDIO-01.50

        #[actix_rt::test]
        async fn an_upload_that_is_no_longer_on_the_server_has_expired() {
            let (_, settings) = setup("central_data_graphql_upload_expired").await;
            CentralServerConfig::set_standalone_central();
            for (operation, field) in [
                (OPERATIONS[1], "importPreview"),
                (OPERATIONS[3], "errorsFile"),
                (OPERATIONS[4], "import"),
            ] {
                let result = run(&settings, operation, None).await;
                assert_eq!(
                    result["data"][field],
                    json!({
                        "__typename": "CentralDataImportError",
                        "error": { "__typename": "CentralDataUploadExpired" }
                    }),
                    "{result}"
                );
            }
        }
    }

    #[test]
    fn an_unknown_upload_has_expired() {
        let dir = tempfile::tempdir().unwrap();
        let result = read_upload(&settings(dir.path()), "gone".to_string(), |_| Ok(()));
        assert!(matches!(result, Ok(None)));
    }

    #[test]
    fn a_file_that_cannot_be_read_is_reported_as_such() {
        let dir = tempfile::tempdir().unwrap();
        let settings = settings(dir.path());
        let result = read_upload(&settings, upload(&settings), unreadable);
        assert!(matches!(
            result,
            Ok(Some(Err(ImportError::CannotReadFile(_))))
        ));
    }

    #[test]
    fn an_upload_deleted_after_its_lookup_has_expired() {
        let dir = tempfile::tempdir().unwrap();
        let settings = settings(dir.path());
        let result = read_upload(&settings, upload(&settings), |path| {
            std::fs::remove_file(path).unwrap();
            unreadable(path)
        });
        assert!(matches!(result, Ok(None)));
    }
}
