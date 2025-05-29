// WhisperPrint + Privacy-Guardian Client
// This script handles all client-side functionality for the application

// Global state
const state = {
    apiEndpoint: localStorage.getItem('apiEndpoint') || 'http://localhost:8000',
    apiKey: localStorage.getItem('apiKey') || '',
    sensitivityThreshold: parseInt(localStorage.getItem('sensitivityThreshold') || '75'),
    autoCheck: localStorage.getItem('autoCheck') !== 'false',
    preserveMetadata: localStorage.getItem('preserveMetadata') !== 'false',
    autoExtractText: localStorage.getItem('autoExtractText') !== 'false',
    connectionStatus: 'disconnected',
    activeWebSocket: null,
    eventLog: [],
    uploadedFiles: {
        document: null,
        identify: null,
        privacy: null
    },
    fingerprintedFile: null
};

// DOM Elements
const elements = {
    // Navigation
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    connectionStatus: document.getElementById('connection-status'),
    
    // Input Type Switchers
    inputTypeSwitchers: document.querySelectorAll('.input-type-switcher'),
    
    // Fingerprint
    fingerprintForm: document.getElementById('fingerprint-form'),
    recipientId: document.getElementById('recipient-id'),
    documentText: document.getElementById('document-text'),
    fingerprintButton: document.getElementById('fingerprint-button'),
    fingerprintResult: document.getElementById('fingerprint-result'),
    trackingId: document.getElementById('tracking-id'),
    recipientUuid: document.getElementById('recipient-uuid'),
    fingerprintedText: document.getElementById('fingerprinted-text'),
    copyFingerprinted: document.getElementById('copy-fingerprinted'),
    downloadFingerprinted: document.getElementById('download-fingerprinted'),
    documentDropzone: document.getElementById('document-dropzone'),
    documentFileInput: document.getElementById('document-file-input'),
    filePreviewContainer: document.getElementById('file-preview-container'),
    textInputContainer: document.getElementById('text-input-container'),
    fileInputContainer: document.getElementById('file-input-container'),
    
    // Identify
    identifyForm: document.getElementById('identify-form'),
    leakedText: document.getElementById('leaked-text'),
    identifyButton: document.getElementById('identify-button'),
    identifyResult: document.getElementById('identify-result'),
    identifiedRecipient: document.getElementById('identified-recipient'),
    confidence: document.getElementById('confidence'),
    recipientMetadata: document.getElementById('recipient-metadata'),
    identifyDropzone: document.getElementById('identify-dropzone'),
    identifyFileInput: document.getElementById('identify-file-input'),
    identifyFilePreview: document.getElementById('identify-file-preview'),
    identifyTextContainer: document.getElementById('identify-text-container'),
    identifyFileContainer: document.getElementById('identify-file-container'),
    
    // Privacy Check
    privacyForm: document.getElementById('privacy-form'),
    contentType: document.getElementById('content-type'),
    contentText: document.getElementById('content-text'),
    privacyButton: document.getElementById('privacy-button'),
    privacyResult: document.getElementById('privacy-result'),
    privacyTrackingId: document.getElementById('privacy-tracking-id'),
    riskScore: document.getElementById('risk-score'),
    riskBar: document.getElementById('risk-bar'),
    recommendation: document.getElementById('recommendation'),
    detectionsList: document.getElementById('detections-list'),
    privacyDropzone: document.getElementById('privacy-dropzone'),
    privacyFileInput: document.getElementById('privacy-file-input'),
    privacyFilePreview: document.getElementById('privacy-file-preview'),
    privacyTextContainer: document.getElementById('privacy-text-container'),
    privacyFileContainer: document.getElementById('privacy-file-container'),
    
    // Dashboard
    totalDocs: document.getElementById('total-docs'),
    totalRecipients: document.getElementById('total-recipients'),
    totalDetections: document.getElementById('total-detections'),
    totalLeaks: document.getElementById('total-leaks'),
    eventsList: document.getElementById('events-list'),
    
    // Settings
    settingsForm: document.getElementById('settings-form'),
    apiEndpointInput: document.getElementById('api-endpoint'),
    apiKeyInput: document.getElementById('api-key'),
    sensitivityThresholdInput: document.getElementById('sensitivity-threshold'),
    thresholdValue: document.getElementById('threshold-display'),
    autoCheckInput: document.getElementById('auto-check'),
    preserveMetadataInput: document.getElementById('preserve-metadata'),
    autoExtractTextInput: document.getElementById('auto-extract-text')
};

