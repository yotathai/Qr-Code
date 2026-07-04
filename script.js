import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, limit, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentMode = 'shortlink'; // 'both', 'shortlink', 'qrcode'

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// DOM Elements
const authLoader = document.getElementById('authLoader');
const loginSection = document.getElementById('loginSection');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const themeBtns = document.querySelectorAll('.theme-circle');
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('selectedTheme', theme);
    });
});

// Load saved theme (default to light-orange)
const savedTheme = localStorage.getItem('selectedTheme') || 'light-orange';
document.documentElement.setAttribute('data-theme', savedTheme);


const authRequiredBanner = document.getElementById('authRequiredBanner');
const longUrlInput = document.getElementById('longUrl');
const customAliasInput = document.getElementById('customAlias');
const enableCustomAlias = document.getElementById('enableCustomAlias');
const aliasWrapper = document.getElementById('aliasWrapper');
const aliasHelper = document.getElementById('aliasHelper');
const qrColorInput = document.getElementById('qrColor');
const qrBgColorInput = document.getElementById('qrBgColor');
const qrLogoInput = document.getElementById('qrLogo');
const logoPreviewContainer = document.getElementById('logoPreviewContainer');
const logoPreview = document.getElementById('logoPreview');
const removeLogoBtn = document.getElementById('removeLogoBtn');
const generateBtn = document.getElementById('generateBtn');

const modeBtns = document.querySelectorAll('.mode-btn');
const qrOptionsPanel = document.getElementById('qrOptionsPanel');
const aliasGroup = document.getElementById('aliasGroup');

const resultContainer = document.getElementById('resultContainer');
const shortlinkResult = document.getElementById('shortlinkResult');
const qrResult = document.getElementById('qrResult');
const finalShortlink = document.getElementById('finalShortlink');
const qrCanvas = document.getElementById('qrCanvas');
const copyBtn = document.getElementById('copyBtn');
const downloadQrBtn = document.getElementById('downloadQrBtn');

const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const historyContentContainer = document.getElementById('historyContentContainer');

if (toggleHistoryBtn && historyContentContainer) {
    toggleHistoryBtn.addEventListener('click', () => {
        historyContentContainer.classList.toggle('hidden');
        if (historyContentContainer.classList.contains('hidden')) {
            toggleHistoryBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> แสดงประวัติ';
        } else {
            toggleHistoryBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg> ซ่อนประวัติ';
        }
    });
}

// Mode Selection
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!currentUser) return; // Must be logged in to change modes
        
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        if (currentMode === 'shortlink') {
            qrOptionsPanel.classList.add('hidden');
            aliasGroup.classList.remove('hidden');
        } else if (currentMode === 'qrcode') {
            qrOptionsPanel.classList.remove('hidden');
            aliasGroup.classList.add('hidden');
        } else {
            qrOptionsPanel.classList.remove('hidden');
            aliasGroup.classList.remove('hidden');
        }
    });
});

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    authLoader.classList.add('hidden');
    
    if (user) {
        currentUser = user;
        loginSection.classList.add('hidden');
        userProfile.classList.remove('hidden');
        userName.textContent = user.displayName;
        userAvatar.src = user.photoURL;
        
        authRequiredBanner.classList.add('hidden');
        
        // Enable inputs
        longUrlInput.disabled = false;
        customAliasInput.disabled = false;
        enableCustomAlias.disabled = false;
        qrColorInput.disabled = false;
        qrBgColorInput.disabled = false;
        qrLogoInput.disabled = false;
        generateBtn.disabled = false;
        
        // Reset checkbox state
        enableCustomAlias.checked = false;
        aliasWrapper.classList.add('hidden');
        aliasHelper.classList.add('hidden');
        customAliasInput.value = generateRandomString(6);
        
        historySection.classList.remove('hidden');
        loadHistory();
    } else {
        currentUser = null;
        loginSection.classList.remove('hidden');
        userProfile.classList.add('hidden');
        
        authRequiredBanner.classList.remove('hidden');
        historySection.classList.add('hidden');
        resultContainer.classList.add('hidden');
        
        // Disable inputs
        longUrlInput.disabled = true;
        customAliasInput.disabled = true;
        enableCustomAlias.disabled = true;
        qrColorInput.disabled = true;
        qrBgColorInput.disabled = true;
        qrLogoInput.disabled = true;
        generateBtn.disabled = true;
    }
});

// Custom Alias Checkbox Logic
enableCustomAlias.addEventListener('change', (e) => {
    if (e.target.checked) {
        aliasWrapper.classList.remove('hidden');
        aliasHelper.classList.remove('hidden');
        customAliasInput.value = '';
        customAliasInput.focus();
    } else {
        aliasWrapper.classList.add('hidden');
        aliasHelper.classList.add('hidden');
        customAliasInput.value = generateRandomString(6);
    }
});

