import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxIILMfoC1y8CgizrJN8yLMF40bwoRLxM",
  authDomain: "yotathai-board.firebaseapp.com",
  projectId: "yotathai-board",
  storageBucket: "yotathai-board.firebasestorage.app",
  messagingSenderId: "449833456981",
  appId: "1:449833456981:web:2119c88538012b3ac34bdc",
  measurementId: "G-27579LSV3Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const barcodeFormatContainer = document.getElementById('barcodeFormatContainer');
    const inputData = document.getElementById('inputData');
    const generateBtn = document.getElementById('generateBtn');
    const outputSection = document.getElementById('outputSection');
    const qrcodeDisplay = document.getElementById('qrcodeDisplay');
    const barcodeDisplay = document.getElementById('barcodeDisplay');
    const downloadBtn = document.getElementById('downloadBtn');
    const barcodeFormat = document.getElementById('barcodeFormat');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    
    // Logo Upload Elements
    const logoUploadContainer = document.getElementById('logoUploadContainer');
    const logoInput = document.getElementById('logoInput');
    const logoFileName = document.getElementById('logoFileName');
    const removeLogoBtn = document.getElementById('removeLogoBtn');

    let currentMode = 'qrcode'; // 'qrcode' or 'barcode'
    let currentColor = '#f97316'; // Default Orange
    let qrCodeInstance = null;
    let uploadedLogo = null;

    // Color Selection
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            // Update Active Class
            colorSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            
            currentColor = swatch.dataset.color;
            
            // Auto regenerate if there's text
            if (inputData.value.trim()) {
                generateBtn.click();
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
                // Auto regenerate if text exists
                if (inputData.value.trim()) {
                    generateBtn.click();
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
        if (inputData.value.trim()) {
            generateBtn.click();
        }
    });

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update Active Class
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            currentMode = tab.dataset.target;

            // Toggle Barcode format options and Logo upload
            if (currentMode === 'barcode') {
                barcodeFormatContainer.classList.remove('hidden');
                logoUploadContainer.classList.add('hidden');
                inputData.placeholder = "รหัสบาร์โค้ด เช่น 123456789";
            } else {
                barcodeFormatContainer.classList.add('hidden');
                logoUploadContainer.classList.remove('hidden');
                inputData.placeholder = "ตัวอย่าง: https://www.google.com หรือ รหัสพัสดุ 123456789";
            }
            
            // Hide output when switching modes
            outputSection.classList.add('hidden');
        });
    });

    // Generate Code
    generateBtn.addEventListener('click', () => {
        const text = inputData.value.trim();
        if (!text) {
            alert('กรุณากรอกข้อมูลก่อนสร้างรหัส');
            return;
        }

        // Save to History
        saveHistory(text, currentMode, currentColor);

        outputSection.classList.remove('hidden');

        if (currentMode === 'qrcode') {
            generateQRCode(text);
        } else {
            generateBarcode(text);
        }
    });

    function generateQRCode(text) {
        qrcodeDisplay.classList.remove('hidden');
        barcodeDisplay.classList.add('hidden');
        
        // Clear previous
        qrcodeDisplay.innerHTML = '';
        
        // Create new QR Code. Use high resolution (e.g. 512x512)
        // Note: qrcode.js draws to a canvas and an img tag
        qrCodeInstance = new QRCode(qrcodeDisplay, {
            text: text,
            width: 512,
            height: 512,
            colorDark : currentColor,
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        
        // Scale it down via CSS for display, but keep actual size large for downloading
        setTimeout(() => {
            const canvas = qrcodeDisplay.querySelector('canvas');
            const img = qrcodeDisplay.querySelector('img');

            if (canvas && uploadedLogo) {
                const ctx = canvas.getContext('2d');
                const centerImage = new Image();
                centerImage.onload = function() {
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;
                    
                    // Logo size (25% of QR code)
                    const logoSize = canvasWidth * 0.25;
                    const x = (canvasWidth - logoSize) / 2;
                    const y = (canvasHeight - logoSize) / 2;
                    
                    // Draw a white background for the logo
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
                    
                    // Draw the uploaded logo
                    ctx.drawImage(centerImage, x, y, logoSize, logoSize);
                    
                    // Update the <img> tag created by qrcode.js
                    if (img) {
                        img.src = canvas.toDataURL("image/png");
                    }
                };
                centerImage.src = uploadedLogo;
            }

            if (img) {
                 img.style.maxWidth = '100%';
                 img.style.height = 'auto';
            }
            if (canvas) {
                 canvas.style.maxWidth = '100%';
                 canvas.style.height = 'auto';
            }
        }, 50);
    }

    function generateBarcode(text) {
        barcodeDisplay.classList.remove('hidden');
        qrcodeDisplay.classList.add('hidden');

        const format = barcodeFormat.value;
        
        try {
            JsBarcode("#barcodeDisplay", text, {
                format: format,
                width: 4,      // Thicker bars for high res
                height: 150,   // Taller bars
                displayValue: true,
                fontSize: 24,
                margin: 20,
                lineColor: currentColor
            });
            // Ensure it fits container visually
            barcodeDisplay.style.maxWidth = '100%';
            barcodeDisplay.style.height = 'auto';
        } catch (error) {
            alert('รูปแบบข้อมูลไม่ถูกต้องสำหรับฟอร์แมต ' + format + '\n\n' + error.message);
            outputSection.classList.add('hidden');
        }
    }

    // Download Image
    downloadBtn.addEventListener('click', async () => {
        let filename = currentMode === 'qrcode' ? `qrcode_${Date.now()}.png` : `barcode_${Date.now()}.png`;
        let dataUrl = "";

        // Extract DataURL based on mode
        if (currentMode === 'qrcode') {
            const canvas = qrcodeDisplay.querySelector('canvas');
            const img = qrcodeDisplay.querySelector('img');
            if (canvas && canvas.style.display !== 'none') {
                 dataUrl = canvas.toDataURL("image/png");
            } else if (img && img.src) {
                 dataUrl = img.src;
            }
        } else {
            if (barcodeDisplay) {
                dataUrl = barcodeDisplay.toDataURL("image/png");
            }
        }

        if (!dataUrl) {
            alert('ไม่สามารถดาวน์โหลดภาพได้ ลองสร้างใหม่อีกครั้ง');
            return;
        }

        // Try Native Share API first (Mobile iOS/Android) to save to Photos directly
        if (navigator.share) {
            try {
                // Convert DataURL to File object
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], filename, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Yotathai QR/Barcode',
                    });
                    return; // Success!
                }
            } catch (error) {
                console.log('Share API error or cancelled:', error);
                // Fallback to normal download if share fails
            }
        }

        // Fallback for Desktop (PC/Mac) or browsers without Share API
        let downloadLink = document.createElement('a');
        downloadLink.download = filename;
        downloadLink.href = dataUrl;
        downloadLink.click();
    });

    // --- History System (Firebase Firestore) ---
    const historyList = document.getElementById('historyList');
    const historySection = document.getElementById('historySection');
    const loginPrompt = document.getElementById('loginPrompt');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userPhoto = document.getElementById('userPhoto');

    // Always show history section now since it contains the login prompt
    if (historySection) historySection.classList.remove('hidden');

    // Auth State Observer
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            // User is signed in
            loginBtn.classList.add('hidden');
            loginPrompt.classList.add('hidden');
            userInfo.classList.remove('hidden');
            historyList.classList.remove('hidden');
            
            userName.textContent = user.displayName || user.email;
            if (user.photoURL) userPhoto.src = user.photoURL;
            
            loadHistory();
        } else {
            // User is signed out
            loginBtn.classList.remove('hidden');
            loginPrompt.classList.remove('hidden');
            userInfo.classList.add('hidden');
            historyList.classList.add('hidden');
            historyList.innerHTML = '';
        }
    });

    // Login
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Login failed", error);
                alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Logout failed", error);
            }
        });
    }

    async function saveHistory(text, mode, color) {
        // Fallback to local storage if not logged in? No, user explicitly wants sync.
        // We only save if logged in.
        if (!currentUser) return;
        
        try {
            await addDoc(collection(db, "qr_history"), {
                uid: currentUser.uid,
                text: text,
                mode: mode,
                color: color,
                timestamp: Date.now()
            });
            // Reload to show the new item
            loadHistory();
        } catch (error) {
            console.error("Error saving history: ", error);
        }
    }

    async function loadHistory() {
        if (!currentUser || !historyList) return;
        
        try {
            historyList.innerHTML = '<div style="text-align:center; padding:1rem; color:#6b7280;">กำลังโหลดข้อมูล...</div>';
            
            const q = query(
                collection(db, "qr_history"),
                where("uid", "==", currentUser.uid),
                orderBy("timestamp", "desc"),
                limit(15)
            );
            
            const querySnapshot = await getDocs(q);
            historyList.innerHTML = '';
            
            if (querySnapshot.empty) {
                historyList.innerHTML = '<div style="text-align:center; padding:1rem; color:#6b7280;">ยังไม่มีประวัติการสร้าง</div>';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const div = document.createElement('div');
                div.className = 'history-item';
                
                const icon = item.mode === 'qrcode' ? '🔳' : '|||';
                const date = new Date(item.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' });
                
                div.innerHTML = `
                    <div class="history-icon">${icon}</div>
                    <div class="history-details">
                        <div class="history-text" title="${item.text}">${item.text}</div>
                        <div class="history-date">${item.mode === 'qrcode' ? 'QR Code' : 'Barcode'} • ${date}</div>
                    </div>
                    <button class="restore-btn" style="background-color: ${item.color}">โหลดข้อมูล</button>
                `;
                
                div.querySelector('.restore-btn').addEventListener('click', () => {
                    // Restore text
                    inputData.value = item.text;
                    
                    // Switch tab
                    const targetTab = Array.from(tabs).find(t => t.dataset.target === item.mode);
                    if (targetTab) targetTab.click();
                    
                    // Select color
                    const targetColor = Array.from(colorSwatches).find(c => c.dataset.color === item.color);
                    if (targetColor) {
                        colorSwatches.forEach(s => s.classList.remove('active'));
                        targetColor.classList.add('active');
                        currentColor = item.color;
                    }
                    
                    // Generate
                    generateBtn.click();
                });
                
                historyList.appendChild(div);
            });
            
        } catch (error) {
            console.error("Error loading history: ", error);
            historyList.innerHTML = '<div style="text-align:center; padding:1rem; color:#ef4444;">ไม่สามารถโหลดข้อมูลได้ (อาจติดเรื่องสิทธิ์การเข้าถึงฐานข้อมูล)</div>';
        }
    }
});
