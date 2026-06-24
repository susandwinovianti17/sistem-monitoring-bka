import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Table, Button, Card, Badge, Spinner, Modal, Form, Row, Col, InputGroup, ProgressBar, Stack } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import bkaLogo from '../assets/logobka.png';

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
};

const TugasKaryawan = () => {
    const [showExtendModal, setShowExtendModal] = useState(false); 
    const [targetTask] = useState(null);
    const [newDeadline, setNewDeadline] = useState('');
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [showLateTasksModal, setShowLateTasksModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    
    // --- STATE MODAL & EXPORT PDF DENGAN FILTER TANGGAL ---
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('Semua');
    
    // State Filter PDF
    const [selectedKaryawan, setSelectedKaryawan] = useState('Semua');
    const [selectedBulan, setSelectedBulan] = useState('Semua'); 
    
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [isEdit, setIsEdit] = useState(false); 

    // --- STATE DATA DETAIL PENUGASAN ---
    const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

    // --- STATE PROJECT MEMBERS (UNTUK TIM / KELOMPOK) ---
    const [selectedKaryawanIds, setSelectedKaryawanIds] = useState([]);

    // --- STATE FORMULIR TAMBAH/EDIT TUGAS HRD & MANAGER ---
    const [addData, setAddData] = useState({
        judul_tugas: '',
        deskripsi_tugas: '',
        karyawan_id: '',
        tenggat_waktu: '',
        prioritas: 'Medium',
        link_project: '' 
    });

    // --- STATE FORMULIR EDIT PROGRES KARYAWAN ---
    const [editData, setEditData] = useState({
        judul_tugas: '',
        keterangan: '',
        persentase: 0,
        estimasi: '',
        link_project: '' 
    });

    const [fotoFile, setFotoFile] = useState(null);
    const [fileBrief, setFileBrief] = useState(null);

    const BASE_URL = 'http://127.0.0.1:8000';
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole')?.trim().toLowerCase() || 'karyawan';
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

   const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/laporan/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data);
        } catch (error) {
            console.error("Gagal ambil tugas:", error);
        } finally {
            setLoading(false);
        }
    }, [token, BASE_URL]);

  const fetchEmployees = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/users/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data.filter(u => u.role?.toLowerCase() === 'karyawan'));
        } catch (error) {
            console.error("Gagal ambil karyawan:", error);
        }
    }, [token, BASE_URL]);

   useEffect(() => {
    fetchTasks();
    fetchEmployees();
}, [fetchTasks, fetchEmployees]);