// *** Tab Navigation ***
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        
        // Update active tab with animation
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content with animation
        elements.tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        const targetContent = document.getElementById(`${tabId}-tab`);
        targetContent.classList.add('active');
        
        // Apply entrance animation
        targetContent.style.animation = 'none';
        setTimeout(() => {
            targetContent.style.animation = 'fadeInScale var(--animation-medium) cubic-bezier(0.26, 0.53, 0.74, 1.48)';
        }, 10);
        
        // If dashboard tab, fetch latest stats
        if (tabId === 'dashboard') {
            fetchStats();
        }
    });
});

// *** Input Type Switchers ***
elements.inputTypeSwitchers.forEach(switcher => {
    const switcherBtns = switcher.querySelectorAll('.switcher-btn');
    
    switcherBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active button
            switcherBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const inputType = btn.getAttribute('data-input-type');
            const tabContent = btn.closest('.tab-content');
            const tabId = tabContent.id.replace('-tab', '');
            
            // Toggle appropriate containers
            if (tabId === 'fingerprint') {
                elements.textInputContainer.style.display = inputType === 'text' ? 'block' : 'none';
                elements.fileInputContainer.style.display = inputType === 'file' ? 'block' : 'none';
            } else if (tabId === 'identify') {
                elements.identifyTextContainer.style.display = inputType === 'text' ? 'block' : 'none';
                elements.identifyFileContainer.style.display = inputType === 'file' ? 'block' : 'none';
            } else if (tabId === 'privacy') {
                elements.privacyTextContainer.style.display = inputType === 'text' ? 'block' : 'none';
                elements.privacyFileContainer.style.display = inputType === 'file' ? 'block' : 'none';
            }
        });
    });
});

// *** API Functions ***
async function apiRequest(endpoint, method = 'GET', data = null, file = null) {
    const url = `${state.apiEndpoint}${endpoint}`;
    const headers = {
        'Authorization': state.apiKey ? `Bearer ${state.apiKey}` : ''
    };
    
    const options = {
        method,
        headers,
        mode: 'cors'
    };
    
    if (file) {
        // Handle file upload with FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // Add other data as JSON
        if (data) {
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object') {
                    formData.append(key, JSON.stringify(data[key]));
                } else {
                    formData.append(key, data[key]);
                }
            });
        }
        
        options.body = formData;
        // Don't set Content-Type header - browser will set it with boundary
        delete headers['Content-Type'];
    } else if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// *** WebSocket Connection ***
function connectWebSocket() {
    if (state.activeWebSocket) {
        state.activeWebSocket.close();
    }
    
    try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = state.apiEndpoint.replace(/^https?:\/\//, '');
        const wsEndpoint = `${wsProtocol}//${wsUrl}/ws/dashboard`;
        
        const ws = new WebSocket(wsEndpoint);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            updateConnectionStatus('connected');
            state.activeWebSocket = ws;
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            updateConnectionStatus('disconnected');
            state.activeWebSocket = null;
            
            // Try to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus('disconnected');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'history') {
                    // Handle history of events
                    state.eventLog = data.events;
                } else {
                    // Handle new event
                    state.eventLog.unshift(data);
                }
                
                updateEventsList();
                // Refresh dashboard stats
                fetchStats();
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
    } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        updateConnectionStatus('disconnected');
    }
}

function updateConnectionStatus(status) {
    state.connectionStatus = status;
    
    elements.connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    elements.connectionStatus.className = `status status-${status}`;
}

