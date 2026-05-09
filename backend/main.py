from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import joblib
import json
import numpy as np

import models
from database import SessionLocal, engine
from pydantic import BaseModel
from typing import List

# Create SQLite database tables if they do not exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Symptom Checker API")

# Add CORS middleware to allow requests from the Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Load the trained machine learning model
try:
    model_data = joblib.load('model.pkl')
    model = model_data['model']
    symptoms_list = model_data['symptoms']
except Exception as e:
    print(f"Error loading model.pkl: {e}")
    model = None
    symptoms_list = []

# Load descriptions and precautions
try:
    with open('info.json', 'r') as f:
        info = json.load(f)
except Exception:
    info = {'descriptions': {}, 'precautions': {}}

class PredictRequest(BaseModel):
    symptoms: List[str]

@app.get("/symptoms")
def get_symptoms():
    return {"symptoms": symptoms_list}

@app.post("/predict")
def predict(req: PredictRequest, request: Request, db: Session = Depends(get_db)):
    if not model:
        return {"error": "Machine learning model not loaded."}
        
    # Prepare input vector (one-hot encoding)
    x_input = np.zeros(len(symptoms_list))
    for s in req.symptoms:
        if s in symptoms_list:
            x_input[symptoms_list.index(s)] = 1
            
    # Get probabilities from Random Forest
    probs = model.predict_proba([x_input])[0]
    
    # Get top 3 indices sorted highest to lowest
    top_3_idx = np.argsort(probs)[-3:][::-1]
    
    classes = model.classes_
    
    results = []
    for idx in top_3_idx:
        disease = classes[idx]
        confidence = probs[idx]
        if confidence == 0:
            continue # skip 0% confident ones
        
        desc = info['descriptions'].get(disease, "Description not available.")
        precs = info['precautions'].get(disease, [])
        
        results.append({
            "disease": disease,
            "confidence": round(confidence * 100, 2),
            "description": desc,
            "precautions": precs
        })
        
    # Log the session data (anonymized IP address / prediction)
    client_host = request.client.host if request.client else "unknown"
    top_pred = results[0]["disease"] if results else "Unknown"
    
    try:
        log_entry = models.SessionLog(
            ip_address=client_host,
            symptoms=",".join(req.symptoms),
            top_prediction=top_pred
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Failed to log to database: {e}")

    return {"predictions": results}
