// predict-handler.js - Handles prediction form submission
const API_BASE_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('prediction-form');
    if (form) {
        form.addEventListener('submit', handlePrediction);
    }
});

async function handlePrediction(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    // Show loading
    btn.disabled = true;
    btn.textContent = '🔄 Calculating...';
    
    try {
        // Collect form data
        const data = {
            user_id: `user_${Date.now()}`,
            marital_status: parseInt(document.getElementById('marital_status').value),
            admission_grade: parseFloat(document.getElementById('admission_grade').value),
            units_approved: parseInt(document.getElementById('units_approved').value),
            avg_grade: parseFloat(document.getElementById('avg_grade').value),
            tuition_status: parseInt(document.getElementById('tuition_status').value),
            scholarship: parseInt(document.getElementById('scholarship').value),
            age: parseInt(document.getElementById('age').value),
            international: parseInt(document.getElementById('international').value),
            gender: parseInt(document.getElementById('gender').value),
            gdp: parseFloat(document.getElementById('gdp').value)
        };
        
        // Send to backend
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult(result.prediction);
            // Store prediction in localStorage
            storePredictionInHistory(result.prediction, data);
        } else {
            showError(result.error);
        }
        
    } catch (error) {
        showError('Server not running. Start with: python app.py');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function storePredictionInHistory(prediction, inputData) {
    // Create a prediction record
    const record = {
        id: inputData.user_id,
        studentId: `STU${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        date: new Date(),
        dropout_percentage: prediction.dropout_percentage,
        risk_level: prediction.risk_level,
        risk_score: prediction.risk_score,
        confidence: prediction.confidence,
        risk_factors: prediction.risk_factors || [],
        recommendations: prediction.recommendations || [],
        // Store input data for reference
        input_data: inputData
    };

    // Get existing predictions from localStorage
    let predictions = JSON.parse(localStorage.getItem('predictions') || '[]');
    // Add the new prediction at the beginning
    predictions.unshift(record);
    // Save back to localStorage
    localStorage.setItem('predictions', JSON.stringify(predictions));
    
    console.log('Prediction stored in history:', record);
}

function showResult(pred) {
    const card = document.getElementById('prediction-result');
    const text = document.getElementById('result-text');
    const desc = document.getElementById('result-description');
    
    // Set style
    card.classList.remove('danger', 'warning-card', 'success');
    if (pred.risk_level === 'high') card.classList.add('danger');
    else if (pred.risk_level === 'medium') card.classList.add('warning-card');
    else card.classList.add('success');
    
    // Main result
    const emoji = pred.risk_level === 'high' ? '🚨' : pred.risk_level === 'medium' ? '⚠️' : '✅';
    text.innerHTML = `
        ${emoji} <strong>${pred.risk_text}</strong>
        <div style="font-size: 3rem; margin-top: 1rem; font-weight: 800; color: ${pred.risk_color};">
            ${pred.dropout_percentage.toFixed(1)}%
        </div>
        <div style="font-size: 1rem; color: #888; margin-top: 0.5rem;">
            Dropout Probability
        </div>
    `;
    
    // Details
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin: 2rem 0; padding: 1.5rem; background: rgba(0,188,212,0.05); border-radius: 10px;">
            <div style="text-align: center;">
                <div style="color: #888; font-size: 0.875rem;">Risk Score</div>
                <div style="font-size: 2rem; font-weight: 700; color: #00BCD4;">${pred.risk_score}/10</div>
            </div>
            <div style="text-align: center;">
                <div style="color: #888; font-size: 0.875rem;">Confidence</div>
                <div style="font-size: 2rem; font-weight: 700; color: #00BCD4;">${(pred.confidence * 100).toFixed(0)}%</div>
            </div>
            <div style="text-align: center;">
                <div style="color: #888; font-size: 0.875rem;">Model</div>
                <div style="font-size: 1.2rem; font-weight: 600; color: #FFB300;">Regression</div>
            </div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-weight: 600;">Probability Scale</span>
                <span style="font-weight: 700; color: ${pred.risk_color};">${pred.dropout_percentage.toFixed(2)}%</span>
            </div>
            <div style="width: 100%; height: 30px; background: rgba(255,255,255,0.1); border-radius: 15px; overflow: hidden;">
                <div style="width: ${pred.dropout_percentage}%; height: 100%; background: ${pred.risk_color}; transition: width 1s;"></div>
            </div>
        </div>
    `;
    
    // Risk factors
    if (pred.risk_factors && pred.risk_factors.length > 0) {
        html += `
            <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: rgba(239,68,68,0.1); border-left: 4px solid #EF4444; border-radius: 8px;">
                <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #EF4444;">
                    ⚠️ Risk Factors
                </div>
                <ul style="margin: 0; padding-left: 1.5rem;">
                    ${pred.risk_factors.map(f => `<li style="margin-bottom: 0.5rem;">${f}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Recommendations
    if (pred.recommendations && pred.recommendations.length > 0) {
        html += `
            <div style="padding: 1.5rem; background: rgba(0,188,212,0.1); border-left: 4px solid #00BCD4; border-radius: 8px;">
                <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #00BCD4;">
                    💡 Recommendations
                </div>
                <ul style="margin: 0; padding-left: 1.5rem;">
                    ${pred.recommendations.map(r => `<li style="margin-bottom: 0.5rem;">${r}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    desc.innerHTML = html;
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(msg) {
    const card = document.getElementById('prediction-result');
    const text = document.getElementById('result-text');
    const desc = document.getElementById('result-description');
    
    card.classList.remove('success', 'warning-card');
    card.classList.add('danger');
    
    text.innerHTML = '❌ <strong>Error</strong>';
    desc.innerHTML = `
        <p>${msg}</p>
        <p style="margin-top: 1rem; color: #888;">
            <strong>Steps to fix:</strong><br>
            1. Start server: <code>python app.py</code><br>
            2. Check all fields are filled<br>
            3. Check browser console (F12) for details
        </p>
    `;
    
    card.style.display = 'block';
}