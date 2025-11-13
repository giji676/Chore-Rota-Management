from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

class Welcome(APIView):
    def get(self, request):
        return Response({"message": "Welcome!"}, status=status.HTTP_200_OK);
