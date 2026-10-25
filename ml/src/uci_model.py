"""
Compact 1D-CNN Architecture Adapted for UCI 178-Sample Vectors
Architecture: UCITinySeizureNet-1D
Input Shape: (1, 178, 1)
Total Trainable Parameters: ~2,600 (< 10 KB INT8 flatbuffer)
"""

import tensorflow as tf
from tensorflow.keras import layers, models


def build_uci_tiny_seizure_net(input_shape=(1, 178, 1), learning_rate=1e-3):
    """
    Builds and compiles the compact 1D-CNN for UCI 178-sample vectors.
    """
    model = models.Sequential([
        layers.Input(shape=input_shape),
        # 1. Temporal feature extraction
        layers.Conv2D(
            filters=8,
            kernel_size=(1, 15),
            strides=(1, 1),
            padding="same",
            activation="relu",
            name="temporal_conv",
        ),
        layers.MaxPooling2D(pool_size=(1, 2), strides=(1, 2), name="pool1"),

        # 2. Depthwise Separable Filter
        layers.DepthwiseConv2D(
            kernel_size=(1, 7),
            strides=(1, 1),
            padding="same",
            depth_multiplier=1,
            activation="relu",
            name="depthwise_conv",
        ),
        layers.MaxPooling2D(pool_size=(1, 3), strides=(1, 3), name="pool2"),

        # 3. Pointwise Projection
        layers.Conv2D(
            filters=16,
            kernel_size=(1, 1),
            strides=(1, 1),
            activation="relu",
            name="pointwise_conv",
        ),
        layers.AveragePooling2D(pool_size=(1, 3), strides=(1, 3), name="avg_pool"),

        # 4. Dense Classification Head
        layers.Flatten(name="flatten"),
        layers.Dropout(0.25, name="dropout"),
        layers.Dense(16, activation="relu", name="dense1"),
        layers.Dense(1, activation="sigmoid", name="seizure_prob"),
    ], name="UCITinySeizureNet_1D")

    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    return model


if __name__ == "__main__":
    net = build_uci_tiny_seizure_net()
    net.summary()