// *** Dashboard Functions ***
async function fetchStats() {
    try {
        const stats = await apiRequest('/stats');
        
        // Update dashboard stats with animation
        animateCounter(elements.totalDocs, stats.fingerprinted_documents || 0);
        animateCounter(elements.totalRecipients, stats.total_recipients || 0);
        animateCounter(elements.totalDetections, stats.content_checks || 0);
        animateCounter(elements.totalLeaks, stats.identified_leaks || 0);
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

function animateCounter(element, targetValue) {
    const duration = 1000; // ms
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        
        if (elapsedTime < duration) {
            const progress = elapsedTime / duration;
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easedProgress);
            element.textContent = currentValue;
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = targetValue;
        }
    }
    
    requestAnimationFrame(updateCounter);
}

function updateEventsList() {
    // Clear existing events except for samples (if no real events)
    if (state.eventLog.length > 0) {
        elements.eventsList.innerHTML = '';
    }
    
    // Add events to list
    state.eventLog.slice(0, 20).forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        const eventTime = document.createElement('span');
        eventTime.className = 'event-time';
        eventTime.textContent = timestamp;
        
        const eventType = document.createElement('span');
        eventType.className = `event-type event-type-${getEventTypeClass(event.event_type)}`;
        eventType.textContent = formatEventType(event.event_type);
        
        const eventText = document.createElement('span');
        eventText.textContent = formatEventDescription(event);
        
        eventItem.appendChild(eventTime);
        eventItem.appendChild(eventType);
        eventItem.appendChild(eventText);
        
        elements.eventsList.appendChild(eventItem);
    });
}

function getEventTypeClass(eventType) {
    switch (eventType) {
        case 'document_fingerprinted':
            return 'fingerprint';
        case 'document_identified':
            return 'identified';
        case 'content_checked':
            return 'checked';
        case 'feedback_recorded':
            return 'feedback';
        default:
            return 'other';
    }
}

function formatEventType(eventType) {
    switch (eventType) {
        case 'document_fingerprinted':
            return 'Fingerprint';
        case 'document_identified':
            return 'Identified';
        case 'content_checked':
            return 'Privacy Check';
        case 'feedback_recorded':
            return 'Feedback';
        default:
            return eventType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
}

function formatEventDescription(event) {
    switch (event.event_type) {
        case 'document_fingerprinted':
            return ` Document fingerprinted for recipient ${event.recipient_id}`;
        case 'document_identified':
            return ` Leaked document identified: ${event.recipient_id || 'Unknown'} (${Math.round((event.confidence || 0) * 100)}% confidence)`;
        case 'content_checked':
            return ` Content check: ${event.has_sensitive_data ? 'Sensitive data detected' : 'No sensitive data'} (Risk: ${Math.round((event.risk_score || 0) * 100)}%)`;
        case 'feedback_recorded':
            return ` Feedback on detection: ${event.was_correct ? 'Correct' : 'Incorrect'}`;
        default:
            return ` ${event.event_type}`;
    }
}

// *** File Upload and Processing Functions ***
function setupFileUpload(dropzone, fileInput, previewContainer, fileType) {
    // Click to browse files
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selection via browse dialog
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0], previewContainer, fileType);
        }
    });
    
    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0], previewContainer, fileType);
        }
    });
}

function handleFileUpload(file, previewContainer, fileType) {
    // Validate file type
    const supportedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/rtf',
        'application/rtf'
    ];
    
    if (!supportedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
        showNotification('Unsupported file type. Please upload PDF, Word, Excel, PowerPoint, or text files.', 'error');
        return;
    }
    
    // Store file in state
    state.uploadedFiles[fileType] = file;
    
    // Update preview
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = '';
    
    const filePreview = document.createElement('div');
    filePreview.className = 'file-preview';
    
    const fileIcon = document.createElement('div');
    fileIcon.className = 'file-icon';
    fileIcon.innerHTML = getFileIcon(file);
    
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    
    const fileSize = document.createElement('div');
    fileSize.className = 'file-size';
    fileSize.textContent = formatFileSize(file.size);
    
    const removeButton = document.createElement('div');
    removeButton.className = 'file-remove';
    removeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        state.uploadedFiles[fileType] = null;
        previewContainer.style.display = 'none';
    });
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);
    filePreview.appendChild(fileIcon);
    filePreview.appendChild(fileInfo);
    filePreview.appendChild(removeButton);
    
    previewContainer.appendChild(filePreview);
    
    // Auto extract text if enabled
    if (state.autoExtractText) {
        extractTextFromFile(file, fileType);
    }
}

