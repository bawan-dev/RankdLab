from pathlib import Path

from alembic import context
from sqlalchemy import create_engine

from app.config import Settings
from app.database import Base

config = context.config
target_metadata = Base.metadata


def run(connection):
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    context.configure(
        url=Settings().database_url, target_metadata=target_metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()
elif config.attributes.get("connection") is not None:
    run(config.attributes["connection"])
else:
    engine = create_engine(Settings().database_url)
    if (
        engine.dialect.name == "sqlite"
        and engine.url.database
        and engine.url.database != ":memory:"
    ):
        Path(engine.url.database).parent.mkdir(parents=True, exist_ok=True)
    with engine.connect() as connection:
        run(connection)
