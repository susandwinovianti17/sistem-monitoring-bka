from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# --- MODEL PROFILE (UNTUK ROLE USER) ---
class Profile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('lead_it', 'Lead IT'),
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
    deadline = models.DateTimeField(null=True, blank=True)
    bagian = models.CharField(max_length=50, null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    bagian = models.CharField(max_length=50, null=True, blank=True)
    foto_progres = models.FileField(upload_to='progres_files/', null=True, blank=True)
    lampiran_admin = models.FileField(upload_to='brief_files/', null=True, blank=True)
    
    # --- UPDATE: Menggunakan DateTimeField agar mencatat Jam & Menit ---
    tanggal = models.DateTimeField(auto_now_add=True) # Waktu pembuatan awal
    updated_at = models.DateTimeField(auto_now=True)   # Waktu setiap kali di-update
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    catatan_manager = models.TextField(blank=True, null=True)
    
    # --- PERBAIKAN: Diubah menjadi DateTimeField agar menerima input Due Date & Time dari React ---
    deadline = models.DateTimeField(null=True, blank=True)
    
    bagian = models.CharField(max_length=50, null=True, blank=True)
    
    # --- PERBAIKAN: Diubah dari ImageField menjadi FileField agar mendukung PDF ---
    foto_progres = models.FileField(upload_to='progres_files/', null=True, blank=True)
    
    # --- FIELD PROGRESS & ESTIMASI ---
    persentase = models.IntegerField(default=0)
    estimasi_waktu = models.CharField(max_length=100, null=True, blank=True)
    
    # --- FIELD PROGRESS KARYAWAN ---
    foto_progres = models.FileField(upload_to='progres_files/', null=True, blank=True)
    
    # --- TAMBAHKAN FIELD BARU INI: Khusus mengunci berkas asli penugasan dari Admin ---
    lampiran_admin = models.FileField(upload_to='brief_files/', null=True, blank=True)
    
    # --- TAMBAHAN BARU: Field Tautan Eksternal GitHub / Figma ---
    link_project = models.URLField(max_length=500, null=True, blank=True)
    
    persentase = models.IntegerField(default=0)
    estimasi_waktu = models.CharField(max_length=100, null=True, blank=True)
    
    persentase = models.IntegerField(default=0)
    estimasi_waktu = models.CharField(max_length=100, null=True, blank=True)

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
        
    