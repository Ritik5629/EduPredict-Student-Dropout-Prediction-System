# 🎓 EduPredict – Student Dropout Prediction System

EduPredict is an AI-based system designed to predict the dropout risk of students before it occurs. The system analyzes academic and personal attributes of students and provides a risk score along with recommended interventions, helping teachers take timely action.

---

## 🔍 Problem Statement

Many students drop out due to poor performance, attendance issues, stress, or lack of support. Educators often realize this too late because there is **no early warning system**.  
EduPredict solves this by **predicting dropout risk early** using Machine Learning.

---

## 🎯 Objective

- Predict whether a student is at **Low**, **Medium**, or **High** dropout risk.
- Provide **early alerts** so teachers can intervene in time.
- Improve student retention and academic outcome.

---

## 🧠 Machine Learning Model

| Model | Type | Output | Reason |
|------|------|--------|--------|
| **Random Forest Regressor** | Regression Model | Dropout Probability (0–100%) | High accuracy & interpretable |

**Model Input Examples:**
- Admission Grade
- Semester Grades
- Units Approved
- Age / Family Status
- Scholarship / Tuition Fee Status

**Model Output:**
- Dropout Percentage
- Risk Category (Low / Medium / High)
- Confidence Score
- Risk Factors
- Suggested Interventions

---

## 🏛️ System Architecture (Simple Flow)

1. User enters student data on the web form (Frontend).
2. Data is sent to Flask API (`/predict`) via POST.
3. Trained Random Forest model processes data and predicts dropout probability.
4. Result is displayed on dashboard and also stored in MySQL database.
5. Teacher can review history, analyze risks, and get recommendations.

---

## 🏗️ Technology Stack

| Layer | Technology |
|------|------------|
| Frontend UI | HTML, CSS, JavaScript |
| Backend Server | Flask (Python) |
| Machine Learning | Random Forest Regressor (scikit-learn) |
| Database | MySQL |

---

## 📊 Key Features

- Student profile input form
- Dropout probability prediction
- Risk category visualization (color-coded)
- Detailed risk factor explanation
- AI recommendation assistant (intervention suggestions)
- Prediction history dashboard
- Secure database storage

---

## 💻 Running the Project
```bash
pip install -r requirements.txt
python app.py
```

Then open the frontend in browser (dashboard.html / index.html)

---

## 🔄 Future Enhancements

- Mobile App Version
- SMS / Email alerting system
- Integration with College ERP / LMS
- Deep Learning model for higher accuracy

---

## ✅ Conclusion

EduPredict provides an effective solution for **early identification of students at risk** of dropping out.  
By combining machine learning with a user-friendly dashboard, the system helps institutions take **timely action**, reduce dropouts, and improve student success.

---

## 👨‍💻 Project by:
- ML & Backend Developer
- Frontend Developer
- Database Integration Support

---

## 📄 License

This project is open-source and available under the MIT License.
