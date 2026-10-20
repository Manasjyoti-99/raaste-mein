# Source and evidence provenance

## Runtime snapshot

This repository copies the final v5.1.0 runtime files from the working prototype without editing their contents. Runtime files include the HTML/CSS/JavaScript, JSON, icons, recovery flow and vendored Leaflet distribution.

The repository replaces the older working README with documentation of the accepted final prototype. It does not include earlier-version download archives. These packaging choices do not alter the runtime code or collected data in the installed app.

The original frozen source archive is `InVehicle_v5_1_0_MobileMap.zip` with SHA-256:

```text
d57f2cb4e3afca782b54841f9152ceb32cf08984b55e17c7e60339d24473c324
```

[source-integrity.json](source-integrity.json) records the source commit and individual runtime file hashes. Those hashes describe this exact source snapshot, not an independently certified release.

## Geometry and venue data

The original route geometry is retained in [route/iit-delhi-route.kml](../route/iit-delhi-route.kml). Application coordinates are in `data/route.json`. Supplied hours, ratings and menu price ranges are in `data/cafes.json` and are not live information.

## Screenshots and presentation

Eight original PNGs supplied by the author are included unchanged. Their observation index records the one evening journey they depict. The report PDF and editable PowerPoint document the final prototype. README figures are rendered report pages using those same images and the explicitly illustrative learning graphic.

## Trip records and sample data

The original personal history JSON is excluded. The repository documents its inspected aggregate evidence in [evidence.md](evidence.md) and the labelled derived summary. The runtime sample-history JSON contains ten synthetic trips and is explicitly separate from GPS/replay records.

## Video status

The edited final-layout demonstration has not yet been added. An available older recording shows v5.0.1 and is excluded from this final-version repository. No placeholder file is presented as a completed video.

## Third-party material

Leaflet's original license remains under `vendor/leaflet/LICENSE.txt`. The app and map screenshots retain OpenStreetMap attribution. The repository does not add an open-source license for the author's code without the author's choice.
