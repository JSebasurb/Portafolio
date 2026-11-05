#!/usr/bin/env python3
"""Visión por computador (DEMO con imágenes simuladas) para inspección de tornillos.

Genera vistas superiores de cabezas de tornillo (64x64 px) sanas, con grieta o con la cabeza golpeada,
extrae un descriptor físico (forma de la cabeza, borde mordido y oscuridad junto al borde) y entrena una regresión logística.
Exporta los parámetros para usarlos en el navegador.

Uso:  python scripts/ml/vision_screws.py     (requiere numpy y scikit-learn)
Salida: silver/data/vision_model.json
"""
import json
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import confusion_matrix, accuracy_score

S = 64                      # tamaño de la imagen (px)
CLASSES = ["sano", "rajado", "golpeado"]
ROOT = Path(__file__).resolve().parents[2]

def make(rng, cls):
    yy, xx = np.mgrid[0:S, 0:S].astype(float)
    cx, cy = 32 + rng.uniform(-3, 3), 32 + rng.uniform(-3, 3)
    R = rng.uniform(17, 20)
    d = np.hypot(xx - cx, yy - cy)
    head = d <= R
    img = np.full((S, S), 0.80)
    img[head] = 0.40 + 0.12 * (1 - d[head] / R)          # cabeza metálica con sombreado
    img[head & (d >= R - 2.2)] = 0.62                    # borde iluminado
    th = rng.uniform(0, np.pi)                           # ranura: ancha, cruza el centro y llega al borde
    dl = np.abs((xx - cx) * np.sin(th) - (yy - cy) * np.cos(th))
    along = (xx - cx) * np.cos(th) + (yy - cy) * np.sin(th)
    img[head & (dl <= 1.6) & (np.abs(along) <= R * 0.85)] = 0.12
    if cls == "rajado":
        # grieta fina que nace en el borde, avanza hacia adentro con trazo irregular y no llega al centro
        a = rng.uniform(0, 2 * np.pi)
        L = rng.uniform(0.45, 0.7) * R
        x0, y0 = cx + (R - 1) * np.cos(a), cy + (R - 1) * np.sin(a)
        ang = a + np.pi + rng.normal(0, 0.15)
        for step in range(int(L * 4)):
            ang += rng.normal(0, 0.08)
            x0 -= 0.25 * np.cos(ang); y0 -= 0.25 * np.sin(ang)
            img[(np.hypot(xx - x0, yy - y0) <= 0.9) & head] = 0.12
    if cls == "golpeado":
        a = rng.uniform(0, 2 * np.pi)
        r = rng.uniform(3.0, 6.0)
        gx, gy = cx + (R - 1) * np.cos(a), cy + (R - 1) * np.sin(a)
        chip = np.hypot(xx - gx, yy - gy) <= r
        img[chip] = 0.80                                  # trozo arrancado del borde
    img = img * rng.uniform(0.88, 1.12) + rng.uniform(-0.04, 0.04)
    img += rng.normal(0, 0.03, (S, S))
    return np.clip(img, 0, 1)

def otsu(img):
    """Umbral de Otsu (64 niveles) para separar la cabeza del fondo."""
    h, _ = np.histogram(img, bins=64, range=(0, 1))
    p = h / h.sum(); centers = (np.arange(64) + 0.5) / 64
    best_v, best_t = -1.0, 0.5
    for k in range(1, 64):
        w0 = p[:k].sum(); w1 = 1 - w0
        if w0 <= 0 or w1 <= 0: continue
        m0 = (p[:k] * centers[:k]).sum() / w0; m1 = (p[k:] * centers[k:]).sum() / w1
        v = w0 * w1 * (m0 - m1) ** 2
        if v > best_v: best_v, best_t = v, k / 64
    return best_t

