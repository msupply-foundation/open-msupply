# Archived: forecasting_plugins

Retired on open-mSupply 3.5. The build skips this directory (`ARCHIVED.md`, see `frontend/scripts/pluginDirs.mjs`), so it is never packed or published again.

**Replaced by core.** Since open-mSupply 3.04 each internal-order line has a forecast method (AMC, Population, Ancillary ratio), and the Population method does this plugin's calculation. Installed on 3.04 or later, this plugin's transform would overwrite core's suggested quantity on every line with vaccine courses, ignoring the order's target months and reorder threshold, and its column would contradict the line's own forecast.

**Left as last released.** The source in `react/` is what sites on 2.x still run, kept for its history. It was not brought up to date: it does not type-check against today's `client/` (`plugin_data` rows now need `datetime`, `ValueInfoRow` renamed `displayVaccinesInDoses`), and fixing that would only make it installable where it does harm. A 2.x site that needs it uses the last bundle it was released with.
