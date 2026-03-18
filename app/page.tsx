import React from 'react';
import Link from 'next/link';
import './landing.css'; // We'll put the custom styles here

export default function LandingPage() {
    return (
        <div className="landing-page-wrapper">
            {/* NAV */}
            <nav>
                <div className="nav-inner">
                    <Link href="/" className="logo">Njadwal<span>.</span></Link>
                    <ul className="nav-links">
                        <li><a href="#fitur">Fitur</a></li>
                        <li><a href="#cara-kerja">Cara Kerja</a></li>
                        <li><a href="#harga">Harga</a></li>
                    </ul>
                    <div className="nav-cta">
                        <Link href="/login" className="btn-ghost">Masuk</Link>
                        <Link href="/register" className="btn-primary">Coba Gratis</Link>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <section className="hero">
                <div className="hero-badge">
                    <span className="badge-dot"></span>
                    Dibuat untuk UMKM Indonesia
                </div>
                <h1>Jadwalkan lebih <em>cerdas,</em><br />tanpa ribet</h1>
                <p>Platform booking otomatis yang terhubung ke WhatsApp, QRIS, dan Google Kalender — khusus untuk barbershop, klinik kecantikan, dan studio di Indonesia.</p>
                <div className="hero-buttons">
                    <Link href="/register" className="btn-hero">Mulai Gratis 14 Hari</Link>
                    <a href="#cara-kerja" className="btn-hero-ghost">Lihat cara kerja →</a>
                </div>
                <p className="hero-note">Tidak perlu kartu kredit · Setup kurang dari 10 menit</p>
            </section>

            {/* HERO VISUAL */}
            <div className="hero-visual-wrap">
                <div className="hero-visual">
                    <div className="booking-card">
                        <div className="booking-card-title">Pilih jadwal kamu</div>
                        <div className="booking-header">
                            <div className="avatar av-g">BB</div>
                            <div>
                                <div className="booking-name">Barber Budi</div>
                                <div className="booking-sub">Potong rambut · 60 mnt</div>
                            </div>
                        </div>
                        <div className="slot-grid">
                            <div className="slot">09:00</div>
                            <div className="slot booked">09:30</div>
                            <div className="slot">10:00</div>
                            <div className="slot active">10:30</div>
                            <div className="slot booked">11:00</div>
                            <div className="slot">11:30</div>
                            <div className="slot">13:00</div>
                            <div className="slot">13:30</div>
                            <div className="slot booked">14:00</div>
                        </div>
                        <div style={{ marginTop: '14px' }}>
                            <div className="wa-pill"><span className="wa-dot"></span> Konfirmasi otomatis via WhatsApp</div>
                        </div>
                    </div>

                    <div className="stat-row">
                        <div className="stat-box">
                            <div className="stat-label">Booking hari ini</div>
                            <div className="stat-value">12</div>
                            <div className="stat-sub">+3 dari kemarin</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">WA terkirim bulan ini</div>
                            <div className="stat-value">47<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)' }}>/50</span></div>
                            <div style={{ marginTop: '8px', background: 'var(--surface)', borderRadius: '100px', height: '4px', overflow: 'hidden' }}>
                                <div style={{ width: '94%', height: '100%', background: 'var(--accent-green)', borderRadius: '100px' }}></div>
                            </div>
                        </div>
                        <div className="stat-box" style={{ flex: 1 }}>
                            <div className="stat-label">Jadwal terbaru</div>
                            <div className="booking-list">
                                <div className="booking-row">
                                    <span className="status-dot s-green"></span>
                                    <span className="name">Rizky A.</span>
                                    <span className="time">10:30</span>
                                </div>
                                <div className="booking-row">
                                    <span className="status-dot s-amber"></span>
                                    <span className="name">Dimas P.</span>
                                    <span className="time">13:00</span>
                                </div>
                                <div className="booking-row">
                                    <span className="status-dot s-gray"></span>
                                    <span className="name">Fajar K.</span>
                                    <span className="time">14:30</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LOGOS */}
            <div className="logos-section">
                <p className="logos-label">Bekerja sama dengan</p>
                <div className="logos-row">
                    <span className="logo-item">Xendit</span>
                    <span className="logo-item">WhatsApp Business</span>
                    <span className="logo-item">Google Calendar</span>
                    <span className="logo-item">Supabase</span>
                </div>
            </div>

            {/* FEATURES */}
            <section className="features-section" id="fitur">
                <div className="section-eyebrow">Fitur</div>
                <h2 className="section-title">Semua yang kamu butuhkan,<br /><em>sudah tersedia</em></h2>
                <p className="section-sub">Dirancang khusus untuk usaha kecil Indonesia yang ingin terlihat profesional tanpa kerumitan teknis.</p>

                <div className="features-grid">
                    <div className="feature-card accent">
                        <div className="feature-icon">📅</div>
                        <h3>Halaman booking publik</h3>
                        <p>Bagikan link jadwalmu ke pelanggan. Mereka bisa langsung pilih waktu, bayar, dan selesai — tanpa perlu WhatsApp bolak-balik.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💳</div>
                        <h3>Pembayaran QRIS & VA</h3>
                        <p>Terintegrasi Xendit. Pelanggan bayar via QRIS atau virtual account, dana langsung masuk ke rekening kamu.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💬</div>
                        <h3>Notifikasi WhatsApp otomatis</h3>
                        <p>Konfirmasi booking dan pengingat jadwal terkirim otomatis via WhatsApp. Kurangi no-show hingga 60%.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🗓️</div>
                        <h3>Sinkronisasi Google Kalender</h3>
                        <p>Booking baru langsung muncul di Google Kalendermu. Bisa dilihat dari HP, laptop, atau mana saja.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">👥</div>
                        <h3>Multi-staf & kalender</h3>
                        <p>Punya lebih dari satu karyawan? Atur kalender per staf, hindari bentrokan jadwal, semua dalam satu dashboard.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🇮🇩</div>
                        <h3>Lokalisasi Indonesia</h3>
                        <p>Mendukung zona waktu WIB, WITA, WIT. Harga dalam Rupiah. Notifikasi dalam Bahasa Indonesia.</p>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="how-section" id="cara-kerja">
                <div className="how-inner">
                    <div className="section-eyebrow">Cara Kerja</div>
                    <h2 className="section-title">Dari daftar sampai<br /><em>booking pertama</em> dalam menit</h2>
                    <div className="steps-grid">
                        <div className="step">
                            <div className="step-num">01</div>
                            <h3>Daftar & setup layanan</h3>
                            <p>Buat akun, isi nama usaha, layanan yang ditawarkan, dan jam operasionalmu. Selesai dalam 10 menit.</p>
                        </div>
                        <div className="step">
                            <div className="step-num">02</div>
                            <h3>Bagikan link booking</h3>
                            <p>Kamu dapat link unik seperti <code style={{ fontSize: '12px', background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>njadwal.app/barberbudi</code>. Taruh di bio Instagram atau WhatsApp.</p>
                        </div>
                        <div className="step">
                            <div className="step-num">03</div>
                            <h3>Pelanggan pilih & bayar</h3>
                            <p>Pelanggan pilih jadwal, isi nama, scan QRIS — selesai. Tidak perlu install app atau daftar akun.</p>
                        </div>
                        <div className="step">
                            <div className="step-num">04</div>
                            <h3>Notifikasi otomatis terkirim</h3>
                            <p>Konfirmasi langsung masuk ke WhatsApp pelanggan, kalendermu terupdate otomatis. Kamu tinggal kerja.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section className="pricing-section" id="harga">
                <div className="section-eyebrow">Harga</div>
                <h2 className="section-title">Harga <em>transparan,</em><br />tanpa biaya tersembunyi</h2>
                <p className="section-sub">Mulai gratis, upgrade sesuai pertumbuhan usahamu.</p>

                <div className="pricing-grid">
                    <div className="pricing-card">
                        <div className="plan-badge">Solo</div>
                        <div className="plan-price">Rp 99rb</div>
                        <div className="plan-period">per bulan</div>
                        <div className="plan-desc">Untuk usaha perorangan yang baru mulai digitalisasi booking.</div>
                        <ul className="plan-features">
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                1 kalender / 1 staf
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                50 notifikasi WA / bulan
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                QRIS & Virtual Account Xendit
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Sinkronisasi Google Kalender
                            </li>
                        </ul>
                        <Link href="/register" className="plan-cta plan-cta-outline">Mulai Sekarang</Link>
                    </div>

                    <div className="pricing-card featured">
                        <div className="popular-tag">Paling Populer</div>
                        <div className="plan-badge">Studio</div>
                        <div className="plan-price" style={{ color: 'white' }}>Rp 199rb</div>
                        <div className="plan-period">per bulan</div>
                        <div className="plan-desc">Untuk studio atau salon dengan banyak karyawan.</div>
                        <ul className="plan-features">
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Kalender multi-staf tak terbatas
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                200 notifikasi WA / bulan
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Semua fitur Solo
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Dashboard admin per staf
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Prioritas support
                            </li>
                        </ul>
                        <Link href="/register" className="plan-cta plan-cta-solid">Mulai Sekarang</Link>
                    </div>

                    <div className="pricing-card">
                        <div className="plan-badge">Top Up WA</div>
                        <div className="plan-price">Rp 50rb</div>
                        <div className="plan-period">untuk 100 pesan WA</div>
                        <div className="plan-desc">Kuota WA habis di tengah bulan? Tambah kapan saja tanpa ganti paket.</div>
                        <ul className="plan-features">
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Aktif langsung setelah bayar
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Tidak ada batas waktu pemakaian
                            </li>
                            <li>
                                <svg className="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,8 6,12 14,4" /></svg>
                                Beli berkali-kali sesuai kebutuhan
                            </li>
                        </ul>
                        <Link href="/dashboard/topup" className="plan-cta plan-cta-outline">Top Up Sekarang</Link>
                    </div>
                </div>

                <div className="topup-note">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p><strong>Coba gratis 14 hari</strong> — tidak perlu kartu kredit. Batalkan kapan saja.</p>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="proof-section">
                <div className="proof-inner">
                    <div className="section-eyebrow">Testimoni</div>
                    <h2 className="section-title">Dipercaya UMKM<br /><em>dari Sabang sampai Merauke</em></h2>
                    <div className="proof-grid">
                        <div className="proof-card">
                            <div className="proof-stars">★★★★★</div>
                            <p className="proof-text">"Sebelumnya booking lewat DM Instagram, sering kelewat. Sekarang semua otomatis, pelanggan langsung dapat konfirmasi WA. No-show turun drastis."</p>
                            <div className="proof-author">
                                <div className="proof-av av-g">DS</div>
                                <div>
                                    <div className="proof-name">Dian Susanti</div>
                                    <div className="proof-biz">Beauty Clinic Dian · Surabaya</div>
                                </div>
                            </div>
                        </div>
                        <div className="proof-card">
                            <div className="proof-stars">★★★★★</div>
                            <p className="proof-text">"Setup-nya cepet banget, kurang dari setengah jam udah live. Link langsung saya taruh di bio IG, langsung ada yang booking. Simple dan profesional."</p>
                            <div className="proof-author">
                                <div className="proof-av av-b">RA</div>
                                <div>
                                    <div className="proof-name">Raka Aditya</div>
                                    <div className="proof-biz">Raka Barbershop · Bandung</div>
                                </div>
                            </div>
                        </div>
                        <div className="proof-card">
                            <div className="proof-stars">★★★★★</div>
                            <p className="proof-text">"Saya punya 4 terapis, dulu jadwal manual ribet banget. Sekarang masing-masing punya kalender sendiri, konflik jadwal nggak pernah terjadi lagi."</p>
                            <div className="proof-author">
                                <div className="proof-av av-o">NP</div>
                                <div>
                                    <div className="proof-name">Novi Pratiwi</div>
                                    <div className="proof-biz">Studio Pijat Novi · Yogyakarta</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <div className="cta-inner">
                    <h2>Siap buat usahamu lebih profesional?</h2>
                    <p>Bergabung dengan ratusan UMKM Indonesia yang sudah otomasi booking mereka dengan Njadwal.</p>
                    <div className="cta-buttons">
                        <Link href="/register" className="btn-white">Mulai Gratis 14 Hari</Link>
                        <a href="#cara-kerja" className="btn-outline-white">Lihat demo</a>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer>
                <div className="footer-inner">
                    <span className="footer-logo">Njadwal<span>.</span></span>
                    <ul className="footer-links">
                        <li><a href="#">Fitur</a></li>
                        <li><a href="#">Harga</a></li>
                        <li><a href="#">Tentang</a></li>
                        <li><a href="#">Kebijakan Privasi</a></li>
                        <li><a href="#">Kontak</a></li>
                    </ul>
                    <span className="footer-copy">© 2025 Njadwal. Dibuat dengan ❤️ untuk Indonesia.</span>
                </div>
            </footer>
        </div>
    );
}
