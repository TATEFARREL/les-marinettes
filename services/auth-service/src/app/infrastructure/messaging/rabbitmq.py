from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pika

from app.core.config import get_settings

logger = logging.getLogger("app.infrastructure.messaging.rabbitmq")


@dataclass(frozen=True)
class RabbitPublisher:
    url: str
    exchange: str

    def publish(self, *, routing_key: str, message: dict[str, Any]) -> None:
        params = pika.URLParameters(self.url)
        conn = pika.BlockingConnection(params)
        try:
            ch = conn.channel()
            ch.exchange_declare(exchange=self.exchange, exchange_type="topic", durable=True)
            ch.basic_publish(
                exchange=self.exchange,
                routing_key=routing_key,
                body=json.dumps(message).encode("utf-8"),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    delivery_mode=2,
                ),
            )
        finally:
            try:
                conn.close()
            except Exception:
                logger.exception("Failed closing rabbitmq connection")


def build_envelope(*, event_type: str, source: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "type": event_type,
        "occurred_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "source": source,
        "data": data,
    }


def get_publisher() -> RabbitPublisher:
    s = get_settings()
    return RabbitPublisher(url=s.rabbitmq_url, exchange=s.rabbitmq_exchange)
