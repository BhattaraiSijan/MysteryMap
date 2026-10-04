from mm_pipeline.derive import extremes, groups


def test_ten_distinct_values_make_five_pairs():
    v = {c: i for i, c in enumerate("ABCDEFGHIJ", start=1)}
    assert groups(v) == {"A": 1, "B": 1, "C": 2, "D": 2, "E": 3, "F": 3, "G": 4, "H": 4, "I": 5, "J": 5}


def test_ties_share_a_group():
    assert groups({"A": 1, "B": 1, "C": 1, "D": 2, "E": 3}) == {"A": 1, "B": 1, "C": 1, "D": 4, "E": 5}


def test_every_group_in_range():
    v = {f"C{i}": (i % 7) * 1.5 for i in range(200)}
    assert set(groups(v).values()) <= {1, 2, 3, 4, 5}


def test_extremes_plain():
    v = {c: i for i, c in enumerate("ABCDEFGH", start=1)}
    assert extremes(v) == {"high": ["H", "G", "F"], "low": ["A", "B", "C"]}


def test_extremes_include_ties_at_third():
    v = {"MLI": 0.1, "MDG": 0.2, "ETH": 0.3, "GIN": 0.3, "NPL": 0.3, "NER": 0.3, "IND": 0.5,
         "USA": 2.8, "KOR": 12.3, "JPN": 13.1, "PRK": 13.2}
    assert extremes(v)["low"] == ["MLI", "MDG", "ETH", "GIN", "NER", "NPL"]
    assert extremes(v)["high"] == ["PRK", "JPN", "KOR"]
