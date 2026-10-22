# Running and deploying the final app

The repository root is the static application root. Relative URLs are retained, so the app can also run under a repository subpath on an HTTPS host.

## Current live address

Open [Raaste Mein on GitHub Pages](https://manasjyoti-99.github.io/raaste-mein/). This address served the repository's v5.1.0 entry page when checked on 22 October 2026. Future availability depends on the repository and its Pages configuration.

On the phone, open the address online, wait for the app to become ready and install it using the steps below. Launch the installed PWA for the intended demonstration. A separate device or hosting origin starts with its own local history unless a backup is restored.

## Windows local preview

Open PowerShell or Command Prompt in the folder containing `index.html`:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Use `python` if `py` is unavailable. Open <http://localhost:8000/?v=5.1.0>. No build or dependency installation is required for the app. Keep the root files, `data`, `vendor` and `icons` together.

Localhost is suitable for a desktop preview. A phone accessing a PC over a plain HTTP LAN address does not have the same secure-context capabilities. Use HTTPS for the installed-phone demonstration and live location.

## Install on Android

1. Serve the repository root from an HTTPS host.
2. Open that address online on the phone.
3. Wait for the app's offline-ready status after the complete cache installation.
4. Use the install action or the browser's install/add-to-home-screen action.
5. Launch the installed app and confirm version 5.1.0.

The installed interface uses standalone portrait mode from `manifest.json`. Replay can be demonstrated without being on campus. Live GPS requires the fixed route and trusted location fixes.

## GitHub Pages configuration

The live address above already serves the app. If hosting needs to be configured again, use the following settings:

1. Open the repository's **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/(root)**, then save.
5. Use the actual published URL shown by GitHub once deployment completes.

The included `.nojekyll` file is suitable for serving this buildless app directly. Do not choose `/docs` for the app: that folder contains documentation, while `index.html` is at the root.

GitHub documents branch publishing and availability by plan here: [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Data when changing addresses

The existing installed app's history stays on its existing origin. Before changing hosts, use **Move or back up my history** in that app and retain the JSON locally. At the new address, preview and restore a matching-route backup through the app interface. Restore replaces local records.

Do not clear the working app's data merely to set up this repository. A new address will not automatically inherit the old localStorage records.

## Offline operation and updates

The service worker caches the listed app, route and menu files as one version. It does not cache external OpenStreetMap tiles. Replay, menus and local preference operations can use cached files. Map tiles need a connection, with a plain-route fallback. A live fix depends on the phone location service, so airplane-mode location is not guaranteed.

The app requests screen wake lock where available. Backgrounding pauses tracking. Accept an available app update through the in-app update control while online. `recover.html` provides the retained reconnect flow if needed.

## Video and source updates

The submitted runtime is frozen at v5.1.0. Adding the final edited video, screenshots or documentation does not require changing the JavaScript or clearing app history. If changing runtime code later, retain coherent versioning across the HTML, manifest and service-worker cache.

This documentation update restores the empty `.nojekyll` marker expected by [source-integrity.json](source-integrity.json). Application code, configuration, media and cache versions are unchanged. Updating these repository documents does not replace a phone's localStorage records.