def desc(img):
    """Descriptor físico de 6 valores:
    0) irregularidad del radio (forma redonda vs. borde mordido)
    1) radio mínimo relativo (un trozo arrancado reduce el radio en un sector)
    2) área relativa a un círculo del radio medio
    3) fracción de píxeles oscuros que tocan el borde (una grieta nace en el borde)
    4) fracción de píxeles oscuros dentro de la cabeza
    5) brillo medio de la cabeza
    """
    t = otsu(img)
    head = img < t
    ys, xs = np.nonzero(head)
    if len(xs) < 20:
        return [0.0] * 6
    cx, cy = xs.mean(), ys.mean()
    area = head.sum()
    rs = []
    for a in np.arange(0, 360, 5):
        ca, sa = np.cos(np.radians(a)), np.sin(np.radians(a))
        r = 0.0
        for st in np.arange(0.5, 45, 0.5):
            x = int(np.floor(cx + ca * st + 0.5)); y = int(np.floor(cy + sa * st + 0.5))  # redondeo explícito (igual en JS)
            if x < 0 or y < 0 or x >= S or y >= S or not head[y, x]: break
            r = st
        rs.append(r)
    rs = np.array(rs); mr = rs.mean() + 1e-9
    dark = head & (img < 0.3)
    band = np.zeros_like(head)
    for y, x in zip(*np.nonzero(head)):
        y0, y1, x0, x1 = max(0, y - 3), min(S, y + 4), max(0, x - 3), min(S, x + 4)
        if (~head[y0:y1, x0:x1]).any(): band[y, x] = True
    nd = dark.sum()
    return [float(rs.std() / mr), float(rs.min() / mr), float(area / (np.pi * mr * mr)),
            float((dark & band).sum() / (nd + 1)), float(nd / area), float(img[head].mean())]

def dataset(n_per, seed):
    rng = np.random.default_rng(seed)
    X, y, imgs = [], [], []
    for c in CLASSES:
        for _ in range(n_per):
            im = make(rng, c)
            X.append(desc(im)); y.append(c); imgs.append(im)
    return np.array(X), np.array(y), imgs

def main():
    X, y, imgs = dataset(n_per=300, seed=11)
    idx = np.arange(len(y))
    tr, te = train_test_split(idx, test_size=0.3, stratify=y, random_state=11)
    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
    model.fit(X[tr], y[tr])
    pred = model.predict(X[te])
    acc = accuracy_score(y[te], pred)
    cv = cross_val_score(make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000)),
                         X, y, cv=StratifiedKFold(5, shuffle=True, random_state=11))
    cm = confusion_matrix(y[te], pred, labels=CLASSES).tolist()
    per = {c: float(accuracy_score(y[te][y[te] == c], pred[y[te] == c])) for c in CLASSES}
    rng = np.random.default_rng(4242)
    test_img = np.round(make(rng, "rajado"), 4)     # la imagen exportada es la redondeada
    sc = model.named_steps["standardscaler"]; lr = model.named_steps["logisticregression"]
    out = {
        "s": S, "features": ["irregularidad_radio", "radio_minimo", "area_relativa", "oscuro_en_borde", "oscuro_total", "brillo_cabeza"],
        "classes": [str(c) for c in lr.classes_],
        "scaler_mean": sc.mean_.tolist(), "scaler_scale": sc.scale_.tolist(),
        "coef": lr.coef_.tolist(), "intercept": lr.intercept_.tolist(),
        "metrics": {"accuracy_test": round(float(acc), 4), "cv5_mean": round(float(cv.mean()), 4),
                    "cv5_std": round(float(cv.std()), 4), "confusion": cm, "labels": CLASSES,
                    "accuracy_by_class": {k: round(v, 4) for k, v in per.items()},
                    "n_total": int(len(y)), "n_test": int(len(te))},
        "parity": {"image": [round(float(v), 4) for v in test_img.ravel()],
                   "features": [round(float(v), 8) for v in desc(test_img)]},
    }
    dst = ROOT / "silver" / "data" / "vision_model.json"
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Imágenes: {len(y)} ({len(tr)} entrenamiento / {len(te)} prueba) · descriptor de {X.shape[1]} valores")
    print(f"Exactitud en prueba: {acc:.3f} · validación cruzada 5: {cv.mean():.3f} ± {cv.std():.3f}")
    print("Exactitud por clase:", {k: round(v, 3) for k, v in per.items()})
    for c, row in zip(CLASSES, cm): print(f"  {c:9s}", row)
    print("Modelo exportado a", dst.relative_to(ROOT))

if __name__ == "__main__":
    main()
