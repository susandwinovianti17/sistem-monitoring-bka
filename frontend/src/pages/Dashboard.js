import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Card, Table, Button, Modal, Spinner, Badge, Stack, Row, Col, ProgressBar } from 'react-bootstrap'; // Modal dan Button sudah ada di sini
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const navigate = useNavigate();
    const [laporanList, setLaporanList] = useState([]);
    const [employees, setEmployees] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [showReminder, setShowReminder] = useState(false);
    const [urgentTasks, setUrgentTasks] = useState([]);
    
    // --- MODAL & STATE ---
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole')?.trim().toLowerCase() || 'karyawan'; 
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId'); 
    const BASE_URL = 'http://127.0.0.1:8000';

    const handleDetailClick = (task) => {
        setSelectedTaskDetail(task);
        setShowDetailModal(true);
    };

    const getChartColor = (name) => {
    switch (name) {
        case 'Selesai': return '#28a745'; // Hijau
        case 'Menunggu': return '#ffc107'; // Kuning
        case 'Terlewat': return '#dc3545'; // Merah
        default: return '#8884d8'; // Warna default
    }
};

    const handleEditClick = (task) => {
        setCurrentTaskId(task.id);
        setShowEditModal(true);
    };

    const getRowClass = (item) => {
        if (userRole !== 'karyawan') return '';
        if (!item.deadline) return '';
        const deadlineDate = new Date(item.deadline);
        const now = new Date();
        const diffHours = (deadlineDate - now) / (1000 * 60 * 60);
        const isNotFinished = (item.status !== 'Approved') || ((item.persentase || 0) < 100);
        
        if (diffHours > 0 && diffHours <= 6 && isNotFinished) {
            return 'table-danger';
        }
        return '';
    };

    const loadLaporan = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/laporan/`, {
                params: { role: userRole, user_id: userId },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            let dataLaporan = [];
            if (Array.isArray(res.data)) {
                dataLaporan = res.data;
            } else if (res.data && typeof res.data === 'object') {
                const arrayDitemukan = Object.values(res.data).find(val => Array.isArray(val));
                if (arrayDitemukan) dataLaporan = arrayDitemukan;
            }
            setLaporanList(dataLaporan);
        } catch (error) {
            console.error("Gagal memuat laporan:", error);
            if (error.response?.status === 401) navigate('/login');
        } finally { setLoading(false); }
    }, [token, navigate, userRole, userId, BASE_URL]);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/users/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data.filter(u => u.role?.toLowerCase() === 'karyawan'));
        } catch (error) { console.error(error); }
    }, [token, BASE_URL]);

    useEffect(() => { 
        loadLaporan(); 
        fetchEmployees();
    }, [loadLaporan, fetchEmployees]);

    useEffect(() => {
    if (laporanList && laporanList.length > 0) {
        const now = new Date();
        const next24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));

        const urgent = laporanList.filter(task => {
            const deadline = new Date(task.deadline);
            return task.status !== 'Approved' && deadline > now && deadline <= next24Hours;
        });

        if (urgent.length > 0) {
            setUrgentTasks(urgent);
            setShowReminder(true);
        }
    }
}, [laporanList]);

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        const d = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const t = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        return `${d} | ${t}`;
    };

    const parseCatatan = (catatanRaw) => {
        if (!catatanRaw) return { instruksiAdmin: '', progresKaryawan: '' };
        const parts = catatanRaw.split('|||');
        return { instruksiAdmin: parts[0] || '', progresKaryawan: parts[1] || parts[0] };
    };

    const getAvatarColor = (name) => {
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6610f2', '#e83e8c'];
        if (!name) return '#6c757d';
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const getStatusVariant = (status, persentase) => {
        if (persentase === 100) return "success";
        if (status === "Pending") return "warning";
        if (status === "Rejected") return "danger";
        return "dark";
    };

    const groupedLaporan = useMemo(() => {
        const groups = {};
        laporanList.forEach(item => {
            const { instruksiAdmin } = parseCatatan(item.catatan_manager);
            const key = `${item.tugas}_${item.deadline || item.tanggal}_${instruksiAdmin}`;
            const currentTaskDate = new Date(item.updated_at || item.tanggal || 0);

            if (!groups[key]) {
                groups[key] = {
                    ...item,
                    max_date_obj: currentTaskDate,
                    pelaksanaList: [{ id: item.karyawan, nama: item.nama_karyawan, id_laporan_asli: item.id }]
                };
            } else {
                if (currentTaskDate > groups[key].max_date_obj) {
                    groups[key].max_date_obj = currentTaskDate;
                    groups[key].updated_at = item.updated_at;
                    groups[key].tanggal = item.tanggal;
                    groups[key].status = item.status;
                }
                if (!groups[key].pelaksanaList.some(p => p.nama === item.nama_karyawan)) {
                    groups[key].pelaksanaList.push({ id: item.karyawan, nama: item.nama_karyawan, id_laporan_asli: item.id });
                }
            }
        });
        return Object.values(groups).sort((a, b) => b.max_date_obj - a.max_date_obj);
    }, [laporanList]);

    const handleTitleClick = (item) => { setSelectedDetail(item); setShowDetailModal(true); };

    const checkExpired = (task) => {
    const today = new Date();
    const deadlineDate = new Date(task.deadline);
    // Tugas terlewat jika progress < 100% dan tanggal deadline sudah lewat
    return task.persentase < 100 && deadlineDate < today;
};

 const stats = useMemo(() => {
    const now = new Date();
    let approved = 0;
    let expired = 0;
    let pending = 0;

    laporanList.forEach(item => {
        // Pastikan format tanggal di database Anda benar (misal: '2026-06-15')
        const deadline = new Date(item.deadline); 
        
        // Logika Status:
        // 1. Jika persentase sudah 100%, maka "Selesai"
        // 2. Jika belum 100% DAN deadline sudah lewat dari hari ini, maka "Terlewat"
        // 3. Sisanya adalah "Menunggu"
        if (item.persentase === 100) {
            approved++;
        } else if (deadline < now) {
            expired++;
        } else {
            pending++;
        }
    });

    return { 
        total: laporanList.length, 
        approved, 
        pending, 
        expired 
    };
}, [laporanList]);

const chartData = [
    { name: 'Selesai', value: stats.approved },
    { name: 'Menunggu', value: stats.pending },
    { name: 'Terlewat', value: stats.expired }
];

const COLORS = ['#28a745', '#ffc107', '#dc3545'];

    const handleVerify = async (pelaksanaList, statusBaru) => {
        const konfirmasi = await Swal.fire({
            title: 'Konfirmasi Tindakan',
            text: `Konfirmasi ${statusBaru === 'Approved' ? 'TUGAS Verifikasi' : 'TUGAS DITOLAK'}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, proses',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#212529',
            cancelButtonColor: '#6e7881'
        });

        if (!konfirmasi.isConfirmed) return;

        try {
            for (const p of pelaksanaList) {
                await axios.patch(`${BASE_URL}/api/laporan/${p.id_laporan_asli}/`, { status: statusBaru }, { headers: { Authorization: `Bearer ${token}` } });
            }
            Swal.fire({ icon: 'success', title: 'Berhasil!', confirmButtonColor: '#212529' });
            loadLaporan();
        } catch (error) { 
            Swal.fire({ icon: 'error', title: 'Error', confirmButtonColor: '#212529' }); 
        }
    };

    return (
        <div className="dashboard-fade">
            <Container className="py-2 pb-5"> 
                <Row className="mb-4 g-3">


    <Row className="mb-4 g-3">
    {/* 1. RINGKASAN TOTAL */}
    <Col md={6} lg={3}>
        <Card className="border-0 shadow-sm p-4 rounded-4 bg-dark text-white h-100">
            <small className="fw-bold opacity-75">RINGKASAN TOTAL</small>
            <h1 className="display-4 fw-bold m-0 mt-1">{stats.total}</h1>
        </Card>
    </Col>

    {/* 2. TUGAS BELUM SELESAI */}
    <Col md={6} lg={3}>
        <Card className="border-0 shadow-sm p-3 rounded-4 border-start border-5 border-warning h-100 bg-white">
            <small className="text-muted fw-bold">BELUM SELESAI</small>
            <h1 className="display-4 fw-bold text-warning m-0 mt-1">{stats.pending}</h1>
        </Card>
    </Col>

    {/* 3. TUGAS TERLEWAT */}
    <Col md={6} lg={3}>
        <Card className="border-0 shadow-sm p-3 rounded-4 border-start border-5 border-danger h-100 bg-white">
            <small className="text-muted fw-bold">TERLEWAT</small>
            <h1 className="display-4 fw-bold text-danger m-0 mt-1">{stats.expired}</h1>
        </Card>
    </Col>

    {/* 4. TUGAS SELESAI */}
    <Col md={6} lg={3}>
        <Card className="border-0 shadow-sm p-3 rounded-4 border-start border-5 border-success h-100 bg-white">
            <small className="text-muted fw-bold">SELESAI</small>
            <h1 className="display-4 fw-bold text-success m-0 mt-1">{stats.approved}</h1>
        </Card>
    </Col>
</Row>
                   
                {/* TABEL HRD & MANAGER */}
                {(userRole === 'manager' || userRole === 'hrd') && (
                    <div className="w-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h5 className="fw-bold m-0 text-uppercase" style={{ letterSpacing: '0.3px' }}>Dashboard Monitoring</h5>
                                <p className="text-muted small m-0">PT Bangun Kreatif Abadi - Monitoring Active</p>
                            </div>
                        </div>
                        <Card className="shadow-sm border-0 rounded-4 overflow-hidden mb-4">
                            {loading ? (<div className="text-center py-5"><Spinner animation="border" /></div>) : (
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="bg-light border-bottom">
                                    <tr className="small text-uppercase fw-bold text-muted">
                                        <th className="py-3 ps-4">Update Terakhir</th>
                                        <th>Pelaksana</th>
                                        <th>Kategori</th>
                                        <th>Detail Tugas</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-end pe-4">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedLaporan.map(l => (
                                        <tr key={l.id} className={`${getRowClass(l)} small border-bottom border-light`}>
                                            <td className="ps-4 py-3 text-muted fw-bold" style={{fontSize: '11px'}}>{formatDateTime(l.updated_at || l.tanggal)}</td>
                                            <td className="fw-bold text-dark">
                                                {l.pelaksanaList && l.pelaksanaList.length > 1 ? (
                                                    <div className="d-flex align-items-center">
                                                        <div className="d-flex me-2">
                                                            {l.pelaksanaList.slice(0, 3).map((p, idx) => {
                                                                const targetKaryawan = employees.find(e => e.id === p.id);
                                                                const urlFotoAsli = targetKaryawan?.foto;
                                                                return urlFotoAsli ? (
                                                                    <img key={idx} src={urlFotoAsli} alt={p.nama} className="rounded-circle border border-white" style={{ width: '24px', height: '24px', objectFit: 'cover', marginLeft: idx > 0 ? '-8px' : '0px', zIndex: 10 - idx, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title={p.nama} />
                                                                ) : (
                                                                    <div key={idx} className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold border border-white" style={{ width: '24px', height: '24px', fontSize: '8px', backgroundColor: getAvatarColor(p.nama), marginLeft: idx > 0 ? '-8px' : '0px', zIndex: 10 - idx, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title={p.nama}>
                                                                        {p.nama ? p.nama.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                                                                    </div>
                                                                );
                                                            })}
                                                            {l.pelaksanaList.length > 3 && (
                                                                <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold border border-white" style={{ width: '24px', height: '24px', fontSize: '8px', backgroundColor: '#4f46e5', marginLeft: '-8px', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>+{l.pelaksanaList.length - 3}</div>
                                                            )}
                                                        </div>
                                                        <span className="text-muted" style={{fontSize: '10px'}}>{l.pelaksanaList.length} Orang</span>
                                                    </div>
                                                ) : (
                                                    l.nama_karyawan
                                                )}
                                            </td>
                                            <td><Badge bg="white" className="text-dark border rounded-pill fw-normal shadow-sm" style={{fontSize: '9px'}}>{l.kategori}</Badge></td>
                                            <td className="text-muted text-truncate fw-bold text-dark" style={{maxWidth: '240px', cursor: 'pointer', textDecoration: 'underline'}} onClick={() => handleTitleClick(l)}>{l.tugas}</td>
                                            <td className="text-center">
                                                <Badge bg={l.status === 'Approved' ? 'success' : l.status === 'Pending' ? 'warning' : 'danger'} style={{fontSize: '9px'}} className="px-3 py-2 text-uppercase fw-normal rounded-pill shadow-sm">{l.status}</Badge>
                                            </td>
                                            <td className="text-end pe-4">
                                                {l.status === 'Pending' && (
                                                    <Stack direction="horizontal" gap={1} className="justify-content-end">
                                                        <Button size="sm" variant="dark" className="rounded-pill px-2 fw-bold" style={{fontSize: '10px'}} onClick={() => handleVerify(l.pelaksanaList, 'Approved')}>VERIFY</Button>
                                                        <Button size="sm" variant="outline-danger" className="rounded-pill px-2 fw-bold" style={{fontSize: '10px'}} onClick={() => handleVerify(l.pelaksanaList, 'Rejected')}>REJECT</Button>
                                                    </Stack>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            )}
                        </Card>
                    </div>
                )}
                </Row>
                {/* TABEL KHUSUS KARYAWAN */}
                {userRole === 'karyawan' && (
                    <>
                        <div className="mb-3 d-flex align-items-center gap-2 mt-4">
                            <div>
                                <h5 className="fw-bold text-uppercase m-0" style={{ letterSpacing: '0.3px' }}>Tabel Riwayat Kegiatan</h5>
                                <p className="text-muted small m-0">Klik judul tugas untuk melihat detail progress - {username}</p>
                            </div>
                        </div>

                        <Card className="shadow-sm border-0 rounded-4 overflow-hidden mb-4">
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="bg-light border-bottom">
                                    <tr className="small text-uppercase fw-bold text-muted">
                                        <th className="py-3 ps-4" style={{width: '25%'}}>Update Terakhir</th>
                                        <th style={{width: '40%'}}>Kegiatan / Tugas</th>
                                        <th className="text-center" style={{width: '35%'}}>Persentase Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="3" className="text-center py-5"><Spinner animation="border" size="sm" variant="dark" /></td></tr>
                                    ) : laporanList.length > 0 ? (
                                        laporanList.map(l => ( 
                                            <tr key={l.id} className={`${getRowClass(l)} small border-bottom border-light`}>
                                                <td className="ps-4 py-3 text-muted fw-bold" style={{fontSize: '11px'}}>{formatDateTime(l.updated_at || l.tanggal)}</td>
                                                <td>
                                                    <div className="fw-bold text-dark mb-0" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleTitleClick(l)}>{l.tugas}</div>
                                                    <div className="text-muted" style={{fontSize: '10px'}}>{parseCatatan(l.catatan_manager).progresKaryawan || 'Detail progres dilaporkan...'}</div>
                                                </td>
                                                <td className="px-4">
                                                    <div className="d-flex align-items-center">
                                                        <div className="flex-grow-1 me-3">
                                                            <ProgressBar 
                                                                now={l.persentase || 0} 
                                                                variant={getStatusVariant(l.status, l.persentase)} 
                                                                style={{height: '7px', borderRadius: '10px'}} 
                                                            />
                                                        </div>
                                                        <Badge 
                                                            bg={getStatusVariant(l.status, 0)} 
                                                            style={{fontSize: '9px'}} 
                                                            className="px-3 py-2 text-uppercase fw-normal rounded-pill shadow-sm"
                                                        >
                                                            {l.status}
                                                        </Badge>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" className="text-center py-5 text-muted small">Belum ada riwayat kegiatan.</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card>
                    </>
                )}

                {/* MODAL DETAIL */}
                <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="small fw-bold text-uppercase">Detail Progres Karyawan</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {selectedDetail && (
                            <>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <h5 className="fw-bold m-0 text-dark">{selectedDetail.tugas}</h5>
                                    <Badge bg="secondary" className="p-2" style={{fontSize: '11px'}}>
                                        🕒 Diperbarui: {formatDateTime(selectedDetail.updated_at || selectedDetail.tanggal)}
                                    </Badge>
                                </div>
                 <Row className="mb-4 g-2">

                    <Modal show={showReminder} onHide={() => setShowReminder(false)}>
    <Modal.Header closeButton>
        <Modal.Title>⚠️ Reminder Tugas!</Modal.Title>
    </Modal.Header>
    <Modal.Body>
        Ada {urgentTasks.length} tugas yang deadline-nya kurang dari 24 jam:
        <ul>
            {urgentTasks.map(task => (
                <li key={task.id}>{task.tugas} - Deadline: {formatDateTime(task.deadline)}</li>
            ))}
        </ul>
    </Modal.Body>
    <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowReminder(false)}>Tutup</Button>
    </Modal.Footer>
</Modal>
   
    {/* Kolom STATUS */}
    <Col xs={4}>
        <div className="p-3 border rounded-3 bg-light text-center">
            <small className="text-muted fw-bold d-block mb-1" style={{fontSize: '10px'}}>STATUS</small>
            <Badge bg={selectedDetail.status === 'Approved' ? 'success' : selectedDetail.status === 'Pending' ? 'warning' : 'danger'} className="px-2 py-1 rounded-pill mt-1 text-uppercase" style={{fontSize: '10px'}}>
                {selectedDetail.status}
            </Badge>
        </div>
    </Col>

   {/* Kolom PROGRESS (Diperbaiki agar konsisten dengan selectedDetail) */}
<Col xs={4}>
    <div className="p-3 border rounded-3 bg-light text-center">
        <small className="text-muted fw-bold d-block mb-1" style={{fontSize: '10px'}}>PROGRESS</small>
        <div className="fw-bold text-dark" style={{fontSize: '14px', marginTop: '5px'}}>
            {/* Menggunakan selectedDetail dan tanda ?. (optional chaining) */}
            {selectedDetail?.persentase || 0}%
        </div>
    </div>
</Col>
    
    {/* Kolom DEADLINE LENGKAP */}
    <Col xs={4}>
        <div className="p-3 border rounded-3 bg-light text-center">
            <small className="text-muted fw-bold d-block mb-1" style={{fontSize: '10px'}}>DEADLINE</small>
            <div className="fw-bold m-0" style={{fontSize: '11px', lineHeight: '1.2'}}>
                {selectedDetail.deadline ? (
                    <>
                        {new Date(selectedDetail.deadline).toLocaleDateString('id-ID', { 
                            day: '2-digit', month: 'short', year: 'numeric' 
                        })}
                        <br />
                        {new Date(selectedDetail.deadline).toLocaleTimeString('id-ID', { 
                            hour: '2-digit', minute: '2-digit', hour12: false 
                        })}
                    </>
                ) : '-'}
            </div>
        </div>
    </Col>
</Row>                      

                                    <Row className="mb-4 g-3">
                                    <Col md={6}>
                                        <small className="text-muted fw-bold d-block mb-2 text-uppercase">Link Tautan / Hasil Kerja:</small>
                                        <div className="p-3 border rounded-3 bg-white shadow-sm d-flex align-items-center justify-content-between" style={{ minHeight: '58px' }}>
                                            {selectedDetail.link_tautan ? (
                                                <a href={selectedDetail.link_tautan} target="_blank" rel="noopener noreferrer" className="text-truncate fw-bold text-dark text-decoration-underline me-2 small">
                                                    {selectedDetail.link_tautan}
                                                </a>
                                            ) : (
                                                <span className="text-muted small italic">Tidak ada tautan dilampirkan</span>
                                            )}
                                            {selectedDetail.link_tautan && (
                                                <Button variant="dark" size="sm" className="rounded-pill px-3 fw-bold" style={{fontSize: '10px'}} href={selectedDetail.link_tautan} target="_blank">BUKA</Button>
                                            )}
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <small className="text-muted fw-bold d-block mb-2 text-uppercase">Foto Progres Kerja:</small>
                                        <div className="p-2 border rounded-3 bg-white shadow-sm text-center d-flex align-items-center justify-content-center overflow-hidden" style={{ minHeight: '120px', maxHeight: '180px' }}>
                                            {selectedDetail.foto_progres_url ? (
                                                <img src={selectedDetail.foto_progres_url.startsWith('http') ? selectedDetail.foto_progres_url : `${BASE_URL}${selectedDetail.foto_progres_url}`} alt="Foto Progres" className="img-fluid rounded" style={{ maxHeight: '160px', objectFit: 'contain' }} />
                                            ) : (
                                                <div className="text-muted small italic">Tidak ada lampiran foto progres</div>
                                            )}
                                        </div>
                                    </Col>
                                </Row>
                                <div className="mb-2">
                                    <small className="text-muted fw-bold d-block mb-2 text-uppercase">Keterangan Progres:</small>
                                    <div className="p-3 border rounded-3 bg-light shadow-sm" style={{ minHeight: '80px', whiteSpace: 'pre-line' }}>
                                        {parseCatatan(selectedDetail.catatan_manager).progresKaryawan || 'Tidak ada keterangan progres yang diberikan.'}
                                    </div>
                                </div>
                            </>
                        )}
                    </Modal.Body>
                </Modal>
            </Container>
        </div>
    );
    
};

export default Dashboard;