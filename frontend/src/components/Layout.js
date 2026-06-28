import React from 'react';
import { Navbar, Nav, Container, Badge, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import bkaLogo from '../assets/logobka.png';

// --- TAMBAHAN BARU: Import komponen lonceng yang sudah dibuat ---
import NotifikasiLonceng from './NotifikasiLonceng';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Ambil data dari localStorage dan bersihkan spasi gaib dengan .trim()
    const userRole = localStorage.getItem('userRole')?.trim().toLowerCase() || 'karyawan';
    const username = localStorage.getItem('username') || 'User';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="bg-light" style={{ minHeight: '100vh' }}>
            <Navbar bg="white" className="border-bottom py-2 shadow-sm" sticky="top">
                <Container>
                    <Navbar.Brand as={Link} to="/dashboard" className="fw-bold tracking-tighter me-4">
                        <img 
                            src={bkaLogo}
                            alt="bkaLogo" 
                            style={{ maxWidth: '300px', width: '200%', marginBottom: '10px' }} 
                        />
                    </Navbar.Brand>
                    
                    <Nav className="me-auto align-items-center">
                        {/* Menu Dashboard: Diakses semua Role */}
                        <Nav.Link 
                            as={Link} 
                            to="/dashboard" 
                            className={`small fw-bold px-3 ${location.pathname === '/dashboard' ? 'text-dark border-bottom border-2 border-dark' : 'text-muted'}`}
                        >
                            DASHBOARD
                        </Nav.Link>

                        {/* MENU KHUSUS DATA KARYAWAN: Diizinkan untuk HRD dan Manager */}
                        {(userRole === 'hrd' || userRole === 'manager') && (
                            <Nav.Link 
                                as={Link} 
                                to="/data-karyawan" 
                                className={`small fw-bold px-3 ${location.pathname === '/data-karyawan' ? 'text-dark border-bottom border-2 border-dark' : 'text-muted'}`}
                            >
                                DATA KARYAWAN
                            </Nav.Link>
                        )}

                        {/* MENU TUGAS DINAMIS */}
                        <Nav.Link 
                            as={Link} 
                            to="/tugas" 
                            className={`small fw-bold px-3 ${location.pathname === '/tugas' ? 'text-dark border-bottom border-2 border-dark' : 'text-muted'}`}
                        >
                            {userRole === 'karyawan' ? 'TUGAS SAYA' : 'TUGAS KARYAWAN'}
                        </Nav.Link>
                    </Nav>
                    
                    <Nav className="ms-auto align-items-center">
                        {/* --- KOMPONEN LONCENG NOTIFIKASI DISISIPKAN DI SINI --- */}
                        <NotifikasiLonceng />

                        <Badge bg="dark" className="me-3 px-3 py-2 rounded-pill shadow-sm" style={{fontSize: '10px'}}>
                            ROLE: {userRole.toUpperCase()}
                        </Badge>
                        
                        <span className="text-muted small me-3 fw-bold text-uppercase">{username}</span>
                        
                        <Button 
                            variant="link" 
                            onClick={handleLogout} 
                            className="text-danger small fw-bold text-decoration-none p-0"
                        >
                            LOGOUT
                        </Button>
                    </Nav>
                </Container>
            </Navbar>

            <main className="py-4">
                <Container>{children}</Container>
            </main>
        </div>
    );
};

export default Layout;