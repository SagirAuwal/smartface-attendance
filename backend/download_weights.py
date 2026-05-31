import sys
import os

print("==================================================")
print("Downloading FaceNet (vggface2) pre-trained weights...")
print("==================================================")

try:
    from facenet_pytorch import InceptionResnetV1
    # This instantiates the model and triggers the weight download if not cached
    model = InceptionResnetV1(pretrained='vggface2')
    print("SUCCESS: FaceNet weight files downloaded and cached successfully!")
except Exception as e:
    print("ERROR failed to download weights:", e)
    sys.exit(1)
