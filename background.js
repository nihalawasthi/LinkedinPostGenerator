// Background script for scheduling and automation
class BackgroundBot {
  constructor() {
    this.init();
  }

  init() {
    // Set up alarm for scheduled posting
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'scheduledPost') {
        this.handleScheduledPost();
      }
    });

    // Listen for settings changes to update alarms
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.postFrequency) {
        this.updateSchedule(changes.postFrequency.newValue);
      }
    });

    // Initialize schedule on startup
    this.initializeSchedule();
  }

  async initializeSchedule() {
    const result = await chrome.storage.sync.get(['postFrequency']);
    const frequency = result.postFrequency || 'manual';
    this.updateSchedule(frequency);
  }

  updateSchedule(frequency) {
    // Clear existing alarms
    chrome.alarms.clear('scheduledPost');

    if (frequency === 'daily') {
      // Schedule daily at 9 AM
      chrome.alarms.create('scheduledPost', {
        when: this.getNextScheduleTime(9, 0), // 9:00 AM
        periodInMinutes: 24 * 60 // 24 hours
      });
    } else if (frequency === 'weekly') {
      // Schedule weekly on Monday at 9 AM
      chrome.alarms.create('scheduledPost', {
        when: this.getNextWeeklyTime(1, 9, 0), // Monday 9:00 AM
        periodInMinutes: 7 * 24 * 60 // 7 days
      });
    }
  }

  getNextScheduleTime(hour, minute) {
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hour, minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.getTime();
  }

  getNextWeeklyTime(dayOfWeek, hour, minute) {
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hour, minute, 0, 0);

    // Calculate days until target day of week (0 = Sunday, 1 = Monday, etc.)
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    
    if (daysUntilTarget === 0 && scheduled <= now) {
      // If it's the target day but time has passed, schedule for next week
      scheduled.setDate(scheduled.getDate() + 7);
    } else {
      scheduled.setDate(scheduled.getDate() + daysUntilTarget);
    }

    return scheduled.getTime();
  }

  async handleScheduledPost() {
    try {
      // Check if user has valid settings
      const settings = await chrome.storage.sync.get(['openaiKey', 'isSetup']);
      
      if (!settings.isSetup || !settings.openaiKey) {
        console.log('Bot not properly configured for scheduled posting');
        return;
      }

      // Create a notification to remind user
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/public/icon128.png',
        title: 'LinkedIn Post Generator',
        message: 'Time for your scheduled post! Click to generate content.',
        buttons: [
          { title: 'Generate Post' },
          { title: 'Skip Today' }
        ]
      });

      // Listen for notification clicks
      chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
        if (buttonIndex === 0) {
          // Open popup to generate post
          chrome.action.openPopup();
        }
        chrome.notifications.clear(notificationId);
      });

    } catch (error) {
      console.error('Error in scheduled post handler:', error);
    }
  }
}

// Initialize background bot
new BackgroundBot();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome page or popup on first install
    chrome.action.openPopup();
  }
});
