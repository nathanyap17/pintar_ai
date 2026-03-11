"""
Model Evaluation Script for PINTAR.ai DistilBERT Classifier
Generates accuracy, F1 score, confusion matrix, and classification report.
Outputs artifacts for hackathon report and README.

Run after training: python evaluate_model.py
"""

import os
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from datasets import load_dataset
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    confusion_matrix,
    classification_report,
    ConfusionMatrixDisplay,
)
import torch

# ============================================
# Configuration
# ============================================
MODEL_DIR = "./msme_distilbert_model"
DATA_FILE = "data.csv"
OUTPUT_DIR = "./evaluation_results"
LABEL_NAMES = ["PAYMENT_IN", "ORDER_IN", "COMPLAINT"]

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================
# 1. Load Model & Data
# ============================================
print("📦 Loading model and data...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
model.eval()

dataset = load_dataset("csv", data_files=DATA_FILE)
full_dataset = dataset["train"]
split = full_dataset.train_test_split(test_size=0.2, seed=42, stratify_by_column="label")
test_dataset = split["test"]

print(f"   Test set: {len(test_dataset)} samples")

# ============================================
# 2. Run Predictions
# ============================================
print("🔄 Running predictions...")
all_preds = []
all_labels = []

for sample in test_dataset:
    inputs = tokenizer(sample["text"], return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        outputs = model(**inputs)
    pred = torch.argmax(outputs.logits, dim=-1).item()
    all_preds.append(pred)
    all_labels.append(sample["label"])

all_preds = np.array(all_preds)
all_labels = np.array(all_labels)

# ============================================
# 3. Compute Metrics
# ============================================
accuracy = accuracy_score(all_labels, all_preds)
f1_weighted = f1_score(all_labels, all_preds, average="weighted")
f1_per_class = f1_score(all_labels, all_preds, average=None)
report = classification_report(all_labels, all_preds, target_names=LABEL_NAMES, output_dict=True)
cm = confusion_matrix(all_labels, all_preds)

print(f"\n📊 Results:")
print(f"   Accuracy:    {accuracy:.4f} ({'✅' if accuracy >= 0.85 else '⚠️'} target: ≥0.85)")
print(f"   F1 Weighted: {f1_weighted:.4f} ({'✅' if f1_weighted >= 0.83 else '⚠️'} target: ≥0.83)")
for i, name in enumerate(LABEL_NAMES):
    print(f"   F1 {name}: {f1_per_class[i]:.4f}")

# ============================================
# 4. Save Confusion Matrix PNG
# ============================================
fig, ax = plt.subplots(figsize=(8, 6))
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=LABEL_NAMES)
disp.plot(ax=ax, cmap="Blues", values_format="d")
ax.set_title("PINTAR.ai DistilBERT — Confusion Matrix\n(Sarawak MSME Transaction Classification)", fontsize=12)
plt.tight_layout()
cm_path = os.path.join(OUTPUT_DIR, "confusion_matrix.png")
plt.savefig(cm_path, dpi=150)
plt.close()
print(f"   💾 Confusion matrix saved: {cm_path}")

# ============================================
# 5. Save Classification Report JSON
# ============================================
report_path = os.path.join(OUTPUT_DIR, "classification_report.json")
with open(report_path, "w") as f:
    json.dump(report, f, indent=2)
print(f"   💾 Classification report saved: {report_path}")

# ============================================
# 6. Save Human-Readable Summary
# ============================================
summary_path = os.path.join(OUTPUT_DIR, "evaluation_summary.txt")
with open(summary_path, "w") as f:
    f.write("=" * 60 + "\n")
    f.write("PINTAR.ai DistilBERT Model Evaluation Summary\n")
    f.write("=" * 60 + "\n\n")
    f.write(f"Model: Fine-tuned DistilBERT (distilbert-base-uncased)\n")
    f.write(f"Task: 3-class Sarawak MSME transaction classification\n")
    f.write(f"Dataset: {len(full_dataset)} total, {len(test_dataset)} test\n")
    f.write(f"Languages: Manglish, Sarawak Malay, Iban, Foochow mix\n\n")
    f.write(f"OVERALL METRICS\n")
    f.write(f"  Accuracy:        {accuracy:.4f}\n")
    f.write(f"  F1 (weighted):   {f1_weighted:.4f}\n\n")
    f.write(f"PER-CLASS METRICS\n")
    f.write(classification_report(all_labels, all_preds, target_names=LABEL_NAMES))
    f.write(f"\nCONFUSION MATRIX\n")
    f.write(f"  Rows = True, Cols = Predicted\n")
    f.write(f"  {LABEL_NAMES}\n")
    for i, row in enumerate(cm):
        f.write(f"  {LABEL_NAMES[i]:12s}: {row}\n")
    f.write(f"\n{'✅ PASS' if accuracy >= 0.85 else '⚠️ BELOW TARGET'}: ")
    f.write(f"Accuracy {'meets' if accuracy >= 0.85 else 'below'} 85% target\n")

print(f"   💾 Summary saved: {summary_path}")
print(f"\n{'✅' if accuracy >= 0.85 else '⚠️'} Evaluation complete!")
