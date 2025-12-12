// script.js

// Import fungsi API (Pastikan api/client.js ada)
import { getDisasters, createDisaster, updateDisaster, deleteDisaster } from './api/client.js';

// --- KONFIGURASI WARNA & KATEGORI (KEY HARUS SESUAI DENGAN BACKEND/DATA JSON) ---
const categoryColors = {
    "Tsunami": "#4361ee",
    "Earthquake": "#ffc300",
    "Flood": "#2ec4b6",
    "Volcanic Eruption": "#ef233c",
    "Forest Fire": "#fb3600ff",
    "Lainnya": "#8d99ae"
};

let map;
let markersLayer;
let disasters = []; // State lokal untuk menyimpan data dari API
let isEditing = false;
let isModalOpen = false;
let carouselInterval; // Variabel global untuk timer carousel

// --- DATA DASHBOARD BARU (Hardcoded sesuai request) ---

// 1. Data Korban Spesifik
const specificVictimData = [
    {
        title: "Banjir Bandang & Longsor Sumatera (Desember 2025)",
        location: "Sumatera Utara, Sumatera Barat, Aceh",
        dead: 990,
        missing: 222,
        displaced: 15400,
        source: "BNPB & Detik.com",
        last_updated: "12 Des 2025"
    },
    {
        title: "Banjir Aceh Tamiang & Aceh Utara",
        location: "Provinsi Aceh",
        dead: 12,
        missing: 5,
        displaced: 3500,
        source: "BPBD Aceh",
        last_updated: "Hari Ini"
    }
];

// 2. Data Video YouTube (SUDAH DIPERBARUI)
const youtubeVideos = [
    { id: "1OSJ7ig3gi4", title: "Liputan Bencana 1" },
    { id: "RKt6xj2Em7M", title: "Liputan Bencana 2" },
    { id: "STPqkiss_w0", title: "Live Streaming Bencana" }
];

// 3. Link Donasi Asli (SUDAH DIPERBARUI)
const donationLinks = [
    {
        name: "Kitabisa - Jelajahi Semua Donasi",
        url: "https://kitabisa.com/explore/all",
        icon: "fa-solid fa-hand-holding-heart"
    }
];


// --- Helper Functions for UI Consistency ---

function getCategoryIcon(category) {
    switch (category) {
        case 'Tsunami': return 'fa-solid fa-water';
        case 'Earthquake': return 'fa-solid fa-house-crack';
        case 'Flood': return 'fa-solid fa-umbrella';
        case 'Volcanic Eruption': return 'fa-solid fa-fire';
        case 'Forest Fire': return 'fa-solid fa-tree';
        default: return 'fa-solid fa-circle-exclamation';
    }
}

function getUICategoryName(category) {
    switch (category) {
        case 'Earthquake': return 'Gempa Bumi';
        case 'Flood': return 'Banjir';
        case 'Volcanic Eruption': return 'Gunung Meletus';
        case 'Forest Fire': return 'Kebakaran Hutan';
        default: return category;
    }
}

// --- FUNGSI NAVIGASI BARU ---

/**
 * Berpindah tampilan antara Map View dan Dashboard View.
 * @param {string} viewId - 'map-view' atau 'dashboard-view'
 */
