import logging

from app.api import create_app
from app.middleware import JsonFormatter

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.getLogger("rankdlab").addHandler(handler)
logging.getLogger("rankdlab").setLevel(logging.INFO)
app = create_app()
