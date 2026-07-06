import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

function renderUserTable() {
    adminUsersList.innerHTML = '';
    
    // Count links per user
    let linkCounts = {};
    globalLinksData.forEach(link => {
        if (link.uid) {
            linkCounts[link.uid] = (linkCounts[link.uid] || 0) + 1;
        }
    });
    
    if (globalUsersData.length === 0) {
        adminUsersList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">ยังไม่มีผู้ใช้งาน</td></tr>';
        return;
    }
    
    globalUsersData.forEach(user => {
        const count = linkCounts[user.id] || 0;
        let lastLoginStr = "-";
        if (user.lastLogin) {
            const d = user.dateObj;
            lastLoginStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">
                <img src="${user.photoURL || 'icon-192.png'}" class="admin-avatar" alt="Avatar">
            </td>
            <td>
                <div style="font-weight: 500; color: #111827;">${user.displayName || 'Unknown'}</div>
                <div style="color: #6b7280; font-size: 0.85rem;">${user.email || '-'}</div>
            </td>
            <td style="text-align: center; font-weight: 600; color: var(--primary);">
                ${count.toLocaleString()}
            </td>
            <td style="color: #6b7280; font-size: 0.9rem;">
                ${lastLoginStr}
            </td>
        `;
        adminUsersList.appendChild(tr);
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
                <p class="activity-title"><strong>${user.displayName}</strong> ${typeBadge}</p>
                <a href="https://th-go.link/${link.id}" target="_blank" style="color: var(--primary); font-size: 0.85rem; text-decoration: none;">th-go.link/${link.id}</a>
                <p class="activity-time">${timeStr}</p>
            </div>
        `;
        recentActivityList.appendChild(div);
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
