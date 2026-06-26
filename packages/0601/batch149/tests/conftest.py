import os
import tempfile
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pytest

from nightstock import db


@pytest.fixture(autouse=True)
def temp_db():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        with patch.object(db, "DB_PATH", db_path):
            db.init_db()
            yield


@pytest.fixture
def cli_runner():
    from click.testing import CliRunner
    return CliRunner()


@pytest.fixture
def today():
    return date.today().isoformat()
