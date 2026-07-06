import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, limit, deleteDoc, doc, updateDoc, getCountFromServer, getAggregateFromServer, sum, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let selectedLogoDataUrl = null;

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
const enableQrTextLabel = document.getElementById('enableQrTextLabel');
const qrTextLabelWrapper = document.getElementById('qrTextLabelWrapper');
const qrTextLabelInput = document.getElementById('qrTextLabel');
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
            aliasGroup.classList.remove('hidden'); // Changed to remove hidden so it always shows
        } else {
            qrOptionsPanel.classList.remove('hidden');
            aliasGroup.classList.remove('hidden');
        }
        updateGenerateBtnText();
    });
});

function updateGenerateBtnText() {
    if (currentMode === 'shortlink') {
        generateBtn.textContent = "สร้างลิงก์สั้น";
    } else if (currentMode === 'qrcode') {
        generateBtn.textContent = "สร้าง QR Code";
    } else {
        generateBtn.textContent = "สร้างทั้งลิงก์และ QR Code";
    }
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    authLoader.classList.add('hidden');
    
    if (user) {
        currentUser = user;
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: new Date()
        }, { merge: true }).catch(err => console.error("Error saving user:", err));
        
        loginSection.classList.add('hidden');
        userProfile.classList.remove('hidden');
        userName.textContent = user.displayName;
        userAvatar.src = user.photoURL;
        
        // Admin Dashboard Check
        const adminBtn = document.getElementById('adminDashboardBtn');
        if (adminBtn) {
            if (user.email === 'yotathai@gmail.com') {
                adminBtn.classList.remove('hidden');
            } else {
                adminBtn.classList.add('hidden');
            }
        }
        
        authRequiredBanner.classList.add('hidden');
        
        // Enable inputs
        longUrlInput.disabled = false;
        customAliasInput.disabled = false;
        enableCustomAlias.disabled = false;
        qrColorInput.disabled = false;
        qrBgColorInput.disabled = false;
        qrLogoInput.disabled = false;
        enableQrTextLabel.disabled = false;
        qrTextLabelInput.disabled = false;
        generateBtn.disabled = false;
        
        // Reset checkbox state
        enableCustomAlias.checked = false;
        aliasWrapper.classList.add('hidden');
        aliasHelper.classList.add('hidden');
        customAliasInput.value = generateRandomString(6);
        
        enableQrTextLabel.checked = false;
        qrTextLabelWrapper.classList.add('hidden');
        qrTextLabelInput.value = '';
        
        historySection.classList.remove('hidden');
        loadHistory();
        fetchSavedLogos();
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
        enableQrTextLabel.disabled = true;
        qrTextLabelInput.disabled = true;
        generateBtn.disabled = true;
    }
});

enableQrTextLabel.addEventListener('change', () => {
    if (enableQrTextLabel.checked) {
        qrTextLabelWrapper.classList.remove('hidden');
        qrTextLabelInput.focus();
    } else {
        qrTextLabelWrapper.classList.add('hidden');
        qrTextLabelInput.value = '';
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

// Color Presets Logic
const qrColorPresets = document.querySelectorAll('#qrColorPresets .color-swatch:not(.recent-swatch)');
const qrBgColorPresets = document.querySelectorAll('#qrBgColorPresets .color-swatch:not(.recent-swatch)');
const recentQrColor = document.getElementById('recentQrColor');
const recentQrBgColor = document.getElementById('recentQrBgColor');

// Load recent colors from localStorage
const savedRecentColor = localStorage.getItem('th-go-recent-color');
if (savedRecentColor && recentQrColor) {
    recentQrColor.style.backgroundColor = savedRecentColor;
    recentQrColor.dataset.color = savedRecentColor;
    recentQrColor.classList.remove('hidden');
}

const savedRecentBgColor = localStorage.getItem('th-go-recent-bgcolor');
if (savedRecentBgColor && recentQrBgColor) {
    recentQrBgColor.style.backgroundColor = savedRecentBgColor;
    recentQrBgColor.dataset.color = savedRecentBgColor;
    recentQrBgColor.classList.remove('hidden');
}

function handleSwatchClick(swatches, inputElement, type) {
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            if (inputElement.disabled) return;
            const color = swatch.dataset.color;
            inputElement.value = color;
            
            // Highlight selected swatch
            const parent = swatch.parentElement;
            parent.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            
            // Trigger change event just in case
            inputElement.dispatchEvent(new Event('change'));
        });
    });
}

