const MODEL_URL = "https://teachablemachine.withgoogle.com/models/X3VWKhkZu/";

// Global variables
let model, webcam, isRunning = false;
const maxPredictions = 4; 

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

let currentMode = 'camera'; 
let uploadedImage = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

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

async function loadModel() {
    try {
        showStatus('Loading AI model...', 'loading');
        
        const modelURL = MODEL_URL + "model.json";
        const metadataURL = MODEL_URL + "metadata.json";
        
        model = await tmImage.load(modelURL, metadataURL);
        
        initializePredictionDisplay();
        
        return true;
    } catch (error) {
        throw new Error('Model loading failed: ' + error.message);
    }
}

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

function initializePredictionDisplay() {
    predictionsDiv.innerHTML = '';
    
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

async function startDetection() {
    if (!model) {
        showStatus('Model not loaded. Please refresh the page.', 'error');
        return;
    }
    
    try {
        showStatus('Starting camera...', 'loading');
        startBtn.disabled = true;
        
        // webcam
        const flip = true; 
        webcam = new tmImage.Webcam(400, 400, flip);
        await webcam.setup();
        await webcam.play();
        
        webcamWrapper.appendChild(webcam.canvas);
        
        isRunning = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        hideStatus();
        
        window.requestAnimationFrame(predictionLoop);
        
    } catch (error) {
        showStatus('Camera access denied or unavailable.', 'error');
        console.error('Camera error:', error);
        startBtn.disabled = false;
    }
}

function stopDetection() {
    isRunning = false;
    
    if (webcam) {
        webcam.stop();
        const canvas = webcamWrapper.querySelector('canvas');
        if (canvas) {
            canvas.remove();
        }
    }
    
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
    stopBtn.style.display = 'none';
    alertSection.innerHTML = '';
    
    showStatus('Detection stopped.', 'success');
}

async function predictionLoop() {
    if (!isRunning) return;
    
    webcam.update();
    await predict();
    window.requestAnimationFrame(predictionLoop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    
    updatePredictionDisplay(prediction);
    updateAlert(prediction);
}

function updatePredictionDisplay(predictions) {
    const items = predictionsDiv.querySelectorAll('.prediction-item');
    
    predictions.forEach((pred, index) => {
        const percentage = (pred.probability * 100).toFixed(1);
        
        if (items[index]) {
            const item = items[index];
            const confidenceSpan = item.querySelector('.prediction-confidence');
            const progressFill = item.querySelector('.progress-fill');
            const labelSpan = item.querySelector('.prediction-label');
            
            labelSpan.textContent = pred.className;
            confidenceSpan.textContent = percentage + '%';
            progressFill.style.width = percentage + '%';
        }
    });
}

function updateAlert(predictions) {
    let highest = predictions[0];
    predictions.forEach(pred => {
        if (pred.probability > highest.probability) {
            highest = pred;
        }
    });
    
    const confidence = (highest.probability * 100).toFixed(1);
    
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

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status-message show ${type}`;
}
function hideStatus() {
    statusDiv.className = 'status-message';
}
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    showStatus('An error occurred. Please refresh the page.', 'error');
});

function switchMode(mode) {
    currentMode = mode;
    
    if (isRunning) {
        stopDetection();
    }
    
    if (mode === 'camera' && uploadedImage) {
        clearUpload();
    }
    
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
    
    alertSection.innerHTML = '';
    hideStatus();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showStatus('Please select a valid image file.', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            uploadPreview.innerHTML = `<img src="${e.target.result}" alt="Uploaded cookie">`;
            uploadedImage = e.target.result;
            
            uploadBtn.style.display = 'none';
            clearBtn.style.display = 'inline-block';
            
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

async function predictUploadedImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = async () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 224;
                canvas.height = 224;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0, 224, 224);
                
                const prediction = await model.predict(canvas);
                
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
    
    initializePredictionDisplay();
}

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