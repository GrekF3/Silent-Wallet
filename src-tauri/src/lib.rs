use std::fs;
use tauri::Manager;

#[tauri::command]
fn delete_wallet_snapshot(app: tauri::AppHandle) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?
        .join("silent.stronghold");

    if path.exists() {
        fs::remove_file(path).map_err(|err| err.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let salt_path = app
                .path()
                .app_local_data_dir()?
                .join("stronghold-salt.txt");
            app.handle().plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![delete_wallet_snapshot])
        .run(tauri::generate_context!())
        .expect("error while running Silent Wallet");
}
