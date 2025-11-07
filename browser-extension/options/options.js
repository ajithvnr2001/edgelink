/**
 * EdgeLink Extension - Options/Settings Page
 * Handles extension configuration and preferences
 */

// DOM Elements
const apiUrlInput = document.getElementById('api-url');
const autoShortenCheckbox = document.getElementById('auto-shorten');
const showInlineNotificationCheckbox = document.getElementById('show-inline-notification');
const autoCopyCheckbox = document.getElementById('auto-copy');
const defaultUtmInput = document.getElementById('default-utm');
const defaultDomainInput = document.getElementById('default-domain');
const linkLimitInput = document.getElementById('link-limit');

const authStatus = document.getElementById('auth-status');
const authStatusTitle = document.getElementById('auth-status-title');
const authStatusDesc = document.getElementById('auth-status-desc');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');
const userPlan = document.getElementById('user-plan');

const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const saveStatus = document.getElementById('save-status');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const exportSettingsBtn = document.getElementById('export-settings-btn');
const importSettingsBtn = document.getElementById('import-settings-btn');

/**
 * Initialize options page
 */
async function init() {
  await api.init();
  await loadSettings();
  await updateAuthStatus();
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);
  logoutBtn.addEventListener('click', handleLogout);
  clearCacheBtn.addEventListener('click', clearCache);
  exportSettingsBtn.addEventListener('click', exportSettings);
  importSettingsBtn.addEventListener('click', importSettings);

  // Auto-save on certain changes
  apiUrlInput.addEventListener('change', () => {
    api.setBaseURL(apiUrlInput.value.trim() || 'https://edgelink.io');
  });
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'apiBaseUrl',
    'autoShorten',
    'showInlineNotification',
    'autoCopy',
    'defaultUtm',
    'defaultDomain',
    'linkLimit',
  ]);

  apiUrlInput.value = settings.apiBaseUrl || 'https://edgelink.io';
  autoShortenCheckbox.checked = settings.autoShorten || false;
  showInlineNotificationCheckbox.checked = settings.showInlineNotification !== false;
  autoCopyCheckbox.checked = settings.autoCopy !== false;
  defaultUtmInput.value = settings.defaultUtm || '';
  defaultDomainInput.value = settings.defaultDomain || '';
  linkLimitInput.value = settings.linkLimit || 10;
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  const settings = {
    apiBaseUrl: apiUrlInput.value.trim() || 'https://edgelink.io',
    autoShorten: autoShortenCheckbox.checked,
    showInlineNotification: showInlineNotificationCheckbox.checked,
    autoCopy: autoCopyCheckbox.checked,
    defaultUtm: defaultUtmInput.value.trim(),
    defaultDomain: defaultDomainInput.value.trim(),
    linkLimit: parseInt(linkLimitInput.value) || 10,
  };

  try {
    await chrome.storage.local.set(settings);
    api.setBaseURL(settings.apiBaseUrl);
    showSaveStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showSaveStatus('Failed to save settings', 'error');
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  const defaults = {
    apiBaseUrl: 'https://edgelink.io',
    autoShorten: false,
    showInlineNotification: true,
    autoCopy: true,
    defaultUtm: '',
    defaultDomain: '',
    linkLimit: 10,
  };

  await chrome.storage.local.set(defaults);
  await loadSettings();
  showSaveStatus('Settings reset to defaults', 'success');
}

/**
 * Update authentication status display
 */
async function updateAuthStatus() {
  if (api.isAuthenticated()) {
    try {
      const profile = await api.getProfile();

      // Update UI for authenticated state
      const indicator = authStatus.querySelector('.status-indicator');
      indicator.classList.add('authenticated');

      authStatusTitle.textContent = 'Authenticated';
      authStatusDesc.textContent = 'You are logged in';
      logoutBtn.classList.remove('hidden');

      userEmail.textContent = `Email: ${profile.email}`;
      userEmail.classList.remove('hidden');

      userPlan.textContent = `Plan: ${profile.plan.toUpperCase()}`;
      userPlan.classList.remove('hidden');
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Handle token expiration
      await api.clearToken();
      updateAuthStatus();
    }
  } else {
    // Update UI for non-authenticated state
    const indicator = authStatus.querySelector('.status-indicator');
    indicator.classList.remove('authenticated');

    authStatusTitle.textContent = 'Not Authenticated';
    authStatusDesc.textContent = 'Click the extension icon to login or signup';
    logoutBtn.classList.add('hidden');

    userEmail.classList.add('hidden');
    userPlan.classList.add('hidden');
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }

  await api.logout();
  await updateAuthStatus();
  showSaveStatus('Logged out successfully', 'success');
}

/**
 * Clear cache
 */
async function clearCache() {
  if (!confirm('Are you sure you want to clear the cache?')) {
    return;
  }

  // Clear session storage
  await chrome.storage.session.clear();

  showSaveStatus('Cache cleared successfully', 'success');
}

/**
 * Export settings
 */
async function exportSettings() {
  const settings = await chrome.storage.local.get(null);

  // Remove sensitive data
  const exportData = { ...settings };
  delete exportData.authToken;

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `edgelink-settings-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showSaveStatus('Settings exported', 'success');
}

/**
 * Import settings
 */
function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const settings = JSON.parse(text);

      // Validate settings
      if (typeof settings !== 'object') {
        throw new Error('Invalid settings file');
      }

      // Don't import authToken
      delete settings.authToken;

      await chrome.storage.local.set(settings);
      await loadSettings();
      showSaveStatus('Settings imported successfully', 'success');
    } catch (error) {
      showSaveStatus('Failed to import settings', 'error');
    }
  };

  input.click();
}

/**
 * Show save status message
 */
function showSaveStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${type}`;

  setTimeout(() => {
    saveStatus.className = 'save-status';
  }, 3000);
}

// Initialize on load
init();
