from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def broadcast(group, event_type, data):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    async_to_sync(channel_layer.group_send)(
        group,
        {
            "type": event_type,
            "data": data,
        },
    )
