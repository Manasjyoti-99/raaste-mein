# Updating the existing GitHub repository

Repository: [Manasjyoti-99/raaste-mein](https://github.com/Manasjyoti-99/raaste-mein)  
Live app: [GitHub Pages](https://manasjyoti-99.github.io/raaste-mein/)

## Upload this prepared folder

1. Extract the supplied ZIP on the computer. Open its inner `raaste-mein` folder.
2. Open the existing repository on GitHub and select the `main` branch.
3. Choose **Add file > Upload files**. Drag the **contents** of the inner folder into the upload area. `index.html`, `README.md`, `data`, `docs`, `assets`, `vendor`, `route` and `icons` must remain at the repository root. Do not upload the ZIP or an extra outer folder.
4. Keep the existing `.nojekyll` publishing marker. Its single newline is recorded in the source-integrity manifest and does not affect app behavior. Existing `.gitattributes` and `.gitignore` are unchanged.
5. Use the commit message **Update project documentation and restore source integrity**. Review the changed-file list and commit the upload. No file deletion is needed for this update.
6. Open the README and check its live app, report, screenshot and research links. Keep GitHub Pages configured to publish `main` from `/(root)`.

This package contains 60 repository files; no file exceeds 25 MiB. The browser upload is intended to fit one batch. See GitHub's [file upload instructions](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository) for current limits and the Git alternative.

The source application and its version remain unchanged. A repository upload does not copy or clear local trip records on the phone.

## Set the About panel manually

Uploading files cannot change repository metadata. Open the gear beside **About** on the repository home page and enter:

**Description**

> Route-aware food stop recommendation prototype with live GPS, replay and explicit-feedback learning. IIT Delhi ideathon project.

**Website**

<https://manasjyoti-99.github.io/raaste-mein/>

**Topics**

`pwa`, `recommender-system`, `gps`, `smart-mobility`

Save the panel. These metadata changes must be made on GitHub; they are not applied by the ZIP.

## Optional release

After the upload, open **Releases > Draft a new release**. If `v5.1.0` does not already exist, create that tag from the reviewed `main` commit and use the title **Raaste Mein v5.1.0 — ideathon prototype**. Describe it as the frozen mobile prototype with documentation, route data, screenshots and technical report. State the recording's actual availability. Creating a release is optional; this package does not create a remote tag or release.

## Final video link

The [author-supplied YouTube demonstration](https://www.youtube.com/shorts/S3F9gqr6sio) is linked in the README and [video notes](../assets/video/README.md). No MP4 upload is required. Keep the existing repository contents and upload the updated folder contents over the matching paths; no deletions are required.
