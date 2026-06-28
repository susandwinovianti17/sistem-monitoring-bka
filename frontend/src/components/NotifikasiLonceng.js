import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom'; 
import axios from 'axios';

const NotifikasiLonceng = () => {
    const [notifikasi, setNotifikasi] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const [hoveredId, setHoveredId] = useState(null);
    const [tick, setTick] = useState(0); 
    
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId'); 
    const userRole = localStorage.getItem('userRole')?.trim().toLowerCase() || 'karyawan';
    const BASE_URL = 'http://127.0.0.1:8000';

  const fetchNotifikasi = useCallback(async () => {
    if (!userId) return;
    try {
        const res = await axios.get(`${BASE_URL}/api/notifikasi/${userId}/`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Ambil data
        let data = res.data.notifikasi || res.data;
        if (!Array.isArray(data)) data = [];

        // FILTER: Buang notifikasi yang mengandung teks "Progres: 0%"
        // Ini akan berlaku untuk semua role agar data yang masuk ke UI bersih
        data = data.filter(n => !n.pesan.includes("Progres: 0%"));

        setNotifikasi(data);
        
    } catch (error) {
        console.error("Gagal ambil notifikasi:", error);
    }
}, [userId, token, BASE_URL]);
    // Fungsi Baru: Menandai semua notifikasi menjadi sudah dibaca
    const tandaiSemuaDibaca = async () => {
        const belumDibaca = notifikasi.filter(n => !n.is_read);
        if (belumDibaca.length === 0) return;

        try {
            // Update UI secara instan agar angka langsung hilang
            setNotifikasi(prev => prev.map(n => ({ ...n, is_read: true })));

            // Kirim request ke backend untuk setiap notifikasi yang belum dibaca
            for (const n of belumDibaca) {
                await axios.post(`${BASE_URL}/api/notifikasi/read/${n.id}/`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error("Gagal update semua status:", error);
            // Jika gagal, fetch ulang untuk mengembalikan data asli
            fetchNotifikasi();
        }
    };

    useEffect(() => {
        const interval = setInterval(() => setTick(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const getCountdown = (deadline) => {
        if (!deadline) return null;
        const target = new Date(deadline).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff > 0 && diff <= 3600000) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return null;
    };

    const tandaiDibaca = async (notifId) => {
        try {
            setNotifikasi(prev => prev.map(n => 
                n.id === notifId ? { ...n, is_read: true } : n
            ));
            await axios.post(`${BASE_URL}/api/notifikasi/read/${notifId}/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Gagal update status:", error);
        }
    };

    useEffect(() => {
       fetchNotifikasi();
        const intervalNotif = setInterval(() => { fetchNotifikasi(); }, 30000);
        
        // --- TAMBAHAN: Listener untuk update otomatis ---
        const handleRefreshNotif = () => {
            fetchNotifikasi();
        };
        window.addEventListener('progressUpdated', handleRefreshNotif);
        
        return () => {
            clearInterval(intervalNotif);
            window.removeEventListener('progressUpdated', handleRefreshNotif);
        };
    }, [fetchNotifikasi]);

    const jumlahBelumDibaca = notifikasi.filter(n => !n.is_read).length;

    return (
        <div className="position-relative d-inline-block me-3" style={{ zIndex: 1050 }}>
            <Button 
                variant="link" 
                className="position-relative p-0 text-white text-decoration-none" 
                onClick={() => {
                    const willShow = !showNotif;
                    setShowNotif(willShow);
                    // Pemicu: Jika kita membuka daftar, langsung tandai semua dibaca
                    if (willShow && jumlahBelumDibaca > 0) {
                        tandaiSemuaDibaca();
                    }
                }} 
                style={{ fontSize: '20px' }}
            >
                <i className="bi bi-bell-fill"></i> 🔔
                {jumlahBelumDibaca > 0 && (
                    <Badge bg="danger" pill className="position-absolute shadow-sm" style={{ top: '-4px', right: '-8px', fontSize: '10px' }}>
                        {jumlahBelumDibaca}
                    </Badge>
                )}
            </Button>

            <div style={{
                transition: 'all 0.3s ease-out',
                opacity: showNotif ? 1 : 0,
                transform: showNotif ? 'translateY(0)' : 'translateY(-10px)',
                visibility: showNotif ? 'visible' : 'hidden',
                position: 'absolute',
                right: '0'
            }}>
                {showNotif && (
                    <Card className="shadow-lg border-0 mt-3" style={{ width: '350px', maxHeight: '350px', overflowY: 'auto', borderRadius: '16px', overflow: 'hidden' }}>
                        <Card.Header className="fw-bold py-2 bg-white d-flex justify-content-between align-items-center">
                            <small className="text-uppercase" style={{ letterSpacing: '0.5px' }}>Riwayat Notifikasi</small>
                            <Button variant="link" size="sm" className="p-0 text-dark" onClick={() => setShowNotif(false)}>✖</Button>
                        </Card.Header>
                        
                        <Card.Body className="p-0">
                            {notifikasi.length === 0 ? (
                                <div className="p-4 text-center text-muted small">Tidak ada notifikasi</div>
                            ) : (
                                notifikasi.map(n => {
                                    const countdown = getCountdown(n.deadline); 
                                    return (
                                        <Link
                                            key={n.id}
                                            to={`/tugas/${n.laporan_id}`}
                                            onMouseEnter={() => setHoveredId(n.id)}
                                            onMouseLeave={() => setHoveredId(n.id)}
                                            onClick={() => setShowNotif(false)}
                                            className="p-3 text-decoration-none d-block border-bottom"
                                            style={{ 
                                                transition: 'all 0.2s ease',
                                                backgroundColor: hoveredId === n.id ? '#f1f1f1' : (n.is_read ? '#f8f9fa' : '#ffffff'),
                                                opacity: n.is_read && hoveredId !== n.id ? 0.7 : 1
                                            }}
                                        >
                                            <div className="d-flex align-items-start">
                                                <i className={`bi ${countdown ? 'bi-stopwatch-fill text-danger' : (n.is_read ? 'bi-check-all' : 'bi-clock-fill')} me-3`}></i>
                                                <div>
                                                    <p className="mb-1 small" style={{ color: n.is_read ? '#6c757d' : '#212529' }}>{n.pesan}</p>
                                                    {countdown ? (
                                                        <Badge bg="danger" className="fw-bold animate-pulse" style={{ fontSize: '10px' }}>
                                                            ⏳ Sisa: {countdown}
                                                        </Badge>
                                                    ) : (
                                                        <small style={{ fontSize: '11px', color: '#6c757d' }}>🕒 {n.waktu}</small>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </Card.Body>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default NotifikasiLonceng;