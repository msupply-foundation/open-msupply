use std::io::ErrorKind;
use std::path::PathBuf;
use std::str::FromStr;
use std::time::{Duration, SystemTime};

use actix_files as fs;
use actix_web::error::InternalError;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::{guard, web, Error, HttpRequest, HttpResponse};
use reqwest::StatusCode;
use serde::Deserialize;

// this function could be located in different module
pub fn config_static_files(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/files").guard(guard::Get()).to(files));
}

#[derive(Debug, Deserialize)]
pub struct FileRequestQuery {
    id: String,
}

async fn files(
    req: HttpRequest,
    query: web::Query<FileRequestQuery>,
) -> Result<HttpResponse, Error> {
    // write dummy file:
    let file_dir = "./static_files";
    std::fs::create_dir_all(file_dir).unwrap();
    let out_path = PathBuf::from_str(file_dir)
        .unwrap()
        .join(format!("{}_test.txt", query.id));
    std::fs::write(out_path, format!("Hello world! (id = {})", query.id))?;

    let file_path = find_file(&query.id, file_dir)?.ok_or(std::io::Error::new(
        ErrorKind::NotFound,
        "Static file not found",
    ))?;
    let original_file_name = parse_original_file_name(&query.id, &file_path).ok_or(
        InternalError::new("Invalid file name", StatusCode::INTERNAL_SERVER_ERROR),
    )?;
    // clean up the static file directory
    let max_lifetime_sec = 60 * 60; // 1 hours
    delete_old_files(file_dir, max_lifetime_sec)?;

    let response = fs::NamedFile::open(file_path)?
        .set_content_disposition(ContentDisposition {
            disposition: DispositionType::Attachment,
            parameters: vec![DispositionParam::Filename(original_file_name)],
        })
        .into_response(&req);

    Ok(response)
}

/// Returns the file name part of the path like:
/// `./static_file_path/{ui}_{file_name};
fn parse_original_file_name(id: &str, file_path: &PathBuf) -> Option<String> {
    let file_name = file_path.file_name()?.to_string_lossy();
    let name = &file_name[id.len() + 1..];
    if name.len() == 0 {
        // something is wrong...
        return None;
    }
    Some(name.to_string())
}

/// TODO move into a service
/// Finds file starting with the provided id
fn find_file(id: &str, file_dir: &str) -> Result<Option<PathBuf>, Error> {
    let starts_with = format!("{}_", id);
    let paths = std::fs::read_dir(file_dir)?;
    for path in paths {
        let entry = path?;
        let entry_path = entry.path();
        let metadata = entry.metadata()?;
        if !metadata.is_file() {
            continue;
        }

        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(&starts_with) {
            return Ok(Some(entry_path));
        }
    }

    Ok(None)
}

fn delete_old_files(file_dir: &str, max_life_time_sec: u64) -> Result<(), Error> {
    let paths = std::fs::read_dir(file_dir)?;
    for path in paths {
        let entry = path?;
        let entry_path = entry.path();
        let metadata = entry.metadata()?;
        if !metadata.is_file() {
            continue;
        }
        // creation time is not available on some file systems...
        let file_time = metadata.modified()?;
        if SystemTime::now()
            .duration_since(file_time)
            .unwrap_or(Duration::from_secs(0))
            > Duration::from_secs(max_life_time_sec)
        {
            log::info!("Delete old static file: {:?}", entry_path);
            std::fs::remove_file(entry_path).unwrap_or_else(|err| {
                log::error!("Failed to delete old static file: {}", err);
                ()
            });
        }
    }

    Ok(())
}
