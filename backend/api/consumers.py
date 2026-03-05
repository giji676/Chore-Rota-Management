from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
import json

class ApiConsumer(WebsocketConsumer):
    def connect(self):
        self.house_id = self.scope["url_route"]["kwargs"]["house_id"]
        self.group_name = f"house_{self.house_id}"

        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name,
            self.channel_name
        )

    def object_update(self, event):
        self.send(text_data=json.dumps({
            "event": event["type"],
            "data": event["data"]
        }))
