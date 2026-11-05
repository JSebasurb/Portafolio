#!/usr/bin/env python3
"""Búsqueda sobre fichas técnicas (recuperación TF-IDF, sin modelo generativo).

Lee silver/data/fichas.json y silver/data/fichas_eval.json, calcula la similitud coseno
entre cada pregunta y cada ficha, y reporta qué tan a menudo la ficha correcta sale en primer
lugar (recall@1) o entre las tres primeras (recall@3).

Uso:  python scripts/ml/rag_fichas.py     (solo requiere la biblioteca estándar)
"""
import json, math, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STOP = set("a al con de del el en es la las lo los o para por que se si su sus un una y e u como cual cuando "
           "donde son ser hay no mas muy tambien tiene tienen que cuanto cuanta cuantos cuantas".split())

def tokens(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")          # quita tildes
    return [t for t in re.findall(r"[a-z0-9]+(?:\.[0-9]+)?", s) if t not in STOP]

def build(fichas):
    docs = [tokens(f["titulo"] + " " + f["texto"]) for f in fichas]
    N = len(docs)
    df = {}
    for d in docs:
        for t in set(d): df[t] = df.get(t, 0) + 1
    idf = {t: math.log((N + 1) / (v + 1)) + 1 for t, v in df.items()}
    vecs = []
    for d in docs:
        tf = {}
        for t in d: tf[t] = tf.get(t, 0) + 1
        v = {t: (c / len(d)) * idf[t] for t, c in tf.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1
        vecs.append({t: x / norm for t, x in v.items()})
    return idf, vecs

def query_vec(q, idf):
    tf = {}
    for t in tokens(q):
        if t in idf: tf[t] = tf.get(t, 0) + 1
    if not tf: return {}
    v = {t: (c) * idf[t] for t, c in tf.items()}
    norm = math.sqrt(sum(x * x for x in v.values())) or 1
    return {t: x / norm for t, x in v.items()}

def rank(q, idf, vecs):
    qv = query_vec(q, idf)
    scores = [sum(w * d.get(t, 0) for t, w in qv.items()) for d in vecs]
    return sorted(range(len(scores)), key=lambda i: -scores[i]), scores

def main():
    fichas = json.loads((ROOT / "silver/data/fichas.json").read_text(encoding="utf-8"))["fichas"]
    ev = json.loads((ROOT / "silver/data/fichas_eval.json").read_text(encoding="utf-8"))["preguntas"]
    idf, vecs = build(fichas)
    ids = [f["id"] for f in fichas]
    r1 = r3 = 0
    for item in ev:
        order, _ = rank(item["q"], idf, vecs)
        top = [ids[i] for i in order[:3]]
        r1 += top[0] == item["ficha"]; r3 += item["ficha"] in top
        mark = "OK " if top[0] == item["ficha"] else ("T3 " if item["ficha"] in top else "-- ")
        print(f"{mark} {item['q'][:48]:48s} -> {top[0]}")
    n = len(ev)
    print(f"\nrecall@1 = {r1}/{n} = {r1/n:.2f} · recall@3 = {r3}/{n} = {r3/n:.2f}")

if __name__ == "__main__":
    main()
