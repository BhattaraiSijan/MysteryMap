from mm_pipeline.preview import write_previews


def test_preview_page_contents(seven_plus_draft, tmp_path):
    [page] = write_previews(seven_plus_draft.layers, seven_plus_draft.data, tmp_path / "preview")
    html = page.read_text()
    assert page.name == "draft-one.html"
    for text in ["Draft one", "Highest", "Lowest", "countries", "<svg"]:
        assert text in html
    assert html.count('class="option"') == 6
    assert "Japan" in html


def test_preview_lists_problems(seven_plus_thin_draft, tmp_path):
    [page] = write_previews(seven_plus_thin_draft.layers, seven_plus_thin_draft.data, tmp_path / "preview")
    assert "needs 80%" in page.read_text()
