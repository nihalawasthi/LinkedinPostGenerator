// Content script for LinkedIn interaction
class LinkedInPoster {
  constructor() {
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'postToLinkedIn') {
        this.postToLinkedIn(request.content, request.imageUrl, request.videoUrl)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
      }
    });
  }

  async postToLinkedIn(content, imageUrl = null) {
  try {
    console.log('🚀 Starting LinkedIn post process...');
    
    // Check if we're on LinkedIn
    if (!window.location.hostname.includes('linkedin.com')) {
      throw new Error('Please navigate to LinkedIn first (linkedin.com/feed)');
    }
    
    // Wait for page to load completely
    await this.waitForPageLoad();
    
    // Try multiple selectors for the share button
    const shareButtonSelectors = [
      '[data-test-id="share-box-trigger"]',
      '[data-control-name="share_toggle"]', 
      '.share-box-feed-entry__trigger',
      '[aria-label*="Start a post"]',
      '.share-box-feed-entry__trigger button',
      'button[aria-label="Start a post"]',
      '.artdeco-button[aria-label*="Start a post"]',
      '.share-creation-state__text-editor-container button'
    ];
    
    console.log('🔍 Looking for share button...');
    let shareButton = null;
    
    for (const selector of shareButtonSelectors) {
      shareButton = document.querySelector(selector);
      if (shareButton && shareButton.offsetParent !== null) { // Check if visible
        console.log(`✅ Found share button with selector: ${selector}`);
        break;
      }
    }
    
    if (!shareButton) {
      throw new Error('Could not find LinkedIn "Start a post" button. Make sure you are on the LinkedIn feed page (linkedin.com/feed) and logged in.');
    }

    // Scroll to the share button and click it
    shareButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    shareButton.click();
    console.log('📝 Clicked share button');
    
    // Wait for the post editor modal to appear
    const editorSelectors = [
      '[data-test-id="share-box-text-editor"]',
      '.ql-editor[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
      '.mentions-texteditor__content',
      '.share-creation-state__text-editor',
      '[data-placeholder*="What do you want to talk about"]'
    ];
    
    console.log('🔍 Waiting for text editor...');
    let textEditor = null;
    
    // Try to find editor with timeout
    for (let attempt = 0; attempt < 10; attempt++) {
      for (const selector of editorSelectors) {
        textEditor = document.querySelector(selector);
        if (textEditor && textEditor.offsetParent !== null) {
          console.log(`✅ Found text editor with selector: ${selector}`);
          break;
        }
      }
      if (textEditor) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!textEditor) {
      throw new Error('Could not find LinkedIn text editor. The post dialog may not have opened properly.');
    }

    // Clear existing content and focus
    textEditor.innerHTML = '';
    textEditor.focus();
    
    // Insert the content with proper formatting
    const formattedContent = content.replace(/\n/g, '<br>');
    textEditor.innerHTML = formattedContent;
    
    // Trigger events to notify LinkedIn of changes
    const events = ['input', 'change', 'keyup', 'paste'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      textEditor.dispatchEvent(event);
    });
    
    // Also try triggering with InputEvent
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: content
    });
    textEditor.dispatchEvent(inputEvent);
    
    console.log('✅ Content inserted into editor');
    
    // Wait for LinkedIn to process the content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Show confirmation dialog
    const previewText = content.length > 200 ? content.substring(0, 200) + '...' : content;
    const confirmMessage = `Ready to post this content to LinkedIn?\n\n${previewText}${imageUrl ? '\n\n[📷 Image will be attached]' : ''}`;
    
    const shouldPost = confirm(confirmMessage);
    
    if (shouldPost) {
      // Find the post button
      const postButtonSelectors = [
        '[data-test-id="share-actions-post-button"]',
        '[data-control-name="share.post"]',
        'button[type="submit"][data-test-id*="post"]',
        '.share-actions__primary-action',
        'button[aria-label*="Post"]',
        '.artdeco-button--primary[type="submit"]'
      ];
      
      console.log('🔍 Looking for post button...');
      let postButton = null;
      
      for (const selector of postButtonSelectors) {
        postButton = document.querySelector(selector);
        if (postButton && !postButton.disabled && postButton.offsetParent !== null) {
          console.log(`✅ Found post button with selector: ${selector}`);
          break;
        }
      }
      
      if (postButton && !postButton.disabled) {
        postButton.click();
        console.log('🚀 Post button clicked!');
        
        // Wait for the post to be submitted
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return { success: true, message: 'Post published successfully!' };
      } else {
        throw new Error('Post button not found or disabled. Please check the content and try posting manually.');
      }
    } else {
      // User cancelled - close the dialog
      const cancelSelectors = [
        '[data-test-id="share-actions-cancel-button"]',
        '[aria-label="Dismiss"]',
        '.artdeco-modal__dismiss',
        '.share-actions__secondary-action'
      ];
      
      for (const selector of cancelSelectors) {
        const cancelButton = document.querySelector(selector);
        if (cancelButton) {
          cancelButton.click();
          break;
        }
      }
      
      throw new Error('Post cancelled by user');
    }
    
  } catch (error) {
    console.error('❌ Error posting to LinkedIn:', error);
    throw error;
  }
}

async waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
      // Fallback timeout
      setTimeout(resolve, 5000);
    }
  });
}

async attachMedia(imageUrl, videoUrl) {
  try {
    // Note: LinkedIn's media attachment is complex and may require different approaches
    // This is a simplified version - in practice, you might need to download and upload files
    
    if (imageUrl) {
      // Try to find media attachment button
      const mediaButton = document.querySelector('[data-test-id="share-box-media-button"]') ||
                         document.querySelector('[aria-label*="Add media"]');
      
      if (mediaButton) {
        // This would typically require file upload handling
        console.log('Media attachment feature would be implemented here');
        // For now, we'll add the image URL as text reference
        const textEditor = document.querySelector('[data-test-id="share-box-text-editor"]');
        if (textEditor) {
          const currentContent = textEditor.innerHTML;
          textEditor.innerHTML = currentContent + `<br><br>🔗 Generated image: ${imageUrl}`;
        }
      }
    }
  } catch (error) {
    console.warn('Could not attach media:', error);
  }
}

  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
}

// Initialize the LinkedIn poster
new LinkedInPoster();
