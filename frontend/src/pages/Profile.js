import React, { useState } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';

const Profile = () => {
    const [password, setPassword] = useState({ old: '', new: '', confirm: '' });

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (password.new !== password.confirm) {
            return Swal.fire('Error', 'Konfirmasi password tidak cocok', 'error');
        }
        // Kirim ke API update password (pastikan backend sudah siap)
        Swal.fire('Berhasil!', 'Password akun BKA kamu sudah diperbarui.', 'success');
    };

    return (
        <Container className="mt-5" style={{ maxWidth: '500px' }}>
            <Card className="border-0 shadow-sm rounded-4 p-4">
                <h5 className="fw-bold mb-4">PENGATURAN KEAMANAN</h5>
                <Form onSubmit={handleUpdatePassword}>
                    <Form.Group className="mb-3">
                        <Form.Label className="small">Password Baru</Form.Label>
                        <Form.Control type="password" onChange={(e) => setPassword({...password, new: e.target.value})} required />
                    </Form.Group>
                    <Form.Group className="mb-4">
                        <Form.Label className="small">Konfirmasi Password Baru</Form.Label>
                        <Form.Control type="password" onChange={(e) => setPassword({...password, confirm: e.target.value})} required />
                    </Form.Group>
                    <Button variant="dark" type="submit" className="w-100 fw-bold">UPDATE PASSWORD</Button>
                </Form>
            </Card>
        </Container>
    );
};

export default Profile;