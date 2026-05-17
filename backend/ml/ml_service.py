"""ML Service: Delay Prediction + Risk Classification"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pickle
import os

# ─── Encoders ────────────────────────────────────────────────────────────────
WEATHER_MAP = {"Clear": 0, "Cloudy": 1, "Rainy": 2, "Foggy": 3, "Stormy": 4}
SIGNAL_MAP = {"Green": 0, "Yellow": 1, "Red": 2}
CONGESTION_MAP = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
RISK_MAP = {0: "Low", 1: "Medium", 2: "High", 3: "Critical"}


def _encode(value: str, mapping: dict, default: int = 0) -> int:
    return mapping.get(value, default)


def _generate_training_data(n: int = 500):
    np.random.seed(42)
    speeds = np.random.uniform(20, 140, n)
    distances = np.random.uniform(5, 300, n)
    weathers = np.random.choice(list(WEATHER_MAP.keys()), n)
    signals = np.random.choice(list(SIGNAL_MAP.keys()), n)
    congestions = np.random.choice(list(CONGESTION_MAP.keys()), n)
    prev_delays = np.random.uniform(0, 60, n)
    risk_counts = np.random.randint(0, 5, n)

    delays = []
    for i in range(n):
        base = prev_delays[i] * 0.5
        base += (140 - speeds[i]) * 0.1
        base += WEATHER_MAP[weathers[i]] * 3
        base += SIGNAL_MAP[signals[i]] * 5
        base += CONGESTION_MAP[congestions[i]] * 4
        base += risk_counts[i] * 6
        base += np.random.normal(0, 2)
        delays.append(max(0, base))

    risks = []
    for i in range(n):
        score = risk_counts[i] * 2 + SIGNAL_MAP[signals[i]] + CONGESTION_MAP[congestions[i]]
        if risk_counts[i] >= 3 or (signals[i] == "Red" and speeds[i] > 30):
            risks.append(3)  # Critical
        elif risk_counts[i] >= 2 or speeds[i] > 120:
            risks.append(2)  # High
        elif risk_counts[i] >= 1 or congestions[i] == "High":
            risks.append(1)  # Medium
        else:
            risks.append(0)  # Low

    X = np.column_stack([
        speeds, distances,
        [WEATHER_MAP[w] for w in weathers],
        [SIGNAL_MAP[s] for s in signals],
        [CONGESTION_MAP[c] for c in congestions],
        prev_delays, risk_counts
    ])
    return X, np.array(delays), np.array(risks)


class MLService:
    def __init__(self):
        self.delay_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.risk_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self._train()

    def _train(self):
        X, y_delay, y_risk = _generate_training_data(600)
        self.delay_model.fit(X, y_delay)
        self.risk_model.fit(X, y_risk)

    def predict_delay(self, speed: float, distance: float, weather: str,
                      signal_status: str, congestion: str,
                      previous_delay: float, detected_risk_count: int) -> dict:
        X = np.array([[
            speed, distance,
            _encode(weather, WEATHER_MAP),
            _encode(signal_status, SIGNAL_MAP),
            _encode(congestion, CONGESTION_MAP),
            previous_delay, detected_risk_count
        ]])
        pred = float(self.delay_model.predict(X)[0])
        importances = self.delay_model.feature_importances_
        feature_names = ["speed", "distance", "weather", "signal", "congestion", "prev_delay", "risk_count"]
        factors = {name: round(float(imp), 3) for name, imp in zip(feature_names, importances)}
        # Compute rough confidence
        preds = [t.predict(X)[0] for t in self.delay_model.estimators_[:20]]
        std = float(np.std(preds))
        confidence = max(0.0, min(1.0, 1 - std / (pred + 1)))
        return {"predicted_delay": round(max(0, pred), 1), "confidence": round(confidence, 2), "factors": factors}

    def predict_risk(self, speed: float, distance: float, weather: str,
                     signal_status: str, congestion: str,
                     previous_delay: float, detected_risk_count: int) -> dict:
        X = np.array([[
            speed, distance,
            _encode(weather, WEATHER_MAP),
            _encode(signal_status, SIGNAL_MAP),
            _encode(congestion, CONGESTION_MAP),
            previous_delay, detected_risk_count
        ]])
        risk_idx = int(self.risk_model.predict(X)[0])
        proba = self.risk_model.predict_proba(X)[0]
        return {"risk_level": RISK_MAP.get(risk_idx, "Low"), "risk_score": round(float(proba[risk_idx]), 2)}


# Singleton
ml_service = MLService()
