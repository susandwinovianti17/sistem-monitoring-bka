from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Laporan, Profile

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    nip = serializers.CharField(source='profile.nip', read_only=True)
    jabatan = serializers.CharField(source='profile.jabatan', read_only=True)
    bagian = serializers.CharField(source='profile.bagian', read_only=True)
    foto = serializers.SerializerMethodField()

    role_input = serializers.CharField(write_only=True, required=False)
    nip_input = serializers.CharField(write_only=True, required=False)
    jabatan_input = serializers.CharField(write_only=True, required=False)
    bagian_input = serializers.CharField(write_only=True, required=False)
    foto_input = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'password', 'first_name', 'last_name', 'email', 
            'role', 'nip', 'jabatan', 'bagian', 'foto',
            'role_input', 'nip_input', 'jabatan_input', 'bagian_input', 'foto_input'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False} # Set required False untuk update
        }

    def get_foto(self, obj):
        if obj.profile.foto:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.foto.url)
            return obj.profile.foto.url
        return None

    def create(self, validated_data):
        role_data = validated_data.pop('role_input', 'karyawan')
        nip_data = validated_data.pop('nip_input', '')
        jabatan_data = validated_data.pop('jabatan_input', '')
        bagian_data = validated_data.pop('bagian_input', '')
        foto_data = validated_data.pop('foto_input', None)
        
        user = User.objects.create_user(**validated_data)
        
        if hasattr(user, 'profile'):
            user.profile.role = role_data
            user.profile.nip = nip_data
            user.profile.jabatan = jabatan_data
            user.profile.bagian = bagian_data
            if foto_data:
                user.profile.foto = foto_data
            user.profile.save()
            
        return user

    # Fungsi Update untuk Edit Karyawan
    def update(self, instance, validated_data):
        role_data = validated_data.pop('role_input', None)
        nip_data = validated_data.pop('nip_input', None)
        jabatan_data = validated_data.pop('jabatan_input', None)
        bagian_data = validated_data.pop('bagian_input', None)
        foto_data = validated_data.pop('foto_input', None)

        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        instance.save()

        profile = instance.profile
        if role_data: profile.role = role_data
        if nip_data: profile.nip = nip_data
        if jabatan_data: profile.jabatan = jabatan_data
        if bagian_data: profile.bagian = bagian_data
        if foto_data: profile.foto = foto_data
        profile.save()

        return instance


class LaporanSerializer(serializers.ModelSerializer):
    nama_karyawan = serializers.ReadOnlyField()
    foto_progres_url = serializers.SerializerMethodField()
    lampiran_admin_url = serializers.SerializerMethodField()

    class Meta:
        model = Laporan
        fields = [
            'id', 
            'karyawan', 
            'nama_karyawan', 
            'tugas', 
            'kategori', 
            'prioritas',
            'persentase',      
            'estimasi_waktu', 
            'tanggal', 
            'deadline',
            'bagian', 
            'status', 
            'catatan_manager',
            'foto_progres',     # File progress karyawan
            'foto_progres_url', # URL progress karyawan
            'lampiran_admin',    # File brief/tugas asli dari admin
            'lampiran_admin_url', # FIXED: Tanda koma sudah ditambahkan di sini
            'link_project'
        ]

    def get_foto_progres_url(self, obj):
        if obj.foto_progres:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.foto_progres.url)
            return obj.foto_progres.url
        return None

    # Fungsi pembuat URL absolut lampiran tugas admin
    def get_lampiran_admin_url(self, obj):
        if obj.lampiran_admin:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.lampiran_admin.url)
            return obj.lampiran_admin.url
        return None