# Ollama + DeepSeek R1 Local AI Setup

This guide explains how to set up and use the local AI integration with Ollama and DeepSeek R1.

## 🎯 Benefits

- **Complete Privacy**: Documents never leave your server
- **No API Costs**: Unlimited usage after initial setup
- **GDPR Compliant**: Perfect for sensitive business documents
- **Offline Capability**: Works without internet connection
- **High Performance**: DeepSeek R1 provides excellent reasoning capabilities

## 🚀 Quick Start

### 1. Start the Services

```bash
# Start all services including Ollama
docker-compose up -d

# Check if Ollama is running
docker-compose logs ollama
```

### 2. Pull the DeepSeek R1 Model

The system will automatically attempt to pull the model when first used, but you can do it manually:

```bash
# Pull the model manually (this will take several minutes)
docker exec pdf_manager_ollama ollama pull deepseek-r1:7b
```

### 3. Verify Setup

```bash
# Test Ollama connection
curl http://localhost:11434/api/tags

# Test model availability
docker exec pdf_manager_ollama ollama list
```

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Ollama Configuration
OLLAMA_URL=http://ollama:11434
USE_LOCAL_AI=true
LOCAL_AI_MODEL=deepseek-r1:7b
```

### Configuration Options

- `USE_LOCAL_AI=true`: Enable local AI processing
- `USE_LOCAL_AI=false`: Use cloud AI services (OpenAI/Anthropic)
- `LOCAL_AI_MODEL`: Specify which model to use (default: deepseek-r1:7b)

## 🔧 Available Models

You can use different models by changing the `LOCAL_AI_MODEL` environment variable:

### DeepSeek Models

- `deepseek-r1:7b` - Recommended, good balance of performance and resource usage
- `deepseek-r1:14b` - Better performance, requires more RAM
- `deepseek-r1:32b` - Best performance, requires significant RAM

### Other Compatible Models

- `llama3.1:8b` - Meta's Llama 3.1
- `mistral:7b` - Mistral AI model
- `codellama:7b` - Specialized for code understanding

## 💻 Hardware Requirements

### Minimum Requirements

- **RAM**: 8GB (for 7b models)
- **Storage**: 10GB free space for model files
- **CPU**: Modern multi-core processor

### Recommended Requirements

- **RAM**: 16GB+ (for better performance)
- **GPU**: NVIDIA GPU with CUDA support (optional but recommended)
- **Storage**: SSD for faster model loading

## 🖥️ GPU Support (Optional)

If you have an NVIDIA GPU, uncomment these lines in `docker-compose.yml`:

```yaml
ollama:
  # Uncomment for GPU support
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

## 🔍 Troubleshooting

### Model Download Issues

```bash
# Check available space
df -h

# Manually pull model with verbose output
docker exec -it pdf_manager_ollama ollama pull deepseek-r1:7b --verbose
```

### Memory Issues

```bash
# Check container memory usage
docker stats pdf_manager_ollama

# Restart Ollama if needed
docker-compose restart ollama
```

### Connection Issues

```bash
# Check if Ollama is responding
curl http://localhost:11434/api/version

# Check container logs
docker-compose logs ollama
```

## 📊 Performance Monitoring

### Check Model Status

```bash
# List loaded models
docker exec pdf_manager_ollama ollama list

# Check system resources
docker exec pdf_manager_ollama ollama ps
```

### Response Time Optimization

- **First Request**: May take 30-60 seconds (model loading)
- **Subsequent Requests**: Usually 5-15 seconds
- **GPU Acceleration**: Can reduce response time by 50-80%

## 🔄 Fallback Behavior

The system automatically falls back to cloud AI if:

1. `USE_LOCAL_AI=false` in environment
2. Ollama service is not available
3. Specified model is not found
4. Local AI generation fails

Fallback order:

1. **Local AI** (Ollama + DeepSeek R1)
2. **OpenAI** (GPT-4o-mini)
3. **Error message** if no services available

## 🛠️ Advanced Configuration

### Custom Model Parameters

You can modify the Ollama service to use custom parameters by editing `backend/app/services/ollama_service.py`:

```python
payload = {
    "model": self.model_name,
    "prompt": prompt,
    "stream": False,
    "options": {
        "temperature": 0.7,      # Creativity (0.0-1.0)
        "top_p": 0.9,           # Nucleus sampling
        "max_tokens": 1000,     # Response length
        "repeat_penalty": 1.1   # Avoid repetition
    }
}
```

### Multiple Models

You can run multiple models simultaneously by modifying the Docker setup to include multiple Ollama instances.

## 📈 Usage Statistics

The system logs will show which AI service is being used:

```
🦙 Generating response with deepseek-r1:7b...
✅ Local AI response generated (1247 chars)
```

vs.

```
🔄 Generating response with OpenAI...
✅ OpenAI response generated
```

## 🔐 Security Considerations

- **Data Privacy**: All processing happens locally
- **Network Isolation**: No external API calls when using local AI
- **Access Control**: Ollama only accessible within Docker network
- **Model Integrity**: Models are downloaded from official Ollama registry

## 📚 Additional Resources

- [Ollama Documentation](https://ollama.ai/docs)
- [DeepSeek R1 Model Card](https://ollama.ai/library/deepseek-r1)
- [Docker Compose GPU Support](https://docs.docker.com/compose/gpu-support/)
