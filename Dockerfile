# File: Dockerfile (Final Definitive Edition for Fly.io)
FROM python:3.10-slim

WORKDIR /app

# Set FLASK_APP for flask db upgrade command
ENV FLASK_APP=run.py

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# The database upgrade command will be run via fly.toml, not here.

EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "--worker-class", "gevent", "run:app"]