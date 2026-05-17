from django.contrib import admin
from django.urls import path, include
from django.conf import settings # Tambahan untuk akses settings
from django.conf.urls.static import static # Tambahan untuk route file statis
from rest_framework.routers import DefaultRouter
from core.views import LaporanViewSet, login_api 
from core.views import UserListCreateView, UserDetailView

router = DefaultRouter()
router.register(r'laporan', LaporanViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/login/', login_api), 
    path('api/users/', UserListCreateView.as_view()),
    path('api/users/<int:pk>/', UserDetailView.as_view()),
]

# Tambahkan baris ini agar foto di folder MEDIA bisa diakses lewat browser/React
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)