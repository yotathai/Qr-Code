import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc, writeBatch, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRcQzCZint9dAkzO73cy9EYgUS1pcjcvM",
  authDomain: "th-go-link.firebaseapp.com",
  projectId: "th-go-link",
  storageBucket: "th-go-link.firebasestorage.app",
  messagingSenderId: "816629073092",
  appId: "1:816629073092:web:6111f00bd629a2a0d9f591",
  measurementId: "G-3TXWT1LVLF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'yotathai@gmail.com';

// DOM Elements
const securityOverlay = document.getElementById('securityOverlay');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const adminUsersList = document.getElementById('adminUsersList');
const recentActivityList = document.getElementById('recentActivityList');

// KPI Elements
const kpiTotalUsers = document.getElementById('kpiTotalUsers');
const kpiTotalLinks = document.getElementById('kpiTotalLinks');
const kpiTotalQr = document.getElementById('kpiTotalQr');
const kpiTotalClicks = document.getElementById('kpiTotalClicks');

// Chart Instances
let growthChartInstance = null;
let modeChartInstance = null;

// Global Data Store
let globalUsersData = [];
let globalLinksData = [];

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        // Access Granted
        securityOverlay.classList.add('hidden');
        userProfile.classList.remove('hidden');
        userName.textContent = user.displayName;
        userAvatar.src = user.photoURL;
        
        loadAdminDashboard();
    } else {
        // Access Denied
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Access Denied)");
        window.location.href = "/";
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "/";
    });
});

// Setup Filter Buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const days = parseInt(e.target.getAttribute('data-days'));
        updateCharts(days);
    });
});

