FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=run.py

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p instance
RUN chmod +x scripts/docker/web-entrypoint.sh

EXPOSE 5000

CMD ["scripts/docker/web-entrypoint.sh"]
