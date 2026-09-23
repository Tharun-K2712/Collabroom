"""
TinyML Keyword Spotting (KWS) Configuration
Wake Word: "IMPOSTER"
Target Constraint: RAM < 256 KB on Edge MCU
"""

import os

# Base paths
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset", "raw")
PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "dataset", "processed")
MODELS_DIR = os.path.join(PROJECT_ROOT, "training", "saved_models")
FIRMWARE_DIR = os.path.join(PROJECT_ROOT, "firmware")

# Audio Specifications
SAMPLE_RATE = 16000          # 16 kHz mono
AUDIO_DURATION_SEC = 1.0     # 1 second window
TOTAL_SAMPLES = int(SAMPLE_RATE * AUDIO_DURATION_SEC)  # 16,000 samples
BIT_DEPTH = 16               # 16-bit signed PCM

# DSP / MFCC Feature Extraction Parameters
FRAME_LENGTH_MS = 40.0       # 40 ms window (640 samples at 16 kHz)
FRAME_STRIDE_MS = 20.0       # 20 ms hop / stride (320 samples at 16 kHz)
FRAME_LENGTH_SAMPLES = int(SAMPLE_RATE * (FRAME_LENGTH_MS / 1000.0))  # 640
FRAME_STRIDE_SAMPLES = int(SAMPLE_RATE * (FRAME_STRIDE_MS / 1000.0))  # 320

FFT_SIZE = 1024              # Radix-2 FFT size (covers 640 samples with zero-padding)
NUM_MEL_BINS = 40            # 40 triangular Mel filterbank channels
NUM_MFCC_FEATURES = 13       # 13 MFCC coefficients per frame
LOWER_FREQUENCY_HZ = 20.0    # 20 Hz (filters out DC and sub-bass rumble)
UPPER_FREQUENCY_HZ = 8000.0  # Nyquist frequency for 16 kHz

# Calculated Feature Matrix Shape
# Number of frames = 1 + int((TOTAL_SAMPLES - FRAME_LENGTH_SAMPLES) / FRAME_STRIDE_SAMPLES)
# (16000 - 640) / 320 = 48 -> 49 frames total
NUM_FRAMES = 1 + (TOTAL_SAMPLES - FRAME_LENGTH_SAMPLES) // FRAME_STRIDE_SAMPLES # 49
INPUT_SHAPE = (NUM_FRAMES, NUM_MFCC_FEATURES, 1)  # (49, 13, 1) = 637 input features

# Classes
CLASSES = ["silence", "noise", "unknown", "wake_word"]
LABEL_TO_INDEX = {cls: idx for idx, cls in enumerate(CLASSES)}
INDEX_TO_LABEL = {idx: cls for idx, cls in enumerate(CLASSES)}
WAKE_WORD_LABEL = "wake_word"
WAKE_WORD_INDEX = LABEL_TO_INDEX[WAKE_WORD_LABEL]

# Detection / Inference Thresholds
CONFIDENCE_THRESHOLD = 0.85  # Minimum confidence for "HEY MAMSEY" trigger
DEBOUNCE_TIME_MS = 1500      # 1.5 second debounce after activation
SMOOTHING_WINDOW = 3         # Moving average smoothing over consecutive inference frames

# RAM Budget Target for Final MCU Migration (< 256 KB)
MAX_ALLOWED_RAM_KB = 256
MAX_TENSOR_ARENA_KB = 32     # Target < 32 KB for ML arena
MAX_AUDIO_BUFFER_KB = 16     # Target < 16 KB for DMA ring buffer
