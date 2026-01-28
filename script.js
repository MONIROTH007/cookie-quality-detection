// Configuration - Replace with your Teachable Machine model URL
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/X3VWKhkZu/";

// Global variables
let model, webcam, isRunning = false;
const maxPredictions = 4; // Perfect, Broken, Burnt, Not Cookie

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const uploadBtn = document.getElementById('uploadBtn');
const clearBtn = document.getElementById('clearBtn');
const fileInput = document.getElementById('fileInput');
const cameraTab = document.getElementById('cameraTab');
const uploadTab = document.getElementById('uploadTab');
const cameraSection = document.getElementById('cameraSection');
const uploadSection = document.getElementById('uploadSection');
const uploadPreview = document.getElementById('upload-preview');
const uploadContainer = document.querySelector('.upload-container');
const statusDiv = document.getElementById('status');
const alertSection = document.getElementById('alertSection');
const predictionsDiv = document.getElementById('predictions');
const webcamWrapper = document.getElementById('webcam-wrapper');

// Current mode
let currentMode = 'camera'; // 'camera' or 'upload'
let uploadedImage = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize application
async function initializeApp() {
    showStatus('Initializing application...', 'loading');
    
    try {
        await loadModel();
        setupEventListeners();
        showStatus('Ready! Click "Start Detection" to begin.', 'success');
    } catch (error) {
        showStatus('Failed to initialize. Please refresh the page.', 'error');
        console.error('Initialization error:', error);
    }
}

