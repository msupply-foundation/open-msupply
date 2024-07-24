use std::{fs, path::PathBuf, str::FromStr};

use fast_scraper::Html;
use headless_chrome::{types::PrintToPdfOptions, Browser, LaunchOptionsBuilder};

pub fn html_to_excel(
    temp_dir: &Option<String>,
    document: &str,
    document_id: &str,
) -> Result<Vec<u8>, anyhow::Error> {
    println!("EXCEL!");
    let doc = Html::parse_document(document);

    let mut book = umya_spreadsheet::new_file();

    let path = std::path::Path::new("/Users/carl/Desktop/_OUTPUT/test.xlsx");

    let temp_dir = match temp_dir {
        Some(temp_dir) => PathBuf::from_str(temp_dir)?,
        None => std::env::current_dir()?,
    }
    .join("report_printing_tmp");
    // headless chrome needs an absolute path
    let temp_dir = if !temp_dir.is_absolute() {
        std::env::current_dir()?.join(temp_dir)
    } else {
        temp_dir
    };
    fs::create_dir_all(&temp_dir)?;

    let document_name = format!("{}.xlsx", document_id);
    let temp_xls_doc_path = temp_dir.join(document_name);
    // fs::write(&temp_html_doc_path, document)?;

    println!("{}", temp_xls_doc_path.display());

    let _ = umya_spreadsheet::writer::xlsx::write(&book, &temp_xls_doc_path);

    // create a new browser and a tab in that browser using headless-chrome
    // let launch_options = LaunchOptionsBuilder::default().headless(true).build()?;
    // let local_pdf = Browser::new(launch_options)?
    //     .new_tab()?
    //     .navigate_to(&format!("file:{}", temp_xls_doc_path.to_string_lossy()))?
    //     .wait_until_navigated()?
    //     .print_to_pdf(pdf_options)?;

    // clean up
    // fs::remove_file(temp_html_doc_path)?;
    Ok(temp_xls_doc_path)
}
