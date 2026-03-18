from django.urls import path
from . import views

urlpatterns = [
    # CREATE, JOIN, LIST, DETAIL
    path("houses/create/", views.HouseView.as_view(), name="house-create"),
    path("houses/join/", views.HouseJoinView.as_view(), name="house-join"),
    path("houses/generic/", views.HouseListGenericView.as_view(), name="house-list-generic"),
    # path("houses/<int:id>/", views.HouseView.as_view(), name="house-detail"),
]
