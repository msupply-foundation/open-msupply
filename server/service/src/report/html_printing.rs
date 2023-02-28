use std::{fs, path::PathBuf, str::FromStr};

use headless_chrome::{types::PrintToPdfOptions, Browser, LaunchOptionsBuilder};

pub fn html_to_pdf(
    temp_dir: &Option<String>,
    document: &str,
    document_id: &str,
) -> Result<Vec<u8>, anyhow::Error> {
    let pdf_options = Some(PrintToPdfOptions {
        display_header_footer: Some(false),
        prefer_css_page_size: None,
        landscape: None,
        print_background: None,
        scale: None,
        // Assuming 96 DPI (dots per inch)
        paper_width: None,
        paper_height: None,
        margin_top: None,
        margin_bottom: None,
        margin_left: None,
        margin_right: None,
        page_ranges: None,
        ignore_invalid_page_ranges: None,
        header_template: None,
        footer_template: None,
        transfer_mode: None,
    });

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

    let document_name = format!("{}.html", document_id);
    let temp_html_doc_path = temp_dir.join(document_name);
    fs::write(&temp_html_doc_path, document)?;

    // create a new browser and a tab in that browser using headless-chrome
    let launch_options = LaunchOptionsBuilder::default().headless(true).build()?;
    let local_pdf = Browser::new(launch_options)?
        .new_tab()?
        .navigate_to(&format!("file:{}", temp_html_doc_path.to_string_lossy()))?
        .wait_until_navigated()?
        .print_to_pdf(pdf_options)?;

    // clean up
    fs::remove_file(temp_html_doc_path)?;
    Ok(local_pdf)
}