// Clear result when input is empty
longUrlInput.addEventListener('input', (e) => {
    if (e.target.value.trim() === '') {
        resultContainer.classList.add('hidden');
    }
});

// Login / Logout
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => {
        console.error("Login Error:", error);
        alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Logo Preview Logic
qrLogoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        logoPreview.src = URL.createObjectURL(file);
        logoPreviewContainer.classList.remove('hidden');
    } else {
        logoPreviewContainer.classList.add('hidden');
        logoPreview.src = '';
    }
});

removeLogoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    qrLogoInput.value = ''; 
    logoPreviewContainer.classList.add('hidden');
    logoPreview.src = '';
});

// Generate Button Click
generateBtn.addEventListener('click', async () => {
    const longUrl = longUrlInput.value.trim();
    if (!longUrl) {
        alert("กรุณาระบุลิงก์ต้นทาง");
        return;
    }
    
    if (!longUrl.startsWith('http://') && !longUrl.startsWith('https://')) {
        alert("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://");
        return;
    }

    const customAlias = customAliasInput.value.trim();
    let aliasToUse = customAlias;
    
    generateBtn.disabled = true;
    generateBtn.textContent = "กำลังประมวลผล...";
    
    try {
        if (!aliasToUse) {
            aliasToUse = generateRandomString(6);
        } else {
            if (aliasToUse.length < 4) {
                alert("ชื่อลิงก์ต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
                generateBtn.disabled = false;
                generateBtn.textContent = "สร้างลิงก์และ QR Code";
                return;
            }
            if (!/^[a-zA-Z0-9-]+$/.test(aliasToUse)) {
                alert("ชื่อลิงก์สามารถใช้ได้แค่ตัวอักษรภาษาอังกฤษ ตัวเลข และขีดกลาง (-) เท่านั้นครับ");
                generateBtn.disabled = false;
                generateBtn.textContent = "สร้างลิงก์และ QR Code";
                return;
            }
        }
        
        // Check alias availability
        const q = query(collection(db, "shortlinks"), where("alias", "==", aliasToUse));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            alert("ชื่อลิงก์นี้ถูกใช้งานแล้ว กรุณาเปลี่ยนใหม่");
            generateBtn.disabled = false;
            generateBtn.textContent = "สร้างลิงก์และ QR Code";
            return;
        }
        
        // Save to Firestore (Always save alias so QR code is clean and trackable)
        await addDoc(collection(db, "shortlinks"), {
            uid: currentUser.uid,
            originalUrl: longUrl,
            alias: aliasToUse,
            mode: currentMode,
            clicks: 0,
            createdAt: new Date()
        });
        
        showResult(longUrl, aliasToUse);
        loadHistory();
        
        longUrlInput.value = '';
        
        // Reset alias
        enableCustomAlias.checked = false;
        aliasWrapper.classList.add('hidden');
        aliasHelper.classList.add('hidden');
        customAliasInput.value = generateRandomString(6);
        
        qrLogoInput.value = '';
        logoPreviewContainer.classList.add('hidden');
        logoPreview.src = '';
        
    } catch (error) {
        console.error("Generate Error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
    
    generateBtn.disabled = false;
    generateBtn.textContent = "สร้างลิงก์และ QR Code";
});

// Show Result and Generate QR
async function showResult(longUrl, alias) {
    resultContainer.classList.remove('hidden');
    
    // Handle Shortlink UI
    if (currentMode === 'shortlink' || currentMode === 'both') {
        shortlinkResult.classList.remove('hidden');
        const shortUrl = window.location.origin + '/' + alias;
        finalShortlink.textContent = shortUrl;
        finalShortlink.href = shortUrl;
    } else {
        shortlinkResult.classList.add('hidden');
    }
    
    // Handle QR UI
    if (currentMode === 'qrcode' || currentMode === 'both') {
        qrResult.classList.remove('hidden');
        
        // ALWAYS point QR to shortlink so that it's clean and never messy!
        const urlToEncode = window.location.origin + '/' + alias;
        
        const colorDark = qrColorInput.value;
        const colorLight = qrBgColorInput.value;
        const logoFile = qrLogoInput.files[0];
        
        await generateQR(urlToEncode, colorDark, colorLight, logoFile);
    } else {
        qrResult.classList.add('hidden');
    }
}

async function generateQR(url, darkColor, lightColor, logoFile) {
    const opts = {
        errorCorrectionLevel: logoFile ? 'H' : 'M',
        margin: 2,
        width: 300,
        color: {
            dark: darkColor,
            light: lightColor
        }
    };

    try {
        await QRCode.toCanvas(qrCanvas, url, opts);
        
        if (logoFile) {
            const ctx = qrCanvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                const logoSize = qrCanvas.width * 0.25;
                const center = (qrCanvas.width - logoSize) / 2;
                
                // White background for logo
                ctx.fillStyle = lightColor;
                ctx.fillRect(center - 5, center - 5, logoSize + 10, logoSize + 10);
                
                ctx.drawImage(img, center, center, logoSize, logoSize);
            };
            img.src = URL.createObjectURL(logoFile);
        }
    } catch (err) {
        console.error("QR Error:", err);
    }
}

// Copy Button
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(finalShortlink.href);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "คัดลอกแล้ว! ✅";
    setTimeout(() => copyBtn.textContent = originalText, 2000);
});

