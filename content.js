// Content script for LinkedIn interaction
class LinkedInPoster {
  constructor() {
    this.isReady = false;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    console.log('🚀 LinkedIn Poster initialized on:', window.location.href);
    this.isReady = true;
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Received message:', request);
      
      if (request.action === 'postToLinkedIn') {
        this.postToLinkedIn(request.content, request.imageUrl)
          .then((result) => {
            console.log('✅ Post successful:', result);
            sendResponse({ success: true, message: result.message || 'Posted successfully!' });
          })
          .catch(error => {
            console.error('❌ Post failed:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep message channel open for async response
      }
      
      if (request.action === 'checkReady') {
        sendResponse({ ready: this.isReady, url: window.location.href });
        return true;
      }
    });
    
    // Signal that content script is ready
    chrome.runtime.sendMessage({ action: 'contentScriptReady', url: window.location.href })
      .catch(() => {/* Ignore if popup not open */});
  }

  async postToLinkedIn(content, imageUrl = null) {
    try {
      console.log('🚀 Starting LinkedIn post process...');
      
      // Check if we're on LinkedIn
      if (!window.location.hostname.includes('linkedin.com')) {
        throw new Error('Please navigate to LinkedIn first (linkedin.com/feed)');
      }
      
      // Navigate to feed if not already there
      if (!window.location.pathname.includes('/feed')) {
        console.log('📍 Redirecting to LinkedIn feed...');
        window.location.href = 'https://www.linkedin.com/feed/';
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for redirect
      }
      
      // Wait for page to load completely
      await this.waitForPageLoad();
      console.log('✅ Page loaded, looking for post button...');

      // Scroll to top to ensure "Start a post" button is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await new Promise(resolve => setTimeout(resolve, 1000));
    
    // LinkedIn selectors for "Start a post" button (2025 actual structure)
    const shareButtonSelectors = [
      // Exact 2025 LinkedIn button classes from your inspection
      'button.artdeco-button.artdeco-button--muted.artdeco-button--4.artdeco-button--tertiary.ember-view',
      'button.artdeco-button--muted.artdeco-button--tertiary',
      'button.artdeco-button.artdeco-button--muted.artdeco-button--tertiary',
      
      // Fallback to older selectors
      '[data-test-id="share-box-trigger"]',
      '[data-testid="share-box-trigger"]',
      '[data-control-name="share_toggle"]',
      'button[data-control-name="share_toggle"]',
      
      // Aria label variations
      '[aria-label*="Start a post"]',
      'button[aria-label*="Start a post"]',
      
      // Class-based selectors
      '.share-box-feed-entry__trigger',
      '.artdeco-button[aria-label*="Start a post"]',
      '.share-creation-state__text-editor-container button',
      
      // Generic class combinations that should work
      '.artdeco-button.artdeco-button--muted',
      'button.ember-view.artdeco-button',
      'button[class*="artdeco-button--tertiary"]',
      'button.artdeco-button.ember-view'
    ];
    
    console.log('🔍 Looking for share button...');
    let shareButton = null;
    
    // Debug: List all potential buttons
    console.log('🔍 DEBUG: All buttons on page:', document.querySelectorAll('button'));
    console.log('🔍 DEBUG: Elements with "post" in aria-label:', document.querySelectorAll('[aria-label*="post" i]'));
    console.log('🔍 DEBUG: Elements with data-test-id:', document.querySelectorAll('[data-test-id]'));
    
    for (const selector of shareButtonSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`🔍 Trying selector "${selector}" - found ${elements.length} elements`);
      
      for (const element of elements) {
        if (element && element.offsetParent !== null) { // Check if visible
          console.log(`✅ Found visible share button:`, element);
          console.log(`✅ Element text content: "${element.textContent?.trim()}"`);
          console.log(`✅ Element aria-label: "${element.getAttribute('aria-label')}"`);
          shareButton = element;
          break;
        }
      }
      if (shareButton) break;
    }
    
    if (!shareButton) {
      // Final debug attempt - look for button containing "Start a post" text
      console.log('🔍 DEBUG: Looking for button with "Start a post" text...');
      
      // Method 1: Find button by text content
      const buttonsByText = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = btn.textContent?.toLowerCase().trim();
        return text && text.includes('start a post');
      });
      console.log('🔍 DEBUG: Buttons with "Start a post" text:', buttonsByText);
      
      // Method 2: Find artdeco buttons
      const artdecoButtons = Array.from(document.querySelectorAll('button.artdeco-button')).filter(btn => {
        const text = btn.textContent?.toLowerCase().trim();
        return text && (text.includes('start') || text.includes('post'));
      });
      console.log('🔍 DEBUG: Artdeco buttons with start/post:', artdecoButtons);
      
      // Method 3: Find by strong tag content
      const strongElements = Array.from(document.querySelectorAll('strong')).filter(strong => {
        const text = strong.textContent?.toLowerCase().trim();
        return text && text.includes('start a post');
      });
      console.log('🔍 DEBUG: Strong elements with "Start a post":', strongElements);
      
      // Use the first viable option
      if (buttonsByText.length > 0) {
        shareButton = buttonsByText[0];
        console.log('✅ Using text-based button:', shareButton);
      } else if (artdecoButtons.length > 0) {
        shareButton = artdecoButtons[0];
        console.log('✅ Using artdeco button:', shareButton);
      } else if (strongElements.length > 0 && strongElements[0].closest('button')) {
        shareButton = strongElements[0].closest('button');
        console.log('✅ Using button containing strong element:', shareButton);
      }
    }
    
