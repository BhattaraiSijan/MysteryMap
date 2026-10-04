# Source data

Every file here is committed so that a build never touches the network. `scripts/prepare_sources.py` turns the raw downloads (kept out of git in `pipeline/sources/`) into these trimmed, ISO-coded CSVs.

| File | Raw download | Licence | Notes |
| --- | --- | --- | --- |
| `ne_50m_admin_0_countries.geojson` | https://github.com/nvkelso/natural-earth-vector (`geojson/`) | Public domain | Borders. Used as is. |
| `owid-covid-latest.csv` | https://github.com/owid/covid-19-data (`public/data/latest/owid-covid-latest.csv`) | CC BY 4.0 | Only the static country columns are used (population, median age, life expectancy, GDP per capita, …). Used as is. |
| `owid-energy.csv` | https://github.com/owid/energy-data (`owid-energy-data.csv`) | CC BY 4.0 | Trimmed to the columns the layers use and years from 2000. |
| `owid-co2.csv` | https://github.com/owid/co2-data (`owid-co2-data.csv`) | CC BY 4.0 | Trimmed as above. |
| `country-facts.csv` | https://github.com/mledoze/countries (`countries.json`) | ODbL 1.0 | Area, count of land neighbours, centre latitude and longitude, count of official languages. |
| `samayo-temperature.csv` | https://github.com/samayo/country-json (`src/country-by-yearly-average-temperature.json`) | MIT | Country names joined to ISO codes through the same repo's abbreviation file and mledoze/countries. |
| `samayo-independence.csv` | https://github.com/samayo/country-json (`src/country-by-independence-date.json`) | MIT | Prepared but not used by a live layer. |
| `worldbank-gdp.csv` | https://github.com/datasets/gdp (`data/gdp.csv`) | CC BY 4.0 (World Bank) | Years from 2000. |
| `worldbank-inflation.csv` | https://github.com/datasets/inflation (`data/inflation-consumer.csv`) | CC BY 4.0 (World Bank) | Years from 2000. |