// Add listeners to static presets
handleSwatchClick(qrColorPresets, qrColorInput, 'color');
handleSwatchClick(qrBgColorPresets, qrBgColorInput, 'bgcolor');
// Add listeners to recent swatches
if (recentQrColor) handleSwatchClick([recentQrColor], qrColorInput, 'color');
if (recentQrBgColor) handleSwatchClick([recentQrBgColor], qrBgColorInput, 'bgcolor');

// Save custom color selections to recent on change
qrColorInput.addEventListener('change', (e) => {
    const color = e.target.value;
    localStorage.setItem('th-go-recent-color', color);
    if (recentQrColor) {
        recentQrColor.style.backgroundColor = color;
        recentQrColor.dataset.color = color;
        recentQrColor.classList.remove('hidden');
    }
    
    // Remove active from other swatches
    document.querySelectorAll('#qrColorPresets .color-swatch').forEach(s => s.classList.remove('active'));
    if (recentQrColor) recentQrColor.classList.add('active');
});

qrBgColorInput.addEventListener('change', (e) => {
    const color = e.target.value;
    localStorage.setItem('th-go-recent-bgcolor', color);
    if (recentQrBgColor) {
        recentQrBgColor.style.backgroundColor = color;
        recentQrBgColor.dataset.color = color;
        recentQrBgColor.classList.remove('hidden');
    }
    
    // Remove active from other swatches
    document.querySelectorAll('#qrBgColorPresets .color-swatch').forEach(s => s.classList.remove('active'));
    if (recentQrBgColor) recentQrBgColor.classList.add('active');
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

// Logo Gallery Logic
async function fetchSavedLogos() {
    if (!currentUser) return;
    const gallery = document.getElementById('savedLogosGallery');
    gallery.innerHTML = '<span style="font-size: 0.8rem; color: #888;">กำลังโหลดโลโก้...</span>';
    gallery.classList.remove('hidden');
    
    try {
        const q = query(collection(db, "user_logos"), where("uid", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        gallery.innerHTML = '';
        if (querySnapshot.empty) {
            gallery.classList.add('hidden');
            return;
        }
        
        let docsArray = [];
        querySnapshot.forEach(doc => docsArray.push({id: doc.id, data: doc.data()}));
        
        // Sort descending by createdAt in memory to avoid needing Firestore composite index
        docsArray.sort((a, b) => {
            const t1 = a.data.createdAt ? a.data.createdAt.toMillis() : 0;
            const t2 = b.data.createdAt ? b.data.createdAt.toMillis() : 0;
            return t2 - t1;
        });
        
        docsArray.forEach((item) => {
            const data = item.data;
            const wrapper = document.createElement('div');
            wrapper.className = 'logo-thumbnail-wrapper';
            
            const img = document.createElement('img');
            img.src = data.dataUrl;
            img.className = 'logo-thumbnail';
            if (selectedLogoDataUrl === data.dataUrl) {
                img.classList.add('selected');
            }
            img.onclick = () => selectSavedLogo(data.dataUrl, img);
            
            const delBtn = document.createElement('button');
            delBtn.className = 'logo-delete-btn';
            delBtn.textContent = '✕';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteSavedLogo(item.id, data.dataUrl);
            };
            
            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            gallery.appendChild(wrapper);
        });
    } catch (err) {
        console.error("Error fetching logos:", err);
        // Fail gracefully without showing an ugly error to the user
        gallery.classList.add('hidden');
    }
}

function selectSavedLogo(dataUrl, imgElement) {
    selectedLogoDataUrl = dataUrl;
    
    // Update UI
    document.querySelectorAll('.logo-thumbnail').forEach(el => el.classList.remove('selected'));
    if (imgElement) imgElement.classList.add('selected');
    
    logoPreview.src = dataUrl;
    logoPreviewContainer.classList.remove('hidden');
    qrLogoInput.value = ''; // clear file input
}

async function deleteSavedLogo(docId, dataUrl) {
    if (!confirm("คุณต้องการลบโลโก้นี้ใช่หรือไม่?")) return;
    
    try {
        await deleteDoc(doc(db, "user_logos", docId));
        if (selectedLogoDataUrl === dataUrl) {
            removeLogoSelection();
        }
        fetchSavedLogos();
    } catch (err) {
        console.error("Error deleting logo:", err);
        alert("ลบโลโก้ไม่สำเร็จ");
    }
}

function removeLogoSelection() {
    selectedLogoDataUrl = null;
    qrLogoInput.value = ''; 
    logoPreviewContainer.classList.add('hidden');
    logoPreview.src = '';
    document.querySelectorAll('.logo-thumbnail').forEach(el => el.classList.remove('selected'));
}

qrLogoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB");
            qrLogoInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 150;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/png');
                selectSavedLogo(dataUrl, null);
                
                // Save to Firestore
                if (currentUser) {
                    try {
                        await addDoc(collection(db, "user_logos"), {
                            uid: currentUser.uid,
                            dataUrl: dataUrl,
                            createdAt: new Date()
                        });
                        fetchSavedLogos();
                    } catch (err) {
                        console.error("Error saving logo:", err);
                    }
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        removeLogoSelection();
    }
});

removeLogoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    removeLogoSelection();
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
    
    // SPAM PROTECTION: Blacklist keywords commonly used by spammers
    const spamKeywords = [
        'slot', 'pgslot', 'ufabet', 'ufa88', 'ufa99', 'ufa168', 'casino', 'baccarat', 
        'บาคาร่า', 'สล็อต', 'คาสิโน', 'เครดิตฟรี', 'เว็บตรง', 'แทงบอล', 'หวยออนไลน์', 
        'gclub', 'joker123', 'sagaming', 'sexybaccarat', 'แจกเครดิต', 'รับเงินฟรี'
    ];
    const urlLower = longUrl.toLowerCase();
    const isSpam = spamKeywords.some(keyword => urlLower.includes(keyword));
    if (isSpam) {
        alert("ระบบตรวจพบลิงก์ที่อาจเข้าข่ายการพนันหรือสแปม จึงไม่อนุญาตให้สร้างลิงก์ครับ (Anti-Spam Protection)");
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
                updateGenerateBtnText();
                return;
            }
            if (!/^[a-zA-Z0-9-]+$/.test(aliasToUse)) {
                alert("ชื่อลิงก์สามารถใช้ได้แค่ตัวอักษรภาษาอังกฤษ ตัวเลข และขีดกลาง (-) เท่านั้นครับ");
                generateBtn.disabled = false;
                updateGenerateBtnText();
                return;
            }
            
            // Prevent using system reserved words and brand impersonation
            const reservedAliases = [
                // System & Admin
                'admin', 'administrator', 'api', 'login', 'logout', 'dashboard', 'auth', 
                'search', 'index', 'home', 'users', 'history', 'root', 'sysadmin', 
                'system', 'app', 'config', 'settings', 'profile', 'account', 'register', 
                'signup', 'signin', 'password', 'support', 'help', 'contact', 'about', 
                'terms', 'privacy', 'policy', 'faq', 'stats', 'analytics',
                // Yotathai Brand Protection
                'yotathai', 'yota', 'changtheuk', 'changtuk', 'aphisit', 'apisit',
                // Country
                'thai', 'thailand', 'siam', 'ไทย', 'ประเทศไทย',
                // All 77 Provinces (English)
                'bangkok', 'bkk', 'krabi', 'kanchanaburi', 'kalasin', 'kamphaengphet', 'khonkaen', 'chanthaburi', 'chachoengsao', 'chonburi', 
                'chainat', 'chaiyaphum', 'chumphon', 'chiangrai', 'chiangmai', 'trang', 'trat', 'tak', 'nakhonnayok', 'nakhonpathom', 
                'nakhonphanom', 'nakhonratchasima', 'korat', 'nakhonsithammarat', 'nakhonsawan', 'nonthaburi', 'narathiwat', 'nan', 'buengkan', 
                'buriram', 'pathumthani', 'prachuapkhirikhan', 'prachinburi', 'pattani', 'phranakhonsiayutthaya', 'ayutthaya', 'phayao', 
                'phangnga', 'phatthalung', 'phichit', 'phitsanulok', 'phetchaburi', 'phetchabun', 'phrae', 'phuket', 'mahasarakham', 
                'mukdahan', 'maehongson', 'yasothon', 'yala', 'roiet', 'ranong', 'rayong', 'ratchaburi', 'lopburi', 'lampang', 'lamphun', 
                'loei', 'sisaket', 'sakonnakhon', 'songkhla', 'satun', 'samutprakan', 'samutsongkhram', 'samutsakhon', 'sakaeo', 'saraburi', 
                'singburi', 'sukhothai', 'suphanburi', 'suratthani', 'surin', 'nongkhai', 'nongbualamphu', 'angthong', 'amnatcharoen', 
                'udonthani', 'uttaradit', 'uthaithani', 'ubonratchathani',
                // All 77 Provinces (Thai)
                'กรุงเทพ', 'กรุงเทพมหานคร', 'กทม', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 
                'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'โคราช', 
                'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 
                'ปัตตานี', 'พระนครศรีอยุธยา', 'อยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 
                'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 
                'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 
                'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 
                'อุทัยธานี', 'อุบลราชธานี',
                // Major Districts (English & Thai)
                'hatyai', 'หาดใหญ่', 'chiangkhan', 'เชียงคาน', 'huahin', 'หัวหิน', 'maesot', 'แม่สอด', 'betong', 'เบตง', 'pattaya', 'พัทยา', 
                'pai', 'ปาย', 'kohsamui', 'samui', 'เกาะสมุย', 'สมุย', 'kohphangan', 'phangan', 'เกาะพะงัน', 'พะงัน', 'sriracha', 'ศรีราชา', 
                'banglamung', 'บางละมุง'
            ];
            
            // Check exact match for reserved words
            if (reservedAliases.includes(aliasToUse.toLowerCase())) {
                alert(`ไม่อนุญาตให้ใช้ชื่อลิงก์ "${aliasToUse}" เนื่องจากเป็นคำสงวนของระบบหรือแบรนด์ครับ`);
                generateBtn.disabled = false;
                updateGenerateBtnText();
                return;
            }
            
            // Check partial match for "yotathai" to prevent variations like "yotathai-admin"
            if (aliasToUse.toLowerCase().includes('yotathai') && currentUser.email !== 'yotathai@gmail.com') {
                alert(`ไม่อนุญาตให้บุคคลทั่วไปใช้ชื่อลิงก์ที่มีคำว่า "yotathai" เพื่อป้องกันการแอบอ้างครับ`);
                generateBtn.disabled = false;
                updateGenerateBtnText();
                return;
            }
            
            // Prevent using profanity / inappropriate words
            const profanityKeywords = [
                'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'porn', 'xxx', 'sex', 'asshole',
                'hee', 'hia', 'kuy', 'sud', 'here',
                'ควย', 'หี', 'เย็ด', 'สัส', 'เหี้ย', 'พ่อง', 'แม่ง', 'ส้นตีน'
            ];
            const isProfane = profanityKeywords.some(keyword => aliasToUse.toLowerCase().includes(keyword));
            if (isProfane) {
                alert(`ไม่อนุญาตให้ใช้คำที่ไม่เหมาะสมในชื่อลิงก์ครับ`);
                generateBtn.disabled = false;
                updateGenerateBtnText();
                return;
            }
        }
        
        // Check alias availability
        const q = query(collection(db, "shortlinks"), where("alias", "==", aliasToUse));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            alert("ชื่อลิงก์นี้มีคนใช้แล้ว กรุณาเปลี่ยนชื่อใหม่ครับ");
            generateBtn.disabled = false;
            updateGenerateBtnText();
            return;
        }
        
        // Save to Firestore (Always save alias so QR code is clean and trackable)
        await addDoc(collection(db, "shortlinks"), {
            uid: currentUser.uid,
            email: currentUser.email || 'unknown', // Track who created the link to ban spammers
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
        console.error("Error adding document: ", error);
        alert("เกิดข้อผิดพลาดในการสร้างลิงก์");
    } finally {
        generateBtn.disabled = false;
        updateGenerateBtnText();
    }
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
        const logoDataUrl = selectedLogoDataUrl;
        const qrText = enableQrTextLabel.checked ? qrTextLabelInput.value.trim() : "";
        
        await generateQR(urlToEncode, colorDark, colorLight, logoDataUrl, qrText);
    } else {
        qrResult.classList.add('hidden');
    }
}

