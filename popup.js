class LinkedInBot {
  constructor() {
    this.selectedProvider = 'groq';
    this.selectedNewsSources = ['hackernews', 'reddit'];
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
    await this.loadUsedTopics();
  }

  async loadSettings() {
    // Use local storage for API keys (persistent) and sync for other settings
    const localResult = await chrome.storage.local.get([
      'groqKey',
      'geminiKey',
      'unsplashKey'
    ]);
    
    const syncResult = await chrome.storage.sync.get([
      'selectedProvider',
      'postFrequency',
      'topicsFocus',
      'selectedNewsSources',
      'enableImageGeneration',
      'isSetup'
    ]);
    
    this.settings = {
      selectedProvider: syncResult.selectedProvider || 'groq',
      groqKey: localResult.groqKey || '',
      geminiKey: localResult.geminiKey || '',
      unsplashKey: localResult.unsplashKey || '',
      postFrequency: syncResult.postFrequency || 'manual',
      topicsFocus: syncResult.topicsFocus || 'Cybersecurity, AI/ML, Cloud Computing, DevOps, Blockchain',
      selectedNewsSources: syncResult.selectedNewsSources || ['hackernews', 'reddit'],
      enableImageGeneration: syncResult.enableImageGeneration || false,
      isSetup: syncResult.isSetup || false
    };

    this.selectedProvider = this.settings.selectedProvider;
    this.selectedNewsSources = this.settings.selectedNewsSources;
  }

  bindEvents() {
    // Provider selection
    document.querySelectorAll('.api-option').forEach(option => {
      option.addEventListener('click', (e) => {
        document.querySelectorAll('.api-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.selectedProvider = option.dataset.provider;
        this.updateApiKeySection();
      });
    });

    // News source selection
    document.querySelectorAll('.news-source').forEach(source => {
      source.addEventListener('click', (e) => {
        source.classList.toggle('selected');
        this.updateSelectedNewsSources();
      });
    });

    // Copy button
    document.getElementById('copy-post').addEventListener('click', () => this.copyPost());
    
    document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('generate-post').addEventListener('click', () => this.generatePost());
    document.getElementById('approve-post').addEventListener('click', () => this.approvePost());
    document.getElementById('regenerate-post').addEventListener('click', () => this.generatePost());
    document.getElementById('clear-topics').addEventListener('click', () => this.clearTopics());
    document.getElementById('view-settings').addEventListener('click', () => this.showSettings());
  }

  updateApiKeySection() {
    const groqSection = document.getElementById('groq-key-section');
    const geminiSection = document.getElementById('gemini-key-section');
    
    // Show/hide sections based on selected provider
    groqSection.style.display = this.selectedProvider === 'groq' ? 'block' : 'none';
    geminiSection.style.display = this.selectedProvider === 'gemini' ? 'block' : 'none';
  }

  updateSelectedNewsSources() {
    this.selectedNewsSources = Array.from(document.querySelectorAll('.news-source.selected'))
      .map(source => source.dataset.source);
  }

  async saveSettings() {
    const groqKey = document.getElementById('groq-key').value;
    const geminiKey = document.getElementById('gemini-key').value;
    const unsplashKey = document.getElementById('unsplash-key').value;
    const postFrequency = document.getElementById('post-frequency').value;
    const topicsFocus = document.getElementById('topics-focus').value;
    const enableImageGeneration = document.getElementById('enable-image-generation').checked;

    // Validate API key based on selected provider
    if (this.selectedProvider === 'groq' && !groqKey && !this.settings.groqKey) {
      this.showStatus('Please enter your Groq API key', 'error');
      return;
    }
    
    if (this.selectedProvider === 'gemini' && !geminiKey && !this.settings.geminiKey) {
      this.showStatus('Please enter your Gemini API key', 'error');
    }

    // Save API keys to local storage (persistent)
    const localData = {};
    if (groqKey) localData.groqKey = groqKey;
    if (geminiKey) localData.geminiKey = geminiKey;
    if (unsplashKey) localData.unsplashKey = unsplashKey;
    
    if (Object.keys(localData).length > 0) {
      await chrome.storage.local.set(localData);
    }

    // Save other settings to sync storage
    const syncData = {
      selectedProvider: this.selectedProvider,
      postFrequency,
      topicsFocus,
      selectedNewsSources: this.selectedNewsSources,
      enableImageGeneration,
      isSetup: true
    };
    
    await chrome.storage.sync.set(syncData);

    // Update local settings object
    this.settings = {
      ...this.settings,
      ...localData,
      ...syncData
    };

    this.showStatus('Settings saved successfully!', 'success');
    this.updateUI();
  }

  updateUI() {
    const setupSection = document.getElementById('setup-section');
    const mainSection = document.getElementById('main-section');

    if (this.settings.isSetup) {
      setupSection.style.display = 'none';
      mainSection.style.display = 'block';
    } else {
      setupSection.style.display = 'block';
      mainSection.style.display = 'none';
      
      // Restore all settings (API keys will be loaded from local storage)
      document.getElementById('groq-key').value = this.settings.groqKey;
      document.getElementById('gemini-key').value = this.settings.geminiKey;
      document.getElementById('unsplash-key').value = this.settings.unsplashKey;
      document.getElementById('post-frequency').value = this.settings.postFrequency;
      document.getElementById('topics-focus').value = this.settings.topicsFocus;
      document.getElementById('enable-image-generation').checked = this.settings.enableImageGeneration;
      
      // Restore provider selection
      document.querySelector(`[data-provider="${this.selectedProvider}"]`)?.classList.add('selected');
      
      // Restore news sources
      this.selectedNewsSources.forEach(source => {
        document.querySelector(`[data-source="${source}"]`)?.classList.add('selected');
      });
      
      this.updateApiKeySection();
    }
  }

  async generatePost() {
    this.showLoading('Fetching trending topics...');
    
    try {
      const trendingTopics = await this.getTrendingTopics();
      const usedTopics = await this.getUsedTopics();
      
      const availableTopics = trendingTopics.filter(topic => 
        !usedTopics.some(used => 
          used.toLowerCase().includes(topic.toLowerCase()) || 
          topic.toLowerCase().includes(used.toLowerCase())
        )
      );

      if (availableTopics.length === 0) {
        this.showStatus('All trending topics have been used recently. Try clearing topic history.', 'error');
        this.hideLoading();
        return;
      }

      const selectedTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
      this.showLoading('Creating engaging content...');
      
      const postData = await this.generatePostContent(selectedTopic);
      
      this.currentPost = {
        content: postData.content,
        imageUrl: postData.imageUrl,
        topic: selectedTopic,
        timestamp: Date.now()
      };

      this.showPostPreview(postData.content, postData.imageUrl);
      this.hideLoading();
      
    } catch (error) {
      console.error('Error generating post:', error);
      this.showStatus('Error generating post: ' + error.message, 'error');
      this.hideLoading();
    }
  }

  async getTrendingTopics() {
    const topics = [];
    
    try {
      // Fetch from multiple current sources
      if (this.selectedNewsSources.includes('hackernews')) {
        const hnTopics = await this.fetchHackerNewsTopics();
        topics.push(...hnTopics);
      }
      
      if (this.selectedNewsSources.includes('reddit')) {
        const redditTopics = await this.fetchRedditTopics();
        topics.push(...redditTopics);
      }
      
      if (this.selectedNewsSources.includes('github')) {
        const githubTopics = await this.fetchGitHubTrending();
        topics.push(...githubTopics);
      }

      if (this.selectedNewsSources.includes('devto')) {
        const devtoTopics = await this.fetchDevToTopics();
        topics.push(...devtoTopics);
      }
      
      // Fallback to current 2025 topics if no topics found
      if (topics.length === 0) {
        return this.getCurrent2025Topics();
      }
      
      return [...new Set(topics)]; // Remove duplicates
    } catch (error) {
      console.warn('Error fetching trending topics, using current fallback:', error);
      return this.getCurrent2025Topics();
    }
  }

  async fetchHackerNewsTopics() {
    try {
      const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const storyIds = await response.json();
      
      const topics = [];
      // Get first 15 stories for better variety
      for (let i = 0; i < Math.min(15, storyIds.length); i++) {
        try {
          const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyIds[i]}.json`);
          const story = await storyResponse.json();
          
          if (story && story.title && this.isTechRelated(story.title)) {
            const topic = this.extractTopicFromTitle(story.title);
            if (topic && topic.length > 5) {
              topics.push(topic);
            }
          }
        } catch (storyError) {
          console.warn('Error fetching individual story:', storyError);
          continue;
        }
      }
      
      return topics;
    } catch (error) {
      console.warn('Error fetching Hacker News topics:', error);
      return [];
    }
  }

  async fetchRedditTopics() {
    try {
      const subreddits = ['programming', 'technology', 'cybersecurity', 'MachineLearning', 'artificial', 'webdev', 'devops'];
      const topics = [];
      
      for (const subreddit of subreddits) {
        try {
          const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
            headers: {
              'User-Agent': 'LinkedInBot/1.0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.data && data.data.children) {
              data.data.children.forEach(post => {
                if (post.data && post.data.title && this.isTechRelated(post.data.title)) {
                  const topic = this.extractTopicFromTitle(post.data.title);
                  if (topic && topic.length > 5) {
                    topics.push(topic);
                  }
                }
              });
            }
          }
        } catch (subredditError) {
          console.warn(`Error fetching r/${subreddit}:`, subredditError);
          continue;
        }
      }
      
      return topics;
    } catch (error) {
      console.warn('Error fetching Reddit topics:', error);
      return [];
    }
  }

  async fetchGitHubTrending() {
    try {
      // Current 2025 trending tech topics
      const currentTrends = [
        'AI Agents and Autonomous Systems',
        'Quantum Computing Applications',
        'Edge AI and Local LLMs',
        'WebAssembly Security',
        'Rust in Production Systems',
        'Multi-Modal AI Integration',
        'Zero-Trust Network Architecture',
        'Serverless Security Patterns',
        'AI-Powered Code Generation',
        'Distributed System Observability',
        'Container Runtime Security',
        'GraphQL Federation at Scale',
        'Real-time Collaborative AI',
        'Privacy-Preserving ML',
        'Sustainable Computing Practices'
      ];
      
      return currentTrends;
    } catch (error) {
      console.warn('Error fetching GitHub trending:', error);
      return [];
    }
  }

  async fetchDevToTopics() {
    try {
      // Dev.to doesn't have a public API for trending, so we'll use current tech topics
      const devTopics = [
        'Next.js 15 Performance Optimization',
        'TypeScript 5.7 New Features',
        'React Server Components',
        'Bun vs Node.js Performance',
        'Deno 2.0 Production Ready',
        'Astro Static Site Generation',
        'Svelte 5 Runes System',
        'Vue 3 Composition API',
        'Tailwind CSS v4 Features',
        'Vite Build Tool Optimization'
      ];
      
      return devTopics;
    } catch (error) {
      console.warn('Error fetching Dev.to topics:', error);
      return [];
    }
  }

  getCurrent2025Topics() {
    return [
      // AI & Machine Learning (2025 trends)
      'Multimodal AI Integration in Enterprise',
      'AI Agents for Cybersecurity Automation',
      'Edge AI and Local LLM Deployment',
      'AI-Powered Code Review Systems',
      'Retrieval-Augmented Generation (RAG)',
      'AI Safety and Alignment Practices',
      'Federated Learning Implementation',
      'AI Model Compression Techniques',
      
      // Cybersecurity (Current threats & solutions)
      'Zero Trust Architecture Implementation',
      'AI-Driven Threat Detection',
      'Supply Chain Security Hardening',
      'Quantum-Resistant Cryptography',
      'Cloud Security Posture Management',
      'Identity-First Security Strategies',
      'DevSecOps Pipeline Integration',
      'Runtime Application Self-Protection',
      
      // Cloud & Infrastructure (2025 focus)
      'Multi-Cloud Cost Optimization',
      'Serverless Security Best Practices',
      'Kubernetes Security Hardening',
      'Infrastructure as Code Evolution',
      'Edge Computing Architecture',
      'Green Cloud Computing Initiatives',
      'Microservices Observability',
      'Container Runtime Security',
      
      // Development & DevOps (Current practices)
      'Platform Engineering Adoption',
      'GitOps Workflow Optimization',
      'API-First Development Strategy',
      'Distributed System Resilience',
      'Real-time Data Processing',
      'Progressive Web App Security',
      'WebAssembly in Production',
      'Low-Code Security Considerations'
    ];
  }

  isTechRelated(title) {
    const techKeywords = [
      // 2025 relevant keywords
      'ai', 'ml', 'llm', 'gpt', 'claude', 'gemini', 'agent', 'automation',
      'security', 'cyber', 'zero-trust', 'quantum', 'encryption',
      'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'serverless',
      'api', 'graphql', 'rest', 'microservices', 'distributed',
      'dev', 'code', 'programming', 'typescript', 'rust', 'go', 'python',
      'react', 'next', 'vue', 'svelte', 'astro', 'vite',
      'blockchain', 'web3', 'defi', 'nft', 'crypto',
      'iot', 'edge', 'wasm', 'webassembly', 'bun', 'deno',
      'observability', 'monitoring', 'logging', 'tracing',
      'devops', 'cicd', 'gitops', 'platform', 'sre'
    ];
    
    return techKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );
  }

  extractTopicFromTitle(title) {
    // Enhanced topic extraction for 2025 content
    const words = title.split(/[\s\-_.,;:!?()[\]{}]+/).filter(word => word.length > 0);
    
    // Filter out common words and keep technical terms
    const stopWords = ['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'how', 'why', 'what', 'when', 'where', 'who'];
    
    const importantWords = words.filter(word => 
      word.length > 3 && 
      !stopWords.includes(word.toLowerCase()) &&
      !/^\d+$/.test(word) // Remove pure numbers
    );
    
    // Take first 2-4 words depending on length
    const topicWords = importantWords.slice(0, importantWords.length > 6 ? 3 : 4);
    return topicWords.join(' ');
  }

  async generatePostContent(topic) {
    let content;
    
    switch (this.selectedProvider) {
      case 'groq':
        content = await this.generateWithGroq(topic);
        break;
      case 'gemini':
        content = await this.generateWithGemini(topic);
        break;
      default:
        content = this.generateWithTemplate(topic);
    }
    
    // Generate image if enabled
    let imageUrl = null;
    if (this.settings.enableImageGeneration) {
      this.showLoading('Generating accompanying image...');
      imageUrl = await this.generatePostImage(topic);
    }
    
    return { content, imageUrl };
  }

  async generateWithGroq(topic) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a tech industry expert creating LinkedIn posts in 2025. Write engaging, professional posts (150-250 words) with current industry insights, relevant hashtags, and modern perspectives. Include emojis sparingly for engagement.'
          },
          {
            role: 'user',
            content: `Create a LinkedIn post about: ${topic}. Make it relevant to 2025 tech trends, informative, engaging, and include 3-5 relevant hashtags. Focus on current industry challenges and opportunities.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateWithGemini(topic) {
    try {
      console.log('🚀 Starting Gemini 2.5 API request for topic:', topic);
      
      // Updated to use Gemini 2.5 models (2025)
      const endpoints = [
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.settings.geminiKey}`,
          model: 'gemini-2.5-flash'
        },
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${this.settings.geminiKey}`,
          model: 'gemini-2.5-pro'
        },
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.settings.geminiKey}`,
          model: 'gemini-1.5-flash'
        }
      ];

      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying ${endpoint.model}...`);
          
          const requestBody = {
            contents: [{
              parts: [{
                text: `Create a professional LinkedIn post about "${topic}" from a 2025 perspective. Make it engaging, informative, and relevant to current tech industry trends. Include insights about modern challenges, opportunities, and best practices. Keep it 150-250 words with 3-5 relevant hashtags. Include 1-2 emojis for engagement.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
              topP: 0.8,
              topK: 40
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_ONLY_HIGH"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_ONLY_HIGH"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_ONLY_HIGH"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_ONLY_HIGH"
              }
            ]
          };

          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`❌ ${endpoint.model} failed:`, response.status, errorText);
            lastError = new Error(`${endpoint.model}: HTTP ${response.status}`);
            continue;
          }

          const data = await response.json();
          console.log(`✅ ${endpoint.model} response:`, data);

          // Extract text from response
          const text = this.extractTextFromGeminiResponse(data);
          if (text) {
            console.log('✅ Successfully extracted text:', text.substring(0, 100) + '...');
            return text;
          }

          console.warn(`⚠️ ${endpoint.model} returned empty content`);
          lastError = new Error(`${endpoint.model} returned empty content`);
          
        } catch (error) {
          console.warn(`❌ ${endpoint.model} error:`, error);
          lastError = error;
          continue;
        }
      }

      // If all endpoints failed, fall back to template
      console.warn('🔄 All Gemini endpoints failed, falling back to template');
      return this.generateWithTemplate(topic);

    } catch (error) {
      console.error('💥 Unexpected Gemini error:', error);
      // Fallback to template on any unexpected error
      return this.generateWithTemplate(topic);
    }
  }

  extractTextFromGeminiResponse(data) {
    try {
      // Method 1: Standard structure
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      // Method 2: Alternative structure
      if (data?.candidates?.[0]?.output) {
        return data.candidates[0].output;
      }

      // Method 3: Direct text field
      if (data?.candidates?.[0]?.text) {
        return data.candidates[0].text;
      }

      // Method 4: Content as string
      if (data?.candidates?.[0]?.content && typeof data.candidates[0].content === 'string') {
        return data.candidates[0].content;
      }

      console.error('❌ Could not extract text from response:', JSON.stringify(data, null, 2));
      return null;

    } catch (error) {
      console.error('❌ Error extracting text:', error);
      return null;
    }
  }

  async generatePostImage(topic) {
    try {
      // Use Unsplash API with proper access key (users need to get their own)
      const query = encodeURIComponent(`${topic} technology cybersecurity`);
      
      // Try with user's Unsplash key if available
      if (this.settings.unsplashKey && this.settings.unsplashKey !== '') {
        try {
          const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape&client_id=${this.settings.unsplashKey}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              return data.results[0].urls.regular;
            }
          }
        } catch (apiError) {
          console.warn('Unsplash API error:', apiError);
        }
      }
      
      // Fallback to Picsum (Lorem Picsum) - reliable placeholder service
      const width = 1200;
      const height = 630;
      const seed = encodeURIComponent(topic.substring(0, 20));
      return `https://picsum.photos/seed/${seed}/${width}/${height}`;
      
    } catch (error) {
      console.warn('Image generation error:', error);
      // Final fallback to a simple tech-themed placeholder
      return `https://picsum.photos/seed/tech/${1200}/${630}`;
    }
  }

  generateWithTemplate(topic) {
    const templates = [
      {
        pattern: "🚀 {topic} is transforming how we approach modern tech challenges in 2025.\n\nKey insights:\n• Enhanced automation capabilities\n• Improved scalability and performance\n• Better integration with AI systems\n\nWhat's your experience with {topic} implementation?\n\n#TechTrends2025 #Innovation #DigitalTransformation #TechLeadership #FutureOfWork",
      },
      {
        pattern: "💡 Diving deep into {topic} and the implications for 2025 are game-changing.\n\nWhy it matters now:\n✅ Addresses current market demands\n✅ Enhances operational efficiency\n✅ Prepares organizations for future challenges\n\nAre you leveraging {topic} in your tech stack?\n\n#Technology #Innovation #AI #CloudComputing #TechStrategy",
      },
      {
        pattern: "🔥 {topic} is becoming essential for competitive advantage in 2025.\n\nWhat I've observed:\n→ Rapid adoption across industries\n→ Significant ROI when implemented correctly\n→ Critical for staying ahead of the curve\n\nShare your thoughts on {topic} adoption!\n\n#TechInnovation #DigitalStrategy #ModernTech #TechTrends #Leadership",
      },
      {
        pattern: "⚡ The evolution of {topic} in 2025 is reshaping entire industries.\n\nCurrent focus areas:\n• Security and compliance integration\n• Performance optimization\n• User experience enhancement\n• Cost-effective scaling\n\nHow is {topic} impacting your organization?\n\n#TechEvolution #Cybersecurity #CloudNative #Innovation #TechLeadership",
      }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.pattern.replace(/{topic}/g, topic);
  }

  showPostPreview(content, imageUrl = null) {
    const previewSection = document.getElementById('post-preview-section');
    const previewDiv = document.getElementById('post-preview');
    
    let previewHTML = `<div class="post-content">${content.replace(/\n/g, '<br>')}</div>`;
    
    if (imageUrl) {
      previewHTML += `
        <div class="post-media" style="margin-top: 15px;">
          <img src="${imageUrl}" alt="Generated post image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        </div>`;
    }
    
    previewDiv.innerHTML = previewHTML;
    previewSection.style.display = 'block';
  }

  async copyPost() {
    if (!this.currentPost) {
      this.showStatus('No post to copy. Generate a post first.', 'error');
      return;
    }

    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(this.currentPost.content);
      
      // Save to topic history (same as approving)
      await this.saveUsedTopic(this.currentPost.topic);
      
      // Update UI
      this.showStatus('Post copied to clipboard and added to topic history!', 'success');
      await this.loadUsedTopics();
      
      // Optional: Hide preview after copying
      // this.hidePostPreview();
      
    } catch (error) {
      console.error('Error copying post:', error);
      this.showStatus('Error copying post to clipboard', 'error');
    }
  }

  async approvePost() {
    if (!this.currentPost) return;

    this.showLoading('Posting to LinkedIn...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('linkedin.com')) {
        this.showStatus('Please navigate to LinkedIn first', 'error');
        this.hideLoading();
        return;
      }

      await chrome.tabs.sendMessage(tab.id, {
        action: 'postToLinkedIn',
        content: this.currentPost.content
      });

      await this.saveUsedTopic(this.currentPost.topic);
      
      this.showStatus('Post scheduled for LinkedIn!', 'success');
      this.hidePostPreview();
      await this.loadUsedTopics();
      this.hideLoading();

    } catch (error) {
      console.error('Error posting:', error);
      this.showStatus('Error posting to LinkedIn: ' + error.message, 'error');
      this.hideLoading();
    }
  }

  async saveUsedTopic(topic) {
    const result = await chrome.storage.local.get(['usedTopics']);
    const usedTopics = result.usedTopics || [];
    
    usedTopics.push({
      topic,
      timestamp: Date.now()
    });

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentTopics = usedTopics.filter(item => item.timestamp > thirtyDaysAgo);

    await chrome.storage.local.set({ usedTopics: recentTopics });
  }

  async getUsedTopics() {
    const result = await chrome.storage.local.get(['usedTopics']);
    const usedTopics = result.usedTopics || [];
    return usedTopics.map(item => item.topic);
  }

  async loadUsedTopics() {
    const usedTopics = await this.getUsedTopics();
    const container = document.getElementById('used-topics');
    
    if (usedTopics.length === 0) {
      container.innerHTML = '<div class="topic-item">No topics used yet</div>';
    } else {
      container.innerHTML = usedTopics
        .slice(-10)
        .map(topic => `<div class="topic-item">${topic}</div>`)
        .join('');
    }
  }

  async clearTopics() {
    if (confirm('Are you sure you want to clear all topic history?')) {
      await chrome.storage.local.remove(['usedTopics']);
      await this.loadUsedTopics();
      this.showStatus('Topic history cleared', 'success');
    }
  }

  hidePostPreview() {
    document.getElementById('post-preview-section').style.display = 'none';
    this.currentPost = null;
  }

  showSettings() {
    document.getElementById('setup-section').style.display = 'block';
    document.getElementById('main-section').style.display = 'none';
  }

  showLoading(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading').style.display = 'block';
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LinkedInBot();
});
