from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import viewsets, generics, status
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Laporan, Notifikasi 
from .serializers import LaporanSerializer, UserSerializer

# 1. API LOGIN
@api_view(['POST'])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user:
        role = 'karyawan'
        if hasattr(user, 'profile'):
            role = user.profile.role
            
        return Response({
            'status': 'success',
            'id': user.id,
            'role': role,
            'username': user.username,
            'token': 'secret-token-bka-2026'
        })
        
    return Response({
        'status': 'error', 
        'message': 'Username atau password salah'
    }, status=status.HTTP_400_BAD_REQUEST)


# 2. VIEWSET LAPORAN
class LaporanViewSet(viewsets.ModelViewSet):
    queryset = Laporan.objects.all()
    serializer_class = LaporanSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        role = self.request.query_params.get('role', '').lower()

        if role == 'karyawan' and user_id:
            return Laporan.objects.filter(karyawan_id=user_id).order_by('-tanggal')
        
        return Laporan.objects.all().order_by('-tanggal')

    def create(self, request, *args, **kwargs):
        karyawan_ids = request.data.get('karyawan_ids', [])
        
        # Penugasan Kelompok
        if karyawan_ids and isinstance(karyawan_ids, list):
            laporan_dibuat = []
            for k_id in karyawan_ids:
                data_copy = request.data.copy()
                data_copy['karyawan'] = k_id
                
                serializer = self.get_serializer(data=data_copy)
                serializer.is_valid(raise_exception=True)
                serializer.save(status='Pending')
                laporan_dibuat.append(serializer.data)
                
            return Response({
                "status": "success",
                "message": f"Berhasil mengirimkan tugas kelompok ke {len(laporan_dibuat)} anggota tim.", 
                "data": laporan_dibuat
            }, status=status.HTTP_201_CREATED)
        
        # Penugasan Tunggal
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(status='Pending')


# 3. KELOLA DATA KARYAWAN
class UserListCreateView(generics.ListCreateAPIView):
    # Gunakan select_related untuk mengambil data profile dalam satu query (JOIN)
    queryset = User.objects.select_related('profile').all().order_by('username')
    serializer_class = UserSerializer

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


# 4. API NOTIFIKASI
@api_view(['GET'])
def get_notifikasi_user(request, user_id):
    try:
        notifikasi = Notifikasi.objects.filter(user_id=user_id).order_by('-created_at')
        data = []
        for notif in notifikasi:
            waktu_lokal = timezone.localtime(notif.created_at)
            data.append({
                'id': notif.id,
                'laporan_id': notif.laporan_terkait_id,
                'pesan': notif.pesan,
                'waktu': waktu_lokal.strftime("%d %b %Y, %H:%M"),
                'is_read': notif.is_read
            })
        return JsonResponse({'notifikasi': data}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
def tandai_dibaca(request, notif_id):
    try:
        notif = Notifikasi.objects.get(id=notif_id)
        notif.is_read = True 
        notif.save() 
        return Response({'message': 'Status diupdate'}, status=200)
    except:
        return Response({'error': 'Gagal'}, status=400)

# 5. FUNGSI BARU: CREATE NOTIFIKASI
@api_view(['POST'])
def create_notifikasi(request):
    try:
        pesan = request.data.get('message')
        user_id = request.data.get('user_id') # Ambil user_id dari body request

        if not pesan or not user_id:
            return Response({'error': 'Pesan dan user_id wajib diisi'}, status=status.HTTP_400_BAD_REQUEST)

        # Simpan ke database dengan user_id
        new_notif = Notifikasi.objects.create(
            pesan=pesan,
            user_id=user_id, # Pastikan ini sinkron dengan field di model Anda
            is_read=False
        )
        return Response({'status': 'success', 'id': new_notif.id}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)