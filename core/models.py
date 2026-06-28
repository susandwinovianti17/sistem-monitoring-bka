from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# --- MODEL PROFILE (UNTUK ROLE USER) ---
class Profile(models.Model):
    ROLE_CHOICES = [
        ('hrd', 'HRD'),
        ('manager', 'Manager'),
        ('karyawan', 'Karyawan'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='karyawan')
    nip = models.CharField(max_length=30, blank=True, null=True)
    jabatan = models.CharField(max_length=50, blank=True, null=True)
    bagian = models.CharField(max_length=50, blank=True, null=True)
    foto = models.ImageField(upload_to='profile_pics/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

# --- SIGNALS (OTOMATISASI PROFILE) ---
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


# --- MODEL LAPORAN KINERJA ---
class Laporan(models.Model):
    KATEGORI_CHOICES = [
        ('Development', 'Development'),
        ('Maintenance', 'Maintenance'),
        ('Bug Fixing', 'Bug Fixing'),
        ('Research', 'Research'),
    ]

    PRIORITAS_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]

    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    karyawan = models.ForeignKey(User, on_delete=models.CASCADE)
    tugas = models.TextField()
    kategori = models.CharField(max_length=50, choices=KATEGORI_CHOICES, default='Development')
    prioritas = models.CharField(max_length=10, choices=PRIORITAS_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    catatan_manager = models.TextField(blank=True, null=True)
    bagian = models.CharField(max_length=50, null=True, blank=True)
    
    # --- Manajemen Waktu ---
    deadline = models.DateTimeField(null=True, blank=True)
    tanggal = models.DateTimeField(auto_now_add=True) # Waktu pembuatan awal
    updated_at = models.DateTimeField(auto_now=True)   # Waktu setiap kali di-update
    estimasi_waktu = models.CharField(max_length=100, null=True, blank=True)
    
    # --- File Lampiran & Tautan ---
    lampiran_admin = models.FileField(upload_to='brief_files/', null=True, blank=True)
    foto_progres = models.FileField(upload_to='progres_files/', null=True, blank=True)
    link_project = models.URLField(max_length=500, null=True, blank=True)
    
    # --- Progress ---
    persentase = models.IntegerField(default=0)

    @property
    def nama_karyawan(self):
        if self.karyawan.first_name:
            return f"{self.karyawan.first_name} {self.karyawan.last_name}"
        return self.karyawan.username

    def __str__(self):
        return f"{self.karyawan.username} - {self.tugas[:20]}... ({self.updated_at})"

    class Meta:
        verbose_name_plural = "Laporan Kinerja"
        ordering = ['-updated_at'] # Menampilkan yang terbaru di urutan teratas secara default


# --- MODEL NOTIFIKASI ---
class Notifikasi(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifikasi')
    laporan_terkait = models.ForeignKey(Laporan, on_delete=models.CASCADE, null=True, blank=True)
    pesan = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notifikasi untuk {self.user.username} - {self.pesan[:20]}"

    class Meta:
        verbose_name_plural = "Notifikasi"
        ordering = ['-created_at']


# --- SIGNALS (OTOMATISASI NOTIFIKASI DINAMIS UNTUK SEMUA ROLE) ---
@receiver(post_save, sender=Laporan)
def buat_notifikasi_sistem(sender, instance, created, **kwargs):
    # KONDISI A: Jika tugas baru dibuat oleh HRD/Manager
    if created:
        # Kirim notifikasi tunggal ke karyawan yang ditugaskan
        Notifikasi.objects.create(
            user=instance.karyawan,
            laporan_terkait=instance,
            pesan=f"Anda menerima tugas baru: {instance.tugas[:30]}..."
        )
    
    # KONDISI B: Jika tugas di-update/diperbarui oleh Karyawan (misal: isi progres, ganti persentase)
    else:
        # Cari semua akun user yang bertindak sebagai HRD atau Manager di sistem
        para_atasan = User.objects.filter(profile__role__in=['hrd', 'manager'])
        
        # Ambil nama karyawan yang melakukan update
        nama_karyawan = instance.nama_karyawan
        
        # Kirimkan pesan notifikasi ke setiap HRD dan Manager secara massal
        for atasan in para_atasan:
            # Cegah pengiriman notifikasi jika yang melakukan update kebetulan adalah atasan itu sendiri
            if atasan != instance.karyawan:
                Notifikasi.objects.create(
                    user=atasan,
                    laporan_terkait=instance,
                    pesan=f"{nama_karyawan} memperbarui tugas '{instance.tugas[:20]}...' (Progres: {instance.persentase}%, Status: {instance.status})"
                )