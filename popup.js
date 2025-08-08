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
    await this.loadLastGeneratedPost();
  }

  async loadSettings() {
    try {
      // Check if we need to migrate from old sync storage
      const syncData = await chrome.storage.sync.get(['selectedProvider', 'postFrequency', 'topicsFocus', 'selectedNewsSources', 'enableImageGeneration', 'isSetup']);
      
      // Load all settings from local storage for persistence across browser sessions
      const result = await chrome.storage.local.get([
        'groqKey',
        'geminiKey',
        'unsplashKey',
        'selectedProvider',
        'postFrequency',
        'topicsFocus',
        'selectedNewsSources',
        'enableImageGeneration',
        'isSetup'
      ]);
      
      console.log('🔍 Raw storage data loaded:', {
        local: result,
        sync: syncData
      });
      
      // Migrate from sync storage if local storage is empty but sync has data
      let finalSettings = result;
      if (syncData.isSetup && !result.isSetup) {
        console.log('🔄 Migrating settings from sync to local storage...');
        finalSettings = { ...result, ...syncData };
        await chrome.storage.local.set(finalSettings);
        await chrome.storage.sync.clear(); // Clear sync storage after migration
        console.log('✅ Migration completed');
      }

      this.settings = {
        selectedProvider: finalSettings.selectedProvider || 'groq',
        groqKey: finalSettings.groqKey || '',
        geminiKey: finalSettings.geminiKey || '',
        unsplashKey: finalSettings.unsplashKey || '',
        postFrequency: finalSettings.postFrequency || 'manual',
        topicsFocus: finalSettings.topicsFocus || 'Cybersecurity, AI/ML, Cloud Computing, DevOps, Blockchain',
        selectedNewsSources: finalSettings.selectedNewsSources || ['hackernews', 'reddit'],
        enableImageGeneration: finalSettings.enableImageGeneration || false,
        isSetup: finalSettings.isSetup || false
      };

      this.selectedProvider = this.settings.selectedProvider;
      this.selectedNewsSources = this.settings.selectedNewsSources;
      
      console.log('✅ Settings loaded and applied:', this.settings);
      
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      // Set default values on error
      this.settings = {
        selectedProvider: 'groq',
        groqKey: '',
        geminiKey: '',
        unsplashKey: '',
        postFrequency: 'manual',
        topicsFocus: 'Cybersecurity, AI/ML, Cloud Computing, DevOps, Blockchain',
        selectedNewsSources: ['hackernews', 'reddit'],
        enableImageGeneration: false,
        isSetup: false
      };
      this.selectedProvider = 'groq';
      this.selectedNewsSources = ['hackernews', 'reddit'];
    }
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
    
    // Debug functions for testing persistence (can be removed in production)
    window.debugStorage = {
      checkAll: async () => {
        const local = await chrome.storage.local.get();
        const sync = await chrome.storage.sync.get();
        console.log('🔍 ALL STORAGE DEBUG:');
        console.log('Local Storage:', local);
        console.log('Sync Storage:', sync);
        return { local, sync };
      },
      clearAll: async () => {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
        console.log('🗑️ All storage cleared');
        location.reload();
      },
      testPersistence: async () => {
        const testData = {
          testKey: 'testValue_' + Date.now(),
          selectedProvider: 'groq',
          postFrequency: 'daily',
          isSetup: true
        };
        await chrome.storage.local.set(testData);
        console.log('💾 Test data saved:', testData);
        
        const verification = await chrome.storage.local.get(Object.keys(testData));
        console.log('✅ Verification read:', verification);
        
        return verification;
      }
    };
    
    console.log('🛠️ Debug functions available: window.debugStorage.checkAll(), window.debugStorage.clearAll(), window.debugStorage.testPersistence()');
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
    try {
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
        return;
      }

      // Save all settings to local storage for persistence across browser sessions
      const settingsToSave = {
        groqKey: groqKey || this.settings.groqKey,
        geminiKey: geminiKey || this.settings.geminiKey,
        unsplashKey: unsplashKey || this.settings.unsplashKey,
        selectedProvider: this.selectedProvider,
        postFrequency,
        topicsFocus,
        selectedNewsSources: this.selectedNewsSources,
        enableImageGeneration,
        isSetup: true
      };

      await chrome.storage.local.set(settingsToSave);
      
      // Verify settings were saved correctly
      const verification = await chrome.storage.local.get(Object.keys(settingsToSave));
      console.log('💾 Settings saved to storage:', settingsToSave);
      console.log('🔍 Verification read from storage:', verification);

      // Update local settings object
      this.settings = settingsToSave;

      this.showStatus('All settings saved successfully! Everything will persist across browser sessions.', 'success');
      this.updateUI();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings: ' + error.message, 'error');
    }
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

      // Save the last generated post for persistence
      await this.saveLastGeneratedPost(this.currentPost);

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

    this.showLoading('Connecting to LinkedIn...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('linkedin.com')) {
        this.showStatus('Please navigate to LinkedIn first (linkedin.com/feed)', 'error');
        this.hideLoading();
        return;
      }

      // Check if content script is ready
      let contentScriptReady = false;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkReady' });
        contentScriptReady = response?.ready;
        console.log('📡 Content script status:', response);
      } catch (checkError) {
        console.log('📡 Content script not responding, attempting to inject...');
      }

      // If content script isn't ready, inject it
      if (!contentScriptReady) {
        this.showLoading('Initializing LinkedIn automation...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          console.log('✅ Content script injected');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for initialization
        } catch (injectError) {
          console.error('❌ Failed to inject content script:', injectError);
          this.showFallbackOptions();
          this.hideLoading();
          return;
        }
      }

      this.showLoading('Posting to LinkedIn...');
      
      // Send the post message
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'postToLinkedIn',
        content: this.currentPost.content,
        imageUrl: this.currentPost.imageUrl
      });

      if (response?.success) {
        await this.saveUsedTopic(this.currentPost.topic);
        this.showStatus('Post published to LinkedIn successfully! ✨', 'success');
        this.hidePostPreview();
        await this.loadUsedTopics();
      } else {
        throw new Error(response?.error || 'Unknown error occurred');
      }

      this.hideLoading();

    } catch (error) {
      console.error('❌ Error posting to LinkedIn:', error);
      
      if (error.message.includes('Could not establish connection')) {
        this.showFallbackOptions();
      } else {
        this.showStatus('Error: ' + error.message, 'error');
      }
      
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

  async saveLastGeneratedPost(post) {
    try {
      await chrome.storage.local.set({ lastGeneratedPost: post });
      console.log('💾 Last generated post saved for persistence:', {
        topic: post.topic,
        timestamp: post.timestamp,
        hasImage: !!post.imageUrl
      });
    } catch (error) {
      console.error('❌ Error saving last generated post:', error);
    }
  }

  async loadLastGeneratedPost() {
    try {
      const result = await chrome.storage.local.get(['lastGeneratedPost']);
      
      if (result.lastGeneratedPost) {
        // Only restore if the post is from the current session or recent (within 24 hours)
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        if (result.lastGeneratedPost.timestamp > twentyFourHoursAgo) {
          this.currentPost = result.lastGeneratedPost;
          this.showPostPreview(result.lastGeneratedPost.content, result.lastGeneratedPost.imageUrl);
          
          console.log('✅ Restored last generated post from storage:', {
            topic: result.lastGeneratedPost.topic,
            age: Math.round((Date.now() - result.lastGeneratedPost.timestamp) / 1000 / 60) + ' minutes ago'
          });
          
          // Show a small indicator that this is restored content
          const statusDiv = document.getElementById('status');
          statusDiv.innerHTML = '🔄 Restored your last generated post';
          statusDiv.className = 'status info';
          statusDiv.style.display = 'block';
          
          setTimeout(() => {
            statusDiv.style.display = 'none';
          }, 3000);
        } else {
          // Clean up old post
          await chrome.storage.local.remove(['lastGeneratedPost']);
          console.log('🗑️ Removed old generated post from storage');
        }
      }
    } catch (error) {
      console.error('❌ Error loading last generated post:', error);
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

  showFallbackOptions() {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `
      <strong>⚠️ Automatic posting failed</strong><br>
      <small>Don't worry! Your content is copied to clipboard.</small><br>
      <strong>Manual steps:</strong><br>
      1. Go to <a href="https://www.linkedin.com/feed/" target="_blank">LinkedIn Feed</a><br>
      2. Click "Start a post"<br>
      3. Paste your content (Ctrl+V)<br>
      4. Click "Post"
    `;
    statusDiv.className = 'status info';
    statusDiv.style.display = 'block';
    
    // Copy content to clipboard as fallback
    if (this.currentPost) {
      navigator.clipboard.writeText(this.currentPost.content)
        .then(() => console.log('✅ Content copied to clipboard as fallback'))
        .catch(() => console.log('❌ Could not copy to clipboard'));
    }
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 10000); // Longer timeout for instructions
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