// Download QR Button
downloadQrBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = qrCanvas.toDataURL();
    link.click();
});

// Load History
async function loadHistory() {
    if (!currentUser) return;
    
    historyList.innerHTML = '<tr><td colspan="5" style="text-align:center;">กำลังโหลด...</td></tr>';
    
    try {
        const q = query(
            collection(db, "shortlinks"),
            where("uid", "==", currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        historyList.innerHTML = '';
        
        if (snapshot.empty) {
            historyList.innerHTML = '<tr><td colspan="5" style="text-align:center;">ยังไม่มีประวัติการใช้งาน</td></tr>';
            return;
        }
        
        let docs = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
        
        // Sort descending by createdAt
        docs.sort((a, b) => {
            const t1 = a.createdAt ? a.createdAt.toDate().getTime() : 0;
            const t2 = b.createdAt ? b.createdAt.toDate().getTime() : 0;
            return t2 - t1;
        });
        
        // Take top 20
        docs = docs.slice(0, 20);
        
        // Make download function globally available for inline onclick
        window.deleteHistory = async function(id) {
            if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประวัตินี้?")) return;
            try {
                await deleteDoc(doc(db, "shortlinks", id));
                loadHistory();
            } catch (err) {
                console.error("Delete Error:", err);
                alert("ไม่สามารถลบได้: " + err.message);
            }
        };
        
        window.downloadHistoryQR = async function(urlToEncode) {
            try {
                const opts = {
                    errorCorrectionLevel: 'M',
                    margin: 2,
                    width: 300,
                    color: { dark: '#000000', light: '#ffffff' }
                };
                const dataUrl = await QRCode.toDataURL(urlToEncode, opts);
                const link = document.createElement('a');
                link.download = 'qrcode-history.png';
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error("Download history QR Error:", err);
                alert("ไม่สามารถดาวน์โหลด QR Code ได้");
            }
        };
        
        docs.forEach(data => {
            const tr = document.createElement('tr');
            
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('th-TH') : '-';
            
            let shortlinkHtml = '-';
            if (data.mode !== 'qrcode' && data.alias) {
                const url = window.location.origin + '/' + data.alias;
                shortlinkHtml = `<a href="${url}" target="_blank">${url}</a>`;
            }
            
            let badgeClass = 'badge-both';
            let modeText = 'ลิงก์ + QR';
            let targetUrl = data.alias ? (window.location.origin + '/' + data.alias) : data.originalUrl;
            
            if (data.mode === 'shortlink') { 
                badgeClass = 'badge-shortlink'; 
                modeText = 'ลิงก์'; 
            } else if (data.mode === 'qrcode') { 
                badgeClass = 'badge-qrcode'; 
                modeText = 'QR'; 
            }
            
            tr.innerHTML = `
                <td>${shortlinkHtml}</td>
                <td style="text-align: center;">
                    <a href="${data.originalUrl}" target="_blank" title="${data.originalUrl}" style="display: inline-block; background: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 0.8rem; white-space: nowrap;">
                        🔗 ดูลิงก์
                    </a>
                </td>
                <td><span class="badge ${badgeClass}">${modeText}</span></td>
                <td>${data.clicks || 0}</td>
                <td>${date}</td>
                <td>
                    <div style="display: flex; gap: 4px; justify-content: flex-start; align-items: center;">
                        <button onclick="downloadHistoryQR('${targetUrl}')" style="background:var(--primary); color:white; border:none; border-radius:4px; padding:4px 8px; font-size:0.8rem; cursor:pointer;">
                            QR
                        </button>
                        <button onclick="deleteHistory('${data.id}')" style="background:#ef4444; color:white; border:none; border-radius:4px; padding:4px 8px; font-size:0.8rem; cursor:pointer;">
                            ลบ
                        </button>
                    </div>
                </td>
            `;
            historyList.appendChild(tr);
        });
        
    } catch (error) {
        console.error("Load History Error:", error);
        historyList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444;">โหลดประวัติล้มเหลว</td></tr>';
    }
}
