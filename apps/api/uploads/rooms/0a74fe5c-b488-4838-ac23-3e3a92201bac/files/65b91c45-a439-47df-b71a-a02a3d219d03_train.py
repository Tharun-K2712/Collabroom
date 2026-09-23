"""
Model Training & Benchmarking Pipeline for TinyML KWS
Trains:
1. Baseline CNN
2. Depthwise Separable CNN (DS-CNN)
Evaluates:
- Validation & Test Accuracy, Loss curves
- Precision, Recall, F1 Score
- Confusion Matrix
- False Acceptance Rate (FAR)
- False Rejection Rate (FRR)
"""

import os
import sys
import json
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix, accuracy_score

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import config
from training.models import BaselineCNN, DSCNN_TinyKWS, count_parameters
from preprocessing.dataset_loader import build_processed_dataset

def load_data():
    """Loads preprocessed NPZ or triggers feature extraction if missing."""
    npz_path = os.path.join(config.PROCESSED_DATA_DIR, "kws_dataset.npz")
    if not os.path.exists(npz_path):
        print("[INFO] Processed dataset not found. Running dataset loader...")
        npz_path = build_processed_dataset()

    data = np.load(npz_path)
    # PyTorch expects channel first: (Batch, 1, 49, 13)
    X_train = np.transpose(data["X_train"], (0, 3, 1, 2))
    y_train = data["y_train"]
    X_val = np.transpose(data["X_val"], (0, 3, 1, 2))
    y_val = data["y_val"]
    X_test = np.transpose(data["X_test"], (0, 3, 1, 2))
    y_test = data["y_test"]

    return (X_train, y_train), (X_val, y_val), (X_test, y_test)

def train_single_model(model, train_loader, val_loader, epochs=25, lr=0.001, device='cpu'):
    """Trains a model with Adam optimizer and CrossEntropyLoss."""
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = {
        "train_loss": [], "train_acc": [],
        "val_loss": [], "val_acc": []
    }

    best_val_acc = 0.0
    best_weights = None

    for epoch in range(1, epochs + 1):
        # Training Phase
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

        scheduler.step()
        train_loss = running_loss / total
        train_acc = correct / total

        # Validation Phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                _, predicted = outputs.max(1)
                val_total += targets.size(0)
                val_correct += predicted.eq(targets).sum().item()

        val_loss = val_loss / val_total
        val_acc = val_correct / val_total

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            best_weights = model.state_dict().copy()

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch [{epoch:2d}/{epochs:2d}] | Train Loss: {train_loss:.4f} Acc: {train_acc*100:.1f}% | Val Loss: {val_loss:.4f} Acc: {val_acc*100:.1f}%")

    # Load best performing weights
    if best_weights is not None:
        model.load_state_dict(best_weights)

    return model, history

