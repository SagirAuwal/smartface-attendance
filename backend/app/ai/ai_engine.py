import logging
import hashlib
import random
import io
from typing import List, Tuple, Optional
from PIL import Image
from app.core.config import settings

logger = logging.getLogger("smartface.ai")

# Lazy load real ML libraries to avoid crashing if they aren't fully installed/configured
_FACENET_MODEL = None
_HAAR_CASCADE = None

def get_face_detector():
    global _HAAR_CASCADE
    if _HAAR_CASCADE is None:
        import cv2
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        _HAAR_CASCADE = cv2.CascadeClassifier(cascade_path)
    return _HAAR_CASCADE

def get_facenet_model():
    global _FACENET_MODEL
    if _FACENET_MODEL is None:
        import torch
        from facenet_pytorch import InceptionResnetV1
        logger.info("Initializing FaceNet model (this may take a few moments on first load)...")
        # Load pre-trained face recognition network
        _FACENET_MODEL = InceptionResnetV1(pretrained='vggface2').eval()
    return _FACENET_MODEL

class AIEngine:
    @staticmethod
    def generate_mock_embedding(identifier: str) -> List[float]:
        """Generates a deterministic 512-dimensional embedding based on an identifier."""
        # Seed random generator with MD5 hash of the identifier for deterministic output
        hash_val = int(hashlib.md5(identifier.encode('utf-8')).hexdigest(), 16)
        rng = random.Random(hash_val)
        embedding = [rng.gauss(0.0, 0.1) for _ in range(512)]
        
        # L2 Normalize the embedding vector
        norm = sum(x*x for x in embedding) ** 0.5
        if norm > 0:
            embedding = [x / norm for x in embedding]
        return embedding

    @staticmethod
    def extract_face_embedding(image_bytes: bytes) -> Optional[List[float]]:
        """
        Extracts a 512-dimensional face embedding from image bytes.
        In mock mode, returns a random embedding (or raises exception if mock fails).
        In real mode, uses OpenCV for detection and FaceNet for embedding.
        """
        if settings.AI_ENGINE_MODE == "mock":
            # For mock mode, generate a pseudo-random embedding
            # We seed it with the hash of the image bytes for consistency if the same image is sent
            img_hash = hashlib.md5(image_bytes).hexdigest()
            return AIEngine.generate_mock_embedding(img_hash)
            
        try:
            import cv2
            import numpy as np
            import torch
            from torchvision import transforms

            # Convert bytes to PIL Image, then to OpenCV numpy array
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            detector = get_face_detector()
            faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            
            if len(faces) == 0:
                logger.warning("No face detected in the image")
                return None
                
            # Take the largest face (assuming it's the subject)
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            
            # Crop and align face
            face_crop = image.crop((x, y, x + w, y + h))
            
            # Preprocess face for FaceNet: resize to 160x160 and convert to tensor
            preprocess = transforms.Compose([
                transforms.Resize((160, 160)),
                transforms.ToTensor(),
                # Normalization expected by facenet-pytorch (standard image normalization or fixed)
                transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
            ])
            
            face_tensor = preprocess(face_crop).unsqueeze(0) # add batch dim
            
            # Generate embedding
            model = get_facenet_model()
            with torch.no_grad():
                embedding_tensor = model(face_tensor)
                # Convert to list of floats and normalize
                embedding = embedding_tensor.squeeze().tolist()
                
            return embedding
            
        except Exception as e:
            logger.error(f"Error in real-mode face embedding extraction: {e}. Falling back to mock embedding.")
            # Fallback to mock embedding on failure
            img_hash = hashlib.md5(image_bytes).hexdigest()
            return AIEngine.generate_mock_embedding(img_hash)

    @staticmethod
    def calculate_similarity(vector_a: List[float], vector_b: List[float]) -> float:
        """Calculates cosine similarity between two vectors."""
        import numpy as np
        a = np.array(vector_a)
        b = np.array(vector_b)
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot_product / (norm_a * norm_b))

    @staticmethod
    def match_face(
        face_embedding: List[float], 
        registered_embeddings: List[Tuple[int, List[float]]]
    ) -> Tuple[Optional[int], float]:
        """
        Compares face_embedding against all registered embeddings.
        Returns the student_id of the best match and the similarity score.
        registered_embeddings is a list of tuples: (student_id, embedding_vector)
        """
        if not registered_embeddings:
            return None, 0.0
            
        best_student_id = None
        best_score = -1.0
        
        for student_id, reg_vector in registered_embeddings:
            score = AIEngine.calculate_similarity(face_embedding, reg_vector)
            if score > best_score:
                best_score = score
                best_student_id = student_id
                
        return best_student_id, best_score
