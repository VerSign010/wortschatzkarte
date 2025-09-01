# File: Dockerfile (V11 - Stateless Edition for Render)

# --- Stage 1: Build ---
# Use a standard Python slim image as a builder
FROM python:3.10-slim as builder

WORKDIR /app

# Copy only the requirements file to leverage Docker's layer caching
COPY requirements.txt .

# Install dependencies into a temporary wheelhouse
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt


# --- Stage 2: Final ---
# Start from a fresh, clean image
FROM python:3.10-slim

WORKDIR /app

# Copy the pre-built wheels from the builder stage
COPY --from=builder /app/wheels /wheels

# Install the dependencies from the local wheels. This is fast and doesn't require network.
RUN pip install --no-cache /wheels/*

# Copy the rest of the application code
COPY . .

# Expose the port Render expects
EXPOSE 10000

# The command to run the application using a production-grade server
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--workers", "4", "--worker-class", "gevent", "run:app"]