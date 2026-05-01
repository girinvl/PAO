FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    openssl \
    ca-certificates \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
COPY wheels /wheels

RUN python -m pip install --upgrade pip setuptools wheel && \
    if [ -d /wheels ] && [ "$(ls -A /wheels 2>/dev/null)" ]; then \
        echo "Installing Python packages from local /wheels (offline mode)" && \
        pip install --no-index --find-links=/wheels -r /tmp/requirements.txt; \
    else \
        echo "Local /wheels is empty, installing Python packages from internet" && \
        pip install --no-cache-dir --prefer-binary -r /tmp/requirements.txt; \
    fi

COPY app /app
COPY models /opt/models
COPY start_https.sh /start_https.sh

RUN chmod +x /start_https.sh

CMD ["/start_https.sh"]