function extractTextFromFile(file, fileType) {
    // In a real implementation, you would use a server-side service or library like pdf.js
    // For this demo, we'll just show a message
    console.log(`Extracting text from ${file.name} for ${fileType}`);
    showNotification(`Extracting text from ${file.name}...`, 'info');
    
    // Simulate text extraction (in a real app, this would call the API)
    setTimeout(() => {
        showNotification(`Text extracted from ${file.name}`, 'success');
    }, 1500);
}

function getFileIcon(file) {
    // Return appropriate icon based on file type
    const fileType = file.type;
    
    if (fileType.includes('pdf')) {
        return '<i class="fa-solid fa-file-pdf"></i>';
    } else if (fileType.includes('word') || fileType.includes('document')) {
        return '<i class="fa-solid fa-file-word"></i>';
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
        return '<i class="fa-solid fa-file-excel"></i>';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
        return '<i class="fa-solid fa-file-powerpoint"></i>';
    } else if (fileType.includes('text') || file.name.endsWith('.txt')) {
        return '<i class="fa-solid fa-file-lines"></i>';
    } else {
        return '<i class="fa-solid fa-file"></i>';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// *** Fingerprint Functions ***
elements.fingerprintForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recipientId = elements.recipientId.value.trim();
    
    // Different handling for text vs file input
    const activeInputType = document.querySelector('#fingerprint-tab .switcher-btn.active').getAttribute('data-input-type');
    
    if (activeInputType === 'text') {
        const text = elements.documentText.value.trim();
        if (!recipientId || !text) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            elements.fingerprintButton.disabled = true;
            elements.fingerprintButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            
            const data = {
                text,
                recipient_id: recipientId,
                metadata: {
                    source: 'web_client',
                    timestamp: new Date().toISOString()
                }
            };
            
            const result = await apiRequest('/fingerprint', 'POST', data);
            
            // Display result
            displayFingerprintResult(result);
            
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            resetFingerprintButton();
        }
    } else {
        // File upload handling
        const file = state.uploadedFiles.document;
        
        if (!recipientId || !file) {
            showNotification('Please provide a recipient ID and upload a file', 'error');
            return;
        }
        
        try {
            elements.fingerprintButton.disabled = true;
            elements.fingerprintButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            
            const data = {
                recipient_id: recipientId,
                preserve_metadata: state.preserveMetadata,
                metadata: {
                    source: 'web_client',
                    filename: file.name,
                    file_type: file.type,
                    timestamp: new Date().toISOString()
                }
            };
            
            const result = await apiRequest('/fingerprint/file', 'POST', data, file);
            
            // Store the fingerprinted file for download
            state.fingerprintedFile = result.fingerprinted_file;
            
            // Display result
            displayFingerprintResult(result);
            
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            resetFingerprintButton();
        }
    }
});

function displayFingerprintResult(result) {
    elements.trackingId.textContent = result.tracking_id;
    elements.recipientUuid.textContent = result.recipient_uuid;
    
    if (result.fingerprinted_text) {
        elements.fingerprintedText.value = result.fingerprinted_text;
        elements.fingerprintedText.style.display = 'block';
    } else {
        elements.fingerprintedText.style.display = 'none';
    }
    
    // For file results, show different UI
    if (result.fingerprinted_file) {
        elements.downloadFingerprinted.style.display = 'inline-flex';
        elements.copyFingerprinted.style.display = 'none';
    } else {
        elements.downloadFingerprinted.style.display = 'none';
        elements.copyFingerprinted.style.display = 'inline-flex';
    }
    
    elements.fingerprintResult.style.display = 'block';
    
    // Scroll to results
    elements.fingerprintResult.scrollIntoView({ behavior: 'smooth' });
}

