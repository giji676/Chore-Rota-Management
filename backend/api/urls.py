from django.urls import path
from . import views

urlpatterns = [
    path("house/create/", views.CreateHouseView.as_view(), name="create-house"),
    path("address-autocomplete/", views.AddressAutocompleteView.as_view(), name="address-autocomplete"),
    path("address-details/", views.AddressDetailsView.as_view(), name="address-details"),
    path("house/join/<join_code>/", views.JoinHouseView.as_view(), name="join-house"),
]
