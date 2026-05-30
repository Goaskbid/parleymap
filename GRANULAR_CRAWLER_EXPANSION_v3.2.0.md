# Iteration notes: v3.2.0

## Focus

Final audit pass for the deployable static ParleyMap cockpit.

## Changes

- Roadmovie launch now follows the selected person from the pull-down, search result, map face or name list.
- The roadmovie button labels itself with the selected person when a mapped trail exists.
- Opening map now hides route and call lines; it shows readable public anchors first.
- Opening map presets were added: Top 10 global, Top 20 global, all top 200, Top 10 Europe, Top 10 North America, Top 10 Asia and Top 10 emerging world.
- Right rail now stays focused on the selected profile.
- Rankings and influence intelligence moved below the map to avoid layout collisions.
- Map markers now show one fitted flag badge, not duplicate flags.
- City ranking rows are clickable and focus the map on the selected public-activity cluster.
- Map frame is no longer sticky; it can scroll away before the deeper intelligence section.
- Header and stat boxes remain clean, with no boxed header metrics.

## Notes

The deployable package still ships with the approved pilot archive. The overnight crawler and 24-month backfill framework are included and scheduled, but the complete top-200 x 24-month source-backed archive must be produced by running the crawler with network access and promoting only verified public records.
