import React, { useState } from 'react';
import { Container, Form, Button, Card, Spinner, Stack } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import bkaLogo from '../assets/logobka.png'; 

const Login = () => {
    const navigate = useNavigate();
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loading, setLoading] = useState(false);

    const BASE_URL = 'http://127.0.0.1:8000';

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${BASE_URL}/api/login/`, {
                username: usernameInput,
                password: passwordInput
            });

            if (response.data.status === 'success') {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('userRole', response.data.role);
                localStorage.setItem('username', response.data.username);
                localStorage.setItem('userId', response.data.id);

                Swal.fire({
                    icon: 'success',
                    title: `Selamat Datang, ${response.data.username}!`,
                    text: 'Login berhasil diverifikasi ke dalam sistem.',
                    showConfirmButton: false,
                    timer: 1500
                });

                navigate('/dashboard');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Otentikasi Gagal',
                text: error.response?.data?.message || 'Username atau password salah, silakan periksa kembali.',
                confirmButtonColor: '#0A192F'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.loginCanvas}>
            <style>{`
                .premium-input {
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 8px !important;
                    padding: 10px 14px !important;
                    font-size: 14px !important;
                    color: #0A192F !important;
                    background-color: #f8fafc !important;
                    transition: all 0.3s ease-in-out !important;
                }
                .premium-input:focus {
                    box-shadow: none !important;
                    background-color: #ffffff !important;
                    border-color: #0A192F !important;
                    transform: translateY(-1px);
                }
                .premium-input::placeholder {
                    color: #94a3b8 !important;
                    opacity: 0.8;
                }
                .lift-button {
                    transition: all 0.2s ease-in-out !important;
                }
                .lift-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(10, 25, 47, 0.15) !important;
                    opacity: 0.95;
                }
            `}</style>

            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <Card style={styles.modernLoginCard}>
                    <Card.Body className="p-4 p-md-5 d-flex flex-column justify-content-between">
                        
                        <div className="text-center mb-5 mt-2">
                            <img 
                                src={bkaLogo} 
                                alt="Logo PT BKA" 
                                style={styles.companyLogoStyle}
                                onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                            <div className="fw-bold mt-2 text-uppercase d-inline-block small" style={styles.fallbackTextLogo}>
                                PT. Bangun Kreatif Abadi
                            </div>
                        </div>

                        <Form onSubmit={handleLoginSubmit}>
                            <Form.Group className="mb-4" controlId="loginUsernameField">
                                <Form.Label style={styles.minimalistLabel}>Username</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    required 
                                    placeholder="Masukkan username" 
                                    className="premium-input"
                                    value={usernameInput}
                                    onChange={(e) => setUsernameInput(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-5" controlId="loginPasswordField">
                                <Form.Label style={styles.minimalistLabel}>Password</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    required 
                                    placeholder="********" 
                                    className="premium-input"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                />
                            </Form.Group>

                            <Button 
                                type="submit" 
                                className="w-100 border-0 py-2.5 fw-bold text-uppercase shadow-sm lift-button" 
                                style={styles.navySubmitButton}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Stack direction="horizontal" gap={2} className="justify-content-center align-items-center">
                                        <Spinner animation="border" size="sm" />
                                        <span>Memverifikasi...</span>
                                    </Stack>
                                ) : 'Masuk Ke Sistem'}
                            </Button>
                        </Form>

                        <div className="text-center mt-5 mb-1" style={styles.cleanFooterText}>
                            © 2026 PT BANGUN KREATIF ABADI
                        </div>

                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

const styles = {
    loginCanvas: {
        backgroundColor: '#486C90', 
        backgroundImage: 'radial-gradient(circle at 50% 50%, #B3C8DC 0%, #e2e8f0 100%)', 
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center'
    },
    modernLoginCard: {
        width: '100%',
        maxWidth: '430px',
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        borderRadius: '16px',
        boxShadow: '0 10px 30px -5px rgba(10, 25, 47, 0.04), 0 8px 16px -6px rgba(10, 25, 47, 0.04)', 
    },
    companyLogoStyle: {
        maxHeight: '42px',
        objectFit: 'contain',
        width: 'auto'
    },
    fallbackTextLogo: {
        color: '#0A192F', 
        letterSpacing: '1px',
        fontWeight: '700',
        fontSize: '13px'
    },
    minimalistLabel: {
        fontSize: '11px',
        fontWeight: '700',
        color: '#1e293b', 
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        marginBottom: '6px',
        display: 'block'
    },
    navySubmitButton: {
        backgroundColor: '#0A192F', 
        borderRadius: '8px',
        fontSize: '13px',
        letterSpacing: '0.5px',
        padding: '11px 0',
        color: '#ffffff'
    },
    cleanFooterText: {
        color: '#838A92', 
        fontSize: '10px',
        fontWeight: '500',
        letterSpacing: '0.5px'
    }
};

export default Login;