window.switchView = function (viewId) {
    const mapView = document.getElementById('map-view');
    const dashboardView = document.getElementById('dashboard-view');
    const mapSidebarContent = document.getElementById('map-sidebar-content');
    const navButtons = document.querySelectorAll('.btn-nav');

    // 1. Update Class Tampilan Utama
    mapView.classList.remove('active');
    dashboardView.classList.remove('active');

    // 2. Tampilkan View yang dipilih
    document.getElementById(viewId).classList.add('active');

    // 3. Update Status Tombol Navigasi
    navButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.btn-nav[onclick="switchView('${viewId}')"]`).classList.add('active');

    // 4. Update Sidebar Content: Hanya tampilkan filter/list saat di PETA
    if (viewId === 'map-view') {
        mapSidebarContent.classList.add('active');
        // Pastikan peta menyesuaikan ukuran
        map.invalidateSize();
    } else {
        mapSidebarContent.classList.remove('active');
        // Render ulang dashboard saat masuk ke halaman Berita
        renderDashboard();
    }
};


// --- INISIALISASI ---

// Assign fungsi global ke window
window.openModal = openModal;
window.closeModal = closeModal;
window.filterData = filterData;
window.panTo = panTo;
window.prepareEdit = prepareEdit;
window.removeData = removeData;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchAndRender();

    // Inisialisasi Dashboard agar siap (meski tidak langsung ditampilkan)
    renderDashboard();

    // Setup Form Listener
    document.getElementById('disasterForm').addEventListener('submit', handleFormSubmit);
});

async function fetchAndRender() {
    disasters = await getDisasters();
    renderAll();
}

// --- PETA LEAFLET (SAMA SEPERTI SEBELUMNYA) ---

function initMap() {
    map = L.map('map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20
    }).addTo(map);

    markersLayer = new L.LayerGroup().addTo(map);

    // LOGIKA BARU: Double-click pada peta akan membuka modal dan mengisi koordinat
    map.on('dblclick', function (e) {
        if (!isEditing) {
            document.getElementById('inputLat').value = e.latlng.lat.toFixed(6);
            document.getElementById('inputLng').value = e.latlng.lng.toFixed(6);
            openModal(); // Membuka modal setelah koordinat diisi
        }
    });

    addLegend();
}

// --- FUNGSI RENDER DASHBOARD (BARU) ---

function renderDashboard() {
    const dashboardContainer = document.getElementById('dashboard-content');
    if (!dashboardContainer) return; // Exit jika container tidak ditemukan

    dashboardContainer.innerHTML = '';

    // --- BAGIAN 1: DATA KORBAN (Statistik) ---
    let victimHTML = `<h3 style="border-left: 5px solid #ef233c; padding-left:10px; margin-top: 0;">Data Korban Terdampak</h3>`;

    specificVictimData.forEach(data => {
        victimHTML += `
        <div class="victim-card">
            <div class="victim-header">
                <span><i class="fa-solid fa-triangle-exclamation"></i> ${data.title}</span>
                <small style="font-weight:normal"><i class="fa-regular fa-clock"></i> Update: ${data.last_updated}</small>
            </div>
            <div class="victim-stats-row">
                <div class="v-stat">
                    <h2 class="color-dead">${data.dead}</h2>
                    <p>Meninggal Dunia</p>
                </div>
                <div class="v-stat">
                    <h2 class="color-missing">${data.missing}</h2>
                    <p>Hilang</p>
                </div>
                <div class="v-stat">
                    <h2 class="color-displaced">${data.displaced.toLocaleString()}</h2>
                    <p>Mengungsi</p>
                </div>
            </div>
            <div style="background:#f9f9f9; padding:10px 20px; text-align:right; font-size:0.8em; color:#777; border-top: 1px solid #eee; border-radius: 0 0 12px 12px;">
                Sumber: ${data.source}
            </div>
        </div>`;
    });
    dashboardContainer.innerHTML += victimHTML;


    // --- BAGIAN 2: YOUTUBE CAROUSEL (Bergerak Otomatis) ---
    let carouselHTML = `
        <h3 style="margin-top: 40px; border-left: 5px solid #ffc300; padding-left:10px;">Berita Terkini (Video)</h3>
        <div class="carousel-wrapper">
            <div class="carousel-track" id="carouselTrack">
    `;

    youtubeVideos.forEach(video => {
        carouselHTML += `
            <div class="carousel-slide">
                <iframe class="youtube-embed"
                    src="https://www.youtube.com/embed/${video.id}?enablejsapi=1&autoplay=0"
                    title="${video.title}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        `;
    });

    carouselHTML += `
            </div>
        </div>
        <div class="carousel-indicators" id="carouselIndicators"></div>
    `;
    dashboardContainer.innerHTML += carouselHTML;

    // Panggil Logika Carousel setelah DOM terisi
    setTimeout(initCarousel, 100);


    // --- BAGIAN 3: LINK DONASI (Redirect) ---
    let donationHTML = `
        <h3 style="margin-top: 40px; border-left: 5px solid #2ec4b6; padding-left:10px;">Salurkan Bantuan</h3>
        <p>Pilih lembaga terpercaya di bawah ini untuk berdonasi langsung:</p>
        <div class="donation-grid">
    `;

    donationLinks.forEach(link => {
        donationHTML += `
            <a href="${link.url}" target="_blank" class="donation-card">
                <div class="donation-logo">
                    <i class="${link.icon}"></i>
                </div>
                <div class="donation-name">${link.name}</div>
                <div class="btn-donate-action">Donasi Sekarang <i class="fa-solid fa-arrow-right"></i></div>
            </a>
        `;
    });
    donationHTML += `</div><br><br>`; // Spacer bawah
    dashboardContainer.innerHTML += donationHTML;
}