async function loadAdminDashboard() {
    try {
        // Fetch Users
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(query(usersRef, orderBy("lastLogin", "desc")));
        
        // Fetch Links
        const linksRef = collection(db, "shortlinks");
        const linksSnapshot = await getDocs(linksRef);
        
        let totalUsers = 0;
        let totalLinks = 0;
        let totalQr = 0;
        let totalClicks = 0;
        
        // Process Users Data
        usersSnapshot.forEach(doc => {
            totalUsers++;
            const data = doc.data();
            globalUsersData.push({
                id: doc.id,
                ...data,
                dateObj: data.lastLogin ? data.lastLogin.toDate() : new Date()
            });
        });
        
        // Process Links Data
        linksSnapshot.forEach(doc => {
            totalLinks++;
            const data = doc.data();
            
            if (data.mode === 'qr' || data.mode === 'both') totalQr++;
            if (data.clicks) totalClicks += data.clicks;
            
            globalLinksData.push({
                id: doc.id,
                ...data,
                dateObj: data.createdAt ? data.createdAt.toDate() : new Date()
            });
        });
        
        // Update KPIs
        kpiTotalUsers.textContent = totalUsers.toLocaleString();
        kpiTotalLinks.textContent = totalLinks.toLocaleString();
        kpiTotalQr.textContent = totalQr.toLocaleString();
        kpiTotalClicks.textContent = totalClicks.toLocaleString();
        
        // Sort Links by date desc for recent activity
        globalLinksData.sort((a, b) => b.dateObj - a.dateObj);
        
        // Render Components
        renderUserTable();
        renderRecentActivity();
        updateCharts(7); // Default to 7 days
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
}

function renderUserTable(searchTerm = "") {
    adminUsersList.innerHTML = '';
    
    // Count links per user
    let linkCounts = {};
    globalLinksData.forEach(link => {
        if (link.uid) {
            linkCounts[link.uid] = (linkCounts[link.uid] || 0) + 1;
        }
    });
    
    // Filter users
    const filteredUsers = globalUsersData.filter(user => {
        const term = searchTerm.toLowerCase();
        const nameMatch = user.displayName ? user.displayName.toLowerCase().includes(term) : false;
        const emailMatch = user.email ? user.email.toLowerCase().includes(term) : false;
        return nameMatch || emailMatch;
    });
    
    if (filteredUsers.length === 0) {
        adminUsersList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">ไม่พบผู้ใช้งาน</td></tr>';
        return;
    }
    
    filteredUsers.forEach(user => {
        const count = linkCounts[user.id] || 0;
        let lastLoginStr = "-";
        if (user.lastLogin) {
            const d = user.dateObj;
            lastLoginStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
        
        const tr = document.createElement('tr');
        if (user.banned) {
            tr.style.opacity = '0.5';
            tr.style.background = '#fee2e2';
        }
        
        tr.innerHTML = `
            <td style="text-align: center;">
                <img src="${user.photoURL || 'icon-192.png'}" class="admin-avatar" alt="Avatar">
            </td>
            <td>
                <div style="font-weight: 500; color: #111827;">${user.displayName || 'Unknown'} ${user.banned ? '<span style="color:red; font-size: 0.8rem;">(BANNED)</span>' : ''}</div>
                <div style="color: #6b7280; font-size: 0.85rem;">${user.email || '-'}</div>
            </td>
            <td style="text-align: center; font-weight: 600; color: var(--primary);">
                ${count.toLocaleString()}
            </td>
            <td style="color: #6b7280; font-size: 0.9rem;">
                ${lastLoginStr}
            </td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="admin-btn btn-view-links" data-uid="${user.id}" data-name="${user.displayName}" style="color: #0369a1; border-color: #7dd3fc; background: #f0f9ff;" title="ดูประวัติลิงก์">🔍 ดู</button>
                    ${user.banned ? '' : `<button class="admin-btn btn-ban" data-uid="${user.id}" style="color: #dc2626; border-color: #fca5a5; background: #fef2f2;" title="แบนผู้ใช้นี้">🚫 แบน</button>`}
                    <button class="admin-btn btn-delete-all" data-uid="${user.id}" style="color: #b91c1c; border-color: #f87171; background: #fff;" title="ลบลิงก์ทั้งหมด">🗑️ ลบ</button>
                </div>
            </td>
        `;
        adminUsersList.appendChild(tr);
    });
    
    // Attach Event Listeners for User Actions
    document.querySelectorAll('.btn-view-links').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const uid = e.target.getAttribute('data-uid');
            const name = e.target.getAttribute('data-name');
            openUserDetailsModal(uid, name);
        });
    });

    document.querySelectorAll('.btn-ban').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uid = e.target.getAttribute('data-uid');
            if (confirm("คุณแน่ใจหรือไม่ว่าต้องการระงับการใช้งาน (แบน) ผู้ใช้งานรายนี้?")) {
                try {
                    await updateDoc(doc(db, "users", uid), { banned: true });
                    alert("แบนผู้ใช้งานเรียบร้อยแล้ว");
                    window.location.reload();
                } catch(err) {
                    console.error(err);
                    alert("เกิดข้อผิดพลาดในการแบนผู้ใช้งาน");
                }
            }
        });
    });
    
    document.querySelectorAll('.btn-delete-all').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uid = e.target.getAttribute('data-uid');
            if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบ 'ลิงก์ทั้งหมด' ที่ผู้ใช้งานรายนี้สร้าง? (ไม่สามารถกู้คืนได้)")) {
                try {
                    const q = query(collection(db, "shortlinks"), where("uid", "==", uid));
                    const snapshot = await getDocs(q);
                    if (snapshot.empty) {
                        alert("ผู้ใช้นี้ยังไม่มีลิงก์");
                        return;
                    }
                    
                    const batch = writeBatch(db);
                    snapshot.forEach(d => {
                        batch.delete(d.ref);
                    });
                    
                    await batch.commit();
                    alert(`ลบลิงก์ทั้งหมด ${snapshot.size} รายการ เรียบร้อยแล้ว`);
                    window.location.reload();
                } catch(err) {
                    console.error(err);
                    alert("เกิดข้อผิดพลาดในการลบลิงก์");
                }
            }
        });
    });
}

// Search Functionality
const searchInput = document.getElementById('userSearchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        renderUserTable(e.target.value);
    });
}

