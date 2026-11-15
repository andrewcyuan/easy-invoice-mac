#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use base64::Engine;
use std::{
    ffi::{c_char, CStr, CString},
    fs::{self, File},
    io::Write,
    path::Path,
    sync::Mutex,
};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

unsafe extern "C" {
    fn invoice_fonts() -> *mut c_char;
    fn invoice_font_data(identifier: *const c_char) -> *mut c_char;
    fn invoice_free(value: *mut c_char);
}
fn native_json(ptr: *mut c_char) -> Result<serde_json::Value, String> {
    if ptr.is_null() {
        return Err("Font service returned no data".into());
    }
    let data = unsafe { CStr::from_ptr(ptr).to_string_lossy().into_owned() };
    unsafe { invoice_free(ptr) };
    serde_json::from_str(&data).map_err(|e| e.to_string())
}
#[tauri::command]
fn list_fonts() -> Result<serde_json::Value, String> {
    native_json(unsafe { invoice_fonts() })
}
#[tauri::command]
fn read_font(id: String) -> Result<serde_json::Value, String> {
    let id = CString::new(id).map_err(|e| e.to_string())?;
    native_json(unsafe { invoice_font_data(id.as_ptr()) })
}
fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Invalid save path")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let temp = parent.join(format!(".invoice-save-{}-{nonce}.tmp", std::process::id()));
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp)
        .map_err(|e| e.to_string())?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())?;
    fs::rename(&temp, path).map_err(|e| e.to_string())?;
    File::open(parent)
        .and_then(|f| f.sync_all())
        .map_err(|e| e.to_string())
}
#[tauri::command]
fn load_state(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("state.json");
    match fs::read(&path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map(Some).map_err(|e| {
            format!(
                "Cannot read saved data at {}: {e}. The file has not been changed.",
                path.display()
            )
        }),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
#[tauri::command]
fn save_state(
    app: tauri::AppHandle,
    state: serde_json::Value,
    lock: tauri::State<Mutex<()>>,
) -> Result<(), String> {
    let _guard = lock.lock().map_err(|e| e.to_string())?;
    if state["version"] != 1 {
        return Err("Unsupported data version".into());
    }
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("state.json");
    let bytes = serde_json::to_vec_pretty(&state).map_err(|e| e.to_string())?;
    // Keep the previous complete file as an extra recovery option.
    if path.exists() {
        fs::copy(&path, path.with_extension("backup.json")).map_err(|e| e.to_string())?;
    }
    atomic_write(&path, &bytes)
}
#[tauri::command]
async fn export_pdf(app: tauri::AppHandle, filename: String, data: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(data)
            .map_err(|e| e.to_string())?;
        if !bytes.starts_with(b"%PDF-") {
            return Err("Invalid PDF".into());
        }
        let Some(path) = app
            .dialog()
            .file()
            .add_filter("PDF", &["pdf"])
            .set_file_name(filename)
            .blocking_save_file()
        else {
            return Ok(false);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        atomic_write(&path, &bytes)?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(()))
        .setup(|app| {
            use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};
            let application = SubmenuBuilder::new(app, "Invoice")
                .item(&PredefinedMenuItem::about(
                    app,
                    Some("About Invoice"),
                    None,
                )?)
                .separator()
                .item(&PredefinedMenuItem::hide(app, None)?)
                .item(&PredefinedMenuItem::hide_others(app, None)?)
                .item(&PredefinedMenuItem::show_all(app, None)?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "save-and-quit",
                    "Quit Invoice",
                    true,
                    Some("CmdOrCtrl+Q"),
                )?)
                .build()?;
            let edit = SubmenuBuilder::new(app, "Edit")
                .item(&PredefinedMenuItem::undo(app, None)?)
                .item(&PredefinedMenuItem::redo(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::cut(app, None)?)
                .item(&PredefinedMenuItem::copy(app, None)?)
                .item(&PredefinedMenuItem::paste(app, None)?)
                .item(&PredefinedMenuItem::select_all(app, None)?)
                .build()?;
            let window = SubmenuBuilder::new(app, "Window")
                .item(&PredefinedMenuItem::minimize(app, None)?)
                .item(&PredefinedMenuItem::close_window(app, None)?)
                .build()?;
            app.set_menu(
                MenuBuilder::new(app)
                    .item(&application)
                    .item(&edit)
                    .item(&window)
                    .build()?,
            )?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "save-and-quit" {
                let _ = app.emit("flush-and-close", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_fonts, read_font, load_state, save_state, export_pdf
        ])
        .build(tauri::generate_context!())
        .expect("Could not start Invoice")
        .run(|app, event| {
            // Cmd+Q also goes through the frontend flush; window.destroy exits only after a successful save.
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if app.get_webview_window("main").is_some() {
                    api.prevent_exit();
                    let _ = app.emit("flush-and-close", ());
                }
            }
        });
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_replace_and_valid_json() {
        let dir = std::env::temp_dir().join(format!("invoice-test-{}", std::process::id()));
        let path = dir.join("state.json");
        atomic_write(&path, b"{\"version\":1}").unwrap();
        atomic_write(&path, b"{\"version\":1,\"draft\":2}").unwrap();
        let value: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(value["draft"], 2);
        assert!(!path.with_extension("pending").exists());
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn native_fonts_and_system_sfnt() {
        let fonts = list_fonts().unwrap();
        assert!(!fonts.as_array().unwrap().is_empty());
        let value = read_font("__system".into()).unwrap();
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(value["data"].as_str().unwrap())
            .unwrap();
        assert!(bytes.len() > 1000);
        assert_eq!(&bytes[..4], &[0, 1, 0, 0]);
        assert!(read_font("not-a-font".into()).unwrap()["error"].is_string());
    }
}
