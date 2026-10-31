const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding model metrics...');

  // Logistic Regression Metrics (from 02_ML.ipynb)
  // Reconciled: sentiment_model.pkl (2,796,543 bytes) + tfidf_vectorizer.pkl (9,574,422 bytes) = 12,370,965 bytes
  await prisma.modelMetric.upsert({
    where: { modelName: 'Logistic Regression' },
    update: {
      accuracy: 90.15,
      precision: 90.1,
      recall: 90.2,
      f1: 90.1,
      params: 50000,
      sizeBytes: 12370965,
      inferenceMs: 2,
    },
    create: {
      modelName: 'Logistic Regression',
      accuracy: 90.15,
      precision: 90.1,
      recall: 90.2,
      f1: 90.1,
      params: 50000,
      sizeBytes: 12370965,
      inferenceMs: 2,
    },
  });

  // Bi-LSTM Metrics (from LSTM.ipynb)
  // Reconciled: best_lstm_model.keras is 78,030,416 bytes (~78.0 MB), ~6.5M params (50k x 128 embedding + 64 Bi-LSTM)
  await prisma.modelMetric.upsert({
    where: { modelName: 'Bi-LSTM' },
    update: {
      accuracy: 84.67,
      precision: 85.0,
      recall: 84.5,
      f1: 84.7,
      params: 6500000,
      sizeBytes: 78030416,
      inferenceMs: 22,
    },
    create: {
      modelName: 'Bi-LSTM',
      accuracy: 84.67,
      precision: 85.0,
      recall: 84.5,
      f1: 84.7,
      params: 6500000,
      sizeBytes: 78030416,
      inferenceMs: 22,
    },
  });

  // BERT Metrics (from full 25k test set evaluation)
  // Reconciled: bert-base-uncased model.safetensors is 437,958,624 bytes (~438.0 MB), ~109.5M params
  await prisma.modelMetric.upsert({
    where: { modelName: 'BERT' },
    update: {
      accuracy: 91.68,
      precision: 93.32,
      recall: 89.79,
      f1: 91.52,
      params: 109500000,
      sizeBytes: 437958624,
      inferenceMs: 72,
    },
    create: {
      modelName: 'BERT',
      accuracy: 91.68,
      precision: 93.32,
      recall: 89.79,
      f1: 91.52,
      params: 109500000,
      sizeBytes: 437958624,
      inferenceMs: 72,
    },
  });

  console.log('Model metrics seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
