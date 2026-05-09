import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import json

def train():
    print("Loading dataset...")
    df = pd.read_csv('../dataset/dataset.csv')
    
    # Extract unique symptoms
    cols = [i for i in df.columns if i != 'Disease']
    
    # Melt dataframe to get a list of all symptoms
    symptoms_series = pd.Series(df[cols].values.ravel()).dropna().str.strip()
    symptoms = sorted(list(symptoms_series.unique()))
    
    # Remove empty strings if any
    if '' in symptoms:
        symptoms.remove('')

    print(f"Loaded {len(symptoms)} unique symptoms.")

    # Create one-hot encoded features
    X = np.zeros((len(df), len(symptoms)))
    
    for i in range(len(df)):
        row = df.iloc[i]
        for col in cols:
            val = row[col]
            if pd.notna(val):
                val = val.strip()
                if val in symptoms:
                    X[i, symptoms.index(val)] = 1
                    
    y = df['Disease'].str.strip().values
    
    # Train test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Accuracy
    acc = model.score(X_test, y_test)
    print(f"Model accuracy on test set: {acc * 100:.2f}%")
    
    # Save the model and symptom list
    model_data = {
        'model': model,
        'symptoms': symptoms
    }
    joblib.dump(model_data, 'model.pkl')
    print("Model saved to model.pkl")

    # Clean and save descriptions and precautions to json for the backend to use fast
    desc_df = pd.read_csv('../dataset/symptom_Description.csv')
    desc_dict = {}
    for _, row in desc_df.iterrows():
        desc_dict[row['Disease'].strip()] = str(row['Description']).strip()
        
    prec_df = pd.read_csv('../dataset/symptom_precaution.csv')
    prec_dict = {}
    for _, row in prec_df.iterrows():
        disease = row['Disease'].strip()
        precs = [str(row[c]).strip() for c in ['Precaution_1', 'Precaution_2', 'Precaution_3', 'Precaution_4'] if pd.notna(row[c]) and str(row[c]).strip() != 'nan']
        prec_dict[disease] = precs
        
    with open('info.json', 'w') as f:
        json.dump({'descriptions': desc_dict, 'precautions': prec_dict}, f)
        
    print("info.json saved.")

if __name__ == '__main__':
    train()
