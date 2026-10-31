FROM python:3.10-slim

RUN apt-get update && apt-get install -y curl nginx supervisor && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir fastapi==0.111.0 uvicorn==0.30.1 pydantic==2.7.4 \
    pydantic-settings==2.3.4 numpy==1.26.4 pandas==2.2.2 scikit-learn==1.5.1 \
    scipy==1.13.1 nltk==3.8.1 tensorflow==2.16.1 keras==3.3.3 \
    transformers==4.41.2 joblib==1.4.2 && \
    pip install --no-cache-dir torch==2.3.1 --index-url https://download.pytorch.org/whl/cpu

RUN python -c "import nltk; nltk.download('stopwords', quiet=True); nltk.download('punkt', quiet=True); nltk.download('wordnet', quiet=True)"

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY . .

RUN cd backend && npx prisma generate && npx prisma db push --accept-data-loss && node prisma/seed.js

ENV PORT=4000
ENV ML_SERVICE_URL=http://localhost:8000
ENV MODELS_ML_DIR=/app/models_ml
ENV MODELS_LSTM_DIR=/app/models_lstm
ENV MODELS_BERT_DIR=/app/models_bert/tuned
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

EXPOSE 7860

CMD ["/bin/bash", "/app/hf_start.sh"]
