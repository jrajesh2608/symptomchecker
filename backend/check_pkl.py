import joblib
import os

model_path = r'd:\project 1\backend\model.pkl'
if os.path.exists(model_path):
    try:
        data = joblib.load(model_path)
        print(f"Model keys: {data.keys()}")
        if 'symptoms' in data:
            print(f"Symptoms count: {len(data['symptoms'])}")
            print(f"First 10 symptoms: {data['symptoms'][:10]}")
        else:
            print("No 'symptoms' key in model.pkl")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"File not found: {model_path}")
