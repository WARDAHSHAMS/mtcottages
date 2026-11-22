#!/usr/bin/env python3
"""Refresh the official figures in _data/area-stats.json (#48).

Reads two public files and rewrites the "population" and "fairMarketRent"
sections of _data/area-stats.json; everything else in the file (the employer
list, which has no machine-readable source) is kept as it is. Safe to re-run:
the same source files give the same output.

  python3 scripts/area-stats.py [--check]

--check exits 1 when the file differs from what the sources give now, without
writing. Uses only the standard library.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "_data" / "area-stats.json"
# HUD answers a bare tool name with a bot-check page, so name the script in a standard browser-compatible form.
USER_AGENT = "Mozilla/5.0 (compatible; mtcottages-area-stats/1.0; +https://mtcottages.com/)"

POPULATION_URL = "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025_54.csv"
POPULATION_PAGE = "https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html"
VINTAGE = 2025
# (id, label, SUMLEV, COUNTY, PLACE) in the Census subcounty file.
PLACES = [
    ("parkersburg", "Parkersburg (city)", "162", "000", "62140"),
    ("vienna", "Vienna (city)", "162", "000", "83500"),
    ("wood-county", "Wood County", "050", "107", "00000"),
]

FMR_URL = "https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs_revised.xlsx"
FMR_PAGE = "https://www.huduser.gov/portal/datasets/fmr.html"
FISCAL_YEAR = 2026
# (id, label, state, county name, expected HUD area name)
FMR_AREAS = [
    ("parkersburg-vienna", "Parkersburg-Vienna metro (Wood and Wirt counties, WV)", "WV", "Wood County", "Parkersburg-Vienna, WV MSA"),
    ("washington-county-oh", "Washington County, OH (Marietta)", "OH", "Washington County", "Washington County, OH"),
]
XLSX = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except OSError as error:
        raise SystemExit(f"cannot download {url}: {error}") from error


def population() -> dict:
    rows = list(csv.DictReader(io.StringIO(fetch(POPULATION_URL).decode("latin-1"))))
    places = []
    for place_id, label, sumlev, county, place in PLACES:
        match = [row for row in rows if row["SUMLEV"] == sumlev and row["COUNTY"] == county and row["PLACE"] == place]
        if len(match) != 1:
            raise SystemExit(f"{POPULATION_URL}: expected one row for {label}, found {len(match)}")
        row = match[0]
        places.append({
            "id": place_id,
            "label": label,
            "base2020": int(row["ESTIMATESBASE2020"]),
            "estimate": int(row[f"POPESTIMATE{VINTAGE}"]),
        })
    return {
        "vintage": VINTAGE,
        "estimateDate": f"{VINTAGE}-07-01",
        "baseDate": "2020-04-01",
        "source": {"label": f"U.S. Census Bureau, Vintage {VINTAGE} population estimates for cities and towns", "url": POPULATION_PAGE, "file": POPULATION_URL},
        "places": places,
    }


def xlsx_rows(data: bytes) -> list[list[str]]:
    if not data.startswith(b"PK"):
        raise SystemExit(f"{FMR_URL}: the server did not return a spreadsheet (got {data[:60]!r}); open the link in a browser and retry")
    with zipfile.ZipFile(io.BytesIO(data)) as book:
        names = book.namelist()
        shared = []
        if "xl/sharedStrings.xml" in names:
            for item in ET.fromstring(book.read("xl/sharedStrings.xml")).findall(f"{XLSX}si"):
                shared.append("".join(text.text or "" for text in item.iter(f"{XLSX}t")))
        for name in sorted(n for n in names if n.startswith("xl/worksheets/sheet")):
            rows = []
            for row in ET.fromstring(book.read(name)).iter(f"{XLSX}row"):
                values = []
                for cell in row.findall(f"{XLSX}c"):
                    kind, value = cell.get("t"), cell.find(f"{XLSX}v")
                    if kind == "inlineStr":
                        values.append("".join(text.text or "" for text in cell.iter(f"{XLSX}t")))
                    elif value is None:
                        values.append("")
                    else:
                        values.append(shared[int(value.text)] if kind == "s" else value.text)
                rows.append(values)
            if rows and "fmr_2" in rows[0]:
                return rows
    raise SystemExit(f"{FMR_URL}: no sheet with an fmr_2 column")


def fair_market_rent() -> dict:
    rows = xlsx_rows(fetch(FMR_URL))
    header = rows[0]
    col = {name: header.index(name) for name in ["stusps", "countyname", "hud_area_name", "fmr_0", "fmr_1", "fmr_2", "fmr_3", "fmr_4"]}
    areas = []
    for area_id, label, state, county, hud_area in FMR_AREAS:
        match = [row for row in rows[1:] if row[col["stusps"]] == state and row[col["countyname"]] == county]
        if len(match) != 1:
            raise SystemExit(f"{FMR_URL}: expected one row for {county}, {state}, found {len(match)}")
        row = match[0]
        if row[col["hud_area_name"]] != hud_area:
            raise SystemExit(f"{FMR_URL}: {county}, {state} is in {row[col['hud_area_name']]!r}, expected {hud_area!r}")
        areas.append({
            "id": area_id,
            "label": label,
            "hudArea": hud_area,
            "rents": [int(float(row[col[f"fmr_{size}"]])) for size in range(5)],
        })
    return {
        "fiscalYear": FISCAL_YEAR,
        "source": {"label": f"HUD Fair Market Rents, FY{FISCAL_YEAR}", "url": FMR_PAGE, "file": FMR_URL},
        "areas": areas,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="exit 1 if the file is out of date; do not write")
    args = parser.parse_args()
    current = json.loads(TARGET.read_text()) if TARGET.exists() else {}
    fresh = {**current, "population": population(), "fairMarketRent": fair_market_rent()}
    same = {key: current.get(key) for key in ("population", "fairMarketRent")} == {key: fresh[key] for key in ("population", "fairMarketRent")}
    if args.check:
        print("area-stats.json matches its sources" if same else "area-stats.json differs from its sources; run scripts/area-stats.py")
        return 0 if same else 1
    if not same:
        fresh["retrieved"] = date.today().isoformat()
    TARGET.write_text(json.dumps(fresh, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {TARGET.relative_to(ROOT)}" if not same else f"{TARGET.relative_to(ROOT)} already matches its sources")
    return 0


if __name__ == "__main__":
    sys.exit(main())