// Modal Logic
const modal = document.getElementById('userDetailsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalUserLinksList = document.getElementById('modalUserLinksList');
const modalUserName = document.getElementById('modalUserName');

function openUserDetailsModal(uid, name) {
    modalUserName.textContent = `ประวัติการสร้างลิงก์ของ: ${name || 'Unknown'}`;
    modalUserLinksList.innerHTML = '';
    
    const userLinks = globalLinksData.filter(link => link.uid === uid);
    
    if (userLinks.length === 0) {
        modalUserLinksList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">ยังไม่มีประวัติการสร้างลิงก์</td></tr>';
    } else {
        // Sort descending by date
        userLinks.sort((a, b) => b.dateObj - a.dateObj);
        
        userLinks.forEach(link => {
            const d = link.dateObj;
            const timeStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
            
            let typeBadge = '';
            if (link.mode === 'shortlink') typeBadge = '🔗 ลิงก์ย่อ';
            else if (link.mode === 'qr') typeBadge = '📱 คิวอาร์';
            else typeBadge = '🔥 ลิงก์+คิวอาร์';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size: 0.85rem; color: #6b7280;">${timeStr}</td>
                <td style="font-size: 0.85rem;">${typeBadge}</td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">
                    <a href="${link.originalUrl}" target="_blank" style="color: #6b7280;">${link.originalUrl}</a>
                </td>
                <td style="font-size: 0.85rem;">
                    <a href="https://th-go.link/${link.alias}" target="_blank" style="color: var(--primary); font-weight: 600; text-decoration: none;">/${link.alias}</a>
                </td>
                <td style="text-align: center; font-size: 0.9rem; font-weight: 500;">${link.clicks || 0}</td>
                <td style="text-align: center;">
                    <button class="admin-btn btn-delete-single-link" data-id="${link.id}" style="padding: 2px 6px; font-size: 0.75rem; color: #b91c1c; border-color: #f87171; background: #fff;" title="ลบลิงก์นี้">ลบ</button>
                </td>
            `;
            modalUserLinksList.appendChild(tr);
        });
        
        // Attach delete to these buttons
        modalUserLinksList.querySelectorAll('.btn-delete-single-link').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm("ลบลิงก์นี้ใช่หรือไม่?")) {
                    try {
                        await deleteDoc(doc(db, "shortlinks", id));
                        e.target.closest('tr').remove();
                        // Optional: update global data
                        globalLinksData = globalLinksData.filter(l => l.id !== id);
                        renderUserTable(searchInput.value);
                        renderRecentActivity();
                    } catch (err) {
                        console.error(err);
                        alert("เกิดข้อผิดพลาด");
                    }
                }
            });
        });
    }
    
    modal.classList.remove('hidden');
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function renderRecentActivity() {
    recentActivityList.innerHTML = '';
    
    const recent = globalLinksData.slice(0, 10); // Take top 10
    
    if (recent.length === 0) {
        recentActivityList.innerHTML = '<div style="text-align: center; padding: 30px; color: #6b7280;">ยังไม่มีความเคลื่อนไหว</div>';
        return;
    }
    
    recent.forEach(link => {
        // Find user
        const user = globalUsersData.find(u => u.id === link.uid) || { displayName: 'ผู้ใช้ทั่วไป', photoURL: 'icon-192.png' };
        
        let typeBadge = '';
        if (link.mode === 'shortlink') typeBadge = '🔗 สร้างลิงก์ย่อ';
        else if (link.mode === 'qr') typeBadge = '📱 สร้างคิวอาร์โค้ด';
        else typeBadge = '🔥 สร้างลิงก์+คิวอาร์';
        
        const d = link.dateObj;
        const timeStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
        
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <img src="${user.photoURL}" class="activity-avatar" alt="Avatar" onerror="this.src='icon-192.png'">
            <div class="activity-content">
                <p class="activity-title" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span><strong>${user.displayName}</strong> ${typeBadge}</span>
                    <button class="admin-btn btn-delete-link" data-id="${link.id}" style="padding: 2px 6px; font-size: 0.75rem; color: #b91c1c; border-color: #f87171; background: #fff;" title="ลบลิงก์นี้">🗑️ ลบ</button>
                </p>
                <div style="margin: 5px 0;">
                    <a href="https://th-go.link/${link.alias}" target="_blank" style="color: var(--primary); font-size: 0.9rem; text-decoration: none; font-weight: 600;">th-go.link/${link.alias}</a>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">
                        🎯 ปลายทาง: <a href="${link.originalUrl}" target="_blank" style="color: #6b7280;">${link.originalUrl}</a>
                    </div>
                </div>
                <p class="activity-time">${timeStr}</p>
            </div>
        `;
        recentActivityList.appendChild(div);
    });
    
    // Attach Event Listeners for Link Delete
    document.querySelectorAll('.btn-delete-link').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบลิงก์นี้? (ไม่สามารถกู้คืนได้)")) {
                try {
                    await deleteDoc(doc(db, "shortlinks", id));
                    alert("ลบลิงก์เรียบร้อยแล้ว");
                    window.location.reload();
                } catch(err) {
                    console.error(err);
                    alert("เกิดข้อผิดพลาดในการลบลิงก์");
                }
            }
        });
    });
}

