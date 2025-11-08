// ==========================================
// EDUPREDICT - AUTHENTICATION & PREDICTION SYSTEM
// ==========================================

// DOM Elements - Global
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const authNav = document.getElementById('auth-nav');
const logoutNav = document.getElementById('logout-nav');
const userNameDisplay = document.getElementById('user-name-display');
const toast = document.getElementById('toast');

// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type = 'info') {
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');
    
    // Using 'active' for showing the toast
    toast.className = `toast ${type} active`; 
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    toastIcon.textContent = icons[type] || icons.info;
    toastMessage.textContent = message;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
function openModal(modal) {
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// ==========================================
// LOCALSTORAGE USER MANAGEMENT
// ==========================================
function getUsers() {
    const users = localStorage.getItem('edupredict_users');
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem('edupredict_users', JSON.stringify(users));
}

function getCurrentUser() {
    const currentUser = localStorage.getItem('edupredict_current_user');
    return currentUser ? JSON.parse(currentUser) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('edupredict_current_user', JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem('edupredict_current_user');
}

function emailExists(email) {
    const users = getUsers();
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
}

function findUser(email, password) {
    const users = getUsers();
    return users.find(user => 
        user.email.toLowerCase() === email.toLowerCase() && 
        user.password === password
    );
}

// Register new user (including backend API call)
async function registerUser(userData) {
    const users = getUsers();
    
    if (emailExists(userData.email)) {
        return { success: false, message: 'Email already registered!' };
    }
    
    const newUser = {
        id: Date.now().toString(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password, 
        role: userData.role,
        registeredAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Attempt to register in backend DB
    try {
        await fetch(`${API_BASE_URL}/register_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: newUser.id,
                first_name: newUser.firstName,
                last_name: newUser.lastName,
                email: newUser.email,
                role: newUser.role
            })
        });
    } catch (error) {
        console.error('Backend registration failed (Server may be offline):', error);
        showToast('Local registration successful, but backend sync failed!', 'warning');
    }
    
    return { success: true, message: 'Registration successful!', user: newUser };
}

// Login user
function loginUser(email, password) {
    const user = findUser(email, password);
    
    if (!user) {
        return { success: false, message: 'Invalid email or password!' };
    }
    
    setCurrentUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
    });
    
    return { success: true, message: 'Login successful!', user: user };
}

// ==========================================
// UI UPDATE & PAGE ROUTING (Centralized Logic)
// ==========================================
function updateUI() {
    const currentUser = getCurrentUser();
    const currentPath = window.location.pathname.split("/").pop();
    const isLandingPage = document.getElementById('landing-page');
    
    const privatePages = [
        'dashboard.html', 'predict.html', 'history.html', 
        'admin_settings.html', 'model_performance.html', 'data_upload.html', 
        'intervention_log.html', 'risk_report.html'
    ];

    if (currentUser) {
        // Logged In: Show user info, hide auth buttons
        if (authNav) authNav.style.display = 'none';
        if (logoutNav) logoutNav.style.display = 'block';
        if (userNameDisplay) userNameDisplay.textContent = `Welcome, ${currentUser.firstName}!`;
        
        // Redirect if logged-in user hits the public landing page
        if (isLandingPage) {
            window.location.href = 'dashboard.html';
        }
        
        // Load data specific to the current page
        if (currentPath === 'dashboard.html') {
            loadDashboardData();
        } else if (currentPath === 'history.html') {
            loadHistoryData();
        }
        
    } else {
        // Logged Out: Show auth buttons, hide user info
        if (authNav) authNav.style.display = 'block';
        if (logoutNav) logoutNav.style.display = 'none';
        
        // Redirect if logged-out user tries to access any private page
        if (privatePages.includes(currentPath)) {
            showToast('Access Denied. Please log in.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
    }
}

// ==========================================
// API INTEGRATION - PREDICTION (FIXED to read all 10 fields)
// ==========================================
async function handlePredictionSubmit(e) {
    e.preventDefault();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('Please log in to make a prediction.', 'error');
        return;
    }
    
    showToast('🚀 Sending data to AI model...', 'info');

    // --- FIX APPLIED: Safely collect ALL 10 fields ---
    // The simplified form only shows 5 fields, but the ML model (main.py) requires 10.
    // The other 5 are read from hidden input fields placed in predict.html.
    try {
        const formData = {
            // CORE VISIBLE FIELDS
            avg_grade: parseFloat(document.getElementById('avg_grade').value),
            units_approved: parseInt(document.getElementById('units_approved').value),
            tuition_status: parseInt(document.getElementById('tuition_status').value),
            scholarship: parseInt(document.getElementById('scholarship').value),
            age: parseInt(document.getElementById('age').value),

            // HIDDEN/DEFAULT FIELDS (Must be read from the HTML elements)
            marital_status: parseInt(document.getElementById('marital_status').value),
            admission_grade: parseFloat(document.getElementById('admission_grade').value),
            international: parseInt(document.getElementById('international').value),
            gender: parseInt(document.getElementById('gender').value),
            gdp: parseFloat(document.getElementById('gdp').value)
        };
        
        // --- API Call ---
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: currentUser.id,
                ...formData
            })
        });

        const result = await response.json();
        const resultCard = document.getElementById('prediction-result');
        const resultText = document.getElementById('result-text');
        const resultDescription = document.getElementById('result-description');
        
        resultCard.style.display = 'block';
        resultCard.className = 'result-card'; 

        if (result.success) {
            const prediction = result.prediction;
            const risk_level = prediction.risk_level;

            resultCard.classList.add(`${risk_level === 'high' ? 'danger' : risk_level === 'medium' ? 'warning-card' : 'success'}`);
            resultText.innerHTML = `${risk_level === 'high' ? '⚠️' : risk_level === 'medium' ? '⚡' : '✓'} ${prediction.risk_text}`;
            resultText.style.color = `var(--${risk_level === 'high' ? 'danger' : risk_level === 'medium' ? 'warning' : 'success'})`;
            showToast(`${risk_level.toUpperCase()} Risk Detected!`, risk_level === 'high' ? 'error' : risk_level === 'medium' ? 'info' : 'success');

            // Detailed Result Description (using prediction data)
            resultDescription.innerHTML = `
                <strong>Risk Score: ${prediction.risk_score}/${prediction.max_score}</strong> | Dropout Probability: ${Math.round(prediction.proba_dropout * 100)}%<br>
                <strong>Confidence: ${Math.round(prediction.confidence * 100)}%</strong><br>
                <div style="margin-top: 1.5rem; text-align: left;">
                    <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">Risk Factors Identified:</h4>
                    <ul style="list-style: disc; margin-left: 20px; color: var(--text-secondary);">
                        ${prediction.risk_factors.map(f => `<li>${f}</li>`).join('') || '<li>No major risk factors detected.</li>'}
                    </ul>
                    <h4 style="color: var(--text-primary); margin-top: 1.5rem; margin-bottom: 0.5rem;">Actionable Recommendations:</h4>
                    <ul style="list-style: disc; margin-left: 20px; color: var(--text-secondary);">
                        ${prediction.recommendations.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            `;
            
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } else {
            console.error('Prediction API returned failure:', result.error);
            resultText.textContent = '❌ PREDICTION FAILED';
            resultText.style.color = 'var(--danger)';
            resultDescription.textContent = `Error: ${result.error || 'Server error occurred.'}`;
            resultCard.classList.add('danger');
            showToast('Prediction failed. Check console.', 'error');
        }
        
    } catch (error) {
        console.error('API Error during prediction:', error);
        showToast('Could not connect to the backend server.', 'error');
    }
}

// ==========================================
// API INTEGRATION - DASHBOARD (Used by dashboard.html)
// ==========================================
async function loadDashboardData() {
    try {
        showToast('Fetching statistics...', 'info');
        const response = await fetch(`${API_BASE_URL}/stats`);
        const result = await response.json();
        
        if (result.success) {
            const stats = result.stats;
            const modelInfo = result.model_info;
            
            // Populate the main statistics cards
            const totalPredictionsElement = document.getElementById('total-predictions');
            if (totalPredictionsElement) totalPredictionsElement.textContent = stats.total_predictions.toLocaleString();

            const totalUsersElement = document.getElementById('total-users');
            if (totalUsersElement) totalUsersElement.textContent = stats.total_users.toLocaleString();
            
            const highRiskCountElement = document.getElementById('high-risk-count');
            if (highRiskCountElement) highRiskCountElement.textContent = stats.high_risk.toLocaleString();

            const mediumRiskCountElement = document.getElementById('medium-risk-count');
            if (mediumRiskCountElement) mediumRiskCountElement.textContent = stats.medium_risk.toLocaleString();

            const lowRiskCountElement = document.getElementById('low-risk-count');
            if (lowRiskCountElement) lowRiskCountElement.textContent = stats.low_risk.toLocaleString();
            
            // Model Info
            const modelNameElement = document.getElementById('model-name');
            if (modelNameElement) modelNameElement.textContent = modelInfo.model_name;

            const modelAlgoElement = document.getElementById('model-algo');
            if (modelAlgoElement) modelAlgoElement.textContent = modelInfo.algorithm;

            const modelAccuracyElement = document.getElementById('model-accuracy');
            if (modelAccuracyElement) modelAccuracyElement.textContent = `${modelInfo.latest_test_accuracy ? (modelInfo.latest_test_accuracy * 100).toFixed(2) + '%' : 'N/A'}`;

            // Chart data - Placeholder
            const riskBreakdownElement = document.getElementById('risk-breakdown');
            if (riskBreakdownElement) {
                riskBreakdownElement.innerHTML = `
                    <div class="stat-progress high" style="width: ${stats.high_risk_percentage}%">High Risk: ${stats.high_risk_percentage}%</div>
                    <div class="stat-progress medium" style="width: ${stats.medium_risk_percentage}%">Medium Risk: ${stats.medium_risk_percentage}%</div>
                    <div class="stat-progress low" style="width: ${stats.low_risk_percentage}%">Low Risk: ${stats.low_risk_percentage}%</div>
                `;
            }
            
            showToast('Statistics loaded successfully!', 'success');
        } else {
            showToast(`Error loading dashboard data: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('API Error during dashboard load:', error);
        showToast('Could not connect to the backend server for statistics.', 'error');
    }
}

// ==========================================
// API INTEGRATION - HISTORY (Used by history.html)
// ==========================================
async function loadHistoryData() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
        showToast('Fetching prediction history...', 'info');
        const response = await fetch(`${API_BASE_URL}/history/${currentUser.id}`);
        const result = await response.json();
        const historyTableBody = document.getElementById('history-table-body');
        
        if (historyTableBody) historyTableBody.innerHTML = ''; // Clear existing data

        if (result.success && result.history.length > 0) {
            result.history.forEach((pred, index) => {
                const row = historyTableBody.insertRow();
                
                // Ensure risk_factors is an array before mapping
                const riskFactors = Array.isArray(pred.risk_factors) ? pred.risk_factors : [];

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${pred.formatted_date}</td>
                    <td class="risk-level-${pred.risk_level}">${pred.risk_level.toUpperCase()}</td>
                    <td>${pred.risk_score}/${pred.risk_score_max || 10}</td>
                    <td>${(pred.confidence * 100).toFixed(1)}%</td>
                    <td class="tooltip-container">
                        ${riskFactors.length} factors 
                        <span class="tooltip-text">
                            ${riskFactors.map(f => `• ${f}`).join('<br>') || 'None'}
                        </span>
                    </td>
                    <td><button class="btn-xs btn-outline-primary" onclick="window.location.href='risk_report.html?id=${pred.id}'">View</button></td>
                `;
            });
            showToast(`Loaded ${result.count} past predictions.`, 'success');
        } else {
            historyTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No prediction history found.</td></tr>`;
            showToast('No history found.', 'info');
        }
    } catch (error) {
        console.error('API Error during history load:', error);
        showToast('Could not connect to the backend server for history.', 'error');
    }
}

// ==========================================
// INITIALIZE APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateUI(); 

    // Global listeners for modals
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const getStartedBtn = document.getElementById('get-started-btn');
    const demoBtn = document.getElementById('demo-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const closeButtons = document.querySelectorAll('.close-btn');

    if (loginLink) loginLink.addEventListener('click', () => openModal(loginModal));
    if (registerLink) registerLink.addEventListener('click', () => openModal(registerModal));
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => openModal(registerModal));
    if (demoBtn) demoBtn.addEventListener('click', () => showToast('Demo feature coming soon!', 'info'));

    // --- FIX 1: Logout Button Event Listener ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearCurrentUser();
            showToast('Logged out successfully', 'info');
            setTimeout(() => { window.location.href = 'index.html'; }, 500);
        });
    }
    // ----------------------------------------

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(loginModal);
            openModal(registerModal);
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(registerModal);
            openModal(loginModal);
        });
    }

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(document.getElementById(btn.getAttribute('data-modal')));
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) closeModal(loginModal);
        if (e.target === registerModal) closeModal(registerModal);
    });

    // Handle Login/Register Form Submissions (unchanged logic)
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('register-first-name').value.trim();
            const lastName = document.getElementById('register-last-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const role = document.getElementById('register-role').value;
            const password = document.getElementById('register-password').value;
            
            if (!firstName || !lastName || !email || !role || !password || password.length < 6) {
                showToast('Please check all fields: Password min 6 chars.', 'error');
                return;
            }
            
            const result = await registerUser({ firstName, lastName, email, password, role });
            
            if (result.success) {
                setCurrentUser({
                    id: result.user.id,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName,
                    email: result.user.email,
                    role: result.user.role
                });
                
                closeModal(registerModal);
                showToast(`Welcome, ${firstName}! Redirecting to dashboard...`, 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
                
                registerForm.reset();
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showToast('Please enter email and password!', 'error');
                return;
            }
            
            const result = loginUser(email, password);
            
            if (result.success) {
                closeModal(loginModal);
                showToast(`Welcome back, ${result.user.firstName}! Redirecting...`, 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html'; 
                }, 1000);
                
                loginForm.reset();
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // Prediction Form Submission - ONLY on predict.html
    const predictionForm = document.getElementById('prediction-form');
    if (predictionForm) {
        predictionForm.addEventListener('submit', handlePredictionSubmit);
    }
});
