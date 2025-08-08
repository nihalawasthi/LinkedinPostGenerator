# LinkedIn Post Generator - Chrome Extension

🚀 **Automate LinkedIn posts with AI-powered tech content generation**

A powerful Chrome extension that helps you generate engaging LinkedIn posts about trending tech topics using free AI APIs (Groq & Google Gemini). Perfect for developers, tech professionals, and thought leaders who want to maintain an active LinkedIn presence.

## ✨ Features

### 🤖 AI-Powered Content Generation
- **Groq API Support**: Lightning-fast inference with 14,400 free requests/day
- **Google Gemini Support**: Advanced AI models with 15 requests/minute free
- **Smart Fallback**: Template-based generation when APIs are unavailable

### 📰 Real-Time Trending Topics
- **Hacker News Integration**: Fetches latest tech discussions
- **Reddit Tech Communities**: Monitors programming, cybersecurity, AI/ML subreddits
- **GitHub Trending**: Access to trending repositories and topics
- **Dev.to Integration**: Latest development articles and trends

### 🔒 Privacy & Security
- **Local Storage**: API keys persist across browser sessions for convenience
- **Chrome Profile Isolation**: Keys only cleared when Chrome profile is deleted
- **Local Processing**: All operations happen locally in your browser
- **No Cloud Sync**: API keys never leave your device

### 🎯 Smart Topic Management
- **Topic History**: Prevents repetitive posts over 30 days
- **Focus Areas**: Customize content based on your interests
- **Content Filtering**: Ensures only tech-relevant topics are used

### 🎨 Image Generation
- **Unsplash Integration**: High-quality images with your API key
- **Fallback Images**: Lorem Picsum placeholders when needed
- **Optional Feature**: Can be disabled to focus on text-only posts

### ⚡ Automation Options
- **Manual Mode**: Generate posts on-demand
- **Daily Scheduling**: Automatic daily post reminders
- **Weekly Scheduling**: Weekly post reminders

## 🚀 Installation

### Method 1: Chrome Web Store (Recommended)
*Coming Soon - Extension is pending review*

### Method 2: Manual Installation (Developer Mode)

1. **Download the Extension**
   ```bash
   git clone https://github.com/yourusername/linkedin-post-generator.git
   cd linkedin-post-generator
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the extension folder
   - The extension icon should appear in your toolbar

## ⚙️ Setup & Configuration

### 1. First Time Setup

1. **Click the Extension Icon** in your Chrome toolbar
2. **Choose Your AI Provider**:
   - **Groq** (Recommended): Fast, 14,400 free requests/day
   - **Google Gemini**: Advanced models, 15 requests/minute

### 2. Get Your API Keys

#### Groq API Key (Recommended)
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key (starts with `gsk_`)
5. Copy and paste into the extension

#### Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key (starts with `AIza`)
4. Copy and paste into the extension

#### Unsplash API Key (Optional)
1. Visit [Unsplash Developers](https://unsplash.com/developers)
2. Create a developer account
3. Create a new application
4. Copy your Access Key
5. Paste into the extension for high-quality images

### 3. Configure Settings

- **Focus Areas**: Enter your tech interests (e.g., "AI/ML, Cybersecurity, Cloud Computing")
- **News Sources**: Select which sources to monitor for trending topics
- **Post Frequency**: Choose manual, daily, or weekly posting
- **Image Generation**: Toggle if you want images with your posts

### 4. Save Settings
Click "Save Settings" to apply your configuration.

## 📝 Usage

### Generating Posts

1. **Navigate to LinkedIn Feed**
   - Go to [linkedin.com/feed](https://linkedin.com/feed)
   - Make sure you're logged in

2. **Generate Content**
   - Click the extension icon
   - Click "🎯 Generate New Post"
   - Wait for AI to create engaging content

3. **Review & Edit**
   - Preview the generated post
   - Copy to clipboard with "Copy & Approve"
   - Or directly post with "✅ Post to LinkedIn"

### Manual Posting
- Use "Copy & Approve" to copy content to clipboard
- Manually paste and post on LinkedIn
- Gives you full control over the posting process

### Automated Posting
- Use "✅ Post to LinkedIn" for direct posting
- Extension will fill the LinkedIn post dialog
- You'll get a confirmation prompt before posting

## 🛠️ Troubleshooting

### Common Issues

#### "API Key Invalid" Error
- **Groq**: Ensure key starts with `gsk_` and is from [console.groq.com](https://console.groq.com)
- **Gemini**: Ensure key starts with `AIza` and is from [Google AI Studio](https://aistudio.google.com/app/apikey)

#### "No Trending Topics Found"
- Check your internet connection
- Try different news sources in settings
- Clear topic history if all recent topics were used

#### LinkedIn Posting Not Working
- Ensure you're on `linkedin.com/feed`
- Make sure you're logged into LinkedIn
- Try refreshing the page and retry
- Check if LinkedIn has updated their interface

#### Extension Not Loading
- Check if Developer Mode is enabled
- Try reloading the extension
- Check browser console for errors

### Performance Tips

- **Groq** is faster but may have rate limits
- **Gemini** is more sophisticated but slower
- Use focus areas to get more relevant content
- Enable image generation only if you have Unsplash API key

## 🔧 Advanced Configuration

### Storage Types Explained
- **Local Storage**: API keys and all settings (persist until Chrome profile deleted)
- **Device-Only**: Your data never leaves your device
- **Topic History**: Automatically cleaned after 30 days

### API Rate Limits
- **Groq**: 14,400 requests/day (very generous)
- **Gemini**: 15 requests/minute, 1,500/day
- **Unsplash**: 50 requests/hour (demo), 5,000/hour (production)

### Content Customization
- Modify `CONFIG.TECH_KEYWORDS` in `config.js` for different filtering
- Update `CONFIG.DEFAULTS.TOPICS_FOCUS` for different default topics
- Customize templates in `generateWithTemplate()` function

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Bug Reports
1. Check existing issues first
2. Provide detailed reproduction steps
3. Include browser version and extension version
4. Share any console errors

### Feature Requests
1. Search existing requests first
2. Describe the use case clearly
3. Explain why it would benefit other users

### Code Contributions
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Setup
```bash
git clone https://github.com/yourusername/linkedin-post-generator.git
cd linkedin-post-generator
# Load extension in developer mode
# Make changes and test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Groq](https://groq.com) for their lightning-fast LLM inference
- [Google AI Studio](https://aistudio.google.com) for Gemini API access
- [Unsplash](https://unsplash.com) for beautiful stock photos
- [Hacker News](https://news.ycombinator.com) for tech discussions
- [Reddit](https://reddit.com) for community-driven content

## 📞 Support

Having issues? Here are your options:

1. **Check this README** - Most questions are answered here
2. **GitHub Issues** - For bugs and feature requests
3. **Email Support** - [your-email@domain.com](mailto:your-email@domain.com)

## 🔄 Changelog

### v0.1.1 (Current)
- ✅ Persistent API key storage (survives browser restarts)
- ✅ Improved error handling and fallbacks
- ✅ Enhanced LinkedIn posting compatibility
- ✅ Better configuration management
- ✅ Updated AI models (Gemini 2.5, Groq latest)
- ✅ Centralized configuration system

### v0.1.0
- 🎉 Initial release
- 🤖 Groq and Gemini AI support
- 📰 Multi-source topic fetching
- 🔒 Local storage management
- 🎯 Topic history tracking

---

**Made with ❤️ for the tech community**

*Keep your LinkedIn presence active with AI-powered content that actually matters!*
