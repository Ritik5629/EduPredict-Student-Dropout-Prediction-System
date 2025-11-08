"""
EduPredict - Student Dropout Prediction System
Machine Learning Model Implementation using REGRESSION for exact probability prediction.
"""

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from typing import Dict, Any, Tuple
import os

# Define the models and paths
MODEL_DIR = 'models'
RF_MODEL_PATH = os.path.join(MODEL_DIR, 'random_forest_regressor.joblib')
GB_MODEL_PATH = os.path.join(MODEL_DIR, 'gradient_boosting_regressor.joblib')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.joblib')
DATA_PATH = 'student_data.csv'

class StudentDropoutPredictor:
    """
    Machine Learning REGRESSOR for student dropout probability prediction.
    Returns continuous probability from 0% to 100%.
    """
    
    # Map of frontend keys to model feature names
    FEATURE_MAPPING = {
        'marital_status': 'Marital_Status',
        'admission_grade': 'Admission_Grade',
        'units_approved': 'Curricular_Units_1st_Sem_Approved',
        'avg_grade': 'Curricular_Units_1st_Sem_Grade',
        'tuition_status': 'Tuition_Fees_Up_to_Date',
        'scholarship': 'Scholarship',
        'age': 'Age_at_Enrollment',
        'international': 'International',
        'gender': 'Gender',
        'gdp': 'GDP_Per_Capita'
    }

    def __init__(self, data_path: str = DATA_PATH):
        """Initialize the predictor: load model or train if not found."""
        self.data_path = data_path
        self.features = list(self.FEATURE_MAPPING.values())
        self.target = 'Target'  # 0: No Dropout, 1: Dropout
        
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        try:
            self.model = joblib.load(RF_MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            print(f"✓ Trained Random Forest REGRESSOR loaded from {RF_MODEL_PATH}")
            self.model_info = self._get_model_info()
        except FileNotFoundError:
            print("⚠️ Training new REGRESSION model...")
            self.model, self.scaler, self.metrics = self.train_and_save_model()
            self.model_info = self._get_model_info(metrics=self.metrics)

    def train_and_save_model(self) -> Tuple[RandomForestRegressor, Any, Dict]:
        """Train REGRESSION models and save the best one."""
        
        try:
            df = pd.read_csv(self.data_path)
        except FileNotFoundError:
            print(f"ERROR: {self.data_path} not found!")
            raise
        
        X = df[self.features]
        y = df[self.target].astype(float)  # Convert to float for regression
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42
        )

        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Train Random Forest REGRESSOR
        print("\nTraining Random Forest Regressor...")
        rf_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        rf_model.fit(X_train_scaled, y_train)
        rf_preds = rf_model.predict(X_test_scaled)
        rf_preds = np.clip(rf_preds, 0, 1)
        
        rf_mse = mean_squared_error(y_test, rf_preds)
        rf_rmse = np.sqrt(rf_mse)
        rf_mae = mean_absolute_error(y_test, rf_preds)
        rf_r2 = r2_score(y_test, rf_preds)
        
        # Train Gradient Boosting REGRESSOR
        print("Training Gradient Boosting Regressor...")
        gb_model = GradientBoostingRegressor(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        gb_model.fit(X_train_scaled, y_train)
        gb_preds = gb_model.predict(X_test_scaled)
        gb_preds = np.clip(gb_preds, 0, 1)
        
        gb_rmse = np.sqrt(mean_squared_error(y_test, gb_preds))
        gb_mae = mean_absolute_error(y_test, gb_preds)
        gb_r2 = r2_score(y_test, gb_preds)
        
        print(f"\n{'='*60}")
        print("REGRESSION MODEL COMPARISON:")
        print(f"{'='*60}")
        print(f"Random Forest: RMSE={rf_rmse:.4f} | MAE={rf_mae:.4f} | R²={rf_r2:.4f}")
        print(f"Gradient Boost: RMSE={gb_rmse:.4f} | MAE={gb_mae:.4f} | R²={gb_r2:.4f}")
        print(f"{'='*60}\n")

        # Choose best model
        if rf_rmse <= gb_rmse:
            best_model = rf_model
            metrics = {'model': 'Random Forest', 'rmse': rf_rmse, 'mae': rf_mae, 'r2': rf_r2}
            print(f"✓ Selected: Random Forest (RMSE: {rf_rmse:.4f})")
        else:
            best_model = gb_model
            metrics = {'model': 'Gradient Boosting', 'rmse': gb_rmse, 'mae': gb_mae, 'r2': gb_r2}
            print(f"✓ Selected: Gradient Boosting (RMSE: {gb_rmse:.4f})")

        joblib.dump(rf_model, RF_MODEL_PATH)
        joblib.dump(gb_model, GB_MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        print(f"✓ Models and Scaler saved.")
        
        return best_model, scaler, metrics

    def _get_model_info(self, metrics=None) -> Dict[str, Any]:
        """Return model information"""
        info = {
            'model_name': 'Dropout Probability Predictor',
            'version': '2.0 (REGRESSION)',
            'output': 'Continuous probability (0-100%)',
            'features': self.features,
        }
        if metrics:
            info['performance'] = metrics
        return info

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        MAIN PREDICTION - Returns dropout probability as percentage
        """
        
        # Prepare data
        input_df = pd.DataFrame([{
            self.FEATURE_MAPPING[k]: features[k] 
            for k in features if k in self.FEATURE_MAPPING
        }])
        input_df = input_df[self.features]
        
        # Scale and predict
        input_scaled = self.scaler.transform(input_df)
        dropout_probability = float(np.clip(self.model.predict(input_scaled)[0], 0, 1))
        dropout_percentage = dropout_probability * 100
        
        # Determine risk level
        if dropout_probability >= 0.70:
            risk_level = 'high'
            risk_text = 'HIGH DROPOUT RISK'
            risk_color = '#EF4444'
        elif dropout_probability >= 0.40:
            risk_level = 'medium'
            risk_text = 'MEDIUM DROPOUT RISK'
            risk_color = '#F59E0B'
        else:
            risk_level = 'low'
            risk_text = 'LOW DROPOUT RISK'
            risk_color = '#10B981'
        
        risk_score = max(1, min(10, int(round(dropout_probability * 10))))
        confidence = self._calculate_confidence(input_df.iloc[0], dropout_probability)
        risk_factors = self._identify_risk_factors(input_df.iloc[0])
        recommendations = self._generate_recommendations(risk_level, risk_factors, dropout_probability)

        return {
            'risk_level': risk_level,
            'risk_text': risk_text,
            'risk_color': risk_color,
            'risk_score': risk_score,
            'max_score': 10,
            'dropout_probability': round(dropout_probability, 4),
            'dropout_percentage': round(dropout_percentage, 2),
            'confidence': round(confidence, 3),
            'risk_factors': risk_factors,
            'recommendations': recommendations,
            'model_type': 'regression'
        }
    
    def _calculate_confidence(self, student_data: pd.Series, probability: float) -> float:
        """Calculate prediction confidence"""
        confidence_factors = []
        
        if not student_data.isnull().any():
            confidence_factors.append(0.3)
        
        prob_certainty = abs(probability - 0.5) * 2
        confidence_factors.append(prob_certainty * 0.4)
        
        academic_indicators = [
            student_data['Curricular_Units_1st_Sem_Grade'],
            student_data['Curricular_Units_1st_Sem_Approved'],
            student_data['Admission_Grade']
        ]
        if all(x > 0 for x in academic_indicators):
            confidence_factors.append(0.3)
        else:
            confidence_factors.append(0.15)
        
        return min(0.99, max(0.60, sum(confidence_factors)))
    
    def _identify_risk_factors(self, student_data: pd.Series) -> list:
        """Identify risk factors"""
        factors = []
        
        if student_data['Tuition_Fees_Up_to_Date'] == 0:
            factors.append("🔴 Financial: Unpaid tuition fees")
        
        if student_data['Curricular_Units_1st_Sem_Grade'] < 10.0:
            factors.append(f"🔴 Academic: Very low grade ({student_data['Curricular_Units_1st_Sem_Grade']:.2f}/20)")
        
        if student_data['Curricular_Units_1st_Sem_Approved'] < 3:
            factors.append(f"🔴 Academic: Few units approved ({int(student_data['Curricular_Units_1st_Sem_Approved'])}/6)")
        
        if 10.0 <= student_data['Curricular_Units_1st_Sem_Grade'] < 12.0:
            factors.append(f"🟡 Academic: Below average ({student_data['Curricular_Units_1st_Sem_Grade']:.2f}/20)")
        
        if student_data['Scholarship'] == 0:
            factors.append("🟡 Financial: No scholarship")
        
        if student_data['Age_at_Enrollment'] > 25:
            factors.append(f"🟡 Demographic: Mature student (Age {int(student_data['Age_at_Enrollment'])})")
        
        if student_data['International'] == 1:
            factors.append("🔵 Demographic: International student")
        
        if student_data['Admission_Grade'] < 130.0:
            factors.append(f"🔵 Admission: Lower score ({student_data['Admission_Grade']:.1f})")
        
        if student_data['Marital_Status'] in [2, 3, 4]:
             factors.append("🔵 Personal: Family responsibilities")
        
        if not factors:
            factors.append("✅ No significant risk factors")
        
        return factors
    
    def _generate_recommendations(self, risk_level: str, risk_factors: list, probability: float) -> list:
        """Generate recommendations"""
        recommendations = []
        
        if probability >= 0.80:
            recommendations.append("🚨 CRITICAL: Immediate intervention within 48 hours")
        elif probability >= 0.60:
            recommendations.append("⚠️ HIGH PRIORITY: Urgent meeting within 1 week")
        elif probability >= 0.40:
            recommendations.append("⚡ MODERATE: Proactive follow-up needed")
        else:
            recommendations.append("✅ LOW PRIORITY: Standard monitoring")
        
        risk_text = ' '.join(risk_factors)
        
        if 'Financial' in risk_text or 'Unpaid' in risk_text:
            recommendations.append("💰 Review financial aid and payment options")
        
        if 'Academic' in risk_text:
            recommendations.append("📚 Academic counseling and tutoring required")
        
        if 'Mature' in risk_text or 'responsibilities' in risk_text:
            recommendations.append("🕐 Offer flexible scheduling options")
        
        if 'International' in risk_text:
            recommendations.append("🌍 Connect with international services")
        
        if probability < 0.30:
            recommendations.append("🎯 Encourage advanced courses")
        
        return recommendations

if __name__ == "__main__":
    print("\n" + "="*70)
    print("EDUPREDICT - REGRESSION MODEL TEST")
    print("="*70 + "\n")
    
    predictor = StudentDropoutPredictor()
    
    # Test with high-risk student
    test_student = {
        'marital_status': 2, 'admission_grade': 115.0, 'units_approved': 1, 
        'avg_grade': 8.5, 'tuition_status': 0, 'scholarship': 0, 
        'age': 32, 'international': 1, 'gender': 0, 'gdp': 950.0
    }
    
    result = predictor.predict(test_student)
    print(f"Test Result:")
    print(f"  Dropout Probability: {result['dropout_percentage']:.2f}%")
    print(f"  Risk Level: {result['risk_text']}")
    print(f"  Risk Score: {result['risk_score']}/10")
    print(f"  Confidence: {result['confidence']*100:.1f}%")
    print(f"\n  Risk Factors:")
    for f in result['risk_factors']:
        print(f"    {f}")
    print(f"\n  Recommendations:")
    for r in result['recommendations']:
        print(f"    {r}")
    print()