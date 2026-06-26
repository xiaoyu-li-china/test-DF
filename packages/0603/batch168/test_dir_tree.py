import os
import tempfile
from dir_tree import build_tree, build_json_tree, IGNORED_DIRS, LARGE_FILE_THRESHOLD


def test_ignored_dirs():
    with tempfile.TemporaryDirectory() as tmpdir:
        for d in IGNORED_DIRS:
            os.makedirs(os.path.join(tmpdir, d))
        os.makedirs(os.path.join(tmpdir, "normal_dir"))
        entries = build_tree(tmpdir)
        text = "\n".join(entries)
        for d in IGNORED_DIRS:
            assert d not in text
        assert "normal_dir" in text


def test_large_file_mark():
    with tempfile.TemporaryDirectory() as tmpdir:
        small_file = os.path.join(tmpdir, "small.txt")
        large_file = os.path.join(tmpdir, "large.txt")
        with open(small_file, "w") as f:
            f.write("x" * 100)
        with open(large_file, "wb") as f:
            f.write(b"x" * (LARGE_FILE_THRESHOLD + 100))
        entries = build_tree(tmpdir)
        text = "\n".join(entries)
        assert "small.txt" in text
        assert "[large]" not in text or "small.txt" not in [e for e in entries if "[large]" in e]
        assert "large.txt [large]" in text


def test_max_depth():
    with tempfile.TemporaryDirectory() as tmpdir:
        level1 = os.path.join(tmpdir, "level1")
        level2 = os.path.join(level1, "level2")
        level3 = os.path.join(level2, "level3")
        os.makedirs(level3)
        entries_depth1 = build_tree(tmpdir, max_depth=1)
        text1 = "\n".join(entries_depth1)
        assert "level1" in text1
        assert "level2" not in text1
        entries_depth2 = build_tree(tmpdir, max_depth=2)
        text2 = "\n".join(entries_depth2)
        assert "level2" in text2
        assert "level3" not in text2
        entries_depth3 = build_tree(tmpdir, max_depth=3)
        text3 = "\n".join(entries_depth3)
        assert "level3" in text3


def test_json_ignored_dirs():
    with tempfile.TemporaryDirectory() as tmpdir:
        for d in IGNORED_DIRS:
            os.makedirs(os.path.join(tmpdir, d))
        os.makedirs(os.path.join(tmpdir, "normal_dir"))
        root = build_json_tree(tmpdir)
        names = [c["name"] for c in root["children"]]
        for d in IGNORED_DIRS:
            assert d not in names
        assert "normal_dir" in names


def test_json_max_depth():
    with tempfile.TemporaryDirectory() as tmpdir:
        level1 = os.path.join(tmpdir, "level1")
        level2 = os.path.join(level1, "level2")
        os.makedirs(level2)
        root_depth1 = build_json_tree(tmpdir, max_depth=1)
        assert len(root_depth1["children"]) > 0
        for c in root_depth1["children"]:
            if c["type"] == "dir":
                assert c["children"] == []
        root_depth2 = build_json_tree(tmpdir, max_depth=2)
        level1_node = next(c for c in root_depth2["children"] if c["name"] == "level1")
        assert len(level1_node["children"]) > 0
