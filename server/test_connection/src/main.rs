use cli::{all_tests, TestCredentials, TestData};
use slint::{Model, ModelRc, SharedString, VecModel};
use std::rc::Rc;

slint::include_modules!();

pub fn main() -> Result<(), slint::PlatformError> {
    // On Windows, open GL is not available in remote connections; force software rendering for the test app to ensure it runs in all environments
    #[cfg(target_os = "windows")]
    std::env::set_var("SLINT_BACKEND", "winit-software");

    let app = App::new()?;

    // Populate the test list with all tests in pending state
    let tests_model: Rc<VecModel<TestEntry>> = Rc::new(VecModel::from(
        all_tests()
            .iter()
            .map(|t| TestEntry {
                name: SharedString::from(t.name()),
                status: SharedString::from("pending"),
                message: SharedString::from(""),
            })
            .collect::<Vec<_>>(),
    ));

    app.set_tests(ModelRc::from(tests_model));

    let app_weak = app.as_weak();

    app.on_start_tests(move |username, password| {
        let username = username.to_string();
        let password = password.to_string();

        // We are on the event loop thread here — reset state directly
        if let Some(app) = app_weak.upgrade() {
            reset_tests(&app);
            app.set_running(true);
        }

        let app_weak_bg = app_weak.clone();
        std::thread::spawn(move || {
            run_tests(username, password, app_weak_bg);
        });
    });

    app.run()
}

/// Reset every test entry back to pending on the event loop thread.
fn reset_tests(app: &App) {
    let model = app.get_tests();
    for i in 0..model.row_count() {
        if let Some(mut entry) = model.row_data(i) {
            entry.status = SharedString::from("pending");
            entry.message = SharedString::from("");
            model.set_row_data(i, entry);
        }
    }
}

/// Run all tests sequentially in a background thread, pushing state updates
/// back to the Slint event loop via `upgrade_in_event_loop`.
fn run_tests(username: String, password: String, app_weak: slint::Weak<App>) {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to build tokio runtime");

    rt.block_on(async move {
        let credentials = TestCredentials { username, password };
        let mut test_data = TestData {
            server_config: None,
            sync_api_v5: None,
            credentials,
        };

        let tests = all_tests();

        for (i, test) in tests.iter().enumerate() {
            set_test_state(&app_weak, i, "running", String::new());

            let (status, message) = match test.run(&mut test_data).await {
                Ok(msg) => ("success", msg),
                Err(err) => ("failure", err.to_string()),
            };

            set_test_state(&app_weak, i, status, message);
        }

        // Mark run as complete so the button re-enables
        let app_weak_done = app_weak.clone();
        slint::invoke_from_event_loop(move || {
            if let Some(app) = app_weak_done.upgrade() {
                app.set_running(false);
            }
        })
        .unwrap();
    });
}

/// Schedule a test-row state update on the Slint event loop.
fn set_test_state(
    app_weak: &slint::Weak<App>,
    index: usize,
    status: &'static str,
    message: String,
) {
    let app_weak = app_weak.clone();
    app_weak
        .upgrade_in_event_loop(move |app| {
            let model = app.get_tests();
            if let Some(mut entry) = model.row_data(index) {
                entry.status = SharedString::from(status);
                entry.message = SharedString::from(message.as_str());
                model.set_row_data(index, entry);
            }
        })
        .unwrap();
}
