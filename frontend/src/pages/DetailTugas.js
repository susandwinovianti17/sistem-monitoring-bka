import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Badge, Button, Spinner, Alert } from 'react-bootstrap'; // Tambahkan Alert
import axios from 'axios';

const DetailTugas = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tugas, setTugas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(null); 

    const BASE_URL = 'http://127.0.0.1:8000';
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/api/laporan/${id}/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTugas(res.data);
            } catch (error) {
                console.error("Gagal mengambil detail tugas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, token, BASE_URL]);

    // --- LOGIKA HITUNG MUNDUR (REAL-TIME) ---
    useEffect(() => {
        if (!tugas || !tugas.deadline) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const target = new Date(tugas.deadline).getTime();
            const diff = target - now;

            if (diff > 0 && diff <= 86400000) {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setCountdown(`SISA ${h} JAM ${m} MENIT ${s} DETIK LAGI!`);
            } else {
                setCountdown(null); 
            }
        };

        const interval = setInterval(updateTimer, 1000);
        updateTimer(); 
        return () => clearInterval(interval);
    }, [tugas]);

    const getSisaWaktu = (deadline) => {
        const target = new Date(deadline);
        const sekarang = new Date();
        const selisih = target - sekarang;

        if (selisih < 0) return { teks: "DEADLINE TERLEWAT", warna: "danger", isOverdue: true };
        const jam = Math.floor(selisih / (1000 * 60 * 60));
        if (jam < 24) return { teks: `SISA ${jam} JAM LAGI!`, warna: "danger", isOverdue: false };
        const hari = Math.floor(jam / 24);
        return { teks: `${hari} Hari Lagi`, warna: hari <= 2 ? "warning" : "success", isOverdue: false };
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{height: '80vh'}}>
            <Spinner animation="border" variant="dark" />
        </div>
    );

    if (!tugas) return <Container className="mt-5 text-center"><h5>Tugas tidak ditemukan.</h5></Container>;

    const statusWaktu = getSisaWaktu(tugas.deadline);
    const instruksi = tugas.catatan_manager?.split('|||')[0] || 'Tidak ada instruksi.';

    return (
        <Container className="mt-4 mb-5 animate__animated animate__fadeIn">
            <Button variant="link" className="text-dark text-decoration-none p-0 mb-4 fw-bold" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left me-2"></i> KEMBALI KE MONITORING
            </Button>

            <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                <div className="p-4 bg-dark text-white d-flex justify-content-between align-items-center">
                    <div>
                        <small className="text-uppercase opacity-75 fw-bold" style={{letterSpacing: '1px'}}>Informasi Detail Penugasan</small>
                        <h2 className="fw-bold m-0 mt-1">{tugas.tugas}</h2>
                    </div>
                    
                    <div className="d-flex gap-2">
                        {countdown ? (
                            <Badge bg="danger" className="px-3 py-2 rounded-pill shadow-sm animate__animated animate__flash animate__infinite">
                                {countdown}
                            </Badge>
                        ) : (
                            <Badge bg={statusWaktu.warna} className="px-3 py-2 rounded-pill shadow-sm">
                                {statusWaktu.teks}
                            </Badge>
                        )}
                    </div>
                </div>

                <Card.Body className="p-4">
                    {/* ALERT MERAH JIKA DEADLINE TERLEWAT */}
                    {statusWaktu.isOverdue && (
                        <Alert variant="danger" className="rounded-4 fw-bold shadow-sm d-flex align-items-center">
                            <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
                            <div>
                                PERHATIAN: Deadline tugas ini sudah terlewat! Segera selesaikan dan hubungi atasan.
                            </div>
                        </Alert>
                    )}

                    <Row className="g-4">
                        <Col lg={8}>
                            <div className="mb-4">
                                <h6 className="fw-bold text-muted text-uppercase mb-3" style={{fontSize: '12px'}}>Deskripsi / Instruksi Atasan:</h6>
                                <div className="p-3 rounded-4 border-0 bg-light shadow-sm" style={{minHeight: '200px', whiteSpace: 'pre-line'}}>
                                    {instruksi}
                                </div>
                            </div>
                        </Col>

                        <Col lg={4}>
                            <div className="p-4 rounded-4 bg-light border-0 shadow-sm mb-4 text-center">
                                <h6 className="fw-bold text-muted text-uppercase mb-3" style={{fontSize: '11px'}}>Status Penugasan:</h6>
                                <Badge 
                                    bg={tugas.status === 'Approved' ? 'success' : tugas.status === 'Pending' ? 'warning' : 'danger'} 
                                    className="px-4 py-2 rounded-pill shadow-sm text-uppercase"
                                    style={{ fontSize: '14px' }}
                                >
                                    {tugas.status.toUpperCase()}
                                </Badge>
                                <div className="mt-3 text-muted" style={{fontSize: '12px'}}>
                                    Progress: {tugas.persentase}%
                                </div>
                            </div>

                            <div className="d-grid gap-2">
                                <h6 className="fw-bold text-muted text-uppercase mb-2" style={{fontSize: '11px'}}>Lampiran Instruksi:</h6>
                                {tugas.lampiran_admin && (
                                    <Button variant="outline-dark" size="sm" className="rounded-3 fw-bold py-2" href={tugas.lampiran_admin} target="_blank">
                                        <i className="bi bi-file-earmark-arrow-down me-2"></i> UNDUH BRIEF TUGAS
                                    </Button>
                                )}
                            </div>
                        </Col>
                    </Row>
                </Card.Body>

                <Card.Footer className="bg-white border-0 py-3 text-center">
                    <small className="text-muted">Deadline: <span className="fw-bold text-dark">{new Date(tugas.deadline).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></small>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default DetailTugas;