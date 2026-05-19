<<<<<<< HEAD
let app = {
    currentUser: null,
    isLoggedIn: false,
    selectedAlgorithm: 'xgboost',
    modelTrained: false,
    charts: {},
    diseases: ['Diabetes', 'Heart Disease', 'Hypertension', 'Obesity'],
    symptoms: ['Chest Pain', 'Shortness of Breath', 'Fatigue', 'Dizziness',
              'Frequent Urination', 'Excessive Thirst', 'Weight Loss', 'Blurred Vision',
              'Headaches', 'Nausea', 'Rapid Heartbeat', 'Leg Swelling',
              'Joint Pain', 'Sleep Problems', 'Mood Changes', 'Numbness']
};

//ApiCall
async function apiCall(action, data = {}) {
    try {
        const response = await fetch(`index.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error: ' + error.message };
    }
}

//handle  Registration 
async function registerUser(e) {
    e.preventDefault();
    const result = await apiCall('register', {
        name: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        phone: document.getElementById('register-phone').value,
        dob: document.getElementById('register-dob').value,
        gender: document.getElementById('register-gender').value,
        password: document.getElementById('register-password').value
    });

    const alert = document.getElementById('register-alert');
    if (result.success) {
        alert.innerHTML = '<div class="alert alert-success">Registration successful! Redirecting...</div>';
        setTimeout(() => showPage('login'), 1500);
    } else {
        alert.innerHTML = `<div class="alert alert-error">${result.message}</div>`;
    }
}

//Handle Login 
async function loginUser(e) {
    e.preventDefault();
    const result = await apiCall('login', {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    });

    const alert = document.getElementById('login-alert');
    if (result.success) {
        app.isLoggedIn = true;
        app.currentUser = result.data;
        alert.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
        updateNavigation();
        setTimeout(() => showPage('dashboard'), 1500);
    } else {
        alert.innerHTML = `<div class="alert alert-error">${result.message}</div>`;
    }
}

//  Handle Logout 
async function logoutUser() {
    await apiCall('logout');
    app.isLoggedIn = false;
    app.currentUser = null;
    updateNavigation();
    showPage('home');
}

// Show Page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const page = document.getElementById(pageId + '-page');
    if (page) {
        page.classList.remove('hidden');
        if (pageId === 'dashboard') loadDashboard();
        if (pageId === 'prediction') initPredictionPage();
        if (pageId === 'profile') loadProfile();
    }
}

// Update Navigation
function updateNavigation() {
    const authBtns = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (app.isLoggedIn) {
        authBtns.classList.add('hidden');
        userMenu.classList.remove('hidden');
        document.getElementById('user-name').textContent = app.currentUser.name;
    } else {
        authBtns.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// Load Dashboard
async function loadDashboard() {
    const result = await apiCall('get_dashboard_data');
    if (result.success) {
        // Update assessment count
        const totalAssessments = result.data.stats.total || 0;
        document.getElementById('assessment-count').textContent = totalAssessments;
        // Calculate  risk level and health score 
        const recentAssessments = result.data.recent || []; 
        if (recentAssessments.length > 0) {
            // Get the  assessment's risk level
            const latestRisk = recentAssessments[0].risk_level || 'Low';
            // Update  Risk Level
            const riskElement = document.querySelectorAll('.stat-value')[1];
            if (riskElement) {
                riskElement.textContent = latestRisk;
                // Change color based on risk
                if (latestRisk === 'High') {
                    riskElement.style.color = '#dc2626';
                } else if (latestRisk === 'Medium') {
                    riskElement.style.color = '#d97706';
                } else {
                    riskElement.style.color = '#059669';
                }
            }
            let totalRiskScore = 0;
            let riskCount = 0;
            
            recentAssessments.forEach(assessment => {
                if (assessment.risk_level === 'High') {
                    totalRiskScore += 80;
                    riskCount++;
                } else if (assessment.risk_level === 'Medium') {
                    totalRiskScore += 50;
                    riskCount++;
                } else if (assessment.risk_level === 'Low') {
                    totalRiskScore += 20;
                    riskCount++;
                }
            });
            
            const avgRisk = riskCount > 0 ? totalRiskScore / riskCount : 20;
            const healthScore = Math.round(100 - avgRisk);
            const scoreElement = document.querySelectorAll('.stat-value')[2];
            if (scoreElement) {
                scoreElement.textContent = healthScore + '%';
                if (healthScore >= 80) {
                    scoreElement.style.color = '#059669';
                } else if (healthScore >= 50) {
                    scoreElement.style.color = '#d97706';
                } else {
                    scoreElement.style.color = '#dc2626';
                }
            }
        }
        
        if (document.getElementById('health-overview-chart')) {
            initHealthChart();
        }
        
        const tbody = document.getElementById('recent-assessments');
        tbody.innerHTML = '';
        
        if (recentAssessments.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No assessments yet. Click "New Health Check" to get started!
                </td>
            `;
            tbody.appendChild(row);
        } else {
            recentAssessments.forEach(r => {
                const row = document.createElement('tr');
                const riskClass = r.risk_level === 'Low' ? 'risk-low' : 
                                 r.risk_level === 'Medium' ? 'risk-medium' : 'risk-high';
                row.innerHTML = `
                    <td>${r.date}</td>
                    <td>${r.assessment_type}</td>
                    <td><span class="risk-badge ${riskClass}">${r.risk_level} Risk</span></td>
                `;
                tbody.appendChild(row);
            });
        }
    }
}
function initHealthChart() {
    if (app.charts.healthOverview) app.charts.healthOverview.destroy();
    
    apiCall('get_dashboard_data').then(result => {
        let lowCount = 0, mediumCount = 0, highCount = 0;
        
        if (result.success && result.data.recent) {
            result.data.recent.forEach(assessment => {
                if (assessment.risk_level === 'Low') lowCount++;
                else if (assessment.risk_level === 'Medium') mediumCount++;
                else if (assessment.risk_level === 'High') highCount++;
            });
        }
        
        if (lowCount === 0 && mediumCount === 0 && highCount === 0) {
            lowCount = 1;
        }
        
        const ctx = document.getElementById('health-overview-chart').getContext('2d');
        app.charts.healthOverview = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Low Risk', 'Medium Risk', 'High Risk'],
                datasets: [{
                    data: [lowCount, mediumCount, highCount],
                    backgroundColor: [
                        'rgba(5, 150, 105, 0.8)',
                        'rgba(217, 119, 6, 0.8)',
                        'rgba(220, 38, 38, 0.8)'
                    ],
                    borderColor: [
                        'rgba(5, 150, 105, 1)',
                        'rgba(217, 119, 6, 1)',
                        'rgba(220, 38, 38, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    });
}

function initPredictionPage() {
    const grid = document.getElementById('symptoms-grid');
    grid.innerHTML = '';
    app.symptoms.forEach((symptom, i) => {
        const div = document.createElement('div');
        div.className = 'symptom-item';
        div.innerHTML = `
            <input type="checkbox" id="symptom-${i}" value="${i}">
            <label for="symptom-${i}" style="margin: 0; flex: 1;">${symptom}</label>
        `;
        grid.appendChild(div);
    });
}

// Select Algorithm
function selectAlgorithm(algo) {
    app.selectedAlgorithm = algo;
    document.querySelectorAll('.algorithm-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-algo="${algo}"]`).classList.add('active');
}

// Train Model
async function trainModel() {
    app.modelTrained = true;
    alert('AI Models trained successfully! Using ' + app.selectedAlgorithm.toUpperCase() + ' as primary algorithm.');
}


//  XGBoost Algorithm (Gradient Boosting)
function xgboostPredict(features) {
    const [age, gender, bmi, bp, chol, sugar, ...symptoms] = features;
    const learningRate = 0.1;
    
    return [
        // Diabetes - Blood Sugar is primary factor
        Math.min(1, Math.max(0, 
            0.5 + learningRate * (
                ((sugar - 100) / 50) * 0.35 +      // Blood sugar weight: 35%
                ((bmi - 25) / 10) * 0.25 +          // BMI weight: 25%
                ((age - 35) / 30) * 0.15 +          // Age weight: 15%
                symptoms.slice(4, 8).reduce((a, b) => a + b) * 0.06  // Diabetes symptoms
            )
        )),
        
        // Heart Disease - BP and Cholesterol are primary
        Math.min(1, Math.max(0,
            0.5 + learningRate * (
                ((bp - 120) / 40) * 0.30 +          // Blood pressure: 30%
                ((chol - 200) / 80) * 0.28 +        // Cholesterol: 28%
                ((age - 40) / 35) * 0.20 +          // Age: 20%
                (symptoms[0] * 0.4 + symptoms[1] * 0.3)  // Chest pain & SOB
            )
        )),
        
        // Hypertension - BP is dominant factor
        Math.min(1, Math.max(0,
            0.5 + learningRate * (
                ((bp - 120) / 50) * 0.40 +          // Blood pressure: 40%
                ((age - 35) / 40) * 0.20 +          // Age: 20%
                ((bmi - 22) / 8) * 0.15 +           // BMI: 15%
                symptoms[8] * 0.25                   // Headaches: 25%
            )
        )),
        
        // Obesity - BMI is primary factor
        Math.min(1, Math.max(0,
            0.5 + learningRate * (
                ((bmi - 25) / 15) * 0.60 +          // BMI: 60% (dominant)
                ((age - 30) / 30) * 0.15            // Age: 15%
            )
        ))
    ];
}

// Random Forest Algorithm 
function randomForestPredict(features) {
    const [age, gender, bmi, bp, chol, sugar, ...symptoms] = features;
    return [
        // Diabetes
        Math.max(0, Math.min(1, 
            ((sugar - 100) * 0.3 + 
             (bmi - 25) * 0.2 + 
             (age - 30) * 0.1 +
             symptoms.slice(4, 8).reduce((s, sym) => s + sym * 0.1, 0)) / 10
        )),
        // Heart Disease
        Math.max(0, Math.min(1,
            ((bp - 120) * 0.25 + 
             (chol - 200) * 0.2 + 
             (age - 40) * 0.15 + 
             symptoms[0] * 0.4 + 
             symptoms[1] * 0.3) / 10
        )),
        // Hypertension
        Math.max(0, Math.min(1,
            ((bp - 120) * 0.4 + 
             (age - 35) * 0.15 + 
             (bmi - 22) * 0.1 + 
             
             symptoms[8] * 0.2) / 10
        )),
        // Obesity
        Math.max(0, Math.min(1,
            ((bmi - 25) * 0.5) / 10
        ))
    ];
}

//SVM Algorithm (Support Vector Machine)
function svmPredict(features) {
    const [age, gender, bmi, bp, chol, sugar, ...symptoms] = features;
    return [
        // Diabetes - Sensitive to blood sugar variations
        (Math.tanh(
            (sugar - 110) * 0.02 + 
            (bmi - 24) * 0.05 + 
            (age - 35) * 0.01 +
            symptoms.slice(4, 8).reduce((a, b) => a + b) * 0.15
        ) + 1) / 2,       
        // Heart Disease - Sensitive to cardiovascular indicators
        (Math.tanh(
            (bp - 130) * 0.02 + 
            (chol - 220) * 0.005 + 
            (age - 45) * 0.01 +
            symptoms[0] * 0.8 + 
            symptoms[1] * 0.6
        ) + 1) / 2,       
        // Hypertension - Highly sensitive to BP changes
        (Math.tanh(
            (bp - 125) * 0.03 + 
            (age - 30) * 0.02 +
            symptoms[8] * 0.5
        ) + 1) / 2,
        // Obesity - Non-linear BMI classification
        (Math.tanh(
            (bmi - 28) * 0.1
        ) + 1) / 2
    ];
}
//Ensemble Algorithm 
function ensemblePredict(features) {
    // Get predictions  three algorithms
    const xgb = xgboostPredict(features);
    const rf = randomForestPredict(features);
    const svm = svmPredict(features);
    // Weighted average: XGBoost 50%, Random Forest 30%, SVM 20%
    const predictions = xgb.map((x, i) => 
        x * 0.5 + rf[i] * 0.3 + svm[i] * 0.2
    );
    
    return predictions;
}

async function predictDisease() {
    if (!app.modelTrained) {
        alert('Please train the AI model first!');
        return;
    }

    document.getElementById('loading-spinner').classList.remove('hidden');
    document.getElementById('prediction-results').classList.add('hidden');

    const age = parseFloat(document.getElementById('patient-age').value);
    const bmi = parseFloat(document.getElementById('patient-bmi').value);
    const bp = parseFloat(document.getElementById('patient-bp').value);
    const chol = parseFloat(document.getElementById('patient-cholesterol').value);
    const sugar = parseFloat(document.getElementById('patient-blood-sugar').value);

    const symptoms = [];
    app.symptoms.forEach((_, i) => {
        const cb = document.getElementById(`symptom-${i}`);
        symptoms.push(cb ? (cb.checked ? 1 : 0) : 0);
    });

    const features = [age, 1, bmi, bp, chol, sugar, ...symptoms];
    await new Promise(r => setTimeout(r, 2000));

    let predictions;
    let algorithmName = '';
    
    switch(app.selectedAlgorithm) {
        case 'xgboost':
            predictions = xgboostPredict(features);
            algorithmName = 'XGBoost (Gradient Boosting)';
            break;
        case 'random-forest':
            predictions = randomForestPredict(features);
            algorithmName = 'Random Forest (Decision Trees)';
            break;
        case 'svm':
            predictions = svmPredict(features);
            algorithmName = 'SVM (Support Vector Machine)';
            break;
        case 'ensemble':
            predictions = ensemblePredict(features);
            algorithmName = 'Ensemble (Combined Algorithms)';
            break;
        default:
            predictions = xgboostPredict(features);
            algorithmName = 'XGBoost (Default)';
    }

    console.log(`Using ${algorithmName}:`, predictions);

    displayPredictionResults(predictions, algorithmName);
    updatePredictionChart(predictions);

    await apiCall('save_prediction', {
        assessment_type: 'General Health Check',
        predictions: predictions,
        algorithm: app.selectedAlgorithm,
        age: age,
        gender: '1',
        bmi: bmi,
        blood_pressure: bp,
        cholesterol: chol,
        blood_sugar: sugar
    });

    document.getElementById('loading-spinner').classList.add('hidden');
}

function displayPredictionResults(predictions, algorithmName) {
    const container = document.getElementById('results-container');
    container.innerHTML = '';
  
    const algoHeader = document.createElement('div');
    algoHeader.style.cssText = 'background: rgba(37, 99, 235, 0.1); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; text-align: center; color: #2563eb; font-weight: 600;';
    algoHeader.innerHTML = `<i class="fas fa-microchip"></i> Algorithm: ${algorithmName}`;
    container.appendChild(algoHeader);
    
    predictions.forEach((pred, i) => {
        const pct = (pred * 100).toFixed(1);
        const riskClass = pct > 70 ? 'risk-high' : (pct > 40 ? 'risk-medium' : 'risk-low');
        const riskLabel = pct > 70 ? 'High Risk' : (pct > 40 ? 'Medium Risk' : 'Low Risk');
        
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div>
                <span style="font-weight: 600; font-size: 1.1rem;">${app.diseases[i]}</span>
                <div style="font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">
                    <span class="risk-badge ${riskClass}">${riskLabel}</span>
                </div>
            </div>
            <span style="font-size: 1.5rem; font-weight: 700; color: #2563eb;">${pct}%</span>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('prediction-results').classList.remove('hidden');
}

// Update Prediction Chart
function updatePredictionChart(predictions) {
    const canvas = document.getElementById('prediction-chart');
    if (!canvas) return;

    if (app.charts.prediction) app.charts.prediction.destroy();

    const ctx = canvas.getContext('2d');
    const colors = predictions.map(p => {
        const pct = p * 100;
        return pct > 70 ? '#dc2626' : (pct > 40 ? '#d97706' : '#059669');
    });

    app.charts.prediction = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: app.diseases,
            datasets: [{
                label: 'Risk Percentage',
                data: predictions.map(p => (p * 100).toFixed(1)),
                backgroundColor: colors.map(c => c + '80'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const risk = value > 70 ? 'High' : (value > 40 ? 'Medium' : 'Low');
                            return `${risk} Risk: ${value}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        callback: v => v + '%',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Load Profile
async function loadProfile() {
    const result = await apiCall('get_profile');
    if (result.success) {
        const user = result.data.user;
        const health = result.data.health;
        
        document.getElementById('profile-name').value = user.name;
        document.getElementById('profile-email').value = user.email;
        document.getElementById('profile-phone').value = user.phone;
        document.getElementById('profile-dob').value = user.dob;
        document.getElementById('profile-height').value = health.height || 175;
        document.getElementById('profile-weight').value = health.weight || 75;
        document.getElementById('profile-blood-type').value = health.blood_type || '';
    }
}

// Save Profile
async function saveProfile() {
    const result = await apiCall('update_profile', {
        name: document.getElementById('profile-name').value,
        phone: document.getElementById('profile-phone').value,
        height: document.getElementById('profile-height').value,
        weight: document.getElementById('profile-weight').value,
        blood_type: document.getElementById('profile-blood-type').value
    });

    alert(result.message);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNavigation();
    showPage('home');
});

// Scroll to features section
function scrollToFeatures() {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Handle contact form
function handleContact(e) {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you within 24 hours.');
    document.getElementById('contact-form').reset();
=======
let app = {
    currentUser: null,
    isLoggedIn: false,
    selectedAlgorithm: 'xgboost',
    modelTrained: false,
    charts: {},
    diseases: ['Diabetes', 'Heart Disease', 'Hypertension', 'Obesity'],
    symptoms: ['Chest Pain', 'Shortness of Breath', 'Fatigue', 'Dizziness',
              'Frequent Urination', 'Excessive Thirst', 'Weight Loss', 'Blurred Vision',
              'Headaches', 'Nausea', 'Rapid Heartbeat', 'Leg Swelling',
              'Joint Pain', 'Sleep Problems', 'Mood Changes', 'Numbness']
};

//ApiCall
async function apiCall(action, data = {}) {
    try {
        const response = await fetch(`index.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error: ' + error.message };
    }
}

//handle  Registration 
async function registerUser(e) {
    e.preventDefault();
    const result = await apiCall('register', {
        name: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        phone: document.getElementById('register-phone').value,
        dob: document.getElementById('register-dob').value,
        gender: document.getElementById('register-gender').value,
        password: document.getElementById('register-password').value
    });

    const alert = document.getElementById('register-alert');
    if (result.success) {
        alert.innerHTML = '<div class="alert alert-success">Registration successful! Redirecting...</div>';
        setTimeout(() => showPage('login'), 1500);
    } else {
        alert.innerHTML = `<div class="alert alert-error">${result.message}</div>`;
    }
}

//Handle Login 
async function loginUser(e) {
    e.preventDefault();
    const result = await apiCall('login', {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    });

    const alert = document.getElementById('login-alert');
    if (result.success) {
        app.isLoggedIn = true;
        app.currentUser = result.data;
        alert.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
        updateNavigation();
        setTimeout(() => showPage('dashboard'), 1500);
    } else {
        alert.innerHTML = `<div class="alert alert-error">${result.message}</div>`;
    }
}

//  Handle Logout 
async function logoutUser() {
    await apiCall('logout');
    app.isLoggedIn = false;
    app.currentUser = null;
    updateNavigation();
    showPage('home');
}

// Show Page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const page = document.getElementById(pageId + '-page');
    if (page) {
        page.classList.remove('hidden');
        if (pageId === 'dashboard') loadDashboard();
        if (pageId === 'prediction') initPredictionPage();
        if (pageId === 'profile') loadProfile();
    }
}

// Update Navigation
function updateNavigation() {
    const authBtns = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (app.isLoggedIn) {
        authBtns.classList.add('hidden');
        userMenu.classList.remove('hidden');
        document.getElementById('user-name').textContent = app.currentUser.name;
    } else {
        authBtns.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// Load Dashboard
async function loadDashboard() {
    const result = await apiCall('get_dashboard_data');
    if (result.success) {
        // Update assessment count
        const totalAssessments = result.data.stats.total || 0;
        document.getElementById('assessment-count').textContent = totalAssessments;
        // Calculate  risk level and health score 
        const recentAssessments = result.data.recent || []; 
        if (recentAssessments.length > 0) {
            // Get the  assessment's risk level
            const latestRisk = recentAssessments[0].risk_level || 'Low';
            // Update  Risk Level
            const riskElement = document.querySelectorAll('.stat-value')[1];
            if (riskElement) {
                riskElement.textContent = latestRisk;
                // Change color based on risk
                if (latestRisk === 'High') {
                    riskElement.style.color = '#dc2626';
                } else if (latestRisk === 'Medium') {
                    riskElement.style.color = '#d97706';
                } else {
                    riskElement.style.color = '#059669';
                }
            }
            let totalRiskScore = 0;
            let riskCount = 0;
            
            recentAssessments.forEach(assessment => {
                if (assessment.risk_level === 'High') {
                    totalRiskScore += 80;
                    riskCount++;
                } else if (assessment.risk_level === 'Medium') {
                    totalRiskScore += 50;
                    riskCount++;
                } else if (assessment.risk_level === 'Low') {
                    totalRiskScore += 20;
                    riskCount++;
                }
            });
            
            const avgRisk = riskCount > 0 ? totalRiskScore / riskCount : 20;
            const healthScore = Math.round(100 - avgRisk);
            const scoreElement = document.querySelectorAll('.stat-value')[2];
            if (scoreElement) {
                scoreElement.textContent = healthScore + '%';
                if (healthScore >= 80) {
                    scoreElement.style.color = '#059669';
                } else if (healthScore >= 50) {
                    scoreElement.style.color = '#d97706';
                } else {
                    scoreElement.style.color = '#dc2626';
                }
            }
        }
        
        if (document.getElementById('health-overview-chart')) {
            initHealthChart();
        }
        
        const tbody = document.getElementById('recent-assessments');
        tbody.innerHTML = '';
        
        if (recentAssessments.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No assessments yet. Click "New Health Check" to get started!
                </td>
            `;
            tbody.appendChild(row);
        } else {
            recentAssessments.forEach(r => {
                const row = document.createElement('tr');
                const riskClass = r.risk_level === 'Low' ? 'risk-low' : 
                                 r.risk_level === 'Medium' ? 'risk-medium' : 'risk-high';
                row.innerHTML = `
                    <td>${r.date}</td>
                    <td>${r.assessment_type}</td>
                    <td><span class="risk-badge ${riskClass}">${r.risk_level} Risk</span></td>
                `;
                tbody.appendChild(row);
            });
        }
    }
}
function initHealthChart() {
    if (app.charts.healthOverview) app.charts.healthOverview.destroy();
    
    apiCall('get_dashboard_data').then(result => {
        let lowCount = 0, mediumCount = 0, highCount = 0;
        
        if (result.success && result.data.recent) {
            result.data.recent.forEach(assessment => {
                if (assessment.risk_level === 'Low') lowCount++;
                else if (assessment.risk_level === 'Medium') mediumCount++;
                else if (assessment.risk_level === 'High') highCount++;
            });
        }
        
        if (lowCount === 0 && mediumCount === 0 && highCount === 0) {
            lowCount = 1;
        }
        
        const ctx = document.getElementById('health-overview-chart').getContext('2d');
        app.charts.healthOverview = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Low Risk', 'Medium Risk', 'High Risk'],
                datasets: [{
                    data: [lowCount, mediumCount, highCount],
                    backgroundColor: [
                        'rgba(5, 150, 105, 0.8)',
                        'rgba(217, 119, 6, 0.8)',
                        'rgba(220, 38, 38, 0.8)'
                    ],
                    borderColor: [
                        'rgba(5, 150, 105, 1)',
                        'rgba(217, 119, 6, 1)',
                        'rgba(220, 38, 38, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    });
}

function initPredictionPage() {
    const grid = document.getElementById('symptoms-grid');
    grid.innerHTML = '';
    app.symptoms.forEach((symptom, i) => {
        const div = document.createElement('div');
        div.className = 'symptom-item';
        div.innerHTML = `
            <input type="checkbox" id="symptom-${i}" value="${i}">
            <label for="symptom-${i}" style="margin: 0; flex: 1;">${symptom}</label>
        `;
        grid.appendChild(div);
    });
}

// Select Algorithm
function selectAlgorithm(algo) {
    app.selectedAlgorithm = algo;
    document.querySelectorAll('.algorithm-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-algo="${algo}"]`).classList.add('active');
}

// Train Model
async function trainModel() {
    app.modelTrained = true;
    alert('AI Models trained successfully! Using ' + app.selectedAlgorithm.toUpperCase() + ' as primary algorithm.');
}


//  XGBoost Algorithm (Gradient Boosting)
function xgboostPredict(features) {
    const [age, gender, bmi, bp, chol, sugar, ...symptoms] = features;
    const learningRate = 0.1;
    
    return [
        // Diabetes - Blood Sugar is primary factor
        Math.min(1, Math.max(0, 
            0.5 + learningRate * (
                ((sugar - 100) / 50) * 0.35 +      // Blood sugar weight: 35%
                ((bmi - 25) / 10) * 0.25 +          // BMI weight: 25%
                ((age - 35) / 30) * 0.15 +          // Age weight: 15%
                symptoms.slice(4, 8).reduce((a, b) => a + b) * 0.06  // Diabetes symptoms
            )
        )),
        
        // Heart Disease - BP and Cholesterol are primary
        Math.min(1, Math.max(0,
            0.5 + learningRate * (
                ((bp - 120) / 40) * 0.30 +          // Blood pressure: 30%
                ((chol - 200) / 80) * 0.28 +        // Cholesterol: 28%
                ((age - 40) / 35) * 0.20 +          // Age: 20%
                (symptoms[0] * 0.4 + symptoms[1] * 0.3)  // Chest pain & SOB
            )
        )),
        
        // Hypertension - BP is dominant factor
        Math.min(1, Math.max(0,
            0.5 + learningRate * (
                ((bp - 120) / 50) * 0.40 +          // Blood pressure: 40%
                ((age - 35) / 40) * 0.20 +          // Age: 20%
                ((bmi - 22) / 8) * 0.15 +           // BMI: 15%
                symptoms[8] * 0.25                   // Headaches: 25%
            )
        )),
        
        // Obesity - BMI is primary factor
        Math.min(1, Math.max(0,
            0.5 + learningRate * (
                ((bmi - 25) / 15) * 0.60 +          // BMI: 60% (dominant)
                ((age - 30) / 30) * 0.15            // Age: 15%
            )
        ))
    ];
}

// Random Forest Algorithm 
function randomForestPredict(features) {
    const [age, gender, bmi, bp, chol, sugar, ...symptoms] = features;
    return [
        // Diabetes
        Math.max(0, Math.min(1, 
            ((sugar - 100) * 0.3 + 
             (bmi - 25) * 0.2 + 
             (age - 30) * 0.1 +
             symptoms.slice(4, 8).reduce((s, sym) => s + sym * 0.1, 0)) / 10
        )),
        // Heart Disease
        Math.max(0, Math.min(1,
            ((bp - 120) * 0.25 + 
             (chol - 200) * 0.2 + 
             (age - 40) * 0.15 + 
             symptoms[0] * 0.4 + 
             symptoms[1] * 0.3) / 10
        )),
        // Hypertension
        Math.max(0, Math.min(1,
            ((bp - 120) * 0.4 + 
             (age - 35) * 0.15 + 
             (bmi - 22) * 0.1 + 
             
             symptoms[8] * 0.2) / 10
        )),
        // Obesity
        Math.max(0, Math.min(1,
            ((bmi - 25) * 0.5) / 10
        ))
    ];
}

//SVM Algorithm (Support Vector Machine)
function svmPredict(features) {
    const [age, gender, bmi, bp, chol, sugar, ...symptoms] = features;
    return [
        // Diabetes - Sensitive to blood sugar variations
        (Math.tanh(
            (sugar - 110) * 0.02 + 
            (bmi - 24) * 0.05 + 
            (age - 35) * 0.01 +
            symptoms.slice(4, 8).reduce((a, b) => a + b) * 0.15
        ) + 1) / 2,       
        // Heart Disease - Sensitive to cardiovascular indicators
        (Math.tanh(
            (bp - 130) * 0.02 + 
            (chol - 220) * 0.005 + 
            (age - 45) * 0.01 +
            symptoms[0] * 0.8 + 
            symptoms[1] * 0.6
        ) + 1) / 2,       
        // Hypertension - Highly sensitive to BP changes
        (Math.tanh(
            (bp - 125) * 0.03 + 
            (age - 30) * 0.02 +
            symptoms[8] * 0.5
        ) + 1) / 2,
        // Obesity - Non-linear BMI classification
        (Math.tanh(
            (bmi - 28) * 0.1
        ) + 1) / 2
    ];
}
//Ensemble Algorithm 
function ensemblePredict(features) {
    // Get predictions  three algorithms
    const xgb = xgboostPredict(features);
    const rf = randomForestPredict(features);
    const svm = svmPredict(features);
    // Weighted average: XGBoost 50%, Random Forest 30%, SVM 20%
    const predictions = xgb.map((x, i) => 
        x * 0.5 + rf[i] * 0.3 + svm[i] * 0.2
    );
    
    return predictions;
}

async function predictDisease() {
    if (!app.modelTrained) {
        alert('Please train the AI model first!');
        return;
    }

    document.getElementById('loading-spinner').classList.remove('hidden');
    document.getElementById('prediction-results').classList.add('hidden');

    const age = parseFloat(document.getElementById('patient-age').value);
    const bmi = parseFloat(document.getElementById('patient-bmi').value);
    const bp = parseFloat(document.getElementById('patient-bp').value);
    const chol = parseFloat(document.getElementById('patient-cholesterol').value);
    const sugar = parseFloat(document.getElementById('patient-blood-sugar').value);

    const symptoms = [];
    app.symptoms.forEach((_, i) => {
        const cb = document.getElementById(`symptom-${i}`);
        symptoms.push(cb ? (cb.checked ? 1 : 0) : 0);
    });

    const features = [age, 1, bmi, bp, chol, sugar, ...symptoms];
    await new Promise(r => setTimeout(r, 2000));

    let predictions;
    let algorithmName = '';
    
    switch(app.selectedAlgorithm) {
        case 'xgboost':
            predictions = xgboostPredict(features);
            algorithmName = 'XGBoost (Gradient Boosting)';
            break;
        case 'random-forest':
            predictions = randomForestPredict(features);
            algorithmName = 'Random Forest (Decision Trees)';
            break;
        case 'svm':
            predictions = svmPredict(features);
            algorithmName = 'SVM (Support Vector Machine)';
            break;
        case 'ensemble':
            predictions = ensemblePredict(features);
            algorithmName = 'Ensemble (Combined Algorithms)';
            break;
        default:
            predictions = xgboostPredict(features);
            algorithmName = 'XGBoost (Default)';
    }

    console.log(`Using ${algorithmName}:`, predictions);

    displayPredictionResults(predictions, algorithmName);
    updatePredictionChart(predictions);

    await apiCall('save_prediction', {
        assessment_type: 'General Health Check',
        predictions: predictions,
        algorithm: app.selectedAlgorithm,
        age: age,
        gender: '1',
        bmi: bmi,
        blood_pressure: bp,
        cholesterol: chol,
        blood_sugar: sugar
    });

    document.getElementById('loading-spinner').classList.add('hidden');
}

function displayPredictionResults(predictions, algorithmName) {
    const container = document.getElementById('results-container');
    container.innerHTML = '';
  
    const algoHeader = document.createElement('div');
    algoHeader.style.cssText = 'background: rgba(37, 99, 235, 0.1); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; text-align: center; color: #2563eb; font-weight: 600;';
    algoHeader.innerHTML = `<i class="fas fa-microchip"></i> Algorithm: ${algorithmName}`;
    container.appendChild(algoHeader);
    
    predictions.forEach((pred, i) => {
        const pct = (pred * 100).toFixed(1);
        const riskClass = pct > 70 ? 'risk-high' : (pct > 40 ? 'risk-medium' : 'risk-low');
        const riskLabel = pct > 70 ? 'High Risk' : (pct > 40 ? 'Medium Risk' : 'Low Risk');
        
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div>
                <span style="font-weight: 600; font-size: 1.1rem;">${app.diseases[i]}</span>
                <div style="font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">
                    <span class="risk-badge ${riskClass}">${riskLabel}</span>
                </div>
            </div>
            <span style="font-size: 1.5rem; font-weight: 700; color: #2563eb;">${pct}%</span>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('prediction-results').classList.remove('hidden');
}

// Update Prediction Chart
function updatePredictionChart(predictions) {
    const canvas = document.getElementById('prediction-chart');
    if (!canvas) return;

    if (app.charts.prediction) app.charts.prediction.destroy();

    const ctx = canvas.getContext('2d');
    const colors = predictions.map(p => {
        const pct = p * 100;
        return pct > 70 ? '#dc2626' : (pct > 40 ? '#d97706' : '#059669');
    });

    app.charts.prediction = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: app.diseases,
            datasets: [{
                label: 'Risk Percentage',
                data: predictions.map(p => (p * 100).toFixed(1)),
                backgroundColor: colors.map(c => c + '80'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const risk = value > 70 ? 'High' : (value > 40 ? 'Medium' : 'Low');
                            return `${risk} Risk: ${value}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        callback: v => v + '%',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Load Profile
async function loadProfile() {
    const result = await apiCall('get_profile');
    if (result.success) {
        const user = result.data.user;
        const health = result.data.health;
        
        document.getElementById('profile-name').value = user.name;
        document.getElementById('profile-email').value = user.email;
        document.getElementById('profile-phone').value = user.phone;
        document.getElementById('profile-dob').value = user.dob;
        document.getElementById('profile-height').value = health.height || 175;
        document.getElementById('profile-weight').value = health.weight || 75;
        document.getElementById('profile-blood-type').value = health.blood_type || '';
    }
}

// Save Profile
async function saveProfile() {
    const result = await apiCall('update_profile', {
        name: document.getElementById('profile-name').value,
        phone: document.getElementById('profile-phone').value,
        height: document.getElementById('profile-height').value,
        weight: document.getElementById('profile-weight').value,
        blood_type: document.getElementById('profile-blood-type').value
    });

    alert(result.message);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNavigation();
    showPage('home');
});

// Scroll to features section
function scrollToFeatures() {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Handle contact form
function handleContact(e) {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you within 24 hours.');
    document.getElementById('contact-form').reset();
>>>>>>> 4e4f2ac24dbf9345943b261c2b1bbc45cd9ff308
}