function updateCharts(daysToLookBack) {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysToLookBack);
    
    // Grouping by Date string (YYYY-MM-DD or YYYY-MM)
    const isYearly = daysToLookBack > 60;
    
    let labels = [];
    let usersDataMap = {};
    let linksDataMap = {};
    let modesCount = { shortlink: 0, qr: 0, both: 0 };
    
    // Generate Labels
    if (isYearly) {
        // Generate months for the current year
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), i, 1);
            const label = d.toLocaleString('th-TH', { month: 'short' });
            labels.push(label);
            usersDataMap[label] = 0;
            linksDataMap[label] = 0;
        }
    } else {
        // Generate daily labels
        for (let i = daysToLookBack - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const label = `${d.getDate()} ${d.toLocaleString('th-TH', { month: 'short' })}`;
            labels.push(label);
            usersDataMap[label] = 0;
            linksDataMap[label] = 0;
        }
    }
    
    // Fill Users Data
    globalUsersData.forEach(user => {
        if (user.dateObj >= cutoffDate || isYearly && user.dateObj.getFullYear() === now.getFullYear()) {
            const label = isYearly 
                ? user.dateObj.toLocaleString('th-TH', { month: 'short' })
                : `${user.dateObj.getDate()} ${user.dateObj.toLocaleString('th-TH', { month: 'short' })}`;
            
            if (usersDataMap[label] !== undefined) {
                usersDataMap[label]++;
            }
        }
    });
    
    // Fill Links Data
    globalLinksData.forEach(link => {
        if (link.dateObj >= cutoffDate || isYearly && link.dateObj.getFullYear() === now.getFullYear()) {
            const label = isYearly 
                ? link.dateObj.toLocaleString('th-TH', { month: 'short' })
                : `${link.dateObj.getDate()} ${link.dateObj.toLocaleString('th-TH', { month: 'short' })}`;
            
            if (linksDataMap[label] !== undefined) {
                linksDataMap[label]++;
            }
            
            // Mode count
            if (link.mode) modesCount[link.mode] = (modesCount[link.mode] || 0) + 1;
        }
    });
    
    const usersDataset = labels.map(l => usersDataMap[l]);
    const linksDataset = labels.map(l => linksDataMap[l]);
    
    renderGrowthChart(labels, usersDataset, linksDataset);
    renderModeChart(modesCount);
}

function renderGrowthChart(labels, usersData, linksData) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    if (growthChartInstance) {
        growthChartInstance.destroy();
    }
    
    growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ลิงก์ที่ถูกสร้างใหม่',
                    data: linksData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'ผู้ใช้เข้าสู่ระบบ',
                    data: usersData,
                    type: 'bar',
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function renderModeChart(modesCount) {
    const ctx = document.getElementById('modeChart').getContext('2d');
    
    if (modeChartInstance) {
        modeChartInstance.destroy();
    }
    
    modeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['ลิงก์ย่ออย่างเดียว', 'QR Code อย่างเดียว', 'ทั้งสองอย่าง'],
            datasets: [{
                data: [modesCount.shortlink || 0, modesCount.qr || 0, modesCount.both || 0],
                backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}
