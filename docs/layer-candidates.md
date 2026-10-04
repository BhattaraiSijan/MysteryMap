# Layer candidates

Counted on 4 October 2026 against the 235 ISO-coded countries in Natural Earth 1:50m. A layer needs figures for 188 countries (80%) to go live.

## Sources reachable for the first batch

The build environment could reach GitHub and npm but not the World Bank API, Our World in Data's own site, Wikipedia or the UN. The first 30 layers therefore come from GitHub-hosted mirrors: Our World in Data's COVID, energy and CO2 datasets, the World Bank mirrors in the `datasets` organisation, `mledoze/countries` and `samayo/country-json`.

## Candidates that reach 80% coverage

| Measure | Source file | Countries | Distinct values | Live? |
| --- | --- | ---: | ---: | --- |
| Population | owid-covid-latest | 226 | 226 | yes |
| Population density | owid-covid-latest | 211 | 211 | yes |
| Median age | owid-covid-latest | 192 | 136 | yes |
| Share aged 65+ | owid-covid-latest | 191 | 190 | yes |
| Life expectancy | owid-covid-latest | 222 | 209 | yes |
| Diabetes prevalence | owid-covid-latest | 205 | 149 | yes |
| Heart disease death rate | owid-covid-latest | 194 | 194 | yes |
| GDP per person (PPP) | owid-covid-latest | 193 | 193 | yes |
| Human development index | owid-covid-latest | 189 | 154 | yes |
| Energy per person | owid-energy | 212 | 211 | yes |
| Electricity per person | owid-energy | 209 | 209 | yes |
| Net electricity imports | owid-energy | 208 | 125 | yes |
| Renewable share of electricity | owid-energy | 208 | 182 | yes |
| Hydro share | owid-energy | 205 | 150 | yes |
| Solar share | owid-energy | 208 | 164 | yes |
| Wind share | owid-energy | 206 | 106 | yes |
| Nuclear share | owid-energy | 206 | 34 | yes |
| Coal share | owid-energy | 207 | 84 | yes |
| Fossil share | owid-energy | 208 | 182 | no, mirror of renewables |
| Carbon intensity of electricity | owid-energy | 208 | 191 | yes |
| CO2 per person | owid-co2 | 212 | 208 | yes |
| Cumulative CO2 | owid-co2 | 212 | 212 | yes |
| Methane per person | owid-co2 | 199 | 190 | yes |
| Cement CO2 per person | owid-co2 | 208 | 117 | yes |
| Share of warming caused | owid-co2 | 212 | 145 | no, near-duplicate of cumulative CO2 |
| CO2 growth, one year | owid-co2 | 212 | 208 | no, noisy |
| Land area | country-facts | 235 | 234 | yes |
| Land neighbours | country-facts | 235 | 13 | yes |
| Latitude of centre | country-facts | 235 | 172 | yes |
| Longitude of centre | country-facts | 235 | 191 | no, not a reasoning puzzle |
| Official languages | country-facts | 235 | 8 | yes |
| Average temperature | samayo-temperature | 218 | 212 | yes |
| Independence year | samayo-independence | 191 | 88 | no, odd negative values for old states |
| GDP, total | worldbank-gdp | 212 | 212 | yes |
| Inflation 2022 | worldbank-inflation | 211 | 211 | yes |

**Count: 35 candidates reach 80% coverage from the sources reachable today; 30 are live.** Hospital beds per 1,000 people (172 countries, 73%) is the clearest example of an everyday measure that misses the bar because Natural Earth's ISO list includes about 40 small territories that no statistical source covers.

## What this says about the 300-layer goal

With the World Bank's World Development Indicators (about 1,400 series, several hundred with wide coverage), FAO food balance sheets and the OWID grapher catalogue, 300 everyday layers with 80% coverage are plausible, but it has not been counted yet because those hosts were unreachable from the build environment. The next curation batch should run the coverage survey in `pipeline/scripts/prepare_sources.py` against a World Bank WDI bulk download.

## Time per layer

The first 30 were authored in one batch: about 6 minutes each for the survey, source preparation, layer file and explanation, which is under the 15-minute target. Explanations were drafted from the extremes the pipeline prints and checked against the figures in the source CSVs.
