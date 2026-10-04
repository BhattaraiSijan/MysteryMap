"""Turn raw downloads in pipeline/sources/ into the trimmed, ISO-coded CSVs committed in pipeline/data/.

Run by hand when a source is refreshed. The build itself never runs this and never touches the network.
See pipeline/data/README.md for where each raw file comes from.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RAW = HERE / "sources"
OUT = HERE / "data"

ENERGY_COLUMNS = [
    "energy_per_capita", "per_capita_electricity", "net_elec_imports_share_demand",
    "renewables_share_elec", "hydro_share_elec", "solar_share_elec", "wind_share_elec",
    "nuclear_share_elec", "coal_share_elec", "fossil_share_elec", "carbon_intensity_elec",
]
CO2_COLUMNS = ["co2_per_capita", "cumulative_co2", "methane_per_capita", "cement_co2_per_capita",
               "share_of_temperature_change_from_ghg", "co2_growth_prct"]
FROM_YEAR = 2000


def trim(src: str, dst: str, columns: list[str]) -> None:
    with (RAW / src).open(newline="", encoding="utf-8") as f, (OUT / dst).open("w", newline="", encoding="utf-8") as g:
        reader = csv.DictReader(f)
        writer = csv.DictWriter(g, fieldnames=["iso_code", "country", "year"] + columns)
        writer.writeheader()
        for row in reader:
            if row["iso_code"] and int(row["year"]) >= FROM_YEAR:
                writer.writerow({k: row[k] for k in writer.fieldnames})


def country_facts() -> dict[str, str]:
    """mledoze/countries -> one row per ISO code; returns alpha-2 -> alpha-3 for the name joins."""
    countries = json.loads((RAW / "mledoze_countries_master_countries.json").read_text(encoding="utf-8"))
    with (OUT / "country-facts.csv").open("w", newline="", encoding="utf-8") as g:
        writer = csv.writer(g)
        writer.writerow(["iso_code", "name", "area_km2", "neighbours", "latitude", "longitude", "official_languages"])
        for c in sorted(countries, key=lambda c: c["cca3"]):
            lat, lng = c["latlng"] if c["latlng"] else ("", "")
            writer.writerow([c["cca3"], c["name"]["common"], c["area"], len(c["borders"]), lat, lng, len(c["languages"])])
    return {c["cca2"]: c["cca3"] for c in countries}


def samayo(alpha2_to_3: dict[str, str]) -> None:
    def load(name):
        return json.loads((RAW / f"samayo_country-json_master_src_country-by-{name}.json").read_text(encoding="utf-8"))

    abbreviations = {r["country"]: r["abbreviation"] for r in load("abbreviation")}
    for name, column, out in [("yearly-average-temperature", "temperature", "samayo-temperature.csv"),
                              ("independence-date", "independence", "samayo-independence.csv")]:
        with (OUT / out).open("w", newline="", encoding="utf-8") as g:
            writer = csv.writer(g)
            writer.writerow(["iso_code", "country", column])
            for row in load(name):
                a2 = abbreviations.get(row["country"])
                iso = alpha2_to_3.get(a2, "")
                if iso and row[column] not in (None, ""):
                    writer.writerow([iso, row["country"], row[column]])


def worldbank() -> None:
    for src, dst, value in [("datasets_gdp_main_data_gdp.csv", "worldbank-gdp.csv", "Value"),
                            ("datasets_inflation_main_data_inflation-consumer.csv", "worldbank-inflation.csv", "Inflation")]:
        with (RAW / src).open(newline="", encoding="utf-8") as f, (OUT / dst).open("w", newline="", encoding="utf-8") as g:
            reader = csv.DictReader(f)
            writer = csv.writer(g)
            writer.writerow(["iso_code", "country", "year", "value"])
            for row in reader:
                if int(row["Year"]) >= FROM_YEAR:
                    writer.writerow([row["Country Code"], row[reader.fieldnames[0]], row["Year"], row[value]])


if __name__ == "__main__":
    trim("owid-energy-data.csv", "owid-energy.csv", ENERGY_COLUMNS)
    trim("owid-co2-data.csv", "owid-co2.csv", CO2_COLUMNS)
    samayo(country_facts())
    worldbank()