// Load the Teachable Machine model
async function loadModel() {
    try {
        showStatus('Loading AI model...', 'loading');
        
        const modelURL = MODEL_URL + "model.json";
        const metadataURL = MODEL_URL + "metadata.json";
        
        model = await tmImage.load(modelURL, metadataURL);
        
        // Initialize prediction display
        initializePredictionDisplay();
        
        return true;
    } catch (error) {
        throw new Error('Model loading failed: ' + error.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', stopDetection);
    uploadBtn.addEventListener('click', () => fileInput.click());
    clearBtn.addEventListener('click', clearUpload);
    fileInput.addEventListener('change', handleFileSelect);
    cameraTab.addEventListener('click', () => switchMode('camera'));
    uploadTab.addEventListener('click', () => switchMode('upload'));
    
    // Drag and drop
    uploadContainer.addEventListener('dragover', handleDragOver);
    uploadContainer.addEventListener('dragleave', handleDragLeave);
    uploadContainer.addEventListener('drop', handleDrop);
}

// Initialize prediction display
function initializePredictionDisplay() {
    predictionsDiv.innerHTML = '';
    
    // Create placeholder items that will be updated with actual predictions
    for (let i = 0; i < maxPredictions; i++) {
        const item = document.createElement('div');
        item.className = 'prediction-item';
        item.innerHTML = `
            <div class="prediction-header">
                <span class="prediction-label">Loading...</span>
                <span class="prediction-confidence">0.0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        `;
        predictionsDiv.appendChild(item);
    }
}

// Start detection
async function startDetection() {
    if (!model) {
        showStatus('Model not loaded. Please refresh the page.', 'error');
        return;
    }
    
    try {
        showStatus('Starting camera...', 'loading');
        startBtn.disabled = true;
        
        // Initialize webcam
        const flip = true; // flip for mirror effect
        webcam = new tmImage.Webcam(400, 400, flip);
        await webcam.setup();
        await webcam.play();
        
        // Add canvas to DOM
        webcamWrapper.appendChild(webcam.canvas);
        
        // Update UI
        isRunning = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        hideStatus();
        
        // Start prediction loop
        window.requestAnimationFrame(predictionLoop);
        
    } catch (error) {
        showStatus('Camera access denied or unavailable.', 'error');
        console.error('Camera error:', error);
        startBtn.disabled = false;
    }
}

// Stop detection
function stopDetection() {
    isRunning = false;
    
    if (webcam) {
        webcam.stop();
        const canvas = webcamWrapper.querySelector('canvas');
        if (canvas) {
            canvas.remove();
        }
    }
    
    // Update UI
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
    stopBtn.style.display = 'none';
    alertSection.innerHTML = '';
    
    showStatus('Detection stopped.', 'success');
}

// Prediction loop
async function predictionLoop() {
    if (!isRunning) return;
    
    webcam.update();
    await predict();
    window.requestAnimationFrame(predictionLoop);
}

// Make prediction
async function predict() {
    const prediction = await model.predict(webcam.canvas);
    
    // Update displays
    updatePredictionDisplay(prediction);
    updateAlert(prediction);
}

// Update prediction display
function updatePredictionDisplay(predictions) {
    const items = predictionsDiv.querySelectorAll('.prediction-item');
    
    predictions.forEach((pred, index) => {
        const percentage = (pred.probability * 100).toFixed(1);
        
        if (items[index]) {
            const item = items[index];
            const confidenceSpan = item.querySelector('.prediction-confidence');
            const progressFill = item.querySelector('.progress-fill');
            const labelSpan = item.querySelector('.prediction-label');
            
            // Update the label to match prediction class name
            labelSpan.textContent = pred.className;
            confidenceSpan.textContent = percentage + '%';
            progressFill.style.width = percentage + '%';
        }
    });
}

// Update alert based on highest prediction
function updateAlert(predictions) {
    // Find highest confidence prediction
    let highest = predictions[0];
    predictions.forEach(pred => {
        if (pred.probability > highest.probability) {
            highest = pred;
        }
    });
    
    const confidence = (highest.probability * 100).toFixed(1);
    
    // Only show alert if confidence > 70%
    if (confidence > 70) {
        const className = highest.className.toLowerCase().replace(' ', '-');
        let message = '';
        let icon = '';
        
        switch (highest.className) {
            case 'Perfect':
                message = `✓ PERFECT - Quality approved (${confidence}% confidence)`;
                break;
            case 'Broken':
                message = `⚠ BROKEN - Structural damage detected (${confidence}% confidence)`;
                break;
            case 'Burnt':
                message = `✗ BURNT - Discard immediately (${confidence}% confidence)`;
                break;
            case 'Not Cookie':
                message = `○ NOT A COOKIE - Unrecognized object (${confidence}% confidence)`;
                break;
        }
        
        alertSection.innerHTML = `<div class="alert ${className}">${message}</div>`;
    } else {
        alertSection.innerHTML = '';
    }
}

// Show status message
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status-message show ${type}`;
}

// Hide status message
function hideStatus() {
    statusDiv.className = 'status-message';
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    showStatus('An error occurred. Please refresh the page.', 'error');
});

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    
    // Stop camera if running
    if (isRunning) {
        stopDetection();
    }
    
    // Clear upload if switching away
    if (mode === 'camera' && uploadedImage) {
        clearUpload();
    }
    
    // Update tabs
    if (mode === 'camera') {
        cameraTab.classList.add('active');
        uploadTab.classList.remove('active');
        cameraSection.style.display = 'block';
        uploadSection.style.display = 'none';
    } else {
        uploadTab.classList.add('active');
        cameraTab.classList.remove('active');
        uploadSection.style.display = 'block';
        cameraSection.style.display = 'none';
    }
    
    // Clear alert
    alertSection.innerHTML = '';
    hideStatus();
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

// Process image file
function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showStatus('Please select a valid image file.', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            // Display image
            uploadPreview.innerHTML = `<img src="${e.target.result}" alt="Uploaded cookie">`;
            uploadedImage = e.target.result;
            
            // Update buttons
            uploadBtn.style.display = 'none';
            clearBtn.style.display = 'inline-block';
            
            // Make prediction
            showStatus('Analyzing image...', 'loading');
            await predictUploadedImage(e.target.result);
            hideStatus();
            
        } catch (error) {
            showStatus('Error processing image.', 'error');
            console.error('Image processing error:', error);
        }
    };
    
    reader.readAsDataURL(file);
}

// Predict uploaded image
async function predictUploadedImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = async () => {
            try {
                // Create canvas and draw image
                const canvas = document.createElement('canvas');
                canvas.width = 224;
                canvas.height = 224;
                const ctx = canvas.getContext('2d');
                
                // Draw and resize image
                ctx.drawImage(img, 0, 0, 224, 224);
                
                // Get prediction
                const prediction = await model.predict(canvas);
                
                // Update displays
                updatePredictionDisplay(prediction);
                updateAlert(prediction);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageSrc;
    });
}

// Clear uploaded photo
function clearUpload() {
    uploadPreview.innerHTML = `
        <div class="upload-placeholder">
            <span class="upload-icon">📷</span>
            <p>Click "Choose Photo" or drag and drop an image here</p>
        </div>
    `;
    uploadedImage = null;
    fileInput.value = '';
    uploadBtn.style.display = 'inline-block';
    clearBtn.style.display = 'none';
    alertSection.innerHTML = '';
    
    // Reset predictions
    initializePredictionDisplay();
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processImageFile(files[0]);
    }
}