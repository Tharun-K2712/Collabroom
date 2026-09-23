"""
TinyML Neural Network Architectures for Keyword Spotting (KWS)
Wake Word: "HEY MAMSEY"
Target Constraint: Strict RAM < 256 KB on Edge MCU

Models:
1. BaselineCNN: Standard 2D Convolutional Neural Network
2. DSCNN_TinyKWS: Depthwise Separable CNN (DS-CNN) optimized for ARM Cortex-M / Xtensa TinyML
"""

import torch
import torch.nn as nn
import config

class BaselineCNN(nn.Module):
    """
    Standard Baseline 2D CNN for Audio MFCC Classification.
    Input Shape: (Batch, 1, 49, 13)
    """
    def __init__(self, num_classes=len(config.CLASSES)):
        super(BaselineCNN, self).__init__()
        self.features = nn.Sequential(
            # Conv Layer 1
            nn.Conv2d(1, 16, kernel_size=(5, 3), stride=1, padding=(2, 1)),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=(2, 2)),

            # Conv Layer 2
            nn.Conv2d(16, 32, kernel_size=(3, 3), stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=(2, 2)),

            # Conv Layer 3
            nn.Conv2d(32, 32, kernel_size=(3, 3), stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.3),
            nn.Linear(32, num_classes)
        )

    def forward(self, x):
        feat = self.features(x)
        out = self.classifier(feat)
        return out

class DepthwiseSeparableBlock(nn.Module):
    """
    Depthwise Separable Convolution Block:
    1. Depthwise Conv: applies a single 3x3 filter per input channel (spatial convolution)
    2. Pointwise Conv: applies a 1x1 filter across all channels (channel combination)
    Reduces compute & parameters by ~8x compared to standard conv.
    """
    def __init__(self, in_channels, out_channels, stride=(1, 1)):
        super(DepthwiseSeparableBlock, self).__init__()
        self.depthwise = nn.Conv2d(
            in_channels,
            in_channels,
            kernel_size=(3, 3),
            stride=stride,
            padding=(1, 1),
            groups=in_channels,
            bias=False
        )
        self.bn_dw = nn.BatchNorm2d(in_channels)
        self.relu_dw = nn.ReLU()

        self.pointwise = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=(1, 1),
            stride=(1, 1),
            bias=False
        )
        self.bn_pw = nn.BatchNorm2d(out_channels)
        self.relu_pw = nn.ReLU()

    def forward(self, x):
        x = self.relu_dw(self.bn_dw(self.depthwise(x)))
        x = self.relu_pw(self.bn_pw(self.pointwise(x)))
        return x

class DSCNN_TinyKWS(nn.Module):
    """
    Ultra-Lightweight Depthwise Separable CNN (DS-CNN) for TinyML KWS.
    Features:
    - Highly optimized for ARM Cortex-M / CMSIS-NN and ESP32 TFLite Micro.
    - Global average pooling eliminates large dense layer weights.
    - Minimal activation memory footprint (< 25 KB peak SRAM arena).
    - Sub-15K total parameters (< 18 KB INT8 Flash size).
    """
    def __init__(self, num_classes=len(config.CLASSES)):
        super(DSCNN_TinyKWS, self).__init__()
        # Initial standard Conv layer
        self.conv1 = nn.Conv2d(1, 16, kernel_size=(5, 3), stride=(2, 1), padding=(2, 1), bias=False)
        self.bn1 = nn.BatchNorm2d(16)
        self.relu1 = nn.ReLU()

        # DS-CNN Blocks
        self.ds_block1 = DepthwiseSeparableBlock(16, 32, stride=(1, 1))
        self.ds_block2 = DepthwiseSeparableBlock(32, 32, stride=(2, 2))
        self.ds_block3 = DepthwiseSeparableBlock(32, 48, stride=(1, 1))
        self.ds_block4 = DepthwiseSeparableBlock(48, 48, stride=(2, 2))

        # Global Pooling & Output
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.dropout = nn.Dropout(0.2)
        self.fc = nn.Linear(48, num_classes)

    def forward(self, x):
        # x shape: (Batch, 1, 49, 13)
        x = self.relu1(self.bn1(self.conv1(x)))
        x = self.ds_block1(x)
        x = self.ds_block2(x)
        x = self.ds_block3(x)
        x = self.ds_block4(x)
        x = self.global_pool(x)
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        x = self.fc(x)
        return x

def count_parameters(model):
    """Calculates total trainable and non-trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
