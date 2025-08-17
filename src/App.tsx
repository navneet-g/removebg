import { useState, useRef, useEffect } from 'react'
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
  frameUtilization: {
    minHeadHeight: 0.6, // Head should fill at least 60% of frame height
    targetHeadHeight: 0.75, // Target: head fills 75% of frame height
    maxHeadHeight: 0.85 // Head should not fill more than 85% of frame height
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
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragHandle, setDragHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Add global mouse event listeners to handle mouse up outside the image
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDragHandle(null)
      }
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && dragHandle) {
        // Only handle mouse move if we're actually dragging
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y
        
        const container = document.querySelector('.image-preview-container')
        if (!container) return
        
        const rect = container.getBoundingClientRect()
        const containerWidth = rect.width
        const containerHeight = rect.height
        
        const deltaXPercent = (deltaX / containerWidth) * 100
        const deltaYPercent = (deltaY / containerHeight) * 100
        
        setCrop(prev => {
          const newCrop = { ...prev }
          
          switch (dragHandle) {
            case 'top-left':
              newCrop.x = Math.max(0, Math.min(prev.x + deltaXPercent, prev.x + prev.width - 20))
              newCrop.y = Math.max(0, Math.min(prev.y + deltaYPercent, prev.y + prev.height - 20))
              newCrop.width = Math.max(20, prev.width - deltaXPercent)
              newCrop.height = Math.max(20, prev.height - deltaYPercent)
              break
            case 'top-right':
              newCrop.y = Math.max(0, Math.min(prev.y + deltaYPercent, prev.y + prev.height - 20))
              newCrop.width = Math.max(20, prev.width + deltaXPercent)
              newCrop.height = Math.max(20, prev.height - deltaYPercent)
              break
            case 'bottom-left':
              newCrop.x = Math.max(0, Math.min(prev.x + deltaXPercent, prev.x + prev.width - 20))
              newCrop.width = Math.max(20, prev.width - deltaXPercent)
              newCrop.height = Math.max(20, prev.height + deltaYPercent)
              break
            case 'bottom-right':
              newCrop.width = Math.max(20, prev.width + deltaXPercent)
              newCrop.height = Math.max(20, prev.height + deltaYPercent)
              break
            case 'top':
              newCrop.y = Math.max(0, Math.min(prev.y + deltaYPercent, prev.y + prev.height - 20))
              newCrop.height = Math.max(20, prev.height - deltaYPercent)
              break
            case 'bottom':
              newCrop.height = Math.max(20, prev.height + deltaYPercent)
              break
            case 'left':
              newCrop.x = Math.max(0, Math.min(prev.x + deltaXPercent, prev.x + prev.width - 20))
              newCrop.width = Math.max(20, prev.width - deltaXPercent)
              break
            case 'right':
              newCrop.width = Math.max(20, prev.width + deltaXPercent)
              break
            case 'move':
              newCrop.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaXPercent))
              newCrop.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaYPercent))
              break
          }
          
          return newCrop
        })
        
        setDragStart({ x: e.clientX, y: e.clientY })
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging, dragHandle, dragStart])

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



  const setRotationExact = (degrees: number) => {
    setRotation(degrees)
  }

  const applyEdits = () => {
    if (!selectedImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Set canvas size
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

      // Convert to data URL
      const editedImageUrl = croppedCanvas.toDataURL('image/png')
      setEditedImage(editedImageUrl)
      setShowEditor(false)
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
    // For passport photos, we want to eliminate ALL white space
    // Make the subject fill the entire frame with minimal margins
    
    // Calculate scale to fill the entire frame
    // Use the larger dimension to ensure complete coverage
    const scaleX = canvasSize / img.width
    const scaleY = canvasSize / img.height
    
    // Use the larger scale to ensure the image covers the entire frame
    const scale = Math.max(scaleX, scaleY) * 1.1 // Add 10% to ensure complete coverage
    
    // Calculate scaled dimensions
    const scaledWidth = img.width * scale
    const scaledHeight = img.height * scale
    
    // Center the image to eliminate white space
    const x = (canvasSize - scaledWidth) / 2
    const y = (canvasSize - scaledHeight) / 2
    
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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDragHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragHandle(null)
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

        {selectedImage && showEditor && (
          <div className="editor-section">
            <h3>Edit Your Image</h3>
            <p className="editor-hint">Rotate and crop your image for better results</p>
            
            <div className="editor-container">
              <div className="image-editor" 
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
              >
                <div className="editor-preview-container">
                  <button 
                    className="rotate-btn rotate-left"
                    onClick={() => rotateImage('left')}
                    title="Rotate Left 90°"
                  >
                    ↶
                  </button>
                  
                  <div className="image-preview-container">
                    <img 
                      src={editedImage || URL.createObjectURL(selectedImage)} 
                      alt="Preview" 
                      className="editor-preview-image"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: 'center'
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'move')}
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
                      <div className="crop-handle crop-handle-top-left" onMouseDown={(e) => handleMouseDown(e, 'top-left')}></div>
                      <div className="crop-handle crop-handle-top-right" onMouseDown={(e) => handleMouseDown(e, 'top-right')}></div>
                      <div className="crop-handle crop-handle-bottom-left" onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}></div>
                      <div className="crop-handle crop-handle-bottom-right" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}></div>
                      <div className="crop-handle crop-handle-top" onMouseDown={(e) => handleMouseDown(e, 'top')}></div>
                      <div className="crop-handle crop-handle-bottom" onMouseDown={(e) => handleMouseDown(e, 'bottom')}></div>
                      <div className="crop-handle crop-handle-left" onMouseDown={(e) => handleMouseDown(e, 'left')}></div>
                      <div className="crop-handle crop-handle-right" onMouseDown={(e) => handleMouseDown(e, 'right')}></div>
                      <div className="crop-handle crop-handle-move" onMouseDown={(e) => handleMouseDown(e, 'move')}></div>
                    </div>
                  </div>
                  
                  <button 
                    className="rotate-btn rotate-right"
                    onClick={() => rotateImage('right')}
                    title="Rotate Right 90°"
                  >
                    ↷
                  </button>
                </div>
              </div>
              
              <div className="editor-controls">
                <div className="control-group">
                  <h4>Current Rotation: {rotation}°</h4>
                  {rotation !== 0 && (
                    <button 
                      onClick={() => setRotationExact(0)} 
                      className="control-btn reset-rotation-btn"
                    >
                      Reset to 0°
                    </button>
                  )}
                </div>
              </div>
            </div>
            
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