async function generateQR(url, darkColor, lightColor, logoDataUrl, qrText = "") {
    const opts = {
        errorCorrectionLevel: logoDataUrl ? 'H' : 'M',
        margin: 2,
        width: 300,
        color: {
            dark: darkColor,
            light: lightColor
        }
    };

    try {
        await QRCode.toCanvas(qrCanvas, url, opts);
        const ctx = qrCanvas.getContext('2d');
        
        if (logoDataUrl) {
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const logoSize = qrCanvas.width * 0.25;
                    const center = (qrCanvas.width - logoSize) / 2;
                    
                    // White background for logo
                    ctx.fillStyle = lightColor;
                    ctx.fillRect(center - 5, center - 5, logoSize + 10, logoSize + 10);
                    ctx.drawImage(img, center, center, logoSize, logoSize);
                    resolve();
                };
                img.src = logoDataUrl;
            });
        }
        
        if (qrText) {
            // Save current QR code to a temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = qrCanvas.width;
            tempCanvas.height = qrCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(qrCanvas, 0, 0);
            
            // Define initial text properties
            let fontSize = 24;
            ctx.font = `600 ${fontSize}px Prompt, sans-serif`;
            
            // Calculate max width for text
            const maxWidth = qrCanvas.width - 20; // 10px padding on each side
            let textWidth = ctx.measureText(qrText).width;
            
            // Scale down font size if text is too long
            while (textWidth > maxWidth && fontSize > 14) {
                fontSize -= 1;
                ctx.font = `600 ${fontSize}px Prompt, sans-serif`;
                textWidth = ctx.measureText(qrText).width;
            }
            
            const textPadding = 20;
            const extraHeight = fontSize + (textPadding * 2);
            
            // Resize actual canvas
            qrCanvas.height = qrCanvas.height + extraHeight;
            
            // Fix CSS distortion
            qrCanvas.style.width = qrCanvas.width + "px";
            qrCanvas.style.height = qrCanvas.height + "px";
            
            // Fill new background
            ctx.fillStyle = lightColor;
            ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
            
            // Redraw QR code at the top
            ctx.drawImage(tempCanvas, 0, 0);
            
            // Draw text at the bottom
            ctx.font = `600 ${fontSize}px Prompt, sans-serif`;
            ctx.fillStyle = darkColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(qrText, qrCanvas.width / 2, tempCanvas.height + textPadding);
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

// Mobile-friendly download helper
function dataURItoFile(dataURI, filename) {
    const arr = dataURI.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type: mime});
}

