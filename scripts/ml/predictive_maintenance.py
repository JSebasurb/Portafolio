#!/usr/bin/env python3
"""Mantenimiento predictivo (DEMO con señales simuladas).

Genera vibraciones de un rodamiento sano y con fallas (pista interior, exterior, bola),
extrae características en el dominio del tiempo y de la frecuencia, entrena una regresión
logística y exporta los parámetros para usarlos en el navegador.

Uso:  python scripts/ml/predictive_maintenance.py      (requiere numpy y scikit-learn)
Salida: silver/data/pm_model.json
"""
import json
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import confusion_matrix, accuracy_score

FS = 10000.0          # frecuencia de muestreo (Hz)
N = 2048              # muestras por señal
FR = 30.0             # frecuencia del eje (Hz) ≈ 1800 rpm
# Frecuencias de falla típicas de un rodamiento genérico (múltiplos de la frecuencia del eje)
BPFO, BPFI, BSF = 3.58 * FR, 5.42 * FR, 2.36 * FR
CLASSES = ["sano", "interior", "exterior", "bola"]
SEV = {"baja": 0.6, "media": 1.2, "alta": 2.4}
FEATURES = ["rms", "pico", "factor_cresta", "curtosis", "env_1x", "env_BPFI", "env_BPFO", "env_BSF"]
ROOT = Path(__file__).resolve().parents[2]

def signal(rng, cond, sev="media"):
    t = np.arange(N) / FS
    x = (0.5 * np.sin(2 * np.pi * FR * t + rng.uniform(0, 6.28))
         + 0.2 * np.sin(2 * np.pi * 2 * FR * t + rng.uniform(0, 6.28)))
    x += rng.normal(0, 0.3, N)
    if cond == "sano":
        return x
    fd = {"interior": BPFI, "exterior": BPFO, "bola": BSF}[cond]
    amp = SEV[sev] * (0.7 if cond == "bola" else 1.0)
    period = 1.0 / fd
    k = 0.0
    while k * period < N / FS:
        tk = k * period + rng.normal(0, 0.01 * period)
        m = t >= tk
        dt = t[m] - tk
        mod = 1 + 0.5 * np.sin(2 * np.pi * FR * t[m]) if cond == "interior" else 1.0
        x[m] += amp * mod * np.exp(-1500 * dt) * np.sin(2 * np.pi * 3000 * dt)
        k += 1
    return x

def amp_at(x, f):
    n = np.arange(len(x))
    return 2.0 / len(x) * abs(np.sum(x * np.exp(-2j * np.pi * f * n / FS)))

def features(x):
    """Dominio del tiempo (RMS, pico, factor de cresta, curtosis) y espectro de la envolvente
    (valor absoluto sin media) en 1x y en las frecuencias de falla del rodamiento."""
    rms = float(np.sqrt(np.mean(x ** 2)))
    pico = float(np.max(np.abs(x)))
    s = float(np.std(x))
    kurt = float(np.mean((x - x.mean()) ** 4) / s ** 4)
    env = np.abs(x - x.mean())
    return [rms, pico, pico / rms, kurt, amp_at(env, FR), amp_at(env, BPFI), amp_at(env, BPFO), amp_at(env, BSF)]

def dataset(n_per, seed):
    rng = np.random.default_rng(seed)
    X, y, sv = [], [], []
    for c in CLASSES:
        sevs = ["-"] if c == "sano" else list(SEV)
        for s in sevs:
            for _ in range(n_per if c == "sano" else n_per // len(SEV)):
                X.append(features(signal(rng, c, s))); y.append(c); sv.append(s)
    return np.array(X), np.array(y), np.array(sv)

def main():
    X, y, sv = dataset(n_per=180, seed=7)
    Xtr, Xte, ytr, yte, _, sv_te = train_test_split(X, y, sv, test_size=0.3, stratify=y, random_state=7)
    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    acc = accuracy_score(yte, pred)
    cv = cross_val_score(make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000)), X, y,
                         cv=StratifiedKFold(5, shuffle=True, random_state=7))
    cm = confusion_matrix(yte, pred, labels=CLASSES).tolist()
    by_sev = {}
    for s in ["baja", "media", "alta"]:
        m = sv_te == s
        by_sev[s] = float(accuracy_score(yte[m], pred[m]))
    # vector de prueba para verificar que el JavaScript calcula igual que Python
    rng = np.random.default_rng(2024)
    test_sig = signal(rng, "interior", "media")
    out = {
        "fs": FS, "n": N, "fr": FR, "bpfo": BPFO, "bpfi": BPFI, "bsf": BSF,
        "classes": [str(c) for c in model.named_steps["logisticregression"].classes_],  # orden real de las filas de coef
        "features": FEATURES, "sev": SEV,
        "scaler_mean": model.named_steps["standardscaler"].mean_.tolist(),
        "scaler_scale": model.named_steps["standardscaler"].scale_.tolist(),
        "coef": model.named_steps["logisticregression"].coef_.tolist(),
        "intercept": model.named_steps["logisticregression"].intercept_.tolist(),
        "metrics": {"accuracy_test": round(float(acc), 4), "cv5_mean": round(float(cv.mean()), 4),
                    "cv5_std": round(float(cv.std()), 4), "confusion": cm, "labels": CLASSES,
                    "accuracy_by_severity": {k: round(v, 4) for k, v in by_sev.items()},
                    "n_train": int(len(Xtr)), "n_test": int(len(Xte)), "n_total": int(len(X))},
        "parity": {"signal": [round(float(v), 6) for v in test_sig],
                   "features": [round(v, 8) for v in features(test_sig)]},
    }
    dst = ROOT / "silver" / "data" / "pm_model.json"
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Datos: {len(X)} señales ({len(Xtr)} entrenamiento / {len(Xte)} prueba)")
    print(f"Exactitud en prueba: {acc:.3f} · validación cruzada 5: {cv.mean():.3f} ± {cv.std():.3f}")
    print("Exactitud por severidad:", {k: round(v, 3) for k, v in by_sev.items()})
    print("Matriz de confusión (filas=real, columnas=predicho):", CLASSES)
    for c, row in zip(CLASSES, cm): print(f"  {c:9s}", row)
    print("Modelo exportado a", dst.relative_to(ROOT))

if __name__ == "__main__":
    main()
