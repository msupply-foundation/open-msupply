use std::{fs, path::PathBuf, str::FromStr};

use headless_chrome::{types::PrintToPdfOptions, Browser, LaunchOptionsBuilder};

/// Converts a HTML report to a PDF file and returns the PDF bytes.
///
/// Rendering is done by headless Chrome/Chromium, so a Chrome/Chromium binary must
/// be available on the server. The standard Docker image bundles Chromium's headless
/// shell (see the Dockerfile); `headless_chrome` locates the binary via the `CHROME`
/// environment variable or the `PATH`. If it can't be launched, we surface an
/// actionable error rather than the raw internal message. See issue #12289.
pub fn html_to_pdf(
    temp_dir: &str,
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
        generate_document_outline: None,
        generate_tagged_pdf: None,
    });

    let temp_dir = PathBuf::from_str(temp_dir)?.join("report_printing_tmp");
    // headless chrome needs an absolute path
    let temp_dir = if !temp_dir.is_absolute() {
        std::env::current_dir()?.join(temp_dir)
    } else {
        temp_dir
    };
    fs::create_dir_all(&temp_dir)?;

    let document_name = format!("{document_id}.html");
    let temp_html_doc_path = temp_dir.join(document_name);
    fs::write(&temp_html_doc_path, document)?;

    // Chrome refuses to start as root inside a container unless the sandbox is
    // disabled. Our Docker image sets OMS_HEADLESS_CHROME_NO_SANDBOX so the bundled
    // Chromium can launch there; the variable is left unset on normal installs, so
    // the sandbox stays enabled by default.
    let sandbox = std::env::var("OMS_HEADLESS_CHROME_NO_SANDBOX").is_err();

    // create a new browser and a tab in that browser using headless-chrome
    let launch_options = LaunchOptionsBuilder::default()
        .headless(true)
        .sandbox(sandbox)
        .build()?;

    // Browser::new is where a missing or unlaunchable Chrome/Chromium binary
    // surfaces (e.g. "Could not auto detect a chrome executable"). Wrap it with an
    // actionable message instead of leaking the raw headless_chrome error. See #12289.
    let browser = Browser::new(launch_options).map_err(|err| {
        anyhow::anyhow!(
            "could not launch headless Chrome/Chromium for PDF export ({err}). \
             Install a Chrome/Chromium binary (the standard Docker image bundles it) \
             or set the CHROME environment variable to its path; see the deployment docs."
        )
    })?;

    let local_pdf = browser
        .new_tab()?
        .navigate_to(&format!("file:{}", temp_html_doc_path.to_string_lossy()))?
        .wait_until_navigated()?
        .print_to_pdf(pdf_options)?;

    // clean up
    fs::remove_file(temp_html_doc_path)?;
    Ok(local_pdf)
}
