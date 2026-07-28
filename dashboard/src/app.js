/**
 * NeuroWatch AI - Clinical Edge EEG Monitoring Dashboard
 * JavaScript Application Logic & Interactive Features
 */

document.addEventListener('DOMContentLoaded', () => {
    initLiveClock();
    initPatientSearch();
    initLoginForm();
    initModelDeploySimulation();
});

/**
 * 1. Dynamic Clock & Status Header Update
 */
function initLiveClock() {
    const updateTime = () => {
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        
        // Find clock elements in header
        const clockContainers = document.querySelectorAll('header .font-mono-data span');
        clockContainers.forEach(span => {
            if (span.textContent.includes('Time:') || /^\d{2}:\d{2}:\d{2}$/.test(span.textContent.trim())) {
                span.textContent = `Time: ${timeString}`;
            }
        });
    };
    
    updateTime();
    setInterval(updateTime, 1000);
}

/**
 * 2. Real-Time Patient Filter & Search
 */
function initPatientSearch() {
    const searchInputs = document.querySelectorAll('header input[placeholder*="Search"]');
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const patientCards = document.querySelectorAll('.grid > div');

            patientCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (!query || text.includes(query)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

/**
 * 3. Login Authentication Simulation
 */
function initLoginForm() {
    const loginForm = document.querySelector('form');
    if (!loginForm) return;

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const loginBtn = loginForm.querySelector('a, button');
        if (!loginBtn) return;

        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Authenticating Hospital Credentials...</span>
        `;

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1200);
    });
}

/**
 * 4. OTA Model Deployment & Retraining Interactions
 */
function initModelDeploySimulation() {
    const deployButtons = document.querySelectorAll('button:contains("Deploy"), button:contains("Publish")');
    deployButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Broadcasting OTA to Edge Nodes...';
            btn.classList.add('opacity-75');

            setTimeout(() => {
                alert('✅ OTA Model Package (Checksum: sha256-e9a8f2) successfully pushed to all active Raspberry Pi Edge Nodes!');
                btn.textContent = originalText;
                btn.disabled = false;
                btn.classList.remove('opacity-75');
            }, 2000);
        });
    });
}
