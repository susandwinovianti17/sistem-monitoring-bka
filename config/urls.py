from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from core.views import LaporanViewSet, login_api 
from core.views import UserListCreateView, UserDetailView
# Tambahkan 'create_notifikasi' di bawah ini
from core.views import get_notifikasi_user, tandai_dibaca, create_notifikasi 

router = DefaultRouter()
router.register(r'laporan', LaporanViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/login/', login_api), 
    path('api/users/', UserListCreateView.as_view()),
    path('api/users/<int:pk>/', UserDetailView.as_view()),
    
    # Path untuk POST notifikasi baru (Tanpa user_id)
    path('api/notifikasi/', create_notifikasi, name='create_notifikasi'),
    
    # Path untuk GET notifikasi user tertentu
    path('api/notifikasi/<int:user_id>/', get_notifikasi_user, name='get_notifikasi'),
    
    # Path untuk menandai sudah dibaca
    path('api/notifikasi/read/<int:notif_id>/', tandai_dibaca, name='tandai_dibaca'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)