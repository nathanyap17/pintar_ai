"""
DistilBERT Fine-tuning Script for Sarawak MSME Transaction Classification
Run in Google Colab with T4/A100 GPU.

Labels:
  0 = PAYMENT_IN  (payment confirmations)
  1 = ORDER_IN    (new orders/requests)
  2 = COMPLAINT   (complaints/issues)
"""

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
)
from datasets import load_dataset
from sklearn.model_selection import train_test_split
import numpy as np

# ============================================
# 1. Load Model & Tokenizer
# ============================================
MODEL_NAME = "distilbert-base-uncased"
NUM_LABELS = 3

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=NUM_LABELS)

# ============================================
# 2. Load & Prepare Dataset
# ============================================
dataset = load_dataset("csv", data_files="data.csv")

# Train/test split (80/20, stratified)
full_dataset = dataset["train"]
train_test = full_dataset.train_test_split(test_size=0.2, seed=42, stratify_by_column="label")


def tokenize_function(batch):
    return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=128)


train_dataset = train_test["train"].map(tokenize_function, batched=True)
test_dataset = train_test["test"].map(tokenize_function, batched=True)

# Set format for PyTorch
train_dataset.set_format("torch", columns=["input_ids", "attention_mask", "label"])
test_dataset.set_format("torch", columns=["input_ids", "attention_mask", "label"])

# ============================================
# 3. Training Configuration
# ============================================
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=10,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    warmup_steps=50,
    weight_decay=0.01,
    learning_rate=2e-5,
    logging_dir="./logs",
    logging_steps=10,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    report_to="none",
)


# ============================================
# 4. Metrics
# ============================================
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    accuracy = (predictions == labels).mean()
    return {"accuracy": accuracy}


# ============================================
# 5. Train
# ============================================
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    compute_metrics=compute_metrics,
)

print("🚀 Starting DistilBERT fine-tuning...")
trainer.train()

# ============================================
# 6. Evaluate
# ============================================
results = trainer.evaluate()
print(f"\n📊 Evaluation Results:")
print(f"   Accuracy: {results['eval_accuracy']:.4f}")
print(f"   Loss: {results['eval_loss']:.4f}")

# ============================================
# 7. Export Model
# ============================================
OUTPUT_DIR = "./msme_distilbert_model"
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"\n✅ Model saved to {OUTPUT_DIR}")
print(f"   Copy this folder to backend/models/ for deployment.")
