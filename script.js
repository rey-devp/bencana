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

// --- Helper Functions for UI Consistency ---

function getCategoryIcon(category) {
    switch (category) {
        case 'Tsunami':
            return 'fa-solid fa-water';
        case 'Earthquake':
            return 'fa-solid fa-house-crack';
        case 'Flood':
            return 'fa-solid fa-umbrella';
        case 'Volcanic Eruption':
            return 'fa-solid fa-fire';
        case 'Forest Fire':
            return 'fa-solid fa-tree';
        default:
            return 'fa-solid fa-circle-exclamation';
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

    // Setup Form Listener
    document.getElementById('disasterForm').addEventListener('submit', handleFormSubmit);
});

async function fetchAndRender() {
    disasters = await getDisasters();
    renderAll();
}

// --- PETA LEAFLET ---

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

// --- RENDER DATA ---

function renderAll() {
    const filterCategoryVal = document.getElementById('filterCategory').value;
    const filterStatusElement = document.getElementById('filterStatus');
    const filterStatusVal = filterStatusElement ? filterStatusElement.value : 'all';

    markersLayer.clearLayers();
    const listContainer = document.getElementById('disaster-list');
    listContainer.innerHTML = '';

    disasters.forEach(item => {
        const backendCategory = item.category;
        const statusBencana = item.status_bencana || 'Pasca Bencana';

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

// --- FORM HANDLING ---

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

// --- ACTIONS (CRUD Dinonaktifkan) ---

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