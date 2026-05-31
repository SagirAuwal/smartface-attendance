FROM python:3.12-slim

# Set work directory
WORKDIR /code

# Install system dependencies (needed for OpenCV / image handling if any)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy backend code
COPY . /code

# Set environmental variable to run in production mode
ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces run on port 7860 by default.
# The user's container must listen on port 7860.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
