from django.urls import re_path
from .consumers import ApiConsumer

websocket_urlpatterns = [
    re_path(r"ws/house/(?P<house_id>\d+)/$", ApiConsumer.as_asgi()),
]
