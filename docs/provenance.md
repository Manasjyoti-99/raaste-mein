# Source and evidence provenance

## Runtime snapshot

This repository copies the final v5.1.0 runtime files from the working prototype without editing their contents. Runtime files include the HTML/CSS/JavaScript, JSON, icons, recovery flow and vendored Leaflet distribution.

The repository replaces the older working README with documentation of the accepted final prototype. It does not include earlier-version download archives. These packaging choices do not alter the runtime code or collected data in the installed app.

The original frozen source archive is `InVehicle_v5_1_0_MobileMap.zip` with SHA-256:

```text
d57f2cb4e3afca782b54841f9152ceb32cf08984b55e17c7e60339d24473c324
```

[source-integrity.json](source-integrity.json) records the source commit and individual runtime file hashes. Those hashes describe this exact source snapshot, not an independently certified release.

## Repository documentation update, 22 October 2026

This upload folder was prepared from the public repository snapshot at commit `c5c8a69e948d451f313b214bb5dbd829e091c208`. The application remains v5.1.0. The update adds the current public app address and author-supplied YouTube demonstration link, updates instructions for the existing repository and adds a proposed research plan.

The `.nojekyll` marker in that public snapshot contained one newline. It is restored here to an empty file, matching the original frozen-source SHA-256 already listed in [source-integrity.json](source-integrity.json). All 31 listed runtime files therefore match that manifest. The JavaScript, HTML, CSS, JSON, icons and vendor files are unchanged from the reviewed repository. No personal trip backup is added.

## Geometry and venue data

The original route geometry is retained in [route/iit-delhi-route.kml](../route/iit-delhi-route.kml). Application coordinates are in `data/route.json`. Supplied hours, ratings and menu price ranges are in `data/cafes.json` and are not live information.

## Screenshots and presentation

Eight original PNGs supplied by the author are included unchanged. Their observation index records the one evening journey they depict. The report PDF and editable PowerPoint document the final prototype. README figures are rendered report pages using those same images and the explicitly illustrative learning graphic.

## Trip records and sample data

The original personal history JSON is excluded. The repository documents its inspected aggregate evidence in [evidence.md](evidence.md) and the labelled derived summary. The runtime sample-history JSON contains ten synthetic trips and is explicitly separate from GPS/replay records.

## Demonstration video

The author supplied the [Raaste Mein demonstration on YouTube](https://www.youtube.com/shorts/S3F9gqr6sio) on 22 October 2026. The repository links to that external recording rather than bundling an MP4. The older local v5.0.1 recording remains excluded. [Video notes](../assets/video/README.md) point to the source, screenshot evidence and methods; the video link does not add new quantitative results to the evidence record.

## Future research

[future-research.md](future-research.md) is a research proposal extending the implemented baseline. Its objectives, comparison methods and evaluation measures are planned work. They are separate from the existing demonstration evidence and do not imply completed model training, additional field trials or measured improvements.

## Third-party material

Leaflet's original license remains under `vendor/leaflet/LICENSE.txt`. The app and map screenshots retain OpenStreetMap attribution. The repository does not add an open-source license for the author's code without the author's choice.
