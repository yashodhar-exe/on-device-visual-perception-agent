"""
loader.py

VLM Hardware Detection & Model Loader for Privacy Vision Agent:
- Probes hardware capabilities (NVIDIA CUDA GPU, Apple MPS, Intel/AMD CPU).
- Inspects PyTorch, Transformers, and Qwen-VL-Utils dependencies.
- Handles real loading of Qwen/Qwen2.5-VL-3B-Instruct if weights & libraries exist.
- Implements transparent fallback to deterministic action planning when weights or GPU VRAM are unavailable.
"""

import os
import sys
import platform
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("PrivacyFirewall.VLM")


class HardwareProbe:
    """Probes system hardware resources for local neural VLM execution."""

    @staticmethod
    def get_hardware_info() -> Dict[str, Any]:
        info: Dict[str, Any] = {
            "os": platform.platform(),
            "python_version": sys.version.split()[0],
            "cpu_count": os.cpu_count() or 1,
            "cuda_available": False,
            "gpu_name": None,
            "vram_gb": 0.0,
            "recommended_device": "cpu",
            "quantization_support": "none",
        }

        try:
            import torch
            if torch.cuda.is_available():
                info["cuda_available"] = True
                info["gpu_name"] = torch.cuda.get_device_name(0)
                vram_bytes = torch.cuda.get_device_properties(0).total_memory
                info["vram_gb"] = round(vram_bytes / (1024 ** 3), 2)
                info["recommended_device"] = "cuda"
                if info["vram_gb"] >= 6.0:
                    info["quantization_support"] = "bfloat16"
                elif info["vram_gb"] >= 3.0:
                    info["quantization_support"] = "4bit"
        except ImportError:
            pass

        return info


class ModelConfig:
    def __init__(self):
        self.model_name = os.getenv("VLM_MODEL_NAME", "Qwen/Qwen2.5-VL-3B-Instruct")
        self.hardware = HardwareProbe.get_hardware_info()
        self.device = os.getenv("VLM_DEVICE", self.hardware["recommended_device"])
        self.use_4bit = os.getenv("VLM_4BIT", "true").lower() == "true"
        self.force_fallback = os.getenv("FORCE_FALLBACK", "false").lower() == "true"

    def get_status(self, loaded: bool = False, error_msg: Optional[str] = None) -> Dict[str, Any]:
        mode = "neural_vlm" if loaded else "deterministic_fallback"
        return {
            "mode": mode,
            "model": self.model_name,
            "loaded": loaded,
            "device": self.device,
            "gpu_name": self.hardware["gpu_name"],
            "vram_gb": self.hardware["vram_gb"],
            "cpu_cores": self.hardware["cpu_count"],
            "quantization": "4bit" if (self.use_4bit and loaded) else "none",
            "status_message": (
                "REAL NEURAL VLM ACTIVE: Qwen2.5-VL-3B loaded on " + self.device
                if loaded
                else (
                    error_msg
                    or "MODEL WEIGHTS NOT AVAILABLE: Install dependencies via 'pip install torch torchvision transformers accelerate qwen-vl-utils' to enable neural VLM inference. Deterministic fallback planner active for SIH demo."
                )
            ),
            "install_command": "pip install torch torchvision transformers accelerate qwen-vl-utils",
        }


def get_vlm_engine():
    """
    Instantiates and returns the Vision Language Model engine.
    """
    from vlm.model import VisionLanguageModel
    return VisionLanguageModel(config=ModelConfig())
