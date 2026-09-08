# Setbook

Version 2 adds a searchable exercise library with primary muscle groups and editable favourites, a session-start heatmap, weekly/program/lifetime set analysis, and an Add weeks control for active programs. Week totals use program weeks, not calendar weeks. Confirmed positive-rep sets in an unfinished workout are included in analysis. Discarded sessions remain in the activity heatmap but their sets are removed from volume totals.

Existing version 1 data is converted on the device. A copy of the original JSON is retained under `workoutAppData-before-v2` before the conversion is saved. Imported version 1 backups are supported. Earlier activity is reconstructed from surviving workout dates; previously discarded drafts cannot be reconstructed. Changes to an exercise's primary muscle group reclassify its historical set totals.

To receive an update on your phone, open the app while online, then fully close the app and any Safari tab showing it, and reopen it. Settings shows version 2.0 when updated. Do not clear browser storage to update.

A personal workout tracker for your iPhone. Plain HTML, CSS and JavaScript; no installation or build tools needed for hosting.

## Publish to GitHub Pages

1. Sign into GitHub and create a repository named `GymApp`.
2. Upload the contents of this folder into the repository root. All app files in this publishing folder belong at the repository root. Include the hidden `.nojekyll` file if your upload method supports it.
3. Open the repository's **Settings → Pages**. Select **Deploy from a branch**, then **main** and **/(root)**. Save.
4. Wait for GitHub to display the published site link, then open that link in Safari on your iPhone.
5. Tap **Share → Add to Home Screen**. Open Setbook and check **Settings → Ready offline** while connected. Try reopening in airplane mode before your first gym visit.

Your repository and website contain only the app. Workout records stay in the browser on your device. The desktop preview, Safari and the installed app may have separate storage; export and restore a backup if you need to move records.

## Using the app

- Create a program with 1–52 weeks and 1–7 sessions per week.
- Add exercises, rep ranges, initial weights in kg, sets and setup notes.
- Start a session. Weight and reps copy from its most recent completed occurrence in the same block. The first session has blank reps.
- Edit a number to record a set, or tap its check mark if the copied values are correct. Untouched copied sets are not recorded as performed.
- Entries save as you type. Press **Session complete** when done. If you finish tomorrow, the start date stays unchanged. Starting a different session finishes the previous draft using only confirmed sets; an empty draft is discarded.
- Weeks move forward after each planned session has one completed workout. Completing the last week archives the program automatically.
- Export backups regularly in Settings. Restoring replaces your data only after validation and confirmation.

## Offline and updates

All app assets are local; there are no third-party fonts, analytics or online dependencies. HTTPS (or localhost for development) is required for offline installation. The service worker caches the complete app shell. When changing source files, increment the cache version in `sw.js`, publish, open while online, then close all app windows and reopen to activate the update. Browser data is separate from the asset cache and is preserved. Clearing browser storage can erase workouts.

## Verification

The included implementation was checked with automated tests for first-session defaults, copied records, unconfirmed-set exclusion, original dates, completed weeks, completed blocks and backup validation. Physical iPhone installation and airplane-mode behavior must be checked on your phone after publishing.
