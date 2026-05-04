import asyncio
import json
from redis.asyncio import Redis
from .models.user import User

_STREAM_KEY = "str:zitadel:events"
_CONSUMER_GROUP = "group:{{snakeCase name}}-service"


async def _process_event(event_type: str, data: dict) -> None:
    if event_type in ("user.registered", "user.updated"):
        await User.update_or_create(
            defaults={"email": data["email"], "name": data.get("name")},
            zitadel_id=data["zitadel_id"],
        )
        print(f"[Sync] Processed {event_type} for user: {data['email']}")


async def setup_consumer(redis: Redis) -> None:
    consumer_name = f"consumer:{id(asyncio.current_task())}"

    try:
        await redis.xgroup_create(_STREAM_KEY, _CONSUMER_GROUP, id="0", mkstream=True)
        print(f"[Redis] Consumer group {_CONSUMER_GROUP} initialized.")
    except Exception as e:
        if "BUSYGROUP" not in str(e):
            raise

    print(f"[Redis] {consumer_name} listening for identity events...")

    while True:
        try:
            result = await redis.xreadgroup(
                groupname=_CONSUMER_GROUP,
                consumername=consumer_name,
                streams={_STREAM_KEY: ">"},
                block=5000,
                count=10,
            )
            if result:
                for _, messages in result:
                    for msg_id, fields in messages:
                        event_type = fields.get("type", "")
                        payload_str = fields.get("payload", "{}")
                        data = json.loads(payload_str)
                        await _process_event(event_type, data)
                        await redis.xack(_STREAM_KEY, _CONSUMER_GROUP, msg_id)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Redis] Stream reading error: {e}")
            await asyncio.sleep(2)
