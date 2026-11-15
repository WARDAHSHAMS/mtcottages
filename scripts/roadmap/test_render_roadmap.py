"""Tests for render_roadmap.py. Run: python3 -m unittest discover -s scripts/roadmap"""

from __future__ import annotations

import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import render_roadmap as rr  # noqa: E402

FIXTURES = HERE / "fixtures"


def load(name: str) -> list[dict[str, object]]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class RiceTests(unittest.TestCase):
    def test_parses_hidden_rice_line(self) -> None:
        rice = rr.parse_rice("text\n<!-- rice: reach=400 impact=2 confidence=0.8 effort=2 -->")
        self.assertIsNotNone(rice)
        assert rice is not None
        self.assertAlmostEqual(rice.score, 320.0)
        self.assertEqual(rice.band, "high")

    def test_bands(self) -> None:
        self.assertEqual(rr.Rice(100, 1, 0.5, 1).band, "mid")
        self.assertEqual(rr.Rice(10, 1, 0.5, 1).band, "low")
        self.assertEqual(rr.Rice(100, 1, 1.0, 1).band, "high")

    def test_missing_line_is_none(self) -> None:
        self.assertIsNone(rr.parse_rice("no rice here"))
        self.assertIsNone(rr.parse_rice(None))

    def test_zero_effort_is_an_error(self) -> None:
        with self.assertRaises(rr.RoadmapError):
            _ = rr.Rice(1, 1, 1, 0).score


class RenderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.epics = rr.group_by_epic(load("issues.json"), load("epics.json"))

    def test_grouping_and_order(self) -> None:
        titles = [e.title for e in self.epics]
        self.assertEqual(titles, ["Growth: Conversion funnels", "Growth: Measurement", rr.NO_EPIC])
        self.assertEqual(self.epics[0].kpi, "qualified inquiries per month")
        self.assertEqual(self.epics[0].items[0].workflow, "ready")

    def test_title_score_fallback(self) -> None:
        funnels = self.epics[0]
        self.assertEqual([i.iid for i in funnels.items], [101, 104])
        self.assertIsNone(funnels.items[1].rice)
        self.assertEqual(funnels.items[1].score, 120.0)
        self.assertAlmostEqual(funnels.total_score, 440.0)
        no_epic = self.epics[-1]
        self.assertIsNone(no_epic.items[0].score)

    def test_html_is_escaped_and_complete(self) -> None:
        page = rr.render(self.epics, dt.datetime(2026, 11, 15, tzinfo=dt.timezone.utc))
        self.assertIn("Top 10 by RICE", page)
        self.assertIn("&lt;script&gt; &amp; escaping", page)
        self.assertNotIn("<script>", page)
        self.assertIn('content="width=device-width,initial-scale=1"', page)
        self.assertIn(">320<", page)

    def test_cli_offline_mode(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "r" / "index.html"
            code = rr.main([
                "--issues", str(FIXTURES / "issues.json"),
                "--epics", str(FIXTURES / "epics.json"),
                "--out", str(out),
            ])
            self.assertEqual(code, 0)
            self.assertTrue(out.read_text(encoding="utf-8").startswith("<!doctype html>"))

    def test_min_issues_gate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            code = rr.main([
                "--issues", str(FIXTURES / "issues.json"),
                "--epics", str(FIXTURES / "epics.json"),
                "--out", str(Path(tmp) / "x.html"),
                "--min-issues", "50",
            ])
            self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
