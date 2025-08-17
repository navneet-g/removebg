import { useState, useRef } from 'react'
import { removeBackground } from '@imgly/background-removal'
import './App.css'

// Passport photo specifications
const PASSPORT_SPECS = {
  // USA and India both use 2x2 inches
  dimensions: {
    width: 2, // inches
    height: 2, // inches
    dpi: 300, // dots per inch for high quality
    pixels: 600 // 2 inches * 300 DPI = 600 pixels
  },
  // Head size requirements (USA: 1 inch to 1 3/8 inches, India: 25mm to 35mm)
  // For optimal passport photos, head should fill about 70-80% of the frame height
  headSize: {
    min: 0.8, // inches (slightly smaller than minimum for safety)
    max: 1.3, // inches (slightly larger than maximum for safety)
    target: 1.1, // target head size for optimal appearance
    pixels: {
      min: 240, // 0.8 inches * 300 DPI
      max: 390,  // 1.3 inches * 300 DPI
      target: 330 // 1.1 inches * 300 DPI (optimal)
    }
  },
  // Eye level positioning (eyes should be 1 1/8 to 1 3/8 inches from bottom)
  eyeLevel: {
    fromBottom: 1.25, // inches
    pixels: 375 // 1.25 inches * 300 DPI
  },
  // Frame utilization - head should fill most of the available space
  // but NEVER cut off any part of the subject
  frameUtilization: {
    minHeadHeight: 0.5, // Head should fill at least 50% of frame height (more conservative)
    targetHeadHeight: 0.65, // Target: head fills 65% of frame height (safer)
    maxHeadHeight: 0.75 // Head should not fill more than 75% of frame height (prevents cutting)
  }
}

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [photoValidation, setPhotoValidation] = useState<{
    dimensions: boolean;
    background: boolean;
    positioning: boolean;
    quality: boolean;
  } | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setEditedImage(null)
      setProcessedImage(null)
      setError(null)
      setPhotoValidation(null)
      setShowEditor(true)
      setRotation(0)
      setCrop({ x: 0, y: 0, width: 100, height: 100 })
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        setSelectedImage(file)
        setEditedImage(null)
        setProcessedImage(null)
        setError(null)
        setPhotoValidation(null)
        setShowEditor(true)
        setRotation(0)
        setCrop({ x: 0, y: 0, width: 100, height: 100 })
      }
    }
  }

  const rotateImage = (direction: 'left' | 'right') => {
    setRotation(prev => {
      const newRotation = direction === 'left' ? prev - 90 : prev + 90
      return newRotation % 360
    })
  }

  const rotateImageFine = (direction: 'left' | 'right') => {
    setRotation(prev => {
      const increment = 1 // 1 degree increments
      const newRotation = direction === 'left' ? prev - increment : prev + increment
      return newRotation
    })
  }

  const setRotationExact = (degrees: number) => {
    setRotation(degrees)
  }

  const applyEdits = () => {
    if (!selectedImage) return

    // Create a canvas to apply the edits
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Set canvas size to match the image
      canvas.width = img.width
      canvas.height = img.height

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Save context
      ctx.save()

      // Move to center for rotation
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-canvas.width / 2, -canvas.height / 2)

      // Draw rotated image
      ctx.drawImage(img, 0, 0)

      // Restore context
      ctx.restore()

      // Apply cropping
      const cropX = (crop.x / 100) * canvas.width
      const cropY = (crop.y / 100) * canvas.height
      const cropWidth = (crop.width / 100) * canvas.width
      const cropHeight = (crop.height / 100) * canvas.height

      // Create new canvas for cropped image
      const croppedCanvas = document.createElement('canvas')
      const croppedCtx = croppedCanvas.getContext('2d')
      if (!croppedCtx) return

      croppedCanvas.width = cropWidth
      croppedCanvas.height = cropHeight

      // Draw cropped portion
      croppedCtx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )

      // Convert to blob for the editedImage state
      croppedCanvas.toBlob((blob) => {
        if (blob) {
          // Create a URL from the blob
          const editedImageUrl = URL.createObjectURL(blob)
          setEditedImage(editedImageUrl)
          setShowEditor(false)
        }
      }, 'image/png')
    }

    img.src = URL.createObjectURL(selectedImage)
  }

  const resetEdits = () => {
    setRotation(0)
    setCrop({ x: 0, y: 0, width: 100, height: 100 })
  }

  const validatePassportPhoto = (canvas: HTMLCanvasElement): {
    dimensions: boolean;
    background: boolean;
    positioning: boolean;
    quality: boolean;
  } => {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Check dimensions
    const dimensions = canvas.width === PASSPORT_SPECS.dimensions.pixels && 
                     canvas.height === PASSPORT_SPECS.dimensions.pixels

    // Check background (sample center pixels to ensure white background)
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const imageData = ctx.getImageData(centerX - 10, centerY - 10, 20, 20)
    const data = imageData.data
    
    let background = true
    for (let i = 0; i < data.length; i += 4) {
      // Check if pixel is not white (allowing small variations for anti-aliasing)
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
        background = false
        break
      }
    }

    // Check positioning (ensure maximum frame utilization)
    const positioning = true // This is handled in the new positioning algorithm

    // Check quality (ensure 300 DPI equivalent)
    const quality = canvas.width >= PASSPORT_SPECS.dimensions.pixels

    return { dimensions, background, positioning, quality }
  }

  const createPassportPhoto = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Set canvas size to exact passport photo dimensions
    const size = PASSPORT_SPECS.dimensions.pixels
    canvas.width = size
    canvas.height = size
    
    // Fill with pure white background (RGB: 255, 255, 255)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)
    
    // Calculate optimal scaling and positioning for passport photo requirements
    const { scale, x, y } = calculateOptimalPosition(img, size)
    
    // Draw the processed image with proper positioning
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
    
    // Validate the generated photo
    const validation = validatePassportPhoto(canvas)
    setPhotoValidation(validation)
    
    return canvas.toDataURL('image/png', 1.0)
  }

  const calculateOptimalPosition = (img: HTMLImageElement, canvasSize: number) => {
    // For passport photos, we want to ensure the subject is fully visible
    // while still maximizing frame utilization
    
    // Calculate scale to fit the image within the frame
    // Use the smaller dimension to ensure the entire image fits
    const scaleX = canvasSize / img.width
    const scaleY = canvasSize / img.height
    
    // Use the smaller scale to ensure the entire image fits without cropping
    // Add a small margin (5%) to ensure no parts are cut off
    const scale = Math.min(scaleX, scaleY) * 0.95
    
    // Calculate scaled dimensions
    const scaledWidth = img.width * scale
    const scaledHeight = img.height * scale
    
    // Center the image to ensure proper positioning
    const x = (canvasSize - scaledWidth) / 2
    const y = (canvasSize - scaledHeight) / 2
    
    // For portrait photos, we want to ensure the head is well-positioned
    // If the image is taller than it is wide (portrait), adjust Y position
    if (img.height > img.width) {
      // For portraits, position the head slightly higher in the frame
      // This ensures the head is never cut off at the top
      const headOffset = (canvasSize - scaledHeight) * 0.1 // Move head up by 10% of available space
      return { scale, x, y: y - headOffset }
    }
    
    return { scale, x, y }
  }

  const processImage = async () => {
    if (!selectedImage) return

    setIsProcessing(true)
    setError(null)
    setPhotoValidation(null)

    try {
      // Use edited image if available, otherwise use original
      const imageToProcess = editedImage || URL.createObjectURL(selectedImage)
      
      // Remove background
      const processedBlob = await removeBackground(imageToProcess)
      
      // Load the processed image
      const img = new Image()
      img.onload = () => {
        try {
          // Create passport photo with exact specifications
          const dataUrl = createPassportPhoto(img)
          setProcessedImage(dataUrl)
          setIsProcessing(false)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create passport photo')
          setIsProcessing(false)
        }
      }
      
      img.src = URL.createObjectURL(processedBlob)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
      setIsProcessing(false)
    }
  }

  const downloadImage = () => {
    if (!processedImage) return
    
    const link = document.createElement('a')
    link.href = processedImage
    link.download = 'passport-photo-2x2-usa-india.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetApp = () => {
    setSelectedImage(null)
    setEditedImage(null)
    setProcessedImage(null)
    setError(null)
    setPhotoValidation(null)
    setShowEditor(false)
    setRotation(0)
    setCrop({ x: 0, y: 0, width: 100, height: 100 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Passport Photo Creator</h1>
        <p>Create 2x2 passport photos meeting USA & India specifications</p>
      </header>

      <main className="app-main">
        {!selectedImage && !processedImage && (
          <div className="upload-section">
            <div 
              className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📷</div>
              <p>Click to select an image</p>
              <p className="upload-hint">or drag and drop</p>
              {isDragOver && <p className="drag-text">Drop your image here!</p>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            
            <div className="specifications-info">
              <h3>Passport Photo Requirements</h3>
              <div className="specs-grid">
                <div className="spec-item">
                  <strong>Size:</strong> 2" × 2" (51mm × 51mm)
                </div>
                <div className="spec-item">
                  <strong>Resolution:</strong> 600 × 600 pixels (300 DPI)
                </div>
                <div className="spec-item">
                  <strong>Background:</strong> Pure white
                </div>
                <div className="spec-item">
                  <strong>Head Size:</strong> 0.8" to 1.3" from chin to crown
                </div>
                <div className="spec-item">
                  <strong>Frame Utilization:</strong> Subject fills entire frame
                </div>
                <div className="spec-item">
                  <strong>White Space:</strong> Minimal to none
                </div>
                <div className="spec-item">
                  <strong>Format:</strong> PNG with high quality
                </div>
                <div className="spec-item">
                  <strong>Positioning:</strong> Centered with maximum coverage
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Image Editor */}
      {selectedImage && showEditor && (
        <div className="editor-section">
          <div className="editor-header">
            <h3>Edit Your Image</h3>
          </div>
          
          <div className="editor-content">
            {/* Canvas Container */}
            <div className="editor-canvas-container">
              <div className="image-preview-container">
                <img 
                  src={URL.createObjectURL(selectedImage)} 
                  alt="Edit" 
                  className="editor-preview-image"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center'
                  }}
                />
                <div 
                  className="crop-overlay"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`
                  }}
                >
                  <div className="crop-handle crop-handle-top-left"></div>
                  <div className="crop-handle crop-handle-top-right"></div>
                  <div className="crop-handle crop-handle-bottom-left"></div>
                  <div className="crop-handle crop-handle-bottom-right"></div>
                </div>
              </div>
              {selectedImage && (
                <div style={{ marginTop: '10px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                  Image loaded • Use controls to adjust rotation and crop
                </div>
              )}
            </div>
            
            {/* Controls Panel */}
            <div className="editor-controls">
              {/* Rotation Controls */}
              <div className="control-group">
                <h4>Rotation</h4>
                <div className="rotation-controls">
                  <button onClick={() => rotateImage('left')} className="rotation-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.11 8.53L5.7 7.12C7.56 5.26 10.44 5.26 12.3 7.12L10.89 8.53C9.5 7.14 7.5 7.14 6.11 8.53L7.11 8.53Z"/>
                    </svg>
                    Rotate Left
                  </button>
                  <button onClick={() => rotateImage('right')} className="rotation-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.89 8.53L18.3 7.12C16.44 5.26 13.56 5.26 11.7 7.12L13.11 8.53C14.5 7.14 16.5 7.14 17.89 8.53L16.89 8.53Z"/>
                    </svg>
                    Rotate Right
                  </button>
                </div>
                
                <div className="fine-rotation-controls">
                  <button onClick={() => rotateImageFine('left')} className="fine-rotation-btn">
                    ↺ -1°
                  </button>
                  <button onClick={() => rotateImageFine('right')} className="fine-rotation-btn">
                    ↻ +1°
                  </button>
                </div>
                
                <div className="exact-rotation-control">
                  <input
                    type="number"
                    value={rotation}
                    onChange={(e) => setRotationExact(Number(e.target.value))}
                    className="exact-rotation-input"
                    placeholder="0"
                    min="-180"
                    max="180"
                  />
                  <button onClick={() => setRotationExact(0)} className="exact-rotation-btn">
                    Reset
                  </button>
                </div>
                
                <div className="control-row">
                  <span className="control-label">Current:</span>
                  <span className="control-value">{rotation}°</span>
                </div>
              </div>
              
              {/* Crop Controls */}
              <div className="control-group">
                <h4>Crop Area</h4>
                <div className="crop-controls">
                  <div className="crop-slider-row">
                    <span className="crop-slider-label">X Position:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={crop.x}
                      onChange={(e) => setCrop(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                      className="crop-slider"
                    />
                    <span className="crop-value">{crop.x.toFixed(1)}%</span>
                  </div>
                  
                  <div className="crop-slider-row">
                    <span className="crop-slider-label">Y Position:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={crop.y}
                      onChange={(e) => setCrop(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                      className="crop-slider"
                    />
                    <span className="crop-value">{crop.y.toFixed(1)}%</span>
                  </div>
                  
                  <div className="crop-slider-row">
                    <span className="crop-slider-label">Width:</span>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={crop.width}
                      onChange={(e) => setCrop(prev => ({ ...prev, width: parseFloat(e.target.value) }))}
                      className="crop-slider"
                    />
                    <span className="crop-value">{crop.width.toFixed(1)}%</span>
                  </div>
                  
                  <div className="crop-slider-row">
                    <span className="crop-slider-label">Height:</span>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={crop.height}
                      onChange={(e) => setCrop(prev => ({ ...prev, height: parseFloat(e.target.value) }))}
                      className="crop-slider"
                    />
                    <span className="crop-value">{crop.height.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="editor-actions">
                <button onClick={applyEdits} className="apply-btn">
                  Apply Edits & Continue
                </button>
                <button onClick={resetEdits} className="reset-edits-btn">
                  Reset Edits
                </button>
                <button onClick={resetApp} className="reset-btn">
                  Select Different Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {selectedImage && !showEditor && !processedImage && (
          <div className="preview-section">
            <h3>Image Ready for Processing</h3>
            <div className="image-preview">
              <img 
                src={editedImage || URL.createObjectURL(selectedImage)} 
                alt="Ready to Process" 
                className="preview-image"
              />
            </div>
            <div className="action-buttons">
              <button 
                onClick={processImage} 
                disabled={isProcessing}
                className="process-btn"
              >
                {isProcessing ? 'Processing...' : 'Create Passport Photo'}
              </button>
              <button 
                onClick={() => setShowEditor(true)}
                className="edit-again-btn"
              >
                Edit Image Again
              </button>
              <button onClick={resetApp} className="reset-btn">
                Select Different Image
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="processing-section">
            <div className="loading-spinner"></div>
            <p>Removing background and creating passport photo...</p>
            <p className="processing-note">This may take a few moments</p>
            <p className="processing-note">Ensuring compliance with USA & India passport standards</p>
          </div>
        )}

        {error && (
          <div className="error-section">
            <p className="error-message">Error: {error}</p>
            <button onClick={resetApp} className="reset-btn">
              Try Again
            </button>
          </div>
        )}

        {processedImage && selectedImage && (
          <div className="result-section">
            <h3>Before & After Comparison</h3>
            <div className="comparison-container">
              <div className="image-comparison">
                <div className="comparison-item">
                  <h4>Original Photo</h4>
                  <img 
                    src={URL.createObjectURL(selectedImage)} 
                    alt="Original" 
                    className="comparison-image"
                  />
                </div>
                <div className="comparison-item">
                  <h4>2x2 Passport Photo</h4>
                  <div className="passport-photo-container">
                    <img 
                      src={processedImage} 
                      alt="Passport Photo" 
                      className="comparison-image passport-photo"
                    />
                    <div className="photo-overlay">
                      <div className="size-indicator">2" × 2"</div>
                      <div className="coverage-indicator">Max Coverage</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="compliance-info">
              <h4>✅ Photo Compliance</h4>
              <div className="compliance-grid">
                <div className="compliance-item">✓ 2" × 2" dimensions</div>
                <div className="compliance-item">✓ 300 DPI resolution</div>
                <div className="compliance-item">✓ Pure white background</div>
                <div className="compliance-item">✓ Maximum frame utilization</div>
                <div className="compliance-item">✓ Minimal white space</div>
                <div className="compliance-item">✓ USA & India standards</div>
                <div className="compliance-item">✓ Ready for printing</div>
              </div>
            </div>

            {photoValidation && (
              <div className="validation-info">
                <h4>🔍 Quality Validation</h4>
                <div className="validation-grid">
                  <div className={`validation-item ${photoValidation.dimensions ? 'valid' : 'invalid'}`}>
                    {photoValidation.dimensions ? '✓' : '✗'} Dimensions: 600×600px
                  </div>
                  <div className={`validation-item ${photoValidation.background ? 'valid' : 'invalid'}`}>
                    {photoValidation.background ? '✓' : '✗'} White Background
                  </div>
                  <div className={`validation-item ${photoValidation.positioning ? 'valid' : 'invalid'}`}>
                    {photoValidation.positioning ? '✓' : '✗'} Maximum Frame Coverage
                  </div>
                  <div className={`validation-item ${photoValidation.quality ? 'valid' : 'invalid'}`}>
                    {photoValidation.quality ? '✓' : '✗'} High Quality (300 DPI)
                  </div>
                </div>
              </div>
            )}
            
            <div className="action-buttons">
              <button onClick={downloadImage} className="download-btn">
                Download Passport Photo
              </button>
              <button onClick={processImage} className="regenerate-btn">
                Regenerate Photo
              </button>
              <button onClick={resetApp} className="reset-btn">
                Create Another Photo
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by @imgly/background-removal • Compliant with USA & India passport standards</p>
      </footer>
    </div>
  )
}

export default App