const handleExtendDeadline = async () => {
    if (!newDeadline) return Swal.fire('Error', 'Pilih tanggal deadline baru!', 'error');
    try {
        Swal.fire({ title: 'Memperbarui...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const groupSama = tasks.filter(t => t.tugas === targetTask.tugas && t.deadline === targetTask.deadline);
        for (const t of groupSama) {
            await axios.patch(`${BASE_URL}/api/laporan/${t.id}/`, 
                { deadline: newDeadline }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
        }
        Swal.fire('Berhasil!', 'Deadline seluruh anggota kelompok diperbarui.', 'success');
        setShowExtendModal(false);
        fetchTasks(); 
    } catch (error) { Swal.fire('Error', 'Gagal memperbarui deadline.', 'error'); }
};

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const getMinDateTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const parseCatatan = (catatanRaw) => {
        if (!catatanRaw) return { instruksiAdmin: '', progresKaryawan: '' };
        const parts = catatanRaw.split('|||');
        return {
            instruksiAdmin: parts[0] || '',
            progresKaryawan: parts[1] || ''
        };
    };

    const getAvatarColor = (name) => {
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6610f2', '#e83e8c'];
        if (!name) return '#6c757d';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const groupedTasks = useMemo(() => {
        const groups = {};
        tasks.forEach(task => {
            const { instruksiAdmin } = parseCatatan(task.catatan_manager);
            const key = `${task.tugas}_${task.deadline}_${instruksiAdmin}`;
            
            if (!groups[key]) {
                groups[key] = {
                    ...task,
                    pelaksanaList: []
                };
            }
            groups[key].pelaksanaList.push({
                id: task.karyawan,
                nama: task.nama_karyawan,
                persentase: task.persentase || 0,
                status: task.status,
                id_laporan_asli: task.id
            });
        });
      
return Object.values(groups).sort((a, b) => b.id - a.id);
    }, [tasks]);



// Cukup gunakan ini satu kali saja
const lateTasks = tasks.filter(t => isDeadlinePassed(t.deadline) && t.persentase < 100);

    const listBulanTahunAvailable = useMemo(() => {
        const months = tasks.map(t => {
            const dateObj = new Date(t.updated_at || t.tanggal);
            if (isNaN(dateObj.getTime())) return null;
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
        }).filter(Boolean);
        return [...new Set(months)].sort((a, b) => b.localeCompare(a));
    }, [tasks]);

    const lateTasksGrouped = useMemo(() => {
    const groups = {};
    lateTasks.forEach(task => {
        if (!groups[task.nama_karyawan]) groups[task.nama_karyawan] = [];
        groups[task.nama_karyawan].push(task);
    });
    return groups;
}, [lateTasks]);

    const formatBulanText = (valueBulan) => {
        if (!valueBulan || valueBulan === 'Semua') return 'Semua Bulan';
        const [year, month] = valueBulan.split('-');
        const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${namaBulan[parseInt(month, 10) - 1]} ${year}`;
    };

    // --- FUNGSI UPDATE EXPORT DENGAN GROUPING & PENGURUTAN STRICT TERBARU ---

const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const startX = 14; // Margin kiri utama
    const boxWidth = 267; // Lebar standar untuk box dan tabel

    // 1. Filter Data
    const filteredData = selectedKaryawan === 'Semua' 
        ? tasks 
        : tasks.filter(l => String(l.nama_karyawan).trim() === String(selectedKaryawan).trim());

    const selectedEmp = employees.find(e => 
        String(e.first_name + " " + e.last_name).trim() === String(selectedKaryawan).trim() || 
        String(e.username) === String(selectedKaryawan)
    );

    // 2. Logo & Judul
    try { 
        // Menambahkan logo BKA
        doc.addImage(bkaLogo, 'PNG', startX, 5, 55, 10); 
    } catch (e) { console.warn("Logo tidak ditemukan"); }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text('LAPORAN MONITORING KINERJA', 75, 12);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode Rekap: ${formatBulanText(selectedBulan || new Date().getMonth())}`, 75, 18);
    
    // 3. Detail Karyawan (Kiri) & Dibuat Oleh (Kanan)
    doc.setFont("helvetica", "bold");
    doc.text("DATA KARYAWAN", startX, 30);
    doc.text("DIBUAT OLEH", 240, 30); // Posisi kanan
    
    doc.setFont("helvetica", "normal");
    doc.text(`Nama    : ${selectedKaryawan}`, startX, 36);
    doc.text(`NIP     : ${selectedEmp?.nip || selectedEmp?.profile?.nip || '-'}`, startX, 41);
    doc.text(`Jabatan : ${selectedEmp?.jabatan || selectedEmp?.profile?.jabatan || '-'}`, startX, 46);

    doc.text(`User    : ${username || 'Admin'}`, 240, 36);
    doc.text(`Tanggal : ${new Date().toLocaleDateString('id-ID')}`, 240, 41);

    // 4. Box Ringkasan (Abu-abu) - Lebar disamakan dengan tabel
    const totalTugas = filteredData.length;
    const tugasSelesai = filteredData.filter(t => t.persentase >= 100).length;
    const tugasTerlambat = filteredData.filter(t => isDeadlinePassed(t.deadline) && t.persentase < 100).length;

    doc.setFillColor(245, 245, 245);
    doc.rect(startX, 52, boxWidth, 10, 'F'); 
    doc.setFont("helvetica", "bold");
    doc.text(`Ringkasan: Total ${totalTugas} Tugas | Selesai ${tugasSelesai} | Terlambat ${tugasTerlambat}`, startX + 2, 59);

    // 5. Tabel - Margin disamakan dengan startX
    autoTable(doc, {
        startY: 65,
        margin: { left: startX }, // Pastikan margin kiri tabel sama dengan box
        tableWidth: boxWidth,     // Lebar tabel disamakan dengan box
        head: [['Update Terakhir', 'Pelaksana', 'Tugas', 'Deadline', 'Progres', 'Catatan', 'Status']],
        body: filteredData.map(l => {
            const { progresKaryawan } = parseCatatan(l.catatan_manager);
            return [
                formatTanggal(l.updated_at),
                l.nama_karyawan,
                l.tugas,
                formatTanggal(l.deadline),
                `${l.persentase || 0}%`,
                progresKaryawan || '-',
                l.status
            ];
        }),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 35 },
            2: { cellWidth: 60 },
            3: { cellWidth: 35 },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 50 },
            6: { cellWidth: 32 }
        }
    });

    doc.save(`Rekap_Kinerja_${selectedKaryawan}.pdf`);
    setShowExportModal(false);
};
    const handleEditClick = (task) => {
        setCurrentTaskId(task.id);
        const { instruksiAdmin, progresKaryawan } = parseCatatan(task.catatan_manager);
        
        if (userRole === 'karyawan') {
            setEditData({
                judul_tugas: task.tugas,
                keterangan: progresKaryawan, 
                persentase: task.persentase || 0,
                estimasi: task.estimasi_waktu || '',
                link_project: task.link_project || '' 
            });
            setFotoFile(null);
            setShowEditModal(true);
        } else {
            setIsEdit(true);
            setAddData({
                judul_tugas: task.tugas,
                deskripsi_tugas: instruksiAdmin, 
                karyawan_id: task.karyawan || '',
                tenggat_waktu: formatDateForInput(task.deadline),
                prioritas: task.prioritas || 'Medium',
                link_project: task.link_project || '' 
            });
            setSelectedKaryawanIds(task.pelaksanaList ? task.pelaksanaList.map(p => p.id) : [task.karyawan]);
            setFileBrief(null);
            setShowAddModal(true);
        }
    };  


    const handleDetailClick = (task) => {
        setSelectedTaskDetail(task);
        setShowDetailModal(true);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setIsEdit(false);
        setAddData({ judul_tugas: '', deskripsi_tugas: '', karyawan_id: '', tenggat_waktu: '', prioritas: 'Medium', link_project: '' });
        setSelectedKaryawanIds([]);
        setFileBrief(null);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setEditData({ judul_tugas: '', keterangan: '', persentase: 0, estimasi: '', link_project: '' });
        setFotoFile(null);
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        
        if (!isEdit && selectedKaryawanIds.length === 0) {
            Swal.fire('Peringatan!', 'Silakan pilih minimal satu anggota tim / project member.', 'warning');
            return;
        }

        const currentTask = tasks.find(t => t.id === currentTaskId);
        const { progresKaryawan } = parseCatatan(currentTask?.catatan_manager);
        const combinedCatatan = progresKaryawan ? `${addData.deskripsi_tugas}|||${progresKaryawan}` : addData.deskripsi_tugas;

        try {
            Swal.fire({
                title: isEdit ? 'Menyimpan Perubahan...' : 'Mendistribusikan Tugas...',
                text: 'Harap tunggu berkas sedang diproses sistem.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            if (isEdit) {
                const groupSama = tasks.filter(t => t.tugas === currentTask.tugas && t.deadline === currentTask.deadline);
                for (const t of groupSama) {
                    const data = new FormData();
                    data.append('tugas', addData.judul_tugas);
                    data.append('catatan_manager', combinedCatatan);
                    data.append('karyawan', t.karyawan); 
                    data.append('deadline', addData.tenggat_waktu);
                    data.append('prioritas', addData.prioritas);
                    data.append('kategori', 'Development');
                    data.append('link_project', addData.link_project); 
                    if (fileBrief) data.append('lampiran_admin', fileBrief);

                    await axios.patch(`${BASE_URL}/api/laporan/${t.id}/`, data, {
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                    });
                }
                Swal.close();
                Swal.fire('Berhasil!', 'Perubahan tugas kelompok berhasil disimpan.', 'success');
            } else {
                for (const empId of selectedKaryawanIds) {
                    const data = new FormData();
                    data.append('tugas', addData.judul_tugas);
                    data.append('catatan_manager', combinedCatatan);
                    data.append('karyawan', empId);
                    data.append('deadline', addData.tenggat_waktu);
                    data.append('prioritas', addData.prioritas);
                    data.append('kategori', 'Development');
                    data.append('link_project', addData.link_project); 
                    data.append('persentase', 0);
                    if (fileBrief) data.append('lampiran_admin', fileBrief);

                    await axios.post(`${BASE_URL}/api/laporan/`, data, {
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                    });
                }
                Swal.close();
                Swal.fire('Berhasil!', 'Tugas berhasil didistribusikan ke project member.', 'success');
            }
            handleCloseAddModal();
            fetchTasks();
        } catch (error) {
            Swal.close();
            Swal.fire('Gagal!', 'Terjadi kesalahan sistem saat memproses data.', 'error');
        }
    };

    const handleUpdateProgress = async (e) => {
        e.preventDefault();
        
        const currentTask = tasks.find(t => t.id === currentTaskId);
        const { instruksiAdmin } = parseCatatan(currentTask?.catatan_manager);
        const combinedCatatan = `${instruksiAdmin}|||${editData.keterangan}`;

        const data = new FormData();
        data.append('catatan_manager', combinedCatatan);
        data.append('persentase', editData.persentase);
        data.append('estimasi_waktu', editData.estimasi);
        data.append('link_project', editData.link_project); 
        
        if (fotoFile) data.append('foto_progres', fotoFile);

        try {
            await axios.patch(`${BASE_URL}/api/laporan/${currentTaskId}/`, data, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            Swal.fire('Berhasil!', 'Progres aktivitas berhasil diperbarui.', 'success');
            handleCloseEditModal();
            fetchTasks();
        } catch (error) {
            Swal.fire('Gagal!', 'Gagal memperbarui progress laporan.', 'error');
        }
    };

    const checkIsImage = (url) => {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    };

    const formatTanggal = (dateString) => {
        if (!dateString) return 'Tidak ada';
        const date = new Date(dateString);
        const d = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const t = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        return `${d} | ${t}`;
    };

    return (
        <Container className="mt-2 pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold text-uppercase m-0">Monitoring Tugas</h4>
                
                <Stack direction="horizontal" gap={2}>
                    {(userRole === 'hrd' || userRole === 'manager') && (
                        <>
                            <Button variant="outline-dark" className="fw-bold px-4 rounded-pill shadow-sm" onClick={() => setShowExportModal(true)}>
                                UNDUH REKAP PDF
                            </Button>
                            <Button variant="dark" className="fw-bold px-4 rounded-pill shadow-sm" onClick={() => setShowAddModal(true)}>
                                + BERI TUGAS
                            </Button>
                        </>
                    )}
                </Stack>
            </div>

            {/* --- KODE PERINGATAN KARYAWAN TERLAMBAT --- */}
{lateTasks.length > 0 && (
    <div className="alert alert-danger rounded-4 py-2 mb-4 d-flex justify-content-between align-items-center shadow-sm">
        <span className="small fw-bold">
            <i className="bi bi-exclamation-triangle-fill me-2"></i> 
            Ada {lateTasks.length} tugas yang melewati deadline!
        </span>
        <Button 
            variant="danger" 
            size="sm" 
            className="rounded-pill px-3 fw-bold" 
            style={{fontSize: '10px'}}
            onClick={() => setShowLateTasksModal(true)} // Pemicu modal
        >
            Lihat Detail
        </Button>
    </div>
)}

{/* --- FILTER PILLS --- */}
<Stack direction="horizontal" gap={2} className="mb-3">
    {['Semua', 'Terlewat', 'Pending', 'Selesai'].map((status) => {
        // Hitung jumlah tugas untuk label notifikasi
        const count = groupedTasks.filter(t => {
            const avg = Math.round(t.pelaksanaList.reduce((acc, curr) => acc + curr.persentase, 0) / t.pelaksanaList.length);
            if (status === 'Semua') return true;
            if (status === 'Terlewat') return isDeadlinePassed(t.deadline) && avg < 100;
            if (status === 'Pending') return t.status === 'Pending';
            if (status === 'Selesai') return avg === 100;
            return false;
        }).length;

        return (
            <Button 
                key={status}
                variant={filterStatus === status ? "dark" : "outline-secondary"}
                className="rounded-pill px-3 fw-bold"
                style={{fontSize: '12px'}}
                onClick={() => setFilterStatus(status)}
            >
                {status} <Badge bg={filterStatus === status ? "light" : "secondary"} text={filterStatus === status ? "dark" : "light"}>{count}</Badge>
            </Button>
        );
    })}
</Stack>

            <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <Table hover responsive className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr className="small text-muted fw-bold">
                            <th className="ps-4 py-3">TUGAS</th>
                            <th>PRIORITAS</th>
                            <th style={{width: '200px'}}>PROGRES</th>
                            <th>DEADLINE</th>
                            <th className="text-center">STATUS</th>
                            <th className="text-end pe-4">AKSI</th>
                        </tr>
                    </thead> 
             <tbody>
            {loading ? (
                <tr><td colSpan="6" className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
            ) : groupedTasks
    .filter(task => {
        // Hitung progres rata-rata dulu supaya bisa difilter
        const avg = Math.round(task.pelaksanaList.reduce((acc, curr) => acc + curr.persentase, 0) / task.pelaksanaList.length);
        
        // Logika filternya
        if (filterStatus === 'Semua') return true;
        if (filterStatus === 'Terlewat') return isDeadlinePassed(task.deadline) && avg < 100;
        if (filterStatus === 'Pending') return task.status === 'Pending';
        if (filterStatus === 'Selesai') return avg === 100;
        return true;
    })
    .map(task => {
                const totalProgress = task.pelaksanaList.reduce((acc, curr) => acc + curr.persentase, 0);
                const avgProgress = Math.round(totalProgress / task.pelaksanaList.length);

                return (
                    <tr key={task.id} className="small border-bottom border-light">
                        <td className="ps-4 py-3">
                            <div className="fw-bold text-dark">{task.tugas}</div>
                            {task.pelaksanaList && task.pelaksanaList.length > 1 ? (
                                <div className="d-flex align-items-center mt-2">
                                    <div className="d-flex me-2">
                                        {task.pelaksanaList.slice(0, 3).map((p, idx) => {
                                            const targetKaryawan = employees.find(e => e.id === p.id);
                                            const urlFotoAsli = targetKaryawan?.foto;
                                            return urlFotoAsli ? (
                                                <img key={idx} src={urlFotoAsli} alt={p.nama} className="rounded-circle border border-white" style={{ width: '26px', height: '26px', objectFit: 'cover', marginLeft: idx > 0 ? '-8px' : '0px', zIndex: 10 - idx }} title={p.nama}/>
                                            ) : (
                                                <div key={idx} className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold border border-white" style={{ width: '26px', height: '26px', fontSize: '9px', backgroundColor: getAvatarColor(p.nama), marginLeft: idx > 0 ? '-8px' : '0px', zIndex: 10 - idx }} title={p.nama}>{p.nama ? p.nama.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}</div>
                                            );
                                        })}
                                        {task.pelaksanaList.length > 3 && <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold border border-white" style={{ width: '26px', height: '26px', fontSize: '9px', backgroundColor: '#4f46e5', marginLeft: '-8px', zIndex: 1 }}>+{task.pelaksanaList.length - 3}</div>}
                                    </div>
                                    <span className="text-muted" style={{ fontSize: '10px' }}>{task.pelaksanaList.length} Project Members</span>
                                </div>
                            ) : (
                                <div className="text-muted mt-1" style={{fontSize: '10px'}}>Pelaksana: {task.nama_karyawan}</div>
                            )}
                        </td>
                        <td>
                                <Badge bg={task.prioritas === 'High' ? 'danger' : task.prioritas === 'Medium' ? 'warning' : 'info'} className="rounded-pill text-uppercase px-3" style={{fontSize: '9px'}}>
                                    {task.prioritas || 'Medium'}
                                </Badge>
                            </td>
                        <td>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1 me-2"><ProgressBar now={avgProgress} variant={avgProgress === 100 ? "success" : "dark"} style={{height: '8px', borderRadius: '10px'}} /></div>
                                <span className="fw-bold" style={{fontSize: '10px'}}>{avgProgress}%</span>
                            </div>
                            <div className="text-muted mt-1" style={{fontSize: '9px'}}>Est: {task.estimasi_waktu || '-'}</div>
                        </td>
                        <td className="text-muted" style={{fontSize: '11px'}}>{formatTanggal(task.deadline)}</td>
                        <td className="text-center">
                            <Badge bg={task.status === 'Approved' ? 'success' : task.status === 'Pending' ? 'warning' : 'danger'} className="px-3 py-2 rounded-pill text-uppercase" style={{fontSize: '9px'}}>{task.status}</Badge>
                        </td>
                        <td className="text-end pe-4">
                            <Stack direction="horizontal" gap={2} className="justify-content-end">
                                <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 fw-bold" style={{fontSize: '10px'}} onClick={() => handleDetailClick(task)}>Detail</Button>
                                
                                              {userRole === 'karyawan' ? (
                                    // LOGIKA KARYAWAN: Edit muncul jika Approved, progress < 100, DAN belum expired
                                    (task.status?.toLowerCase() === 'approved' && task.persentase < 100 && !isDeadlinePassed(task.deadline)) ? (
                                        <Button variant="outline-dark" size="sm" className="rounded-pill px-3 fw-bold" style={{fontSize: '10px'}} onClick={() => handleEditClick(task)}>Edit</Button>
                                    ) : (
                                        <Badge bg="light" className="text-muted border rounded-pill py-2" style={{fontSize: '10px'}}>
                                            {isDeadlinePassed(task.deadline) ? "Expired" : "Selesai/Kunci"}
                                        </Badge>
                                    )
                                ) : (
                                    // Logika Manager
                                    avgProgress < 100 ? (
                                        <Button variant="outline-dark" size="sm" className="rounded-pill px-3 fw-bold" style={{fontSize: '10px'}} onClick={() => handleEditClick(task)}>Edit</Button>
                                    ) : (
                                        <Badge bg="light" className="text-muted border rounded-pill py-2" style={{fontSize: '10px'}}>Selesai</Badge>
                                    )
                                )}
                            </Stack>
                        </td>
                    </tr>
                );
            })}
        </tbody>
                </Table>
            </Card>

            {/* --- MODAL EDIT PROGRESS (KARYAWAN) --- */}
            <Modal show={showEditModal} onHide={handleCloseEditModal} centered size="lg" backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold text-uppercase" style={{ fontSize: '15px', letterSpacing: '0.5px' }}>SUNTING LAPORAN TUGAS</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3 pb-4">
                    <Form onSubmit={handleUpdateProgress}>
                        <div className="mb-4 p-3 bg-light rounded-3 text-center border-0">
                            <small className="text-muted fw-bold d-block mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>DOC / LAPORAN DIUPDATE PADA:</small>
                            <span className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                                {new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}, {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                            </span>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted">KETERANGAN PROGRES</Form.Label>
                            <Form.Control as="textarea" rows={4} required placeholder="Apa yang sudah dikerjakan?" value={editData.keterangan} className="bg-light border-0 small" onChange={(e) => setEditData({...editData, keterangan: e.target.value})} />
                        </Form.Group>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label className="small fw-bold text-muted">PERSENTASE PROGRESS (%)</Form.Label>
                                <InputGroup>
                                    <Form.Control type="number" min="0" max="100" required value={editData.persentase} className="bg-light border-0 small" onChange={(e) => setEditData({...editData, persentase: e.target.value})} />
                                    <InputGroup.Text className="bg-light border-0 small fw-bold">%</InputGroup.Text>
                                </InputGroup>
                            </Col>
                            <Col md={6}>
                                <Form.Label className="small fw-bold text-muted">ESTIMASI SISA WAKTU</Form.Label>
                                <Form.Control type="text" required placeholder="Cth: 2 jam lagi / Besok" value={editData.estimasi} className="bg-light border-0 small" onChange={(e) => setEditData({...editData, estimasi: e.target.value})} />
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted">TAUTAN LINK PROJECT (GITHUB / FIGMA)</Form.Label>
                            <Form.Control type="url" placeholder="Masukkan tautan figma atau repositori github pekerjaan hari ini..." value={editData.link_project} className="bg-light border-0 small" onChange={(e) => setEditData({...editData, link_project: e.target.value})} />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted">UNGGAH FOTO PROGRESS</Form.Label>
                            <Form.Control type="file" accept="image/*" className="bg-light border-0 small" onChange={(e) => setFotoFile(e.target.files[0])} />
                        </Form.Group>

                        <Button variant="dark" type="submit" className="w-100 fw-bold py-2 rounded-3 text-uppercase shadow-sm">SIMPAN PERUBAHAN</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* --- MODAL FORMULIR PENUGASAN KELOMPOK --- */}
            <Modal show={showAddModal} onHide={handleCloseAddModal} centered size="lg" backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold text-uppercase" style={{ fontSize: '15px', letterSpacing: '0.5px' }}>
                        {isEdit ? 'SUNTING PENUGASAN TUGAS' : 'FORMULIR PENUGASAN BARU'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3 pb-4">
                    <Form onSubmit={handleSaveTask}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted">JUDUL TUGAS</Form.Label>
                            <Form.Control type="text" required placeholder="Masukkan judul tugas atau pekerjaan..." value={addData.judul_tugas} className="bg-light border-0 small py-2" onChange={(e) => setAddData({...addData, judul_tugas: e.target.value})} />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted">DESKRIPSI TUGAS / INSTRUKSI</Form.Label>
                            <Form.Control as="textarea" rows={4} required placeholder="Tuliskan deskripsi lengkap, instruksi detail, atau catatan progres di sini..." value={addData.deskripsi_tugas} className="bg-light border-0 small" onChange={(e) => setAddData({...addData, deskripsi_tugas: e.target.value})} />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted">
                                {isEdit ? 'PILIH PENERIMA TUGAS' : 'PILIH ANGGOTA TIM / PROJECT MEMBER'}
                            </Form.Label>
                            {isEdit ? (
                                <Form.Select required value={addData.karyawan_id} className="bg-light border-0 small py-2" onChange={(e) => setAddData({...addData, karyawan_id: e.target.value})}>
                                    <option value="">Pilih Staf Karyawan...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.first_name || emp.username}</option>
                                    ))}
                                </Form.Select>
                            ) : (
                                <>
                                    <div 
                                        className="p-3 border rounded-3 bg-white shadow-sm" 
                                        style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e0e0e0' }}
                                    >
                                        {employees.map((emp) => (
                                            <Form.Check 
                                                key={emp.id}
                                                type="checkbox"
                                                id={`member-${emp.id}`}
                                                label={emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username}
                                                checked={selectedKaryawanIds.includes(emp.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedKaryawanIds([...selectedKaryawanIds, emp.id]);
                                                    } else {
                                                        setSelectedKaryawanIds(selectedKaryawanIds.filter(id => id !== emp.id));
                                                    }
                                                }}
                                                className="small mb-2 fw-semibold text-dark"
                                            />
                                        ))}
                                    </div>
                                    <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                                        Terpilih: <Badge bg="dark">{selectedKaryawanIds.length} Orang</Badge> anggota kelompok.
                                    </div>
                                </>
                            )}
                        </Form.Group>

                        <Row className="mb-3">
                            <Col md={12}>
                                <Form.Label className="small fw-bold text-muted">TINGKAT PRIORITAS</Form.Label>
                                <Form.Select value={addData.prioritas} className="bg-light border-0 small py-2" onChange={(e) => setAddData({...addData, prioritas: e.target.value})}>
                                    <option value="Low">Low Priority</option>
                                    <option value="Medium">Medium Priority</option>
                                    <option value="High">High Priority</option>
                                </Form.Select>
                            </Col>
                        </Row>

                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Label className="small fw-bold text-muted">TENGGAT WAKTU (DUE DATE & TIME)</Form.Label>
                                <Form.Control 
                                    type="datetime-local" 
                                    required 
                                    min={getMinDateTime()}
                                    value={addData.tenggat_waktu} 
                                    className="bg-light border-0 small py-2" 
                                    onChange={(e) => setAddData({...addData, tenggat_waktu: e.target.value})} 
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="small fw-bold text-muted">UNGGAH FILE LAMPIRAN / BRIEF / FOTO</Form.Label>
                                <Form.Control type="file" className="bg-light border-0 small py-2" onChange={(e) => setFileBrief(e.target.files[0])} />
                            </Col>
                        </Row>

                        <Button variant="dark" type="submit" className="w-100 fw-bold py-2 rounded-3 text-uppercase shadow-sm">
                            {isEdit ? 'SIMPAN PERUBAHAN TUGAS' : 'KIRIM PENUGASAN BARU'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* --- MODAL POP-UP DETAIL PENUGASAN --- */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="md">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold small text-uppercase">Informasi Detail Penugasan</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 pt-2">
                    {selectedTaskDetail && (() => {
                        const adminBriefFile = selectedTaskDetail.lampiran_admin_url || selectedTaskDetail.lampiran_admin;
                        const fileToDisplay = adminBriefFile || (selectedTaskDetail.persentase === 0 ? (selectedTaskDetail.foto_progres_url || selectedTaskDetail.foto_progres) : null);

                        return (
                            <>
                                <div className="mb-4">
                                    <h4 className="fw-bold m-0 text-dark">{selectedTaskDetail.tugas}</h4>
                                    <Stack direction="horizontal" gap={2} className="mt-2">
                                        <Badge bg="dark" className="px-3 py-1 rounded-pill" style={{fontSize: '9px'}}>PRIORITAS: {selectedTaskDetail.prioritas?.toUpperCase() || 'MEDIUM'}</Badge>
                                        <Badge bg="secondary" className="px-3 py-1 rounded-pill" style={{fontSize: '9px'}}>
                                            {selectedTaskDetail.pelaksanaList && selectedTaskDetail.pelaksanaList.length > 1 
                                                ? `TIM: ${selectedTaskDetail.pelaksanaList.length} ORANG` 
                                                : `PELAKSANA: ${selectedTaskDetail.nama_karyawan}`}
                                        </Badge>
                                    </Stack>
                                </div>

                                <div className="mb-4 p-3 bg-light rounded-4">
                                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{fontSize: '10px'}}>Deskripsi Tugas / Instruksi:</small>
                                    <p className="small m-0 text-dark" style={{lineHeight: '1.6', whiteSpace: 'pre-line'}}>
                                        {parseCatatan(selectedTaskDetail.catatan_manager).instruksiAdmin || 'Tidak ada deskripsi penugasan tambahan.'}
                                    </p>
                                </div>

                                <div className="mb-4 border p-3 rounded-4 bg-white shadow-sm">
                                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{fontSize: '10px'}}>Tenggat Waktu Pekerjaan (Deadline):</small>
                                    <span className="small fw-bold text-danger">{formatTanggal(selectedTaskDetail.deadline)}</span>
                                </div>

                                {fileToDisplay && (
                                    <div className="mb-3">
                                        <small className="text-muted fw-bold d-block mb-2 text-uppercase" style={{fontSize: '10px'}}>File Lampiran / Brief Kerja:</small>
                                        {checkIsImage(fileToDisplay) ? (
                                            <img src={fileToDisplay} alt="Lampiran Kerja" className="img-fluid rounded-4 shadow-sm border w-100" style={{ maxHeight: '250px', objectFit: 'cover' }} />
                                        ) : (
                                            <div className="p-3 bg-light rounded-4 border text-center shadow-sm">
                                                <div className="small fw-bold text-dark mb-2">Dokumen Brief Tersedia (PDF/Berkas)</div>
                                                <Button variant="dark" size="sm" className="rounded-pill px-4 fw-bold text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.3px' }} href={fileToDisplay} target="_blank" rel="noopener noreferrer">Buka & Unduh Berkas</Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </Modal.Body>
            </Modal>

            {/* --- MODAL DIALOG UNDUH REKAP PDF --- */}
            <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="small fw-bold text-uppercase" style={{letterSpacing: '0.3px'}}>Konfigurasi Cetak Rekap PDF</Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-3">
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold text-muted">Saring Berdasarkan Staf Karyawan</Form.Label>
                        <Form.Select value={selectedKaryawan} onChange={(e) => setSelectedKaryawan(e.target.value)} className="bg-light border-0 small py-2">
                            <option value="Semua">Semua Karyawan (Seluruh Staf)</option>
                            {[...new Set(tasks.map(l => l.nama_karyawan))].filter(Boolean).map(nama => (
                                <option key={nama} value={nama}>{nama}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label className="small fw-bold text-muted">Saring Berdasarkan Bulan Periode</Form.Label>
                        <Form.Select value={selectedBulan} onChange={(e) => setSelectedBulan(e.target.value)} className="bg-light border-0 small py-2">
                            <option value="Semua">Semua Bulan (Seluruh Riwayat)</option>
                            {listBulanTahunAvailable.map(valBulan => (
                                <option key={valBulan} value={valBulan}>{formatBulanText(valBulan)}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="dark" className="w-100 fw-bold py-2 rounded-pill text-uppercase shadow-sm" style={{fontSize: '12px'}} onClick={exportToPDF}>
                        PROSES CETAK PDF
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Modal Perpanjang Deadline */}
            <Modal show={showExtendModal} onHide={() => setShowExtendModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{fontSize: '16px'}}>Perpanjang Deadline</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Pilih Tanggal Baru</Form.Label>
                        <Form.Control type="datetime-local" onChange={(e) => setNewDeadline(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowExtendModal(false)}>Batal</Button>
                    <Button variant="dark" onClick={handleExtendDeadline}>Simpan</Button>
                </Modal.Footer>
            </Modal>
{/* --- MODAL DAFTAR TUGAS TERLAMBAT --- */}
<Modal show={showLateTasksModal} onHide={() => { setShowLateTasksModal(false); setSelectedEmployee(null); }} centered size="lg">
    <Modal.Header closeButton>
        <Modal.Title className="fw-bold small text-uppercase text-danger">
            {/* Tombol Back hanya muncul untuk Manager/HRD saat melihat detail */}
            {userRole !== 'karyawan' && selectedEmployee && (
                <Button variant="link" className="p-0 text-danger me-2" onClick={() => setSelectedEmployee(null)}>
                    <i className="bi bi-arrow-left"></i>
                </Button>
            )}
            {userRole === 'karyawan' 
                ? 'Daftar Tugas Anda yang Terlambat' 
                : (selectedEmployee ? `Tugas: ${selectedEmployee}` : 'Karyawan dengan Tugas Terlambat')
            }
        </Modal.Title>
    </Modal.Header>
    <Modal.Body style={{ minHeight: '300px' }}>
        {userRole === 'karyawan' ? (
            /* --- TAMPILAN KARYAWAN: Langsung List Tabel --- */
            lateTasks.length > 0 ? (
                <Table hover responsive size="sm" className="mb-0">
                    <thead className="bg-light text-muted" style={{ fontSize: '11px' }}>
                        <tr>
                            <th className="py-2">TUGAS</th>
                            <th className="py-2 text-center" style={{ width: '150px' }}>PROGRESS</th>
                            <th className="py-2">DEADLINE</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '13px' }}>
                        {lateTasks.map((t) => (
                            <tr key={t.id} className="align-middle">
                                <td className="fw-bold text-dark py-3">{t.tugas}</td>
                                <td className="text-center">
                                    <ProgressBar 
                                        now={t.persentase || 0} 
                                        label={`${t.persentase}%`} 
                                        variant="danger" 
                                        style={{ height: '18px', fontSize: '10px' }} 
                                    />
                                </td>
                                <td className="text-danger fw-bold">{formatTanggal(t.deadline)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            ) : (
                <div className="text-center py-5 text-muted">Tidak ada tugas terlambat!</div>
            )
        ) : (
            /* --- TAMPILAN MANAGER/HRD: Grouping Nama Karyawan --- */
            !selectedEmployee ? (
                <div className="d-grid gap-2">
                    <small className="text-muted mb-2">Klik nama karyawan untuk melihat detail tugas:</small>
                    {Object.keys(lateTasksGrouped).map((name) => (
                        <Button 
                            key={name} 
                            variant="outline-dark" 
                            className="text-start d-flex justify-content-between align-items-center py-3"
                            onClick={() => setSelectedEmployee(name)}
                        >
                            {name}
                            <Badge bg="danger" pill>{lateTasksGrouped[name].length} Tugas</Badge>
                        </Button>
                    ))}
                </div>
            ) : (
                <Table hover responsive size="sm" className="mb-0">
                    <thead className="bg-light text-muted" style={{ fontSize: '11px' }}>
                        <tr>
                            <th className="py-2">TUGAS</th>
                            <th className="py-2 text-center" style={{ width: '150px' }}>PROGRESS</th>
                            <th className="py-2">DEADLINE</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '13px' }}>
                        {lateTasksGrouped[selectedEmployee].map((t) => (
                            <tr key={t.id} className="align-middle">
                                <td className="fw-bold text-dark py-3">{t.tugas}</td>
                                <td className="text-center">
                                    <ProgressBar 
                                        now={t.persentase || 0} 
                                        label={`${t.persentase}%`} 
                                        variant="danger" 
                                        style={{ height: '18px', fontSize: '10px' }} 
                                    />
                                </td>
                                <td className="text-danger fw-bold">{formatTanggal(t.deadline)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )
        )}
    </Modal.Body>
</Modal>
        </Container>
    );
};

export default TugasKaryawan;