function showIOSModal(dataUrl) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '80%';
    img.style.maxHeight = '60%';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    
    const text = document.createElement('p');
    text.textContent = '👆 แตะค้างที่รูปภาพเพื่อ "บันทึกรูปภาพ"';
    text.style.color = 'white';
    text.style.marginTop = '20px';
    text.style.fontFamily = 'Prompt, sans-serif';
    text.style.fontSize = '1.1rem';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'ปิดหน้าต่าง';
    closeBtn.style.marginTop = '20px';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.borderRadius = '20px';
    closeBtn.style.border = 'none';
    closeBtn.style.backgroundColor = 'var(--primary, #f97316)';
    closeBtn.style.color = 'white';
    closeBtn.style.fontFamily = 'Prompt, sans-serif';
    closeBtn.style.fontSize = '1rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    
    overlay.appendChild(img);
    overlay.appendChild(text);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
}

function downloadMobileFriendly(dataUrl, filename) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    try {
        if (isMobile && navigator.share) {
            const file = dataURItoFile(dataUrl, filename);
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                // Must be called synchronously after user click
                navigator.share({
                    files: [file],
                    title: 'QR Code',
                    text: 'QR Code จาก th-go.link'
                }).catch(err => {
                    console.error("Share failed", err);
                    if (isIOS) showIOSModal(dataUrl);
                });
                return;
            }
        }
        
        // Fallback for desktop and browsers without share support
        if (isIOS) {
            showIOSModal(dataUrl);
        } else {
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (err) {
        console.error("Download Error:", err);
        if (isIOS) {
            showIOSModal(dataUrl);
        } else {
            // Fallback 2: just try regular download
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Download QR Button
downloadQrBtn.addEventListener('click', () => {
    downloadMobileFriendly(qrCanvas.toDataURL(), 'qrcode.png');
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
            const dashboard = document.getElementById('userDashboard');
            if(dashboard) dashboard.classList.add('hidden');
            return;
        }
        
        let docs = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
        
        // Calculate Stats
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        let totalLinks = docs.length;
        let todayLinks = 0;
        let totalClicks = 0;
        let todayClicks = 0;
        
        docs.forEach(d => {
            // Parse date safely
            let dateObj = null;
            if (d.createdAt) {
                if (typeof d.createdAt.toDate === 'function') {
                    dateObj = d.createdAt.toDate();
                } else {
                    dateObj = new Date(d.createdAt);
                }
            }
            d._parsedDate = dateObj; // Cache for sorting
            
            if (dateObj) {
                const dY = dateObj.getFullYear();
                const dM = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dD = String(dateObj.getDate()).padStart(2, '0');
                if (`${dY}-${dM}-${dD}` === todayStr) {
                    todayLinks++;
                }
            }
            
            totalClicks += (d.clicks || 0);
            todayClicks += (d[`clicks_${todayStr}`] || 0);
        });
        
        // User dashboard logic removed per request
        
        // Sort descending by createdAt
        docs.sort((a, b) => {
            const t1 = a._parsedDate ? a._parsedDate.getTime() : 0;
            const t2 = b._parsedDate ? b._parsedDate.getTime() : 0;
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

        window.editHistory = async function(id, currentUrl) {
            const newUrl = prompt("กรุณากรอกลิงก์ปลายทางใหม่ (URL):", currentUrl);
            if (newUrl !== null && newUrl.trim() !== "" && newUrl !== currentUrl) {
                try {
                    // Basic URL validation
                    new URL(newUrl);
                    await updateDoc(doc(db, "shortlinks", id), {
                        originalUrl: newUrl.trim()
                    });
                    loadHistory();
                } catch (err) {
                    if (err instanceof TypeError) {
                        alert("รูปแบบลิงก์ไม่ถูกต้อง กรุณาขึ้นต้นด้วย http:// หรือ https://");
                    } else {
                        console.error("Edit Error:", err);
                        alert("ไม่สามารถแก้ไขได้: " + err.message);
                    }
                }
            }
        };

        window.editAlias = async function(id, currentAlias) {
            const newAlias = prompt("คำเตือน: หากเปลี่ยนชื่อลิงก์ ผู้ที่เคยสแกน QR Code เก่าจะเข้าเว็บไม่ได้อีกต่อไป\\n\\nกรุณากรอกชื่อลิงก์ใหม่ (เช่น my-shop):", currentAlias);
            
            if (newAlias !== null && newAlias.trim() !== "" && newAlias !== currentAlias) {
                const aliasToUse = newAlias.trim();
                
                // Validate format
                const aliasRegex = /^[a-zA-Z0-9-]+$/;
                if (!aliasRegex.test(aliasToUse) || aliasToUse.length < 4) {
                    alert("ชื่อลิงก์ต้องมีความยาวอย่างน้อย 4 ตัวอักษร และประกอบด้วยภาษาอังกฤษ ตัวเลข หรือขีดกลาง (-) เท่านั้นครับ");
                    return;
                }
                
                try {
                    // Check availability
                    const q = query(collection(db, "shortlinks"), where("alias", "==", aliasToUse));
                    const querySnapshot = await getDocs(q);
                    
                    let isTaken = false;
                    querySnapshot.forEach((doc) => {
                        if (doc.id !== id) isTaken = true;
                    });
                    
                    if (isTaken) {
                        alert("ชื่อลิงก์นี้มีคนใช้แล้ว กรุณาเปลี่ยนชื่อใหม่ครับ");
                        return;
                    }
                    
                    await updateDoc(doc(db, "shortlinks", id), {
                        alias: aliasToUse
                    });
                    loadHistory();
                } catch (err) {
                    console.error("Edit Alias Error:", err);
                    alert("ไม่สามารถแก้ไขชื่อลิงก์ได้: " + err.message);
                }
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
                downloadMobileFriendly(dataUrl, 'qrcode-history.png');
            } catch (err) {
                console.error("Download history QR Error:", err);
                alert("ไม่สามารถดาวน์โหลด QR Code ได้");
            }
        };
        
        docs.forEach(data => {
            const tr = document.createElement('tr');
            
            const date = data._parsedDate ? data._parsedDate.toLocaleDateString('th-TH') : '-';
            
            let shortlinkHtml = '-';
            if (data.alias) {
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
                        <button onclick="downloadHistoryQR('${targetUrl}')" style="background:var(--primary); color:white; border:none; border-radius:4px; padding:4px 8px; font-size:0.8rem; cursor:pointer;" title="โหลด QR">
                            QR
                        </button>
                        <button onclick="editAlias('${data.id}', '${data.alias}')" style="background:#8b5cf6; color:white; border:none; border-radius:4px; padding:4px 8px; font-size:0.8rem; cursor:pointer;" title="เปลี่ยนชื่อลิงก์สั้น">
                            ชื่อลิงก์
                        </button>
                        <button onclick="editHistory('${data.id}', '${data.originalUrl}')" style="background:#eab308; color:white; border:none; border-radius:4px; padding:4px 8px; font-size:0.8rem; cursor:pointer;" title="เปลี่ยนลิงก์ปลายทาง">
                            ปลายทาง
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
        historyList.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 20px;">กรุณาเข้าสู่ระบบเพื่อดูประวัติ</td></tr>';
        
        document.getElementById('savedLogosGallery').innerHTML = '';
        document.getElementById('savedLogosGallery').classList.add('hidden');
        selectedLogoDataUrl = null;
        logoPreviewContainer.classList.add('hidden');
        qrLogoInput.value = '';
    }
}
// ==========================================
// PWA Installation Logic (Android & iOS)
// ==========================================
let deferredPrompt;
const installAppBtn = document.getElementById('installAppBtn');
const iosInstallModal = document.getElementById('iosInstallModal');
const closeIosModalBtn = document.getElementById('closeIosModalBtn');

// Detect if device is iOS
const isIOS = () => {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

// Detect if already installed / running in standalone
const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

// Show the install button if not installed
if (!isStandalone()) {
    if (isIOS()) {
        // Show button for iOS users always (since we can't intercept prompt)
        if(installAppBtn) installAppBtn.classList.remove('hidden');
    }
}

// Intercept Android install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    if(installAppBtn) installAppBtn.classList.remove('hidden');
});

// Handle Install Button Click
if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
        if (isIOS()) {
            // Show iOS instructions modal
            iosInstallModal.classList.remove('hidden');
        } else if (deferredPrompt) {
            // Show Android native install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installAppBtn.classList.add('hidden');
            }
            deferredPrompt = null;
        } else {
            alert('เบราว์เซอร์ของคุณอาจไม่รองรับการติดตั้งแอปอัตโนมัติ หรือคุณได้ติดตั้งไปแล้วครับ');
        }
    });
}

// Close iOS Modal
if (closeIosModalBtn) {
    closeIosModalBtn.addEventListener('click', () => {
        iosInstallModal.classList.add('hidden');
    });
}

// Load Global Stats
async function loadGlobalStats() {
    try {
        const linksRef = collection(db, "shortlinks");
        
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        // 0. Total Users
        const usersRef = collection(db, "users");
        try {
            const totalUsersSnap = await getCountFromServer(usersRef);
            document.getElementById('globalStatTotalUsers').textContent = totalUsersSnap.data().count.toLocaleString();
        } catch (e) {
            console.error("Error counting users (maybe missing rules):", e);
            document.getElementById('globalStatTotalUsers').textContent = "-";
        }
        
        // 1. Total Links
        const totalLinksSnap = await getCountFromServer(linksRef);
        document.getElementById('globalStatTotalLinks').textContent = totalLinksSnap.data().count.toLocaleString();
        
        // 2. Today Links
        const qTodayLinks = query(linksRef, where("createdAt", ">=", startOfToday));
        const todayLinksSnap = await getCountFromServer(qTodayLinks);
        document.getElementById('globalStatTodayLinks').textContent = todayLinksSnap.data().count.toLocaleString();
        
        // 3. Total Clicks
        const totalClicksSnap = await getAggregateFromServer(linksRef, {
            total: sum("clicks")
        });
        document.getElementById('globalStatTotalClicks').textContent = totalClicksSnap.data().total.toLocaleString();
        
        // 4. Today Clicks
        const todayClicksSnap = await getAggregateFromServer(linksRef, {
            today: sum(`clicks_${todayStr}`)
        });
        document.getElementById('globalStatTodayClicks').textContent = todayClicksSnap.data().today.toLocaleString();
        
    } catch (err) {
        console.error("Error loading global stats:", err);
    }
}

// Call on startup
loadGlobalStats();
