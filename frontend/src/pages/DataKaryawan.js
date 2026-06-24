import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Card, Badge, Spinner, Modal, Form, Row, Col, Stack } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';

const DataKaryawan = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- STATE MODAL TAMBAH ---
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '', email: '', password: '', first_name: '',
        nip_input: '', jabatan_input: '', bagian_input: '', role_input: 'karyawan'
    });

    // --- STATE MODAL EDIT ---
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editUser, setEditUser] = useState({
        username: '', email: '', first_name: '',
        nip_input: '', jabatan_input: '', bagian_input: '', role_input: ''
    });

    // --- STATE MODAL DETAIL BIODATA ---
    const [showProfileDetail, setShowProfileDetail] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);

    const [fotoFile, setFotoFile] = useState(null);
    const BASE_URL = 'http://127.0.0.1:8000';
    const token = localStorage.getItem('token');
    
    // --- AMBIL DATA ROLE DARI LOCALSTORAGE ---
    const userRole = localStorage.getItem('userRole')?.trim().toLowerCase() || 'karyawan';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/users/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (error) {
            Swal.fire('Error', 'Gagal memuat data karyawan', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fungsi Registrasi User Baru
    const handleAddUser = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(newUser).forEach(key => data.append(key, newUser[key]));
        if (fotoFile) data.append('foto_input', fotoFile);

        try {
            await axios.post(`${BASE_URL}/api/users/`, data, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}` 
                }
            });
            Swal.fire('Berhasil!', 'Karyawan baru telah didaftarkan.', 'success');
            setShowAddModal(false);
            setNewUser({ username: '', email: '', password: '', first_name: '', nip_input: '', jabatan_input: '', bagian_input: '', role_input: 'karyawan' });
            setFotoFile(null);
            fetchUsers(); 
        } catch (error) {
            Swal.fire('Gagal!', 'Cek kembali kelengkapan data input.', 'error');
        }
    };

    // Fungsi Klik Nama untuk Detail
    const handleNameClick = (user) => {
        setSelectedEmp(user);
        setShowProfileDetail(true);
    };

    // Trigger Edit Modal
    const handleEditClick = (u) => {
        setEditingUserId(u.id);
        setEditUser({
            username: u.username,
            email: u.email,
            first_name: u.first_name,
            nip_input: u.nip || '',
            jabatan_input: u.jabatan || '',
            bagian_input: u.bagian || '',
            role_input: u.role || 'karyawan'
        });
        setShowEditModal(true);
    };

    // Update Data (PATCH)
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(editUser).forEach(key => data.append(key, editUser[key]));
        if (fotoFile) data.append('foto_input', fotoFile);

        try {
            await axios.patch(`${BASE_URL}/api/users/${editingUserId}/`, data, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}` 
                }
            });
            Swal.fire('Berhasil!', 'Data karyawan telah diperbarui.', 'success');
            setShowEditModal(false);
            setFotoFile(null);
            fetchUsers();
        } catch (error) {
            Swal.fire('Gagal!', 'Gagal memperbarui data karyawan.', 'error');
        }
    };

    const deleteUser = (id) => {
        Swal.fire({
            title: 'Hapus Karyawan?',
            text: "Data akun ini akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#212529',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${BASE_URL}/api/users/${id}/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus!', 'User telah dihapus.', 'success');
                    fetchUsers();
                } catch (error) {
                    Swal.fire('Error', 'Gagal menghapus user.', 'error');
                }
            }
        });
    };

    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.nip && user.nip.includes(searchTerm))
    );

    return (
        <Container className="mt-2 pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h4 className="fw-bold text-uppercase m-0">Manajemen Karyawan</h4>
                    <p className="text-muted small m-0">Sistem Informasi Monitoring PT Bangun Kreatif Abadi</p>
                </div>
                {/* KONDISI 1: HANYA HRD YANG BISA MELIHAT TOMBOL TAMBAH KARYAWAN */}
                {userRole === 'hrd' && (
                    <Button variant="dark" className="fw-bold px-4 rounded-pill shadow-sm" onClick={() => setShowAddModal(true)}>
                        + TAMBAH KARYAWAN
                    </Button>
                )}
            </div>

            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Header className="bg-white py-3 border-bottom-0">
                    <Form.Control
                        placeholder="Cari NIP atau Nama..."
                        className="rounded-pill px-3 bg-light border-0 small"
                        style={{maxWidth: '300px'}}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Card.Header>
                <Table hover responsive className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr className="small text-muted fw-bold">
                            <th className="ps-4 py-3">KARYAWAN</th>
                            <th>NIP</th>
                            <th>JABATAN</th>
                            <th className="text-center">AKSES</th>
                            {/* KONDISI 2: HANYA HRD YANG MELIHAT KOLOM TINDAKAN (Manager hanya bisa memantau) */}
                            {userRole === 'hrd' && <th className="text-end pe-4">TINDAKAN</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={userRole === 'hrd' ? 5 : 4} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <tr key={u.id} className="small border-bottom border-light">
                                    <td className="ps-4 py-3">
                                        <div className="d-flex align-items-center">
                                            <img 
                                                src={u.foto || 'https://via.placeholder.com/35'} 
                                                alt="p" 
                                                className="rounded-circle me-2 shadow-sm border" 
                                                style={{width: '35px', height: '35px', objectFit: 'cover'}}
                                            />
                                            <div>
                                                <div 
                                                    className="fw-bold text-dark mb-0" 
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => handleNameClick(u)}
                                                >
                                                    {u.first_name || u.username}
                                                </div>
                                                <div className="text-muted" style={{fontSize: '10px'}}>{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-muted">{u.nip || '-'}</td>
                                    <td className="text-muted">{u.jabatan || '-'}</td>
                                    <td className="text-center">
                                        <Badge bg="dark" className="px-3 py-2 rounded-pill fw-normal text-uppercase" style={{fontSize: '9px'}}>
                                            {u.role || 'karyawan'}
                                        </Badge>
                                    </td>
                                    {/* KONDISI 3: HANYA HRD YANG BISA MELIHAT TOMBOL EDIT & HAPUS */}
                                    {userRole === 'hrd' && (
                                        <td className="text-end pe-4">
                                            <Stack direction="horizontal" gap={2} className="justify-content-end">
                                                <Button variant="outline-dark" size="sm" className="rounded-pill px-3" style={{fontSize: '10px'}} onClick={() => handleEditClick(u)}>
                                                    Edit
                                                </Button>
                                                <Button variant="outline-danger" size="sm" className="rounded-pill px-3" style={{fontSize: '10px'}} onClick={() => deleteUser(u.id)}>
                                                    Hapus
                                                </Button>
                                            </Stack>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={userRole === 'hrd' ? 5 : 4} className="text-center py-5 text-muted small">Data tidak ditemukan.</td></tr>
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* 1. MODAL TAMBAH KARYAWAN (SESUAI REQUEST: NIP, NAMA, EMAIL, BAGIAN, JABATAN, STATUS, ROLE, FOTO) */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered backdrop="static" size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="small fw-bold text-uppercase">Registrasi Akun Karyawan Baru</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3 pb-4">
                    <Form onSubmit={handleAddUser}>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label className="small fw-bold">NIP / ID STAFF</Form.Label>
                                <Form.Control type="text" required className="bg-light border-0 small py-2" onChange={(e) => setNewUser({...newUser, nip_input: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="small fw-bold">Nama Lengkap</Form.Label>
                                <Form.Control type="text" required className="bg-light border-0 small py-2" onChange={(e) => setNewUser({...newUser, first_name: e.target.value})} />
                            </Col>
                        </Row>
                        
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label className="small fw-bold">Email</Form.Label>
                                <Form.Control type="email" required className="bg-light border-0 small py-2" onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="small fw-bold">Bagian</Form.Label>
                                <Form.Control type="text" required className="bg-light border-0 small py-2" placeholder="Cth: Divisi IT / Keuangan" onChange={(e) => setNewUser({...newUser, bagian_input: e.target.value})} />
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label className="small fw-bold">Jabatan</Form.Label>
                                <Form.Control type="text" className="bg-light border-0 small py-2" placeholder="Cth: Staff Programmer" onChange={(e) => setNewUser({...newUser, jabatan_input: e.target.value})} />
                            </Col>
                            <Col md={3}>
                                <Form.Label className="small fw-bold">Status Akun</Form.Label>
                                <Form.Select className="bg-light border-0 small py-2 fw-bold text-success" disabled>
                                    <option>AKTIF</option>
                                </Form.Select>
                            </Col>
                            <Col md={3}>
                                <Form.Label className="small fw-bold">Role (Akses)</Form.Label>
                                <Form.Select className="bg-light border-0 small py-2" required onChange={(e) => setNewUser({...newUser, role_input: e.target.value})}>
                                    <option value="karyawan">KARYAWAN</option>
                                    <option value="manager">MANAGER</option>
                                    <option value="hrd">HRD</option>
                                </Form.Select>
                            </Col>
                        </Row>

                        {/* Username & Password tetap dibutuhkan untuk pembuatan akun login */}
                        <Row className="mb-3 p-3 bg-light rounded-3 mx-0 border">
                            <small className="fw-bold mb-2 p-0 text-muted">INFO LOGIN (OTOMATIS / MANUAL)</small>
                            <Col md={6} className="ps-0">
                                <Form.Label className="small fw-bold">Username Login</Form.Label>
                                <Form.Control type="text" required className="border-0 small" onChange={(e) => setNewUser({...newUser, username: e.target.value})} />
                            </Col>
                            <Col md={6} className="pe-0">
                                <Form.Label className="small fw-bold">Password Default</Form.Label>
                                <Form.Control type="password" required className="border-0 small" onChange={(e) => setNewUser({...newUser, password: e.target.value})} />
                            </Col>
                        </Row>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold">Upload Foto Profil</Form.Label>
                            <Form.Control type="file" accept="image/*" className="bg-light border-0 small py-2" onChange={(e) => setFotoFile(e.target.files[0])} />
                        </Form.Group>
                        <Button variant="dark" type="submit" className="w-100 fw-bold py-2 rounded-3 shadow">SIMPAN DATA KARYAWAN</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* 2. MODAL EDIT KARYAWAN (MENYESUAIKAN OPSI ROLE BARU) */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered backdrop="static" size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="small fw-bold text-uppercase">Edit Data Karyawan</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3 pb-4">
                    <Form onSubmit={handleUpdateUser}>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label className="small fw-bold">NIP / ID STAFF</Form.Label>
                                <Form.Control type="text" className="bg-light border-0 small" value={editUser.nip_input} onChange={(e) => setEditUser({...editUser, nip_input: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="small fw-bold">Nama Lengkap</Form.Label>
                                <Form.Control type="text" className="bg-light border-0 small" value={editUser.first_name} onChange={(e) => setEditUser({...editUser, first_name: e.target.value})} />
                            </Col>
                        </Row>
                        <Row className="mb-3">
                            <Col md={4}>
                                <Form.Label className="small fw-bold">Email</Form.Label>
                                <Form.Control type="email" className="bg-light border-0 small" value={editUser.email} onChange={(e) => setEditUser({...editUser, email: e.target.value})} />
                            </Col>
                            <Col md={4}>
                                <Form.Label className="small fw-bold">Bagian</Form.Label>
                                <Form.Control type="text" className="bg-light border-0 small" value={editUser.bagian_input} onChange={(e) => setEditUser({...editUser, bagian_input: e.target.value})} />
                            </Col>
                            <Col md={4}>
                                <Form.Label className="small fw-bold">Username</Form.Label>
                                <Form.Control type="text" className="bg-light border-0 small text-muted" value={editUser.username} disabled />
                            </Col>
                        </Row>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label className="small fw-bold">Jabatan</Form.Label>
                                <Form.Control type="text" className="bg-light border-0 small" value={editUser.jabatan_input} onChange={(e) => setEditUser({...editUser, jabatan_input: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="small fw-bold">Akses (Role)</Form.Label>
                                <Form.Select className="bg-light border-0 small" value={editUser.role_input} onChange={(e) => setEditUser({...editUser, role_input: e.target.value})}>
                                    <option value="karyawan">KARYAWAN</option>
                                    <option value="manager">MANAGER</option>
                                    <option value="hrd">HRD</option>
                                </Form.Select>
                            </Col>
                        </Row>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold">Ganti Foto Profil (Opsional)</Form.Label>
                            <Form.Control type="file" accept="image/*" className="bg-light border-0 small" onChange={(e) => setFotoFile(e.target.files[0])} />
                        </Form.Group>
                        <Button variant="dark" type="submit" className="w-100 fw-bold py-2 rounded-3 shadow">SIMPAN PERUBAHAN</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* 3. MODAL DETAIL BIODATA */}
            <Modal show={showProfileDetail} onHide={() => setShowProfileDetail(false)} centered size="md" backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0"></Modal.Header>
                <Modal.Body className="px-4 pb-5 pt-0 text-center">
                    {selectedEmp && (
                        <>
                            <div className="mb-4">
                                <img 
                                    src={selectedEmp.foto || 'https://via.placeholder.com/100'} 
                                    alt="profile" 
                                    className="rounded-circle border border-4 border-white shadow-sm mb-3"
                                    style={{ width: '120px', height: '120px', objectFit: 'cover', marginTop: '-60px' }}
                                />
                                <h4 className="fw-bold m-0 text-uppercase">{selectedEmp.first_name || selectedEmp.username}</h4>
                                <p className="text-muted small mb-3">{selectedEmp.email}</p>
                                <Badge bg="dark" className="px-4 py-2 rounded-pill text-uppercase" style={{ fontSize: '10px' }}>
                                    ROLE: {selectedEmp.role || 'Karyawan'}
                                </Badge>
                            </div>
                            <hr className="opacity-25" />
                            <Row className="text-start g-3">
                                <Col xs={6}>
                                    <small className="fw-bold text-muted d-block small">NIP / ID STAF</small>
                                    <span className="small fw-bold">{selectedEmp.nip || '-'}</span>
                                </Col>
                                <Col xs={6}>
                                    <small className="fw-bold text-muted d-block small">BAGIAN</small>
                                    <span className="small fw-bold">{selectedEmp.bagian || '-'}</span>
                                </Col>
                                <Col xs={6}>
                                    <small className="fw-bold text-muted d-block small">JABATAN</small>
                                    <span className="small fw-bold">{selectedEmp.jabatan || '-'}</span>
                                </Col>
                                <Col xs={6}>
                                    <small className="fw-bold text-muted d-block small">STATUS</small>
                                    <Badge bg="success" className="fw-normal" style={{fontSize: '9px'}}>AKTIF</Badge>
                                </Col>
                            </Row>
                        </>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default DataKaryawan;