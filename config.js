// Configuration and constants for LinkedIn Post Generator
const CONFIG = {
  // API Configuration
  API: {
    GROQ: {
      BASE_URL: 'https://api.groq.com/openai/v1/chat/completions',
      MODEL: 'llama3-8b-8192',
      MAX_TOKENS: 500,
      TEMPERATURE: 0.7
    },
    GEMINI: {
      BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
      MODELS: [
        'gemini-2.5-flash',
        'gemini-2.5-pro', 
        'gemini-1.5-flash'
      ],
      MAX_TOKENS: 500,
      TEMPERATURE: 0.7
    },
    UNSPLASH: {
      BASE_URL: 'https://api.unsplash.com/search/photos',
      FALLBACK_URL: 'https://picsum.photos'
    }
  },

  // Content Configuration
  CONTENT: {
    POST_LENGTH: {
      MIN: 150,
      MAX: 250
    },
    HASHTAG_COUNT: {
      MIN: 3,
      MAX: 5
    },
    TOPIC_HISTORY_DAYS: 30,
    MAX_TOPIC_HISTORY: 10
  },

  // News Sources
  NEWS_SOURCES: {
    HACKERNEWS: {
      BASE_URL: 'https://hacker-news.firebaseio.com/v0',
      MAX_STORIES: 15
    },
    REDDIT: {
      BASE_URL: 'https://www.reddit.com/r',
      SUBREDDITS: ['programming', 'technology', 'cybersecurity', 'MachineLearning', 'artificial', 'webdev', 'devops'],
      POST_LIMIT: 10,
      USER_AGENT: 'LinkedInBot/1.0'
    }
  },

  // Tech Keywords for filtering
  TECH_KEYWORDS: [
    // AI & ML 
    'ai', 'ml', 'llm', 'gpt', 'claude', 'gemini', 'agent', 'automation', 'neural', 'deep learning',
    // Security
    'security', 'cyber', 'zero-trust', 'quantum', 'encryption', 'vulnerability', 'threat', 'firewall',
    // Cloud & Infrastructure  
    'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'serverless', 'container', 'microservices',
    // Development
    'api', 'graphql', 'rest', 'microservices', 'distributed', 'frontend', 'backend', 'fullstack',
    'dev', 'code', 'programming', 'typescript', 'rust', 'go', 'python', 'javascript', 'java', 'c++',
    // Frameworks & Tools
    'react', 'next', 'vue', 'svelte', 'astro', 'vite', 'webpack', 'node', 'deno', 'bun',
    // Emerging Tech
    'blockchain', 'web3', 'defi', 'nft', 'crypto', 'iot', 'edge', 'wasm', 'webassembly',
    // DevOps & Monitoring
    'observability', 'monitoring', 'logging', 'tracing', 'devops', 'cicd', 'gitops', 'platform', 'sre'
  ],

  // Stop words for topic extraction
  STOP_WORDS: [
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'been', 
    'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 
    'how', 'why', 'what', 'when', 'where', 'who', 'which', 'than', 'then', 'them',
    'here', 'there', 'these', 'those', 'they', 'their', 'some', 'any', 'all', 'each',
    'more', 'most', 'much', 'many', 'few', 'less', 'new', 'old', 'first', 'last'
  ],

  // Default settings
  DEFAULTS: {
    PROVIDER: 'groq',
    POST_FREQUENCY: 'manual',
    TOPICS_FOCUS: 'Cybersecurity, AI/ML, Cloud Computing, DevOps, Blockchain',
    NEWS_SOURCES: ['hackernews', 'reddit'],
    ENABLE_IMAGES: false
  },

  // UI Configuration
  UI: {
    LOADING_TIMEOUT: 30000, // 30 seconds
    STATUS_DISPLAY_TIME: 5000, // 5 seconds
    NOTIFICATION_TIMEOUT: 10000 // 10 seconds
  },

  // LinkedIn Selectors (updated for 2025)
  LINKEDIN_SELECTORS: {
    SHARE_BUTTON: [
      '[data-test-id="share-box-trigger"]',
      '[data-control-name="share_toggle"]',
      '.share-box-feed-entry__trigger',
      '[aria-label*="Start a post"]',
      '.share-box-feed-entry__trigger button',
      'button[aria-label="Start a post"]',
      '.artdeco-button[aria-label*="Start a post"]',
      '.share-creation-state__text-editor-container button'
    ],
    TEXT_EDITOR: [
      '[data-test-id="share-box-text-editor"]',
      '.ql-editor[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
      '.mentions-texteditor__content',
      '.share-creation-state__text-editor',
      '[data-placeholder*="What do you want to talk about"]'
    ],
    POST_BUTTON: [
      '[data-test-id="share-actions-post-button"]',
      '[data-control-name="share.post"]',
      'button[type="submit"][data-test-id*="post"]',
      '.share-actions__primary-action',
      'button[aria-label*="Post"]',
      '.artdeco-button--primary[type="submit"]'
    ],
    CANCEL_BUTTON: [
      '[data-test-id="share-actions-cancel-button"]',
      '[aria-label="Dismiss"]',
      '.artdeco-modal__dismiss',
      '.share-actions__secondary-action'
    ]
  }
};

