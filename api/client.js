// api/client.js

const BASE_URL = "https://bencana-express.vercel.app/disasters";

// 1. GET ALL
export async function getDisasters() {
    try {
        const response = await fetch(BASE_URL);
        if (!response.ok) throw new Error("Gagal mengambil data");
        return await response.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

// 2. CREATE (POST)
export async function createDisaster(data) {
    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal menyimpan data");
        }
        return await response.json();
    } catch (error) {
        alert(error.message);
        throw error;
    }
}

// 3. UPDATE (PUT)
export async function updateDisaster(id, data) {
    try {
        const response = await fetch(`${BASE_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal update data");
        }
        return await response.json();
    } catch (error) {
        alert(error.message);
        throw error;
    }
}

// 4. DELETE
export async function deleteDisaster(id) {
    try {
        const response = await fetch(`${BASE_URL}/${id}`, {
            method: "DELETE",
        });
        if (!response.ok) throw new Error("Gagal menghapus data");
        return true;
    } catch (error) {
        console.error("Error deleting data:", error);
        return false;
    }
}