    if (!shareButton) {
      throw new Error('Could not find LinkedIn "Start a post" button. Make sure you are on the LinkedIn feed page (linkedin.com/feed) and logged in. Check console logs for debugging info.');
    }

    // Scroll to the share button and click it
    shareButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    shareButton.click();
    console.log('📝 Clicked share button');
    
    // LinkedIn selectors for text editor (with fallbacks)
    const editorSelectors = [
      // Most common selectors for text editor
      '.ql-editor[contenteditable="true"]',
      '[data-test-id="share-box-text-editor"]',
      '[contenteditable="true"][role="textbox"]',
      '.mentions-texteditor__content',
      '.share-creation-state__text-editor',
      '[data-placeholder*="What do you want to talk about"]',
      // Additional fallback selectors
      '.editor-content[contenteditable="true"]',
      '[data-testid="share-box-text-editor"]',
      '.share-box__text-editor',
      '.compose-text-editor',
      'div[contenteditable="true"][data-placeholder]'
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
    
    // Copy image to clipboard for manual pasting if available
    if (imageUrl) {
      console.log('🖼️ Processing image for clipboard copy:', imageUrl);
      try {
        await this.copyImageToClipboard(imageUrl);
        console.log('✅ Image copied to clipboard successfully');
      } catch (imageError) {
        console.warn('⚠️ Could not copy image to clipboard:', imageError);
      }
    }
    
    // Wait for LinkedIn to process the content
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Position cursor at the end for easy image pasting
    this.positionCursorAtEnd(textEditor);
    
    // Show simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0073b1;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
    `;
    
    let notificationText = '✅ Content inserted into LinkedIn editor!';
    if (imageUrl) {
      notificationText += '<br>📸 Image ready to paste (Ctrl+V / Cmd+V)';
    }
    
    notification.innerHTML = notificationText;
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
    
    return { success: true, message: 'Content ready for posting! Image copied to clipboard if available.' };
    
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

  async copyImageToClipboard(imageUrl) {
    try {
      console.log('🖼️ Fetching image for clipboard copy:', imageUrl);
      
      // Check if clipboard API is supported
      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('Clipboard API not supported in this browser');
      }
      
      // Fetch the image
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*'
        },
        mode: 'cors' // Try CORS first
      }).catch(async (corsError) => {
        console.warn('CORS fetch failed, trying without CORS:', corsError);
        // Fallback without CORS mode
        return fetch(imageUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/*'
          }
        });
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      // Get the image as a blob
      const imageBlob = await response.blob();
      
      // Determine the correct MIME type
      let mimeType = imageBlob.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        // Try to determine MIME type from URL extension
        const urlLower = imageUrl.toLowerCase();
        if (urlLower.includes('.png')) mimeType = 'image/png';
        else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) mimeType = 'image/jpeg';
        else if (urlLower.includes('.gif')) mimeType = 'image/gif';
        else if (urlLower.includes('.webp')) mimeType = 'image/webp';
        else mimeType = 'image/png'; // Default fallback
      }
      
      console.log(`🎯 Image fetched: ${imageBlob.size} bytes, MIME type: ${mimeType}`);
      
      // Create a ClipboardItem with the image blob
      const clipboardItem = new ClipboardItem({
        [mimeType]: imageBlob
      });
      
      // Write to clipboard
      await navigator.clipboard.write([clipboardItem]);
      
      console.log('✅ Image successfully copied to clipboard!');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to copy image to clipboard:', error);
      
      // Provide helpful error messages
      if (error.name === 'NotAllowedError') {
        throw new Error('Clipboard access denied. Please allow clipboard permissions for this extension.');
      } else if (error.message.includes('CORS')) {
        throw new Error('Cannot copy image due to cross-origin restrictions. The image server does not allow cross-origin requests.');
      } else if (error.message.includes('fetch')) {
        throw new Error('Failed to download image. Please check if the image URL is accessible.');
      } else {
        throw new Error(`Clipboard copy failed: ${error.message}`);
      }
    }
  }

  async pasteImageIntoEditor(textEditor) {
    try {
      console.log('📎 Attempting to paste image directly into editor...');
      
      // Ensure the text editor is focused
      textEditor.focus();
      
      // Method 1: Try programmatic paste using execCommand (legacy but often works)
      try {
        const pasteSuccess = document.execCommand('paste');
        if (pasteSuccess) {
          console.log('✅ Image pasted successfully using execCommand');
          return true;
        }
      } catch (execError) {
        console.warn('⚠️ execCommand paste failed:', execError);
      }
      
      // Method 2: Try to read from clipboard and create paste event
      try {
        const clipboardItems = await navigator.clipboard.read();
        if (clipboardItems && clipboardItems.length > 0) {
          const clipboardItem = clipboardItems[0];
          
          // Check if clipboard contains image data
          const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
          
          if (imageTypes.length > 0) {
            const imageBlob = await clipboardItem.getType(imageTypes[0]);
            
            // Create a synthetic paste event with the image data
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: new DataTransfer(),
              bubbles: true,
              cancelable: true
            });
            
            // Add the image data to the clipboard data
            const file = new File([imageBlob], 'image.png', { type: imageBlob.type });
            pasteEvent.clipboardData.items.add(file);
            
            // Dispatch the paste event
            textEditor.dispatchEvent(pasteEvent);
            
            console.log('✅ Image paste event dispatched successfully');
            return true;
          }
        }
      } catch (clipboardError) {
        console.warn('⚠️ Clipboard read failed:', clipboardError);
      }
      
      // Method 3: Try to trigger paste using keyboard simulation
      try {
        // Create Ctrl+V / Cmd+V key events
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const pasteKey = new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          keyCode: 86,
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true,
          cancelable: true
        });
        
        textEditor.dispatchEvent(pasteKey);
        
        // Also dispatch keyup event
        const pasteKeyUp = new KeyboardEvent('keyup', {
          key: 'v',
          code: 'KeyV', 
          keyCode: 86,
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true,
          cancelable: true
        });
        
        textEditor.dispatchEvent(pasteKeyUp);
        
        console.log('✅ Paste keyboard events dispatched');
        return true;
        
      } catch (keyboardError) {
        console.warn('⚠️ Keyboard event simulation failed:', keyboardError);
      }
      
      // Method 4: Position cursor after text and suggest manual paste
      try {
        // Move cursor to the end of the text content
        const range = document.createRange();
        const selection = window.getSelection();
        
        // Find the last text node or create one
        let lastNode = textEditor.lastChild;
        if (!lastNode || lastNode.nodeType !== Node.TEXT_NODE) {
          const textNode = document.createTextNode('\n\n');
          textEditor.appendChild(textNode);
          lastNode = textNode;
        }
        
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('✅ Cursor positioned for manual paste');
        return false; // Indicate manual paste needed
        
      } catch (cursorError) {
        console.warn('⚠️ Cursor positioning failed:', cursorError);
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to paste image into editor:', error);
      return false;
    }
  }

  positionCursorAtEnd(textEditor) {
    try {
      // Move cursor to the end of the text content for easy image pasting
      const range = document.createRange();
      const selection = window.getSelection();
      
      // Select all content and collapse to end
      range.selectNodeContents(textEditor);
      range.collapse(false); // false = collapse to end
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Ensure the editor stays focused
      textEditor.focus();
      
      console.log('✅ Cursor positioned at end of content');
      return true;
      
    } catch (error) {
      console.warn('⚠️ Failed to position cursor:', error);
      return false;
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