// Utility functions
const UTILS = {
  // Storage utilities
  storage: {
    // Session storage methods (kept for potential future use)
    async setSession(data) {
      try {
        await chrome.storage.session.set(data);
      } catch (error) {
        console.error('Error setting session storage:', error);
        throw error;
      }
    },
    
    async getSession(keys) {
      try {
        return await chrome.storage.session.get(keys);
      } catch (error) {
        console.error('Error getting session storage:', error);
        return {};
      }
    },
    
    async setSync(data) {
      try {
        await chrome.storage.sync.set(data);
      } catch (error) {
        console.error('Error setting sync storage:', error);
        throw error;
      }
    },
    
    async getSync(keys) {
      try {
        return await chrome.storage.sync.get(keys);
      } catch (error) {
        console.error('Error getting sync storage:', error);
        return {};
      }
    },
    
    async setLocal(data) {
      try {
        await chrome.storage.local.set(data);
      } catch (error) {
        console.error('Error setting local storage:', error);
        throw error;
      }
    },
    
    async getLocal(keys) {
      try {
        return await chrome.storage.local.get(keys);
      } catch (error) {
        console.error('Error getting local storage:', error);
        return {};
      }
    }
  },

  // Text processing utilities
  text: {
    isTechRelated(title) {
      return CONFIG.TECH_KEYWORDS.some(keyword => 
        title.toLowerCase().includes(keyword.toLowerCase())
      );
    },

    extractTopic(title) {
      const words = title.split(/[\s\-_.,;:!?()\[\]{}]+/).filter(word => word.length > 0);
      
      const importantWords = words.filter(word => 
        word.length > 3 && 
        !CONFIG.STOP_WORDS.includes(word.toLowerCase()) &&
        !/^\d+$/.test(word)
      );
      
      const topicWords = importantWords.slice(0, importantWords.length > 6 ? 3 : 4);
      return topicWords.join(' ');
    },

    formatContent(content) {
      return content.replace(/\n/g, '<br>');
    },

    truncateText(text, maxLength = 200) {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
  },

  // Time utilities
  time: {
    getThirtyDaysAgo() {
      return Date.now() - (CONFIG.CONTENT.TOPIC_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    },

    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleDateString();
    }
  },

  // Network utilities
  network: {
    async fetchWithTimeout(url, options = {}, timeout = 10000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },

    async retryFetch(url, options = {}, maxRetries = 3, delay = 1000) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await this.fetchWithTimeout(url, options);
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
  },

  // Validation utilities
  validation: {
    isValidApiKey(key, provider) {
      if (!key || typeof key !== 'string') return false;
      
      switch (provider) {
        case 'groq':
          return key.startsWith('gsk_') && key.length > 20;
        case 'gemini':
          return key.startsWith('AIza') && key.length > 30;
        case 'unsplash':
          return key.length > 20; // Basic length check
        default:
          return key.length > 10;
      }
    },

    isValidUrl(string) {
      try {
        new URL(string);
        return true;
      } catch {
        return false;
      }
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, UTILS };
} else {
  // Browser environment
  window.CONFIG = CONFIG;
  window.UTILS = UTILS;
}
