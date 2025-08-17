# Passport Photo Creator

[![Deploy to GitHub Pages](https://github.com/navneet-g/remvoebg/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/navneet-g/remvoebg/actions)

A React web app that creates 2x2 passport photos meeting **USA and India passport specifications** by removing backgrounds and replacing them with pure white backgrounds.

## ✨ Features

- **Exact Specifications**: 2" × 2" (51mm × 51mm) dimensions
- **High Resolution**: 600 × 600 pixels at 300 DPI for print quality
- **AI Background Removal**: Uses @imgly/background-removal for automatic background removal
- **Image Editing**: Rotate and crop images before processing for better results
- **Proper Positioning**: Optimized head positioning and eye level placement
- **Pure White Background**: Compliant with passport office requirements
- **Side-by-Side Comparison**: View original vs. processed photos
- **Compliance Checker**: Visual indicators for all requirements
- **Drag & Drop Support**: Easy image upload
- **Download Ready**: PNG format ready for printing

## 🎯 Passport Photo Requirements

### Dimensions & Quality
- **Size**: 2" × 2" (51mm × 51mm)
- **Resolution**: 600 × 600 pixels
- **DPI**: 300 dots per inch
- **Format**: PNG with high quality

### Photo Specifications
- **Background**: Pure white (#FFFFFF)
- **Head Size**: 0.8" to 1.3" from chin to crown
- **Frame Utilization**: Subject fills entire frame
- **White Space**: Minimal to none
- **Format**: PNG with high quality
- **Positioning**: Centered with maximum coverage

### Compliance Standards
- ✅ USA Passport Photo Standards
- ✅ India Passport Photo Standards
- ✅ International Passport Requirements
- ✅ Print-Ready Format

## 🖼️ Image Editing Features

### **Rotation Controls**
- **90° Left/Right Rotation**: Perfect for correcting tilted photos
- **1° Fine Tuning**: Precise adjustments for perfect alignment
- **Exact Rotation Input**: Direct input for specific rotation values
- **Visual Preview**: See rotation changes in real-time
- **Degree Display**: Shows current rotation angle
- **Quick Reset**: Reset to 0° with one click

### **Cropping Tools**
- **Interactive Crop Overlay**: Visual crop area selection
- **Precise Controls**: Adjust X, Y, width, and height with sliders
- **Minimum Size Limits**: Ensures crop area is never too small
- **Real-time Preview**: See crop changes immediately

### **Edit Workflow**
1. **Upload Image**: Select or drag & drop your photo
2. **Edit & Adjust**: Rotate and crop as needed
3. **Apply Changes**: Process the edited image
4. **Background Removal**: AI removes background automatically
5. **Final Result**: Perfect 2x2 passport photo

## 🛠️ Tech Stack

- **React 18** + **TypeScript** for type safety
- **Vite** for fast development and building
- **@imgly/background-removal** for AI-powered background removal
- **Canvas API** for precise image processing and resizing
- **Responsive Design** for all devices

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

## 📱 Usage

1. **Upload Image**: Click or drag & drop any image
2. **Edit Image**: Rotate and crop for optimal positioning
3. **Process Photo**: Click "Apply Edits & Continue" to remove background
4. **Review Results**: Compare original vs. processed photos side by side
5. **Download**: Save your compliant 2x2 passport photo
6. **Create More**: Reset and create additional photos

## 🎨 UI Features

- **Modern Design**: Beautiful gradient theme with glassmorphism effects
- **Interactive Editor**: Full-featured image editing interface
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Visual Feedback**: Loading states, progress indicators, and animations
- **Compliance Display**: Clear indicators showing all requirements are met
- **Error Handling**: User-friendly error messages and recovery options

## 🔧 Development

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code quality and consistency
- **Hot Reload**: Instant updates during development
- **Production Ready**: Optimized build for deployment

## 📋 Build

To build for production:
```bash
npm run build
```

## 🌍 International Compliance

This app is specifically designed to meet:
- **United States** passport photo requirements
- **India** passport photo specifications
- **International** passport standards
- **Print shop** quality requirements

## 📸 Photo Guidelines

For best results:
- Use a clear, high-resolution photo
- Ensure good lighting and contrast
- Face should be clearly visible
- Neutral expression recommended
- No glasses or head coverings (unless for religious reasons)
- **Use the editing tools** to rotate and crop for optimal positioning

## 🎯 Image Editing Tips

### **Rotation**
- Use rotation to straighten tilted photos
- Ensure eyes are level for professional appearance
- 90° increments provide clean, crisp results

### **Cropping**
- Focus on the head and upper shoulders
- Leave minimal space around the subject
- Use the crop overlay to visualize the final result
- Adjust crop area to eliminate unwanted elements

---

**Note**: This app creates photos that meet official passport requirements, but final acceptance is at the discretion of passport authorities.