// --- LOGIKA CAROUSEL OTOMATIS (BARU) ---

function initCarousel() {
    const track = document.getElementById('carouselTrack');
    const indicatorsContainer = document.getElementById('carouselIndicators');

    if (!track || youtubeVideos.length === 0) return;

    const slides = track.querySelectorAll('.carousel-slide');
    let currentIndex = 0;
    const totalSlides = slides.length;

    // Bersihkan interval lama jika ada (penting untuk menghindari duplikasi timer)
    if (carouselInterval) clearInterval(carouselInterval);

    // Buat Indikator (Titik-titik)
    indicatorsContainer.innerHTML = '';
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.onclick = () => goToSlide(index);
        indicatorsContainer.appendChild(dot);
    });

    function updateDots() {
        const dots = document.querySelectorAll('#carouselIndicators .dot');
        dots.forEach(d => d.classList.remove('active'));
        if (dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    function goToSlide(index) {
        currentIndex = index;
        // Gunakan persentase untuk pergeseran
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        updateDots();
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalSlides;
        goToSlide(currentIndex);
    }

    // Set Interval Otomatis (Bergerak setiap 5 detik)
    carouselInterval = setInterval(nextSlide, 5000);

    // Tambahkan event listener agar carousel berhenti saat di-hover
    track.addEventListener('mouseenter', () => clearInterval(carouselInterval));
    track.addEventListener('mouseleave', () => carouselInterval = setInterval(nextSlide, 5000));
}


// --- RENDER DATA PETA (SAMA, HANYA DIPASTIKAN MEMANGGIL STATUS BARU) ---

function renderAll() {
    const filterCategoryVal = document.getElementById('filterCategory').value;
    const filterStatusElement = document.getElementById('filterStatus');
    const filterStatusVal = filterStatusElement ? filterStatusElement.value : 'all';

    markersLayer.clearLayers();
    const listContainer = document.getElementById('disaster-list');
    listContainer.innerHTML = '';

    disasters.forEach(item => {
        const backendCategory = item.category;
        // Ambil status_bencana yang baru ditambahkan
        const statusBencana = item.status_bencana || 'Lama';

        const uiName = getUICategoryName(backendCategory);
        const color = categoryColors[backendCategory] || categoryColors["Lainnya"];
        const iconClass = getCategoryIcon(backendCategory);

        let passesCategoryFilter = (filterCategoryVal === 'all' || backendCategory === filterCategoryVal);
        let passesStatusFilter = (filterStatusVal === 'all' || statusBencana === filterStatusVal);

        if (!passesCategoryFilter || !passesStatusFilter) return;

        const lng = item.location.coordinates[0];
        const lat = item.location.coordinates[1];

        // 1. Marker
        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        marker.bindPopup(`
            <div style="text-align:center">
                <strong style="color:${color}">${uiName}</strong><br>
                <b>${item.name}</b><br>
                ${item.description}
                <small>Status: ${statusBencana}</small>
            </div>
        `);
        markersLayer.addLayer(marker);

        // 2. Sidebar Card
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeftColor = color;

        const statusDisplay = (statusBencana === 'Terkini') ?
            `<span style="color: #ef233c; font-size: 0.8em; margin-left: 10px; font-weight: 600;">(TERKINI)</span>` : '';


        card.innerHTML = `
            <h4>${item.name} ${statusDisplay}</h4>
            <span class="category-badge" style="background-color:${color}"><i class="${iconClass}"></i> ${uiName}</span>
            <p>${item.description}</p>
            <div class="card-actions">
                <button class="btn-locate" onclick="panTo(${lat}, ${lng})"><i class="fa-solid fa-eye"></i> Lihat</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// --- FORM HANDLING (SAMA) ---

function openModal() {
    document.getElementById('formModal').style.display = 'block';
    isModalOpen = true;

    isEditing = false;

    // Hanya mereset input non-koordinat, agar koordinat dari dblclick tidak hilang.
    document.getElementById('inputName').value = '';
    document.getElementById('inputCategory').value = 'Tsunami'; // Default Category
    document.getElementById('inputDesc').value = '';
    // BARU: Set default status saat membuka modal
    document.getElementById('inputStatusBencana').value = 'Terkini';
    document.getElementById('inputId').value = "";

    document.getElementById('modalTitle').innerText = "Tambah Data Bencana Terkini";
}

function closeModal() {
    document.getElementById('formModal').style.display = 'none';
    isModalOpen = false;
    isEditing = false;
    document.getElementById('disasterForm').reset();
}

window.onclick = function (event) {
    const modal = document.getElementById('formModal');
    if (event.target == modal) closeModal();
}

async function handleFormSubmit(e) {
    e.preventDefault();

    // Siapkan Payload termasuk status_bencana BARU
    const payload = {
        name: document.getElementById('inputName').value,
        category: document.getElementById('inputCategory').value,
        description: document.getElementById('inputDesc').value,
        latitude: parseFloat(document.getElementById('inputLat').value),
        longitude: parseFloat(document.getElementById('inputLng').value),
        status_bencana: document.getElementById('inputStatusBencana').value // AMBIL NILAI BARU
    };

    if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
        // Ganti alert() dengan SweetAlert
        Swal.fire({
            icon: 'warning',
            title: 'Lokasi Belum Dipilih',
            text: 'Silakan klik dua kali pada peta atau isi koordinat untuk menentukan lokasi!',
        });
        return;
    }

    const btnSave = document.querySelector('.btn-save');
    const oldText = btnSave.innerText;
    btnSave.innerText = "Menyimpan...";
    btnSave.disabled = true;

    try {
        if (isEditing) {
            // Logika Update diblokir
            console.warn("Fungsi Update diblokir di mode Read-Only.");
            return;
        } else {
            // --- CREATE KE API ---
            await createDisaster(payload);
        }

        closeModal();
        await fetchAndRender();

        // SweetAlert Sukses
        Swal.fire({
            icon: 'success',
            title: 'Data Tersimpan!',
            text: 'Data bencana baru telah berhasil ditambahkan.',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error(error);
        // SweetAlert Error
        Swal.fire({
            icon: 'error',
            title: 'Gagal Menyimpan',
            text: 'Terjadi kesalahan saat menyimpan data. Cek koneksi API Anda.',
        });
    } finally {
        btnSave.innerText = oldText;
        btnSave.disabled = false;
    }
}

// --- ACTIONS (SAMA) ---

function prepareEdit(id) {
    console.log("Edit dinonaktifkan di mode ini.");
}

async function removeData(id) {
    console.log("Delete dinonaktifkan di mode ini.");
}

function panTo(lat, lng) {
    map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
}

function filterData() {
    renderAll();
}

function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += "<strong>Kategori</strong><br>";
        for (const key in categoryColors) {
            const uiName = getUICategoryName(key);
            const iconClass = getCategoryIcon(key);
            div.innerHTML +=
                `<div style="margin-top:5px;"><i style="background:${categoryColors[key]}"></i> <i class="${iconClass}" style="color:${categoryColors[key]}"></i> ${uiName}</div>`;
        }
        return div;
    };
    legend.addTo(map);
}