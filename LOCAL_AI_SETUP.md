# Local AI Setup Guide

This guide will help you set up local AI for document chat, replacing OpenAI with local models.

## 🚀 Quick Setup (Recommended: Ollama)

### 1. Install Ollama

**macOS:**

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Linux:**

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from: https://ollama.ai/download

### 2. Start Ollama Service

```bash
ollama serve
```

### 3. Pull a Model

Choose one based on your hardware:

**For 8GB+ RAM (Recommended):**

```bash
ollama pull llama3.2:3b
```

**For 16GB+ RAM (Better quality):**

```bash
ollama pull llama3.2:7b
```

**For 32GB+ RAM (Best quality):**

```bash
ollama pull llama3.2:70b
```

**Alternative models:**

```bash
ollama pull mistral:7b        # Good for general tasks
ollama pull codellama:7b      # Good for technical documents
ollama pull phi3:mini         # Lightweight option
```

### 4. Install Python Dependencies

```bash
cd backend
pip install sentence-transformers numpy requests
```

### 5. Update Environment Variables

Add to your `.env` file:

```env
# Local AI Configuration
USE_LOCAL_AI=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Optional: Keep OpenAI as fallback
OPENAI_API_KEY=your_openai_key_here
```

### 6. Update Backend Code

The `LocalAIService` is already created. Now update your main application to use it.

## 🔧 Alternative Local AI Options

### Option 2: LM Studio

1. Download LM Studio: https://lmstudio.ai/
2. Install a model (e.g., Llama 3.2, Mistral)
3. Start local server
4. Update `OLLAMA_URL` to LM Studio's endpoint

### Option 3: GPT4All

```bash
pip install gpt4all
```

### Option 4: Hugging Face Transformers

```bash
pip install transformers torch
```

## 📊 Model Comparison

| Model        | Size  | RAM Needed | Speed  | Quality     |
| ------------ | ----- | ---------- | ------ | ----------- |
| Phi3:mini    | 2.3GB | 4GB        | Fast   | Good        |
| Llama3.2:3b  | 2GB   | 8GB        | Fast   | Very Good   |
| Mistral:7b   | 4.1GB | 16GB       | Medium | Excellent   |
| Llama3.2:7b  | 4.1GB | 16GB       | Medium | Excellent   |
| Llama3.2:70b | 40GB  | 64GB       | Slow   | Outstanding |

## 🎯 Benefits of Local AI

✅ **Privacy**: Your documents never leave your server
✅ **No API costs**: No per-token charges
✅ **Offline capability**: Works without internet
✅ **Customization**: Fine-tune models for your use case
✅ **Speed**: No network latency for embeddings

## 🔍 Features Included

- **Local Embeddings**: Using sentence-transformers
- **Local LLM**: Using Ollama/LM Studio
- **Document Search**: Semantic search through your documents
- **Streaming Responses**: Real-time response generation
- **Fallback Support**: Can fallback to OpenAI if needed

## 🛠️ Troubleshooting

### Ollama not starting:

```bash
# Check if running
curl http://localhost:11434/api/tags

# Restart service
ollama serve
```

### Model not found:

```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3.2:3b
```

### Memory issues:

- Use smaller models (phi3:mini, llama3.2:3b)
- Reduce context window size
- Close other applications

### Slow responses:

- Use GPU acceleration if available
- Use smaller models
- Reduce max_tokens in generation

## 🚀 Performance Tips

1. **Use GPU**: Install CUDA/ROCm for GPU acceleration
2. **Optimize RAM**: Close unnecessary applications
3. **SSD Storage**: Store models on fast storage
4. **Model Selection**: Balance size vs quality for your needs

## 📝 Configuration Options

```env
# Ollama Settings
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Embedding Settings
EMBEDDING_MODEL=all-MiniLM-L6-v2  # Fast, good quality
# EMBEDDING_MODEL=all-mpnet-base-v2  # Slower, better quality

# Generation Settings
MAX_TOKENS=1000
TEMPERATURE=0.7
TOP_P=0.9

# Search Settings
SIMILARITY_THRESHOLD=0.7
MAX_CONTEXT_CHUNKS=5
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## 🔄 Switching Between Local and OpenAI

You can easily switch between local AI and OpenAI by changing the `USE_LOCAL_AI` environment variable:

```env
USE_LOCAL_AI=true   # Use local AI
USE_LOCAL_AI=false  # Use OpenAI
```

This allows you to:

- Test both approaches
- Use OpenAI as fallback
- Compare response quality
- Handle high-load scenarios