def evaluate_model(model, X_test, y_test, device='cpu'):
    """Computes comprehensive evaluation metrics on the test dataset."""
    model.eval()
    inputs = torch.tensor(X_test, dtype=torch.float32).to(device)
    with torch.no_grad():
        logits = model(inputs)
        probs = torch.softmax(logits, dim=1).numpy()
        preds = np.argmax(probs, axis=1)

    acc = accuracy_score(y_test, preds)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, preds, average='weighted', zero_division=0)
    cm = confusion_matrix(y_test, preds, labels=list(range(len(config.CLASSES))))

    # Wake word specific FAR & FRR
    # Positive class = WAKE_WORD_INDEX (3), Negative classes = 0, 1, 2
    wake_idx = config.WAKE_WORD_INDEX
    tp = cm[wake_idx, wake_idx]
    fn = np.sum(cm[wake_idx, :]) - tp
    fp = np.sum(cm[:, wake_idx]) - tp
    tn = np.sum(cm) - tp - fn - fp

    # False Acceptance Rate: FP / (FP + TN)
    far = (fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    # False Rejection Rate: FN / (FN + TP)
    frr = (fn / (fn + tp)) if (fn + tp) > 0 else 0.0

    return {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1_score": float(f1),
        "far": float(far),
        "frr": float(frr),
        "confusion_matrix": cm.tolist(),
        "classes": config.CLASSES
    }

def run_training_pipeline(epochs=30, batch_size=16):
    """Full training, benchmarking and evaluation pipeline."""
    os.makedirs(config.MODELS_DIR, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[INFO] Using training device: {device}")

    (X_train, y_train), (X_val, y_val), (X_test, y_test) = load_data()

    train_ds = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long))
    val_ds = TensorDataset(torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.long))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    results = {}

    # 1. Train Baseline CNN
    print("\n" + "="*60)
    print("      TRAINING MODEL 1: BASELINE 2D CNN")
    print("="*60)
    baseline_model = BaselineCNN().to(device)
    param_count_baseline = count_parameters(baseline_model)
    print(f"Baseline CNN Parameter Count: {param_count_baseline:,}")

    start_t = time.time()
    baseline_model, baseline_hist = train_single_model(baseline_model, train_loader, val_loader, epochs=epochs, device=device)
    baseline_time = time.time() - start_t
    baseline_eval = evaluate_model(baseline_model, X_test, y_test, device=device)
    baseline_eval["parameters"] = param_count_baseline
    baseline_eval["train_time_sec"] = baseline_time
    baseline_eval["history"] = baseline_hist

    torch.save(baseline_model.state_dict(), os.path.join(config.MODELS_DIR, "baseline_cnn.pth"))

    # 2. Train DS-CNN (Depthwise Separable CNN for TinyML)
    print("\n" + "="*60)
    print("      TRAINING MODEL 2: DEPTHWISE SEPARABLE CNN (DS-CNN)")
    print("="*60)
    dscnn_model = DSCNN_TinyKWS().to(device)
    param_count_dscnn = count_parameters(dscnn_model)
    print(f"DS-CNN Parameter Count: {param_count_dscnn:,}")

    start_t = time.time()
    dscnn_model, dscnn_hist = train_single_model(dscnn_model, train_loader, val_loader, epochs=epochs, device=device)
    dscnn_time = time.time() - start_t
    dscnn_eval = evaluate_model(dscnn_model, X_test, y_test, device=device)
    dscnn_eval["parameters"] = param_count_dscnn
    dscnn_eval["train_time_sec"] = dscnn_time
    dscnn_eval["history"] = dscnn_hist

    torch.save(dscnn_model.state_dict(), os.path.join(config.MODELS_DIR, "dscnn_kws.pth"))

    # Save summary results
    results = {
        "baseline_cnn": baseline_eval,
        "dscnn_tinyml": dscnn_eval,
        "timestamp": time.time(),
        "classes": config.CLASSES
    }

    results_file = os.path.join(config.MODELS_DIR, "training_metrics.json")
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)

    # Print Comparison Table
    print("\n" + "="*70)
    print("                 MODEL COMPARISON & BENCHMARK REPORT")
    print("="*70)
    print(f"{'Metric':<25} | {'Baseline CNN':<18} | {'DS-CNN (TinyML)':<18}")
    print("-" * 70)
    print(f"{'Parameters':<25} | {param_count_baseline:<18,} | {param_count_dscnn:<18,}")
    print(f"{'Test Accuracy':<25} | {baseline_eval['accuracy']*100:<17.2f}% | {dscnn_eval['accuracy']*100:<17.2f}%")
    print(f"{'F1 Score':<25} | {baseline_eval['f1_score']:<18.4f} | {dscnn_eval['f1_score']:<18.4f}")
    print(f"{'False Acceptance Rate':<25} | {baseline_eval['far']*100:<17.2f}% | {dscnn_eval['far']*100:<17.2f}%")
    print(f"{'False Rejection Rate':<25} | {baseline_eval['frr']*100:<17.2f}% | {dscnn_eval['frr']*100:<17.2f}%")
    print("="*70)

    return results

if __name__ == "__main__":
    run_training_pipeline()
