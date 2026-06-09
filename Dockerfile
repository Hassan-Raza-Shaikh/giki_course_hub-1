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
# Uses the PORT environment variable injected by Render/DigitalOcean
# Removes hardcoded -w 4 so Render's WEB_CONCURRENCY is automatically respected (prevents OOM crashes on free tier)
CMD gunicorn -b 0.0.0.0:${PORT:-8080} app:app
