const fs = require('fs');

// 1. Update style.css
let css = fs.readFileSync('style.css', 'utf8');

const rootVars = `
:root {
    --primary: #f97316;
    --primary-dark: #ea580c;
    --primary-light: #fdba74;
    --bg-color: #fff7ed;
    --card-bg: rgba(255, 255, 255, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --border: rgba(0, 0, 0, 0.1);
    --input-bg: rgba(0, 0, 0, 0.05);
    --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
    --glass-blur: blur(12px);
    --nav-height: 70px;
}

[data-theme="light-orange"] { --primary: #f97316; --primary-dark: #ea580c; --bg-color: #fff7ed; --card-bg: rgba(255,255,255,0.9); --text-main: #0f172a; --text-muted: #64748b; --border: rgba(0,0,0,0.1); --input-bg: rgba(0,0,0,0.05); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.1); }
[data-theme="light-blue"] { --primary: #0ea5e9; --primary-dark: #0284c7; --bg-color: #f0f9ff; --card-bg: rgba(255,255,255,0.9); --text-main: #0f172a; --text-muted: #64748b; --border: rgba(0,0,0,0.1); --input-bg: rgba(0,0,0,0.05); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.1); }
[data-theme="light-green"] { --primary: #10b981; --primary-dark: #059669; --bg-color: #ecfdf5; --card-bg: rgba(255,255,255,0.9); --text-main: #0f172a; --text-muted: #64748b; --border: rgba(0,0,0,0.1); --input-bg: rgba(0,0,0,0.05); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.1); }
[data-theme="light-purple"] { --primary: #8b5cf6; --primary-dark: #7c3aed; --bg-color: #f5f3ff; --card-bg: rgba(255,255,255,0.9); --text-main: #0f172a; --text-muted: #64748b; --border: rgba(0,0,0,0.1); --input-bg: rgba(0,0,0,0.05); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.1); }

[data-theme="dark-orange"] { --primary: #f97316; --primary-dark: #ea580c; --bg-color: #0f172a; --card-bg: rgba(30,41,59,0.8); --text-main: #f8fafc; --text-muted: #94a3b8; --border: rgba(255,255,255,0.1); --input-bg: rgba(0,0,0,0.2); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.37); }
[data-theme="dark-blue"] { --primary: #38bdf8; --primary-dark: #0ea5e9; --bg-color: #0f172a; --card-bg: rgba(30,41,59,0.8); --text-main: #f8fafc; --text-muted: #94a3b8; --border: rgba(255,255,255,0.1); --input-bg: rgba(0,0,0,0.2); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.37); }
[data-theme="dark-green"] { --primary: #34d399; --primary-dark: #10b981; --bg-color: #0f172a; --card-bg: rgba(30,41,59,0.8); --text-main: #f8fafc; --text-muted: #94a3b8; --border: rgba(255,255,255,0.1); --input-bg: rgba(0,0,0,0.2); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.37); }
[data-theme="dark-purple"] { --primary: #a78bfa; --primary-dark: #8b5cf6; --bg-color: #0f172a; --card-bg: rgba(30,41,59,0.8); --text-main: #f8fafc; --text-muted: #94a3b8; --border: rgba(255,255,255,0.1); --input-bg: rgba(0,0,0,0.2); --glass-shadow: 0 8px 32px 0 rgba(0,0,0,0.37); }

.theme-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}
.theme-circle:hover {
    transform: scale(1.2);
    box-shadow: 0 0 8px rgba(0,0,0,0.2);
}
`;

css = css.replace(/:root \{[\s\S]*?--nav-height: 70px;\n\}/, rootVars);

// Replace hardcoded inputs backgrounds
css = css.replace(/background: rgba\(0, 0, 0, 0\.2\);/g, 'background: var(--input-bg);');
css = css.replace(/background: rgba\(0, 0, 0, 0\.3\);/g, 'background: var(--input-bg);');
css = css.replace(/color: white;/g, 'color: var(--text-main);');
css = css.replace(/background: rgba\(0, 0, 0, 0\.15\);/g, 'background: var(--input-bg);');
css = css.replace(/background: rgba\(15, 23, 42, 0\.8\);/g, 'background: var(--card-bg);');
css = css.replace(/background: linear-gradient\(145deg, rgba\(30, 41, 59, 0\.9\), rgba\(15, 23, 42, 0\.9\)\);/, 'background: var(--card-bg);');

fs.writeFileSync('style.css', css);

// 2. Update index.html
let html = fs.readFileSync('index.html', 'utf8');

const themeButtons = `
            <!-- Theme Color Picker -->
            <div class="theme-picker" style="display: flex; align-items: center; gap: 8px;">
                <button class="theme-circle" data-theme="light-orange" style="background: #fff7ed; border: 2px solid #f97316;" title="สว่าง-ส้ม"></button>
                <button class="theme-circle" data-theme="light-blue" style="background: #f0f9ff; border: 2px solid #0ea5e9;" title="สว่าง-ฟ้า"></button>
                <button class="theme-circle" data-theme="light-green" style="background: #ecfdf5; border: 2px solid #10b981;" title="สว่าง-เขียว"></button>
                <button class="theme-circle" data-theme="light-purple" style="background: #f5f3ff; border: 2px solid #8b5cf6;" title="สว่าง-ม่วง"></button>
                <div style="width: 1px; height: 16px; background: var(--border); margin: 0 4px;"></div>
                <button class="theme-circle" data-theme="dark-orange" style="background: #0f172a; border: 2px solid #f97316;" title="มืด-ส้ม"></button>
                <button class="theme-circle" data-theme="dark-blue" style="background: #0f172a; border: 2px solid #38bdf8;" title="มืด-ฟ้า"></button>
                <button class="theme-circle" data-theme="dark-green" style="background: #0f172a; border: 2px solid #34d399;" title="มืด-เขียว"></button>
                <button class="theme-circle" data-theme="dark-purple" style="background: #0f172a; border: 2px solid #a78bfa;" title="มืด-ม่วง"></button>
            </div>`;

html = html.replace(/<div class="theme-picker"[\s\S]*?<\/div>/, themeButtons);
fs.writeFileSync('index.html', html);

// 3. Update script.js
let js = fs.readFileSync('script.js', 'utf8');

const jsLogic = `
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
`;

js = js.replace(/const themeColorInput = document\.getElementById\('themeColor'\);[\s\S]*?document\.documentElement\.style\.setProperty\('--primary-light', savedTheme\);\n\}/, jsLogic);

fs.writeFileSync('script.js', js);
console.log("Updated themes successfully!");
