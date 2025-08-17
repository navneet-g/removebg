import { useState, useRef, useEffect } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/swiper-bundle.css'
import { 
  Button, 
  Typography, 
  Box, 
  Paper, 
  Alert,
  Container,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  CardActions,
  IconButton
} from '@mui/material'
import { 
  PhotoCamera, 
  Download, 
  Refresh, 
  Add,
  Clear,
  Image
} from '@mui/icons-material'
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
  const [printablePage, setPrintablePage] = useState<string | null>(null)
  const [isGeneratingPrintable, setIsGeneratingPrintable] = useState(false)

  const [showEditor, setShowEditor] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragHandle, setDragHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showCropAndRotate, setShowCropAndRotate] = useState(false)
  const [changeBackgroundColor, setChangeBackgroundColor] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState('#F5F5F5')
  const [currentView, setCurrentView] = useState<'upload' | 'editor' | 'result'>('upload')
  const [photoHistory, setPhotoHistory] = useState<Array<{
    id: string
    name: string
    timestamp: number
    originalImage: string
    imageData: string
    processedImage: string
    settings: {
      rotation: number
      crop: { x: number; y: number; width: number; height: number }
      changeBackgroundColor: boolean
      backgroundColor: string
    }
  }>>([])


  // Handle browser navigation and URL management
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const view = urlParams.get('view') as 'upload' | 'editor' | 'result' | null
      
      if (view && view !== currentView) {
        setCurrentView(view)
        // Restore the appropriate state based on the view
        if (view === 'upload') {
          resetApp()
        } else if (view === 'editor' && selectedImage) {
          setShowEditor(true)
        } else if (view === 'result' && processedImage) {
          setShowEditor(false)
        }
      }
    }

    // Listen for browser back/forward button clicks
    window.addEventListener('popstate', handlePopState)
    
    // Set initial view based on URL
    const urlParams = new URLSearchParams(window.location.search)
    const initialView = urlParams.get('view') as 'upload' | 'editor' | 'result' | null
    if (initialView) {
      setCurrentView(initialView)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [currentView, selectedImage, processedImage])

  // Load photo history from local storage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('photoHistory')
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory)
        setPhotoHistory(parsedHistory)
      }
    } catch (error) {
      console.warn('Failed to load photo history from local storage:', error)
    }
  }, [])

  // Helper function to update URL and browser history
  const updateView = (view: 'upload' | 'editor' | 'result') => {
    setCurrentView(view)
    const url = new URL(window.location.href)
    url.searchParams.set('view', view)
    window.history.pushState({ view }, '', url.toString())
  }

  // Helper function to save photo to history
  const saveToHistory = async (imageData: string, processedImage: string) => {
    if (!selectedImage) return

    // Convert original file to data URL for storage
    const originalImageData = await fileToDataURL(selectedImage)

    const newPhoto = {
      id: Date.now().toString(),
      name: selectedImage.name,
      timestamp: Date.now(),
      originalImage: originalImageData,
      imageData,
      processedImage,
      settings: {
        rotation,
        crop,
        changeBackgroundColor,
        backgroundColor
      }
    }

    setPhotoHistory(prev => {
      const updatedHistory = [newPhoto, ...prev.slice(0, 9)] // Keep only last 10
      // Save to local storage
      try {
        localStorage.setItem('photoHistory', JSON.stringify(updatedHistory))
      } catch (error) {
        console.warn('Failed to save photo history to local storage:', error)
      }
      return updatedHistory
    })
  }

  // Add global mouse and touch event listeners to handle interactions outside the image
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDragHandle(null)
      }
    }

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false)
        setDragHandle(null)
      }
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && dragHandle) {
        handleMove(e.clientX, e.clientY)
      }
    }

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging && dragHandle && e.touches.length > 0) {
        e.preventDefault() // Prevent scrolling while dragging
        const touch = e.touches[0]
        handleMove(touch.clientX, touch.clientY)
      }
    }

    const handleMove = (clientX: number, clientY: number) => {
      const deltaX = clientX - dragStart.x
      const deltaY = clientY - dragStart.y
      
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
      
      setDragStart({ x: clientX, y: clientY })
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false })
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
      document.removeEventListener('touchmove', handleGlobalTouchMove)
    }
  }, [isDragging, dragHandle, dragStart])



  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setEditedImage(null)
      setProcessedImage(null)
      setError(null)
      setShowEditor(true)
      setRotation(0)
      setCrop({ x: 0, y: 0, width: 100, height: 100 })
      updateView('editor')
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
        setShowEditor(true)
        setRotation(0)
        setCrop({ x: 0, y: 0, width: 100, height: 100 })
        updateView('editor')
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



  const resetEdits = () => {
    setRotation(0)
    setCrop({ x: 0, y: 0, width: 100, height: 100 })
    setChangeBackgroundColor(false)
    setBackgroundColor('#F5F5F5')
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
    
    if (changeBackgroundColor) {
      // Change background - fill with selected background color
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, size, size)
    } else {
      // Keep original background - don't fill anything, let the image show through
      // The canvas will be transparent by default
    }
    
    // Calculate optimal scaling and positioning for passport photo requirements
    const { scale, x, y } = calculateOptimalPosition(img, size)
    
    // Draw the processed image with proper positioning
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
    
    return canvas.toDataURL('image/png', 1.0)
  }

  const generatePrintablePage = async (passportPhotoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // 4x6 inch page at 300 DPI = 1200x1800 pixels
      const pageWidth = 4 * 300  // 1200 pixels
      const pageHeight = 6 * 300 // 1800 pixels
      
      canvas.width = pageWidth
      canvas.height = pageHeight
      
      // Fill with pure white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, pageWidth, pageHeight)
      
      // Load the passport photo
      const img = new window.Image()
      img.onload = () => {
        try {
          // Calculate photo dimensions for the grid
          // We want 2 columns and 3 rows = 6 photos total
          const photoSize = 2 * 300 // 2 inches * 300 DPI = 600 pixels
          
          // Calculate grid layout - no spacing between photos
          // Total width: 2 photos side by side
          // Total height: 3 photos stacked
          const gridWidth = 2 * photoSize
          const gridHeight = 3 * photoSize
          
          // Center the grid on the page
          const gridStartX = (pageWidth - gridWidth) / 2
          const gridStartY = (pageHeight - gridHeight) / 2
          
          // Draw 6 photos in a 2x3 grid
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
              const x = gridStartX + (col * photoSize)
              const y = gridStartY + (row * photoSize)
              
              ctx.drawImage(img, x, y, photoSize, photoSize)
            }
          }
          
          // Draw cut lines between photos
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5]) // Dashed line for better visibility
          
          // Vertical cut line between columns (exactly between the two columns)
          const verticalCutX = gridStartX + photoSize
          ctx.beginPath()
          ctx.moveTo(verticalCutX, gridStartY)
          ctx.lineTo(verticalCutX, gridStartY + gridHeight)
          ctx.stroke()
          
          // Horizontal cut lines between rows (exactly between each row)
          for (let row = 1; row < 3; row++) {
            const horizontalCutY = gridStartY + (row * photoSize)
            ctx.beginPath()
            ctx.moveTo(gridStartX, horizontalCutY)
            ctx.lineTo(gridStartX + gridWidth, horizontalCutY)
            ctx.stroke()
          }
          
          resolve(canvas.toDataURL('image/png', 1.0))
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load passport photo'))
      }
      
      img.src = passportPhotoUrl
    })
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

    try {
      // Apply edits inline if we're in the editor
      let imageToProcess: string
      
      if (showEditor) {
        // Apply edits directly from the editor
        if (!canvasRef.current) {
          throw new Error('Canvas not available')
        }
        
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Failed to get canvas context')
        }

        const img = new window.Image()
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

          // Convert to data URL and continue processing
          const editedImageUrl = croppedCanvas.toDataURL('image/png')
          continueProcessing(editedImageUrl)
        }

        img.src = URL.createObjectURL(selectedImage)
        return // Exit early, processing will continue in the onload callback
      } else {
        // Use existing edited image or original
        imageToProcess = editedImage || URL.createObjectURL(selectedImage)
        continueProcessing(imageToProcess)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
      setIsProcessing(false)
    }
  }

  const continueProcessing = async (imageUrl: string) => {
    try {
      let processedBlob: Blob
      
      if (changeBackgroundColor) {
        // Remove background first, then apply custom color
        processedBlob = await removeBackground(imageUrl)
      } else {
        // Keep original background - convert imageUrl to blob
        const response = await fetch(imageUrl)
        processedBlob = await response.blob()
      }
      
      // Load the processed image
      const img = new window.Image()
      img.onload = () => {
        try {
          // Create passport photo with exact specifications
          const dataUrl = createPassportPhoto(img)
          setProcessedImage(dataUrl)
          setIsProcessing(false)
          setShowEditor(false) // Close editor after successful processing
          // Save to history (fire and forget)
          saveToHistory(imageUrl, dataUrl).catch(err => 
            console.warn('Failed to save to history:', err)
          )
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
    link.download = 'passport-photo-2x2.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleGeneratePrintable = async () => {
    if (!processedImage) return
    
    setIsGeneratingPrintable(true)
    setError(null)
    
    try {
      const printablePageUrl = await generatePrintablePage(processedImage)
      setPrintablePage(printablePageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate printable page')
    } finally {
      setIsGeneratingPrintable(false)
    }
  }

  const downloadPrintablePage = () => {
    if (!printablePage) return
    
    const link = document.createElement('a')
    link.href = printablePage
    link.download = 'passport-photos-4x6-printable.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetApp = () => {
    setSelectedImage(null)
    setEditedImage(null)
    setProcessedImage(null)
    setError(null)
    setShowEditor(false)
    setRotation(0)
    setCrop({ x: 0, y: 0, width: 100, height: 100 })
    setPrintablePage(null)
    setChangeBackgroundColor(false)
    setBackgroundColor('#F5F5F5')
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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.touches.length > 0) {
      setIsDragging(true)
      setDragHandle(handle)
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragHandle(null)
  }

  // Helper function to load photo from history
  const loadFromHistory = (photo: typeof photoHistory[0]) => {
    // Create a file from the original image data
    const originalBlob = dataURLtoBlob(photo.originalImage)
    setSelectedImage(new File([originalBlob], photo.name, { type: 'image/png' }))
    
    // Set the edited image (with crop/rotation applied)
    setEditedImage(photo.imageData)
    
    // Set the final processed image
    setProcessedImage(photo.processedImage)
    
    // Restore all the settings
    setRotation(photo.settings.rotation)
    setCrop(photo.settings.crop)
    setChangeBackgroundColor(photo.settings.changeBackgroundColor)
    setBackgroundColor(photo.settings.backgroundColor)
    
    setShowEditor(false)
    setError(null)
    updateView('result')
  }

  // Helper function to convert data URL to Blob
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  // Helper function to convert File to Data URL
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }

  // Helper function to remove photo from history
  const removeFromHistory = (photoId: string) => {
    setPhotoHistory(prev => {
      const updatedHistory = prev.filter(photo => photo.id !== photoId)
      // Update local storage
      try {
        localStorage.setItem('photoHistory', JSON.stringify(updatedHistory))
      } catch (error) {
        console.warn('Failed to update photo history in local storage:', error)
      }
      return updatedHistory
    })
  }

  // Helper function to clear all photo history
  const clearPhotoHistory = () => {
    setPhotoHistory([])
    try {
      localStorage.removeItem('photoHistory')
    } catch (error) {
      console.warn('Failed to clear photo history from local storage:', error)
    }
  }



  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #533483 100%)' }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'center', py: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'white' }}>
            Passport Photo Creator
          </Typography>
        </Toolbar>
        <Toolbar sx={{ justifyContent: 'center', pt: 0, pb: 1 }}>
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Create 2x2 passport photos
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Privacy Notice */}
        <Alert 
          severity="info" 
          sx={{ 
            mb: 2, 
            width: '100%',
            maxWidth: 600,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: 'rgba(255, 255, 255, 0.9)',
            '& .MuiAlert-icon': { color: 'rgba(34, 197, 94, 0.8)' }
          }}
        >
          <strong>Privacy First:</strong> All photos are processed locally in your browser and stored only on your device. Nothing is uploaded to our servers.
        </Alert>
        
        {!selectedImage && !processedImage && (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                textAlign: 'center',
                width: '100%',
                maxWidth: 600,
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                },
                ...(isDragOver && {
                  border: '2px solid rgba(99, 102, 241, 0.8)',
                  background: 'rgba(99, 102, 241, 0.1)'
                })
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <PhotoCamera sx={{ fontSize: 60, mb: 2, color: 'rgba(255, 255, 255, 0.8)' }} />
              <Typography variant="h6" sx={{ mb: 1.5, color: 'white' }}>
                Ready to create your passport photo?
              </Typography>
              <Button
                variant="contained"
                size="medium"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  mb: 1.5,
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2
                }}
              >
                Select a Photo
              </Button>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                or drag and drop your image here
              </Typography>
              {isDragOver && (
                <Typography variant="body1" sx={{ color: '#6366f1', fontWeight: 600, mt: 1 }}>
                  Drop your image here!
                </Typography>
              )}
            </Paper>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            
            {/* Photo History Section */}
            {photoHistory.length > 0 && (
              <Box sx={{ mt: 4, width: '100%', maxWidth: 800 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ color: '#00d4aa', fontWeight: 600 }}>
                    Recent Photos
                  </Typography>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Clear />}
                    onClick={clearPhotoHistory}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1
                    }}
                  >
                    Clear All
                  </Button>
                </Box>

                <Swiper
                  modules={[Navigation, Pagination]}
                  spaceBetween={20}
                  slidesPerView={1}
                  navigation={true}
                  pagination={{ clickable: true }}
                  breakpoints={{
                    640: { slidesPerView: 2 },
                    768: { slidesPerView: 3 },
                    1024: { slidesPerView: 4 },
                  }}
                  style={{
                    padding: '0 20px'
                  }}
                >
                  {photoHistory.map((photo) => (
                    <SwiperSlide key={photo.id}>
                      <Card 
                        sx={{ 
                          background: 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <CardContent sx={{ p: 2, flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 1, textAlign: 'center' }}>
                                Original
                              </Typography>
                              <Box
                                component="img"
                                src={photo.originalImage}
                                alt={`Original ${photo.name}`}
                                sx={{
                                  width: '100%',
                                  height: 80,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                              />
                            </Box>
                            <Box sx={{ flex: 1, position: 'relative' }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 1, textAlign: 'center' }}>
                                Processed
                              </Typography>
                              <Box
                                component="img"
                                src={photo.processedImage}
                                alt={`Processed ${photo.name}`}
                                sx={{
                                  width: '100%',
                                  height: 80,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  background: 'rgba(0, 0, 0, 0.7)',
                                  color: 'white',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.7rem',
                                  fontWeight: 500
                                }}
                              >
                                Processed
                              </Box>
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ color: 'white', mt: 2, fontWeight: 500, textAlign: 'center' }}>
                            {photo.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', textAlign: 'center' }}>
                            {new Date(photo.timestamp).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Image />}
                            onClick={() => loadFromHistory(photo)}
                            sx={{
                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              mr: 1,
                              borderRadius: 2
                            }}
                          >
                            Load
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => removeFromHistory(photo.id)}
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              '&:hover': {
                                color: 'white',
                                background: 'rgba(255, 255, 255, 0.1)'
                              }
                            }}
                          >
                            <Clear />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </Box>
            )}
          </Box>
        )}

        {selectedImage && showEditor && (
          <div className="editor-section">
            <div className="editor-header">
              <div className="advanced-mode-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showCropAndRotate}
                    onChange={(e) => setShowCropAndRotate(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">Crop and Rotate</span>
              </div>
              
              <div className="advanced-mode-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={changeBackgroundColor}
                    onChange={(e) => setChangeBackgroundColor(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">Change Background Color</span>
                
                {changeBackgroundColor && (
                  <>
                    <label className="color-picker-label">Color:</label>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="color-picker"
                      title="Choose background color"
                    />
                    <button
                      onClick={() => setBackgroundColor('#F5F5F5')}
                      className="reset-color-btn"
                      title="Reset to off-white"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="editor-container">
              <div className="image-editor" 
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  className="editor-canvas"
                  style={{ display: 'none' }}
                />
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
                    onTouchStart={(e) => handleTouchStart(e, 'move')}
                  />
                  {showCropAndRotate && (
                    <div 
                      className="crop-overlay"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.width}%`,
                        height: `${crop.height}%`
                      }}
                    >
                      <div className="crop-handle crop-handle-top-left" onMouseDown={(e) => handleMouseDown(e, 'top-left')} onTouchStart={(e) => handleTouchStart(e, 'top-left')}></div>
                      <div className="crop-handle crop-handle-top-right" onMouseDown={(e) => handleMouseDown(e, 'top-right')} onTouchStart={(e) => handleTouchStart(e, 'top-right')}></div>
                      <div className="crop-handle crop-handle-bottom-left" onMouseDown={(e) => handleMouseDown(e, 'bottom-left')} onTouchStart={(e) => handleTouchStart(e, 'bottom-left')}></div>
                      <div className="crop-handle crop-handle-bottom-right" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} onTouchStart={(e) => handleTouchStart(e, 'bottom-right')}></div>
                      <div className="crop-handle crop-handle-top" onMouseDown={(e) => handleMouseDown(e, 'top')} onTouchStart={(e) => handleTouchStart(e, 'top')}></div>
                      <div className="crop-handle crop-handle-bottom" onMouseDown={(e) => handleMouseDown(e, 'bottom')} onTouchStart={(e) => handleTouchStart(e, 'bottom')}></div>
                      <div className="crop-handle crop-handle-left" onMouseDown={(e) => handleMouseDown(e, 'left')} onTouchStart={(e) => handleTouchStart(e, 'left')}></div>
                      <div className="crop-handle crop-handle-right" onMouseDown={(e) => handleMouseDown(e, 'right')} onTouchStart={(e) => handleTouchStart(e, 'right')}></div>
                      <div className="crop-handle crop-handle-move" onMouseDown={(e) => handleMouseDown(e, 'move')} onTouchStart={(e) => handleTouchStart(e, 'move')}></div>
                    </div>
                  )}
                </div>
              </div>
              
              {showCropAndRotate && (
                <div className="editor-controls">
                <div className="control-group">
                  <h4>Rotation</h4>
                  <div className="rotation-controls">
                    <button 
                      onClick={() => rotateImage('left')} 
                      className="control-btn rotation-btn"
                    >
                      ↶ Rotate Left 90°
                    </button>
                    <button 
                      onClick={() => rotateImage('right')} 
                      className="control-btn rotation-btn"
                    >
                      ↷ Rotate Right 90°
                    </button>
                  </div>
                  
                  <div className="fine-rotation-controls">
                    <h5>Fine Tune</h5>
                    <div className="fine-rotation-buttons">
                      <button 
                        onClick={() => rotateImageFine('left')} 
                        className="control-btn fine-rotation-btn"
                      >
                        ↶ -1°
                      </button>
                      <button 
                        onClick={() => rotateImageFine('right')} 
                        className="control-btn fine-rotation-btn"
                      >
                        ↷ +1°
                      </button>
                    </div>
                  </div>
                  
                  <div className="rotation-input">
                    <label>
                      Exact Rotation:
                      <div className="rotation-input-group">
                        <input
                          type="number"
                          min="-360"
                          max="360"
                          step="1"
                          value={rotation}
                          onChange={(e) => setRotationExact(parseFloat(e.target.value) || 0)}
                          className="rotation-number-input"
                        />
                        <span className="degree-symbol">°</span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="rotation-display">
                    Current: {rotation}°
                  </div>
                  
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
              )}
            </div>
            
            <div className="editor-actions">
              <button 
                onClick={processImage} 
                disabled={isProcessing}
                className="create-passport-btn"
              >
                {isProcessing ? (
                  <>
                    <div className="button-spinner"></div>
                    Creating Passport Photo...
                  </>
                ) : (
                  'Create Passport Photo'
                )}
              </button>
              {(rotation !== 0 || crop.x !== 0 || crop.y !== 0 || crop.width !== 100 || crop.height !== 100 || changeBackgroundColor || backgroundColor !== '#F5F5F5') && (
                <button onClick={resetEdits} className="reset-edits-btn">
                  Reset Edits
                </button>
              )}
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
                {isProcessing ? (
                  <>
                    <div className="button-spinner"></div>
                    Creating Passport Photo...
                  </>
                ) : (
                  'Create Passport Photo'
                )}
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

                  </div>
                </div>
              </div>
            </div>
            



            
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={downloadImage}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Download Photo
          </Button>
          <Button
            variant="contained"
            onClick={handleGeneratePrintable}
            disabled={isGeneratingPrintable}
            sx={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            {isGeneratingPrintable ? 'Generating...' : 'Generate Printable Page'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={processImage}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Regenerate
          </Button>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={resetApp}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'rgba(255, 255, 255, 0.9)',
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Create Another
          </Button>
        </Box>
          </div>
        )}

        {printablePage && (
          <div className="printable-section">
            <h3>4x6 Printable Page</h3>
            <p className="printable-description">
              This page contains 6 passport photos arranged in a 2x3 grid, perfect for printing on 4x6 inch photo paper. 
              <strong>Thin black dashed lines</strong> are included to guide cutting between photos.
            </p>
            <div className="printable-preview">
              <img 
                src={printablePage} 
                alt="Printable 4x6 Page" 
                className="printable-page-image"
              />
            </div>
            <div className="printable-actions">
              <button onClick={downloadPrintablePage} className="download-printable-btn">
                Download Printable Page
              </button>
              <button onClick={() => setPrintablePage(null)} className="close-printable-btn">
                Close
              </button>
            </div>
          </div>
        )}
      </Container>
    </Box>
  )
}

export default App
