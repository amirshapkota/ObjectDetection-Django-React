from django.urls import path
from .views import receive_detections

urlpatterns = [
    path('receive_detections/', receive_detections, name='receive_detections'),
]
