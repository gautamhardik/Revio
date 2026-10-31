import os
import joblib
import pickle
import torch
import warnings
from transformers import BertTokenizerFast, BertForSequenceClassification
from app.config import settings

import tensorflow as tf
import keras

warnings.filterwarnings("ignore")

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.device = torch.device("xpu" if torch.xpu.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
        self.models_loaded = {
            "logistic_regression": False,
            "lstm": False,
            "bert": False
        }
        self.load_errors = {}
        
        # LR specific
        self.lr_model = None
        self.lr_vectorizer = None
        
        # LSTM specific
        self.lstm_model = None
        self.lstm_fast_predict = None
        self.lstm_tokenizer = None
        self.lstm_config = None
        
        # BERT specific
        self.bert_model = None
        self.bert_tokenizer = None
        self.bert_threshold = 0.5

        self._initialized = True

    def load_all_models(self):
        self.load_lr()
        self.load_lstm()
        self.load_bert()
        self.warmup_models()
        
    def warmup_models(self):
        print("Warming up models...")
        try:
            if self.models_loaded["logistic_regression"]:
                self.lr_model.predict(self.lr_vectorizer.transform(["warmup"]))
        except Exception as e: print(f"LR warmup failed: {e}")
        try:
            if self.models_loaded["lstm"]:
                seq = self.lstm_tokenizer.texts_to_sequences(["warmup text"])
                try:
                    from tensorflow.keras.preprocessing.sequence import pad_sequences
                except ImportError:
                    from keras.src.legacy.preprocessing.sequence import pad_sequences
                seq = pad_sequences(seq, maxlen=self.lstm_config.get("max_len", 300))
                self.lstm_fast_predict(tf.convert_to_tensor(seq))
        except Exception as e: print(f"LSTM warmup failed: {e}")
        try:
            if self.models_loaded["bert"]:
                inputs = self.bert_tokenizer("warmup text", return_tensors="pt", truncation=True, padding=True, max_length=128)
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                with torch.no_grad():
                    self.bert_model(**inputs)
        except Exception as e: print(f"BERT warmup failed: {e}")
        print("Warmup complete.")

    def load_lr(self):
        try:
            vec_path = os.path.join(settings.MODELS_ML_DIR, "tfidf_vectorizer.pkl")
            model_path = os.path.join(settings.MODELS_ML_DIR, "sentiment_model.pkl")
            if os.path.exists(vec_path) and os.path.exists(model_path):
                import sklearn
                if tuple(int(x) for x in sklearn.__version__.split(".")[:2]) >= (1, 4):
                    self.lr_vectorizer = joblib.load(vec_path)
                    self.lr_model = joblib.load(model_path)
                    if not hasattr(self.lr_model, "multi_class"):
                        self.lr_model.multi_class = "ovr"
                else:
                    self.lr_vectorizer = joblib.load(vec_path)
                    self.lr_model = joblib.load(model_path)
                self.models_loaded["logistic_regression"] = True
        except Exception as e:
            self.load_errors["lr"] = str(e)
            print(f"Failed to load Logistic Regression: {e}")

    def load_lstm(self):
        try:
            model_path = os.path.join(settings.MODELS_LSTM_DIR, "best_lstm_model.keras")
            tok_path = os.path.join(settings.DATA_DIR, "tokenizer.pkl")
            cfg_path = os.path.join(settings.DATA_DIR, "config.pkl")
            
            if os.path.exists(model_path) and os.path.exists(tok_path) and os.path.exists(cfg_path):
                last_lstm_error = ""
                
                for loader_fn, name in [
                    (lambda p: keras.saving.load_model(p), "keras_saving"),
                    (lambda p: keras.models.load_model(p), "keras"),
                    (lambda p: tf.keras.models.load_model(p, compile=False), "tf.keras"),
                ]:
                    try:
                        self.lstm_model = loader_fn(model_path)
                        self.models_loaded["lstm"] = True
                        break
                    except Exception as e:
                        last_lstm_error = f"{name}: {str(e)}"
                        continue
                
                if not self.models_loaded["lstm"]:
                    try:
                        import keras.saving
                        rebuilt = keras.models.Sequential([
                            keras.layers.InputLayer(batch_shape=[None, 300]),
                            keras.layers.Embedding(50000, 128, mask_zero=True),
                            keras.layers.SpatialDropout1D(0.2),
                            keras.layers.Bidirectional(keras.layers.LSTM(64)),
                            keras.layers.Dropout(0.5),
                            keras.layers.Dense(1, activation="sigmoid"),
                        ])
                        rebuilt.load_weights(model_path)
                        self.lstm_model = rebuilt
                        self.models_loaded["lstm"] = True
                        last_lstm_error = ""
                    except Exception as e:
                        last_lstm_error = f"rebuild: {str(e)}"
                
                if not self.models_loaded["lstm"]:
                    raise RuntimeError(f"Could not load LSTM model: {last_lstm_error}")
                
                if hasattr(self.lstm_model, "signatures") and "serving_default" in self.lstm_model.signatures:
                    self.lstm_fast_predict = self.lstm_model.signatures["serving_default"]
                else:
                    @tf.function(reduce_retracing=True)
                    def fast_predict(x):
                        return self.lstm_model(x, training=False)
                    self.lstm_fast_predict = fast_predict
                
                with open(tok_path, "rb") as f:
                    self.lstm_tokenizer = pickle.load(f)
                with open(cfg_path, "rb") as f:
                    self.lstm_config = pickle.load(f)
        except Exception as e:
            self.load_errors["lstm"] = str(e)
            print(f"Failed to load LSTM: {e}")

    def load_bert(self):
        try:
            if os.path.exists(settings.MODELS_BERT_DIR):
                self.bert_tokenizer = BertTokenizerFast.from_pretrained(settings.MODELS_BERT_DIR, local_files_only=True)
                self.bert_model = BertForSequenceClassification.from_pretrained(settings.MODELS_BERT_DIR, local_files_only=True)
                self.bert_model.to(self.device)
                self.bert_model.eval()
                
                thresh_path = os.path.join(settings.MODELS_BERT_DIR, "threshold.pkl")
                if os.path.exists(thresh_path):
                    with open(thresh_path, "rb") as f:
                        self.bert_threshold = pickle.load(f).get("threshold", 0.5)
                        
                self.models_loaded["bert"] = True
        except Exception as e:
            self.load_errors["bert"] = str(e)
            print(f"Failed to load BERT: {e}")

model_manager = ModelManager()
