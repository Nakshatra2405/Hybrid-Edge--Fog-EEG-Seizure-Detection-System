"""
Model Architecture Definition: TinySeizureNet-1D
Designed specifically for TensorFlow Lite for Microcontrollers (TFLite Micro)
on Cortex-M4F (Arduino Nano 33 BLE Sense).
Uses only universally supported operators: Conv2D (1D), DepthwiseConv2D, MaxPool, AvgPool, Dense, ReLU, Sigmoid.
"""

import tensorflow as tf
from tensorflow.keras import layers, models
from ml.src.config import WINDOW_SAMPLES


def build_tiny_seizure_net(input_shape=(1, WINDOW_SAMPLES, 1), learning_rate=1e-3):
    """
    Builds and compiles the compact 1D-CNN architecture.
    Total parameters: ~4,500 parameters (< 10 KB INT8 weights).
    """
    model = models.Sequential([
        # 1. Temporal Convolution (Filter band dynamics)
        layers.Input(shape=input_shape),
        layers.Conv2D(
            filters=8,
            kernel_size=(1, 15),
            strides=(1, 1),
            padding="same",
            activation="relu",
            name="temporal_conv",
        ),
        layers.MaxPooling2D(pool_size=(1, 2), strides=(1, 2), name="pool1"),
        
        # 2. Depthwise Separable Feature Extraction
        layers.DepthwiseConv2D(
            kernel_size=(1, 7),
            strides=(1, 1),
            padding="same",
            depth_multiplier=1,
            activation="relu",
            name="depthwise_conv",
        ),
        layers.MaxPooling2D(pool_size=(1, 4), strides=(1, 4), name="pool2"),
        
        # 3. Pointwise Projection
        layers.Conv2D(
            filters=16,
            kernel_size=(1, 1),
            strides=(1, 1),
            activation="relu",
            name="pointwise_conv",
        ),
        layers.AveragePooling2D(pool_size=(1, 4), strides=(1, 4), name="avg_pool"),
        
        # 4. Dense Classification Head
        layers.Flatten(name="flatten"),
        layers.Dropout(0.25, name="dropout"),
        layers.Dense(16, activation="relu", name="dense1"),
        layers.Dense(1, activation="sigmoid", name="seizure_prob"),
    ], name="TinySeizureNet_1D")

    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    return model


if __name__ == "__main__":
    net = build_tiny_seizure_net()
    net.summary()