function resetFingerprintButton() {
    elements.fingerprintButton.disabled = false;
    elements.fingerprintButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        Create Fingerprinted Document
    `;
}

// Copy to clipboard
elements.copyFingerprinted.addEventListener('click', () => {
    elements.fingerprintedText.select();
    document.execCommand('copy');
    
    // Animate button
    elements.copyFingerprinted.classList.add('shake');
    setTimeout(() => {
        elements.copyFingerprinted.classList.remove('shake');
    }, 500);
    
    showNotification('Copied to clipboard!', 'success');
});

// Download fingerprinted file
elements.downloadFingerprinted.addEventListener('click', () => {
    if (state.fingerprintedFile && state.fingerprintedFile.url) {
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = state.fingerprintedFile.url;
        a.download = state.fingerprintedFile.filename || 'fingerprinted_document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification('Download started!', 'success');
    } else {
        showNotification('No file available for download', 'error');
    }
});

// *** Notification System ***
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fa-solid fa-circle-check"></i>';
            break;
        case 'error':
            icon = '<i class="fa-solid fa-circle-exclamation"></i>';
            break;
        case 'warning':
            icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
            break;
        default:
            icon = '<i class="fa-solid fa-circle-info"></i>';
    }
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-message">${message}</div>
        <div class="notification-close"><i class="fa-solid fa-xmark"></i></div>
    `;
    
    // Add to DOM
    const notificationsContainer = document.querySelector('.notifications-container') || createNotificationsContainer();
    notificationsContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Add close handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Auto close after delay
    setTimeout(() => {
        closeNotification(notification);
    }, 5000);
}

function closeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    setTimeout(() => {
        notification.remove();
    }, 300);
}

function createNotificationsContainer() {
    const container = document.createElement('div');
    container.className = 'notifications-container';
    document.body.appendChild(container);
    return container;
}

function initializeApp() {
    // Set initial values for settings inputs
    elements.apiEndpointInput.value = state.apiEndpoint;
    elements.apiKeyInput.value = state.apiKey;
    elements.sensitivityThresholdInput.value = state.sensitivityThreshold;
    elements.thresholdValue.textContent = state.sensitivityThreshold;
    elements.autoCheckInput.checked = state.autoCheck;
    elements.preserveMetadataInput.checked = state.preserveMetadata;
    elements.autoExtractTextInput.checked = state.autoExtractText;
    
    // Update threshold display when slider changes
    elements.sensitivityThresholdInput.addEventListener('input', () => {
        const value = elements.sensitivityThresholdInput.value;
        elements.thresholdValue.textContent = value;
    });
    
    // Handle settings form submission
    elements.settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Update state and localStorage
        state.apiEndpoint = elements.apiEndpointInput.value.trim();
        state.apiKey = elements.apiKeyInput.value.trim();
        state.sensitivityThreshold = parseInt(elements.sensitivityThresholdInput.value);
        state.autoCheck = elements.autoCheckInput.checked;
        state.preserveMetadata = elements.preserveMetadataInput.checked;
        state.autoExtractText = elements.autoExtractTextInput.checked;
        
        localStorage.setItem('apiEndpoint', state.apiEndpoint);
        localStorage.setItem('apiKey', state.apiKey);
        localStorage.setItem('sensitivityThreshold', state.sensitivityThreshold);
        localStorage.setItem('autoCheck', state.autoCheck);
        localStorage.setItem('preserveMetadata', state.preserveMetadata);
        localStorage.setItem('autoExtractText', state.autoExtractText);
        
        // Reconnect websocket with new endpoint
        connectWebSocket();
        
        showNotification('Settings saved successfully!', 'success');
    });
    
    // Set up file upload functionality
    setupFileUpload(elements.documentDropzone, elements.documentFileInput, elements.filePreviewContainer, 'document');
    setupFileUpload(elements.identifyDropzone, elements.identifyFileInput, elements.identifyFilePreview, 'identify');
    setupFileUpload(elements.privacyDropzone, elements.privacyFileInput, elements.privacyFilePreview, 'privacy');
    
    // Connect WebSocket
    connectWebSocket();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp); 