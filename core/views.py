from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import viewsets, generics, status
from django.contrib.auth.models import User
from .models import Laporan
from .serializers import LaporanSerializer, UserSerializer

# 1. API LOGIN (Sudah Terhubung dengan Model Profile)
@api_view(['POST'])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user:
        # AMBIL ROLE DARI MODEL PROFILE
        # Kita gunakan hasattr untuk jaga-jaga jika ada user lama yang belum punya profile
        if hasattr(user, 'profile'):
            role = user.profile.role
        else:
            # Fallback jika profile tidak ditemukan
            role = 'karyawan'
            
        return Response({
            'status': 'success',
            'id': user.id,
            'role': role, # Ini akan mengirim 'lead_it', 'manager', atau 'karyawan'
            'username': user.username,
            'token': 'secret-token-bka-2026' # Nanti bisa ganti ke JWT/Token ORI
        })
        
    return Response({
        'status': 'error', 
        'message': 'Username atau password salah'
    }, status=status.HTTP_400_BAD_REQUEST)

# 2. VIEWSET LAPORAN (Logika Filter Role & Security)
class LaporanViewSet(viewsets.ModelViewSet):
    queryset = Laporan.objects.all()
    serializer_class = LaporanSerializer

    def get_queryset(self):
        """
        Karyawan: Hanya melihat laporan miliknya.
        Manager/Lead IT: Bisa melihat seluruh laporan tim BKA.
        """
        user_id = self.request.query_params.get('user_id')
        role = self.request.query_params.get('role')

        # Jika role karyawan, paksa filter berdasarkan user_id mereka
        if role == 'karyawan' and user_id:
            return Laporan.objects.filter(karyawan_id=user_id).order_by('-tanggal')
            
        # Untuk Manager dan Lead IT, tampilkan semua
        return Laporan.objects.all().order_by('-tanggal')

    def perform_create(self, serializer):
        # Setiap laporan baru dari React otomatis berstatus Pending
        serializer.save(status='Pending')

# 3. KELOLA DATA KARYAWAN (Hanya untuk Admin/Lead IT)
class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer