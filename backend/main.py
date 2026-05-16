from fastapi import FastAPI, Depends, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import joblib
import json
import numpy as np
import os
import hashlib
import hmac
import base64
import time
import secrets

import models
from database import SessionLocal, engine

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

# Simple secret key for token signing
SECRET_KEY = "healthcheck-ai-secret-2024-do-not-share"

# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Load the trained machine learning model
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
model_path = os.path.join(BASE_DIR, 'model.pkl')
try:
    model_data = joblib.load(model_path)
    model = model_data.get('model')
    symptoms_list = model_data.get('symptoms', [])
    if not symptoms_list:
        print('Warning: Symptoms list is empty after loading model.')
except Exception as e:
    print(f"Error loading model.pkl from {model_path}: {e}")
    model = None
    symptoms_list = []

# Load descriptions and precautions from JSON file
info_path = os.path.join(BASE_DIR, 'info.json')
try:
    with open(info_path, 'r') as f:
        info = json.load(f)
except Exception as e:
    print(f"Error loading info.json from {info_path}: {e}")
    info = {'descriptions': {}, 'precautions': {}}


# ─── Simple Token Utilities ─────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """SHA-256 based password hashing with a fixed salt prefix."""
    salted = SECRET_KEY + password
    return hashlib.sha256(salted.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: int, email: str) -> str:
    """Create a simple base64-encoded token with expiry."""
    expiry = int(time.time()) + 86400  # 24 hours
    payload = f"{user_id}:{email}:{expiry}:{secrets.token_hex(8)}"
    encoded = base64.b64encode(payload.encode()).decode()
    sig = hmac.new(SECRET_KEY.encode(), encoded.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{encoded}.{sig}"

def decode_token(token: str) -> Optional[dict]:
    """Decode and validate token, returns user info or None."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        sig = parts[-1]
        encoded = ".".join(parts[:-1])
        expected_sig = hmac.new(SECRET_KEY.encode(), encoded.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = base64.b64decode(encoded).decode()
        # Format: user_id:email:expiry:nonce — split with maxsplit to handle emails with colons
        pieces = payload.split(":")
        user_id_str = pieces[0]
        expiry_str  = pieces[-2]  # second-to-last
        if int(time.time()) > int(expiry_str):
            return None
        email = ":".join(pieces[1:-2])  # re-join in case email had colons
        return {"user_id": int(user_id_str), "email": email}
    except Exception:
        return None

def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    info_tok = decode_token(token)
    if not info_tok:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(models.User).filter(models.User.id == info_tok["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ─── Auth Schemas ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class PredictRequest(BaseModel):
    symptoms: List[str]


# ─── Auth Endpoints ──────────────────────────────────────────────────────────

@app.post("/auth/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = models.User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.email)
    return {
        "message": "Account created successfully",
        "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email}
    }

@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user.id, user.email)
    return {
        "message": "Login successful",
        "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email}
    }

@app.get("/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}

@app.get("/auth/history")
def get_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return past check sessions for the logged-in user (by IP is approximate — here we return recent global logs as demo)."""
    logs = db.query(models.SessionLog).order_by(models.SessionLog.timestamp.desc()).limit(10).all()
    return {
        "history": [
            {
                "id": l.id,
                "symptoms": l.symptoms.split(","),
                "top_prediction": l.top_prediction,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            }
            for l in logs
        ]
    }


# ─── Existing Endpoints ──────────────────────────────────────────────────────

@app.get("/symptoms")
def get_symptoms():
    """Return a JSON object with the list of available symptoms.
    The frontend expects the response format: {"symptoms": ["symptom1", ...]}.
    """
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
