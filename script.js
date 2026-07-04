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

    let currentMode = 'qrcode'; // 'qrcode' or 'barcode'
    let currentColor = '#f97316'; // Default Orange
    let qrCodeInstance = null;

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

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update Active Class
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            currentMode = tab.dataset.target;

            // Toggle Barcode format options
            if (currentMode === 'barcode') {
                barcodeFormatContainer.classList.remove('hidden');
                inputData.placeholder = "รหัสบาร์โค้ด เช่น 123456789";
            } else {
                barcodeFormatContainer.classList.add('hidden');
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
            const img = qrcodeDisplay.querySelector('img');
            const canvas = qrcodeDisplay.querySelector('canvas');
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
});
