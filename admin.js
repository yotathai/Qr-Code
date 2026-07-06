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
const totalUsersStat = document.getElementById('totalUsersStat');
const totalLinksStat = document.getElementById('totalLinksStat');

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

async function loadAdminDashboard() {
    try {
        // Fetch all users
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(query(usersRef, orderBy("lastLogin", "desc")));
        
        // Fetch all shortlinks to count per user
        const linksRef = collection(db, "shortlinks");
        const linksSnapshot = await getDocs(linksRef);
        
        let linkCounts = {};
        let totalLinks = 0;
        
        linksSnapshot.forEach(doc => {
            totalLinks++;
            const data = doc.data();
            const uid = data.uid;
            if (uid) {
                linkCounts[uid] = (linkCounts[uid] || 0) + 1;
            }
        });
        
        totalUsersStat.textContent = usersSnapshot.size.toLocaleString();
        totalLinksStat.textContent = totalLinks.toLocaleString();
        
        adminUsersList.innerHTML = '';
        
        if (usersSnapshot.empty) {
            adminUsersList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">ยังไม่มีผู้ใช้งาน</td></tr>';
            return;
        }
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const uid = doc.id;
            const count = linkCounts[uid] || 0;
            
            let lastLoginStr = "-";
            if (data.lastLogin) {
                const d = data.lastLogin.toDate();
                lastLoginStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">
                    <img src="${data.photoURL || 'icon-192.png'}" class="admin-avatar" alt="Avatar">
                </td>
                <td>
                    <div style="font-weight: 500; color: #111827;">${data.displayName || 'Unknown'}</div>
                </td>
                <td>
                    <div style="color: #6b7280; font-size: 0.9rem;">${data.email || '-'}</div>
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
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
        adminUsersList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}
