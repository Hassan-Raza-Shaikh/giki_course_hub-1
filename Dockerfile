# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Expose port (DigitalOcean App Platform standard)
EXPOSE 8080

# Run gunicorn
# -w 4: 4 worker processes
# -b 0.0.0.0:8080: Bind to all interfaces on port 8080
# app:app: module app, object app
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "app:app"]
