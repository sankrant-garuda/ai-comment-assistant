# 🤖 AI Comment Assistant

Transform your GitHub issues into an intelligent help desk! Users can get instant AI-powered responses by simply commenting `/ai your question here` on any issue.

## ⚡ Quickstart

1. **Copy files**: Download `.github/` folder to your repo  
2. **Commit & push**: That's it!
3. **Test**: Comment `/ai hello world` on any issue

**What happens**: Processing message appears → AI responds with @mention

## 📋 Prerequisites

- **GitHub Models enabled**: Your organization must have GitHub Models enabled in Settings > Code security and analysis > GitHub Models
- **Repository access**: Ensure your repository has access to GitHub Models (usually inherited from organization settings)  
- **No additional API keys needed**: Uses GitHub's built-in AI infrastructure

## ✨ Features

- 🚀 **Zero setup** - Works with GitHub's built-in tokens (no API keys required)
- 🧠 **Multiple AI models** - GPT, DeepSeek, Llama, Claude, Grok support
- 🎯 **Context-aware** - Understands full issue history and conversation
- 💬 **Natural conversations** - Maintains conversation history across comments  
- 🔒 **Secure** - Uses GitHub's native authentication and permissions
- ⚡ **Fast** - Optimized workflow with duplicate prevention
- 🎨 **Customizable** - Easy to modify system prompts and model settings

## 🚀 Setup Options

### Option 1: Use as Template (Recommended for new repos)
1. Click **[Use this template](../../generate)** button above
2. That's it! The AI assistant is ready to use

### Option 2: Add to Existing Repository 
1. Copy the `.github` folder from this repo to your repository
2. Commit and push the changes
3. Start using `/ai` commands in your issues!

### Option 3: GitHub Action (One-click setup)
Add this to your workflow file:
```yaml
- uses: your-username/ai-comment-assistant@v1
```

## 📝 Usage

Comment on any issue with:
- `/ai how do I setup authentication?`
- `/ai gpt explain this error message`  
- `/ai deepseek what's the best practice for this?`
- `/ai llama help me debug this code`

**What happens next:**
1. **Processing notification** appears immediately: "🤖 Processing your AI request..."
2. **Short delay** while the AI analyzes your question and issue context
3. **AI response** replaces the processing message with @mention and detailed answer

**💡 Pro tip:** Subsequent `/ai` comments in the same issue will include the entire discussion history, making the conversation more intelligent and contextual.

## 🛠 Configuration

### Available Models
- `gpt` / `gpt4o` - OpenAI GPT-4o (default) - Reliable, well-tested
- `gpt5` - OpenAI GPT-5 - Latest, best for complex logic tasks  
- `ds` - DeepSeek V3 - Excellent for reasoning and code generation
- `llama` / `llama4` - Meta Llama models - Great for code analysis
- `claude` - Anthropic Claude 3.5 Sonnet - Strong at writing and analysis
- `grok` / `grok-mini` - xAI Grok 3 - Real-time information and unique perspective

**Add more models**: Edit `.github/model-map.json` with any model from [GitHub Models marketplace](https://github.com/marketplace?type=models):
```json
{
  "gpt": "openai/gpt-4o",
  "your-model": "provider/model-name", 
  "default": "openai/gpt-4o"
}
```

### Custom System Prompt
Edit `.github/prompts/prompt.md` to customize the AI's behavior and expertise area. The default prompt is optimized for general software development questions.

### Advanced Configuration
- **Restrict users**: Modify workflow trigger conditions
- **Custom endpoints**: Update the AI endpoint in `aicomment.js`
- **Rate limiting**: Add additional controls in the workflow

## 🔧 How It Works

1. User comments `/ai question` on an issue
2. GitHub workflow triggers and shows "Processing..." message
3. AI processes the question with full issue context and conversation history
4. Processing message is replaced with AI response and @mention
5. All subsequent `/ai` comments include complete discussion context

## 🏗 Architecture

```
.github/
├── workflows/aicomment.yml    # GitHub Actions workflow
├── scripts/aicomment.js       # Core AI integration logic  
├── model-map.json            # AI model configuration
└── prompts/prompt.md         # System prompt template
```

## 🛡 Security & Privacy

- Uses GitHub's secure token system (no external API keys)
- Processes data only within GitHub's infrastructure  
- Respects repository permissions and access controls
- No data stored outside GitHub
- Open source and auditable

## 📊 Perfect For

- **Open source projects** - Help users and contributors instantly
- **Technical documentation** - Answer common questions automatically  
- **Customer support** - Provide 24/7 assistance via issues
- **Internal tools** - Help team members with project-specific questions
- **Educational repos** - Assist students and learners

## 🎯 Examples

**User asks:**
> `/ai how do I configure SSL certificates?`

**AI responds:**
> @username Here's how to configure SSL certificates for your setup:
> 
> 1. **Generate certificates**: Use Let's Encrypt or your preferred CA
> 2. **Configure your web server**: Update your nginx/apache config
> 3. **Test the setup**: Verify with SSL testing tools
>
> Based on your repository structure, I can see you're using [specific framework]. Here are the specific steps...

## 🚀 Advanced Usage

### Multiple Models in One Conversation
```
/ai gpt what's the current approach?
/ai claude how can we improve this?  
/ai llama what are the performance implications?
```

### Context-Aware Responses
The AI maintains conversation history and understands:
- Previous `/ai` questions and responses in the issue
- All comments and discussions in the issue thread
- Issue title and description
- Code snippets and error messages
- User roles and permissions

## 📈 Benefits

- **Reduce response time** from hours to seconds
- **Scale support** without growing team size  
- **Consistent answers** using your custom prompts
- **24/7 availability** for global contributors
- **Learning tool** - users learn while getting help

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch
3. Test with your own issues
4. Submit a pull request

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. The AI responses are generated automatically and may contain inaccuracies. Users should:

- Review AI responses before acting on them
- Understand that AI models can make mistakes or provide outdated information
- Use their own judgment when implementing suggested solutions
- Test all code suggestions thoroughly before deployment

The authors are not responsible for any damages, data loss, or issues arising from the use of this software.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details. Copyright © 2025 Sankrant Sanu

## 🙋‍♀️ Support

- **Issues**: Open an issue for bugs or feature requests
- **Discussions**: Share use cases and ask questions  
- **Wiki**: Detailed configuration and troubleshooting guides

---

⭐ **Star this repo** if it helps your project! 

🔄 **Share** with other maintainers who need AI assistance

🚀 **Deploy** in seconds and transform your GitHub issues today