import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const DOMAIN = "th-go.link";

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const inputData = document.getElementById('inputData');
    const generateBtn = document.getElementById('generateBtn');
    const generateBtnText = document.getElementById('generateBtnText');
    const outputSection = document.getElementById('outputSection');
    
    // Output Containers
    const shortlinkOutputContainer = document.getElementById('shortlinkOutputContainer');
    const qrcodeOutputContainer = document.getElementById('qrcodeOutputContainer');
    const shortlinkDisplay = document.getElementById('shortlinkDisplay');
    const qrcodeDisplay = document.getElementById('qrcodeDisplay');
    
    // Options
    const qrOptionsContainer = document.getElementById('qrOptionsContainer');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const loginWarning = document.getElementById('loginWarning');
    
    // Logo Upload
    const logoInput = document.getElementById('logoInput');
    const logoFileName = document.getElementById('logoFileName');
    const removeLogoBtn = document.getElementById('removeLogoBtn');

    let currentMode = 'shortlink'; // 'shortlink', 'qrcode', 'both'
    let currentColor = '#f97316';
    let qrCodeInstance = null;
    let uploadedLogo = null;
    let currentRenderUrl = '';

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.target;
            
            outputSection.classList.add('hidden'); // Hide output when switching modes

            if (currentMode === 'shortlink') {
                qrOptionsContainer.classList.add('hidden');
                generateBtnText.textContent = 'สร้างลิงก์ย่อ';
            } else if (currentMode === 'qrcode') {
                qrOptionsContainer.classList.remove('hidden');
                generateBtnText.textContent = 'สร้าง QR Code';
            } else if (currentMode === 'both') {
                qrOptionsContainer.classList.remove('hidden');
                generateBtnText.textContent = 'สร้างลิงก์ย่อ & QR Code';
            }
        });
    });

    // Color Selection
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            colorSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            currentColor = swatch.dataset.color;
            
            if (currentRenderUrl && (currentMode === 'qrcode' || currentMode === 'both')) {
                renderQRCode(currentRenderUrl);
            }
        });
    });

    // Logo Upload Logic
    logoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            logoFileName.textContent = file.name;
            removeLogoBtn.classList.remove('hidden');
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedLogo = event.target.result;
                if (currentRenderUrl && (currentMode === 'qrcode' || currentMode === 'both')) {
                    renderQRCode(currentRenderUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    });

    removeLogoBtn.addEventListener('click', function() {
        logoInput.value = '';
        logoFileName.textContent = 'เลือกไฟล์รูปภาพ (ไม่บังคับ)';
        removeLogoBtn.classList.add('hidden');
        uploadedLogo = null;
        if (currentRenderUrl && (currentMode === 'qrcode' || currentMode === 'both')) {
            renderQRCode(currentRenderUrl);
        }
    });

    function generateShortCode() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Generate Button Click
    generateBtn.addEventListener('click', async () => {
        const text = inputData.value.trim();
        
        if (!currentUser) {
            alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
            loginWarning.classList.remove('hidden');
            return;
        }

        if (!text) {
            alert('กรุณาวางลิงก์ปลายทาง');
            return;
        }

        if (!text.startsWith('http://') && !text.startsWith('https://')) {
            alert('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
            return;
        }

        generateBtn.disabled = true;
        const originalBtnText = generateBtnText.textContent;
        generateBtnText.textContent = 'กำลังประมวลผล...';

        try {
            let shortCode = '';
            let shortlinkUrl = '';

            if (currentMode === 'shortlink' || currentMode === 'both') {
                shortCode = generateShortCode();
                shortlinkUrl = `https://${DOMAIN}/${shortCode}`;
            }

            // Save to Firestore
            await addDoc(collection(db, "shortlinks"), {
                uid: currentUser.uid,
                original_url: text,
                short_code: shortCode, // empty if qrcode only
                mode: currentMode,
                color: (currentMode !== 'shortlink') ? currentColor : null,
                clicks: 0,
                timestamp: Date.now()
            });

            // Handle UI based on Mode
            outputSection.classList.remove('hidden');

            if (currentMode === 'shortlink') {
                shortlinkOutputContainer.classList.remove('hidden');
                qrcodeOutputContainer.classList.add('hidden');
                
                currentRenderUrl = shortlinkUrl;
                shortlinkDisplay.textContent = `${DOMAIN}/${shortCode}`;
                shortlinkDisplay.href = shortlinkUrl;
                
            } else if (currentMode === 'qrcode') {
                shortlinkOutputContainer.classList.add('hidden');
                qrcodeOutputContainer.classList.remove('hidden');
                
                currentRenderUrl = text; // QR points to original url
                renderQRCode(currentRenderUrl);
                
            } else if (currentMode === 'both') {
                shortlinkOutputContainer.classList.remove('hidden');
                qrcodeOutputContainer.classList.remove('hidden');
                
                currentRenderUrl = shortlinkUrl; // QR points to shortlink
                shortlinkDisplay.textContent = `${DOMAIN}/${shortCode}`;
                shortlinkDisplay.href = shortlinkUrl;
                renderQRCode(currentRenderUrl);
            }

            loadHistory();

        } catch (error) {
            console.error("Error creating item: ", error);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            generateBtn.disabled = false;
            generateBtnText.textContent = originalBtnText;
        }
    });

    copyBtn.addEventListener('click', () => {
        if (currentRenderUrl && currentMode !== 'qrcode') {
            navigator.clipboard.writeText(currentRenderUrl).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'คัดลอกแล้ว!';
                copyBtn.style.backgroundColor = '#dcfce7';
                copyBtn.style.color = '#166534';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = '#e2e8f0';
                    copyBtn.style.color = 'inherit';
                }, 2000);
            });
        }
    });

    function renderQRCode(url) {
        qrcodeDisplay.innerHTML = '';
        
        qrCodeInstance = new QRCode(qrcodeDisplay, {
            text: url,
            width: 512,
            height: 512,
            colorDark : currentColor,
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        
        let checkCount = 0;
        const drawLogoInterval = setInterval(() => {
            const canvas = qrcodeDisplay.querySelector('canvas');
            const img = qrcodeDisplay.querySelector('img');
            
            checkCount++;
            
            if (canvas && img && img.src) {
                clearInterval(drawLogoInterval);
                
                if (uploadedLogo) {
                    const ctx = canvas.getContext('2d');
                    const centerImage = new Image();
                    centerImage.onload = function() {
                        const logoSize = canvas.width * 0.25;
                        const x = (canvas.width - logoSize) / 2;
                        const y = (canvas.height - logoSize) / 2;
                        
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
                        ctx.drawImage(centerImage, x, y, logoSize, logoSize);
                        
                        img.src = canvas.toDataURL("image/png");
                    };
                    centerImage.src = uploadedLogo;
                }
                
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                canvas.style.maxWidth = '100%';
                canvas.style.height = 'auto';
                
            } else if (checkCount > 50) {
                clearInterval(drawLogoInterval);
            }
        }, 50);
    }

    // Download Image
    downloadBtn.addEventListener('click', async () => {
        let filename = `qrcode_thgo_${Date.now()}.png`;
        let dataUrl = "";

        const canvas = qrcodeDisplay.querySelector('canvas');
        const img = qrcodeDisplay.querySelector('img');
        if (canvas && canvas.style.display !== 'none') {
             dataUrl = canvas.toDataURL("image/png");
        } else if (img && img.src) {
             dataUrl = img.src;
        }

        if (!dataUrl) {
            alert('ไม่สามารถดาวน์โหลดภาพได้');
            return;
        }

        if (navigator.share) {
            try {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], filename, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'th-go.link QR Code',
                    });
                    return;
                }
            } catch (error) {
                console.log('Share API error:', error);
            }
        }

        let downloadLink = document.createElement('a');
        downloadLink.download = filename;
        downloadLink.href = dataUrl;
        downloadLink.click();
    });

    // --- History System ---
    const historyList = document.getElementById('historyList');
    const loginPrompt = document.getElementById('loginPrompt');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userPhoto = document.getElementById('userPhoto');

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            loginBtn.classList.add('hidden');
            loginPrompt.classList.add('hidden');
            loginWarning.classList.add('hidden');
            userInfo.classList.remove('hidden');
            historyList.classList.remove('hidden');
            
            userName.textContent = user.displayName || user.email;
            if (user.photoURL) userPhoto.src = user.photoURL;
            
            loadHistory();
        } else {
            loginBtn.classList.remove('hidden');
            loginPrompt.classList.remove('hidden');
            userInfo.classList.add('hidden');
            historyList.classList.add('hidden');
            historyList.innerHTML = '';
        }
    });

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Login failed", error);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                outputSection.classList.add('hidden');
                inputData.value = '';
            } catch (error) {
                console.error("Logout failed", error);
            }
        });
    }

    async function loadHistory() {
        if (!currentUser || !historyList) return;
        
        try {
            historyList.innerHTML = '<div style="text-align:center; padding:1rem; color:#6b7280;">กำลังโหลดข้อมูล...</div>';
            
            const q = query(
                collection(db, "shortlinks"),
                where("uid", "==", currentUser.uid),
                orderBy("timestamp", "desc"),
                limit(15)
            );
            
            const querySnapshot = await getDocs(q);
            historyList.innerHTML = '';
            
            if (querySnapshot.empty) {
                historyList.innerHTML = '<div style="text-align:center; padding:1rem; color:#6b7280;">คุณยังไม่มีประวัติการสร้าง</div>';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const div = document.createElement('div');
                div.className = 'history-item';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                
                const date = new Date(item.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' });
                
                let iconStr = '🔗';
                let modeName = 'ลิงก์ย่อ';
                if (item.mode === 'qrcode') { iconStr = '🔳'; modeName = 'QR Code'; }
                if (item.mode === 'both') { iconStr = '🌟'; modeName = 'ลิงก์+QR'; }

                let mainLinkHtml = '';
                if (item.mode === 'qrcode') {
                    // QR Code Only - show original URL
                    mainLinkHtml = `<a href="${item.original_url}" target="_blank" style="font-weight: 600; color: #1f2937; text-decoration: none; word-break: break-all; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${item.original_url}</a>`;
                } else {
                    // Has shortlink
                    const fullShortUrl = `https://${DOMAIN}/${item.short_code}`;
                    mainLinkHtml = `<a href="${fullShortUrl}" target="_blank" style="font-weight: 600; color: #166534; text-decoration: none;">${DOMAIN}/${item.short_code}</a>`;
                }
                
                const statsHtml = (item.mode !== 'qrcode') ? `👁️ ${item.clicks || 0} คลิก • ` : '';

                div.innerHTML = `
                    <div class="history-details" style="flex: 1; overflow: hidden; padding-right: 10px;">
                        <div style="font-size: 0.8em; color: #4b5563; margin-bottom: 2px;">${iconStr} ${modeName}</div>
                        ${mainLinkHtml}
                        ${item.mode !== 'qrcode' ? `<div class="history-text" style="font-size: 0.8em; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.original_url}">${item.original_url}</div>` : ''}
                        <div class="history-date" style="font-size: 0.75em; color: #9ca3af; margin-top: 2px;">${statsHtml}${date}</div>
                    </div>
                    <button class="restore-btn" style="background-color: ${item.color || '#3b82f6'}; padding: 5px 10px; font-size: 0.8em; white-space: nowrap;">เรียกดู</button>
                `;
                
                div.querySelector('.restore-btn').addEventListener('click', () => {
                    inputData.value = item.original_url;
                    
                    // Switch to correct tab
                    const targetTab = Array.from(tabs).find(t => t.dataset.target === (item.mode || 'shortlink'));
                    if (targetTab) targetTab.click();

                    outputSection.classList.remove('hidden');

                    if (item.mode === 'shortlink') {
                        shortlinkOutputContainer.classList.remove('hidden');
                        qrcodeOutputContainer.classList.add('hidden');
                        
                        const fullShortUrl = `https://${DOMAIN}/${item.short_code}`;
                        currentRenderUrl = fullShortUrl;
                        shortlinkDisplay.textContent = `${DOMAIN}/${item.short_code}`;
                        shortlinkDisplay.href = fullShortUrl;
                    } 
                    else if (item.mode === 'qrcode') {
                        shortlinkOutputContainer.classList.add('hidden');
                        qrcodeOutputContainer.classList.remove('hidden');
                        
                        currentRenderUrl = item.original_url;
                        
                        const targetColor = Array.from(colorSwatches).find(c => c.dataset.color === item.color);
                        if (targetColor) {
                            colorSwatches.forEach(s => s.classList.remove('active'));
                            targetColor.classList.add('active');
                            currentColor = item.color;
                        }
                        renderQRCode(currentRenderUrl);
                    }
                    else { // both
                        shortlinkOutputContainer.classList.remove('hidden');
                        qrcodeOutputContainer.classList.remove('hidden');
                        
                        const fullShortUrl = `https://${DOMAIN}/${item.short_code}`;
                        currentRenderUrl = fullShortUrl;
                        shortlinkDisplay.textContent = `${DOMAIN}/${item.short_code}`;
                        shortlinkDisplay.href = fullShortUrl;
                        
                        const targetColor = Array.from(colorSwatches).find(c => c.dataset.color === item.color);
                        if (targetColor) {
                            colorSwatches.forEach(s => s.classList.remove('active'));
                            targetColor.classList.add('active');
                            currentColor = item.color;
                        }
                        renderQRCode(currentRenderUrl);
                    }

                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
                
                historyList.appendChild(div);
            });
            
        } catch (error) {
            console.error("Error loading history: ", error);
            historyList.innerHTML = '<div style="text-align:center; padding:1rem; color:#ef4444;">ไม่สามารถโหลดข้อมูลได้</div>';
        }
    }
});
