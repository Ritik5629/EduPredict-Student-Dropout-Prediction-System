from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import datetime
import json
import os
from main import StudentDropoutPredictor

app = Flask(__name__)
CORS(app)

# MySQL Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Root@321',
    'database': 'edupredict_db'
}

# Initialize ML predictor
try:
    predictor = StudentDropoutPredictor()
    print("✓ ML Regressor initialized successfully")
except Exception as e:
    print(f"✗ Error initializing predictor: {e}")
    predictor = None

def get_db_connection():
    """Create database connection"""
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"DB Error: {err}")
        return None

def init_database():
    """Initialize database tables"""
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = connection.cursor()

        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        cursor.execute(f"USE {DB_CONFIG['database']}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) UNIQUE NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                role VARCHAR(50) NOT NULL,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_email (email)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                marital_status INT,
                admission_grade FLOAT,
                units_approved INT,
                avg_grade FLOAT,
                tuition_status INT,
                scholarship INT,
                age INT,
                international INT,
                gender INT,
                gdp FLOAT,
                dropout_probability FLOAT,
                dropout_percentage FLOAT,
                risk_level VARCHAR(20),
                risk_score INT,
                confidence FLOAT,
                risk_factors JSON,
                recommendations JSON,
                prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_prediction_date (prediction_date),
                INDEX idx_risk_level (risk_level)
            )
        """)

        connection.commit()
        cursor.close()
        connection.close()
        print("✓ Database initialized!")

    except mysql.connector.Error as err:
        print(f"✗ DB Init Error: {err}")

@app.route('/')
def index():
    return jsonify({
        'status': 'online',
        'message': 'EduPredict API - REGRESSION MODEL',
        'model_type': 'Random Forest Regressor',
        'output': 'Continuous probability (0-100%)',
        'endpoints': {
            '/predict': 'POST - Dropout prediction',
            '/history/all': 'GET - All predictions',
            '/history/<user_id>': 'GET - User predictions',
            '/health': 'GET - Health check'
        }
    })

@app.route('/health')
def health():
    conn = get_db_connection()
    return jsonify({
        'status': 'healthy',
        'predictor': 'ready' if predictor else 'not initialized',
        'model_type': 'regression',
        'database': 'connected' if conn else 'disconnected'
    })

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict_student():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        if not predictor:
            return jsonify({'success': False, 'error': 'ML model not initialized'}), 500
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        user_id = data.get('user_id', f"user_{int(datetime.now().timestamp())}")

        try:
            features = {
                'marital_status': int(data.get('marital_status', 1)),
                'admission_grade': float(data.get('admission_grade', 130.0)),
                'units_approved': int(data.get('units_approved', 0)),
                'avg_grade': float(data.get('avg_grade', 0.0)),
                'tuition_status': int(data.get('tuition_status', 1)),
                'scholarship': int(data.get('scholarship', 0)),
                'age': int(data.get('age', 20)),
                'international': int(data.get('international', 0)),
                'gender': int(data.get('gender', 0)),
                'gdp': float(data.get('gdp', 1053.06))
            }
        except (ValueError, TypeError) as e:
            return jsonify({'success': False, 'error': f'Invalid input: {str(e)}'}), 400

        # Validate ranges
        if not (0 <= features['avg_grade'] <= 20):
            return jsonify({'success': False, 'error': 'Grade must be 0-20'}), 400
        if not (0 <= features['units_approved'] <= 6):
            return jsonify({'success': False, 'error': 'Units must be 0-6'}), 400
        if not (18 <= features['age'] <= 50):
            return jsonify({'success': False, 'error': 'Age must be 18-50'}), 400
        if not (100 <= features['admission_grade'] <= 200):
            return jsonify({'success': False, 'error': 'Admission grade must be 100-200'}), 400

        # Get prediction
        prediction_result = predictor.predict(features)

        # Save to database
        try:
            connection = get_db_connection()
            if connection:
                cursor = connection.cursor()
                insert_query = """
                    INSERT INTO predictions 
                    (user_id, marital_status, admission_grade, units_approved, 
                    avg_grade, tuition_status, scholarship, age, international, 
                    gender, gdp, dropout_probability, dropout_percentage, 
                    risk_level, risk_score, confidence, risk_factors, recommendations)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                values = (
                    user_id,
                    features['marital_status'], features['admission_grade'],
                    features['units_approved'], features['avg_grade'],
                    features['tuition_status'], features['scholarship'],
                    features['age'], features['international'],
                    features['gender'], features['gdp'],
                    prediction_result['dropout_probability'],
                    prediction_result['dropout_percentage'],
                    prediction_result['risk_level'],
                    prediction_result['risk_score'],
                    prediction_result['confidence'],
                    json.dumps(prediction_result['risk_factors']),
                    json.dumps(prediction_result['recommendations'])
                )
                cursor.execute(insert_query, values)
                connection.commit()
                pred_id = cursor.lastrowid
                cursor.close()
                connection.close()
                print(f"✓ Saved #{pred_id}: {user_id} - {prediction_result['dropout_percentage']:.2f}%")
        except Exception as db_error:
            print(f"DB save error: {db_error}")

        return jsonify({
            'success': True,
            'prediction': prediction_result,
            'message': 'Prediction completed'
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/history/all', methods=['GET'])
def get_all_predictions():
    """Get ALL predictions (for dashboard and history pages)"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 500
        
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT * FROM predictions 
            ORDER BY prediction_date DESC 
            LIMIT 100
        """
        cursor.execute(query)
        predictions = cursor.fetchall()
        
        # Parse JSON fields
        for pred in predictions:
            if pred.get('risk_factors'):
                try:
                    pred['risk_factors'] = json.loads(pred['risk_factors'])
                except:
                    pred['risk_factors'] = []
            if pred.get('recommendations'):
                try:
                    pred['recommendations'] = json.loads(pred['recommendations'])
                except:
                    pred['recommendations'] = []
        
        cursor.close()
        connection.close()
        
        print(f"✓ Returned {len(predictions)} predictions for dashboard/history")
        
        return jsonify({
            'success': True,
            'count': len(predictions),
            'predictions': predictions
        })
        
    except Exception as e:
        print(f"Error fetching all predictions: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/history/<user_id>', methods=['GET'])
def get_user_predictions(user_id):
    """Get predictions for specific user"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'error': 'Database unavailable'}), 500
        
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT * FROM predictions 
            WHERE user_id = %s 
            ORDER BY prediction_date DESC 
            LIMIT 50
        """
        cursor.execute(query, (user_id,))
        predictions = cursor.fetchall()
        
        for pred in predictions:
            if pred.get('risk_factors'):
                try:
                    pred['risk_factors'] = json.loads(pred['risk_factors'])
                except:
                    pred['risk_factors'] = []
            if pred.get('recommendations'):
                try:
                    pred['recommendations'] = json.loads(pred['recommendations'])
                except:
                    pred['recommendations'] = []
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'count': len(predictions),
            'predictions': predictions
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/test-prediction', methods=['GET'])
def test_prediction():
    """Test with sample data"""
    test_cases = [
        {
            'name': 'High-Risk', 'data': {
                'user_id': 'test_high', 'marital_status': 2,
                'admission_grade': 115.0, 'units_approved': 1,
                'avg_grade': 8.5, 'tuition_status': 0,
                'scholarship': 0, 'age': 32,
                'international': 1, 'gender': 0, 'gdp': 950.0
            }
        },
        {
            'name': 'Low-Risk', 'data': {
                'user_id': 'test_low', 'marital_status': 1,
                'admission_grade': 152.0, 'units_approved': 6,
                'avg_grade': 15.2, 'tuition_status': 1,
                'scholarship': 1, 'age': 19,
                'international': 0, 'gender': 1, 'gdp': 1053.06
            }
        }
    ]
    
    results = []
    for test_case in test_cases:
        try:
            prediction = predictor.predict(test_case['data'])
            results.append({
                'test_name': test_case['name'],
                'dropout_percentage': f"{prediction['dropout_percentage']:.2f}%",
                'risk_level': prediction['risk_level']
            })
        except Exception as e:
            results.append({'test_name': test_case['name'], 'error': str(e)})
    
    return jsonify({'success': True, 'test_results': results})

if __name__ == "__main__":
    print("\n" + "="*70)
    print("EDUPREDICT - REGRESSION FLASK SERVER")
    print("="*70)
    
    if not os.path.exists('student_data.csv'):
        print("⚠️  WARNING: student_data.csv not found!")
    
    init_database()
    
    print("\n✓ Server: http://localhost:5000")
    print("✓ Endpoints:")
    print("  - POST /predict")
    print("  - GET /history/all (for dashboard & history)")
    print("  - GET /history/<user_id>")
    print("  - GET /test-prediction")
    print("✓ Model: REGRESSION (0-100% probability)")
    print("="*70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)