# 🚀 GitHub Pages Deployment Guide

This guide will help you deploy your Passport Photo Creator app to GitHub Pages.

## 📋 Prerequisites

- Your repository is hosted on GitHub
- You have push access to the repository
- Node.js and npm are installed locally

## 🎯 Option 1: GitHub Actions (Recommended)

### **Step 1: Enable GitHub Pages**

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

### **Step 2: Push the Workflow**

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`. Just push your changes:

```bash
git add .
git commit -m "Add GitHub Pages deployment workflow"
git push origin main
```

### **Step 3: Monitor Deployment**

1. Go to **Actions** tab in your repository
2. You'll see the "Deploy to GitHub Pages" workflow running
3. Wait for it to complete (usually 2-3 minutes)
4. Your app will be available at: `https://navneet-g.github.io/remvoebg/`

## 🛠️ Option 2: Manual Deployment

### **Step 1: Build Locally**

```bash
npm run build
```

### **Step 2: Deploy to GitHub Pages**

```bash
npm run deploy
```

### **Step 3: Configure GitHub Pages**

1. Go to repository **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Select **gh-pages** branch
4. Click **Save**

## 🔧 Configuration Details

### **Vite Configuration**

The `vite.config.ts` is configured with:
- **Base Path**: `/remvoebg/` for production (matches your repository name)
- **Build Output**: `dist` directory
- **Asset Optimization**: Disabled manual chunks for better compatibility

### **Package.json Scripts**

- `npm run build`: Builds the app for production
- `npm run deploy`: Builds and deploys to GitHub Pages
- `npm run preview`: Preview the production build locally

## 🌐 Custom Domain (Optional)

If you want to use a custom domain:

1. Add your domain to the workflow file:
   ```yaml
   cname: yourdomain.com
   ```

2. Create a `CNAME` file in the `public` folder:
   ```
   yourdomain.com
   ```

3. Configure DNS settings with your domain provider

## 📱 Testing Deployment

### **Local Testing**

```bash
npm run build
npm run preview
```

### **Production Testing**

After deployment, test:
- [ ] Image upload works
- [ ] Rotation controls function
- [ ] Cropping tools work
- [ ] Background removal processes
- [ ] Download functionality works
- [ ] Mobile responsiveness

## 🚨 Troubleshooting

### **Common Issues**

1. **404 Errors**: Ensure base path in `vite.config.ts` matches repository name
2. **Assets Not Loading**: Check if GitHub Actions completed successfully
3. **Build Failures**: Verify all dependencies are in `package.json`

### **Debug Steps**

1. Check **Actions** tab for build errors
2. Verify **Pages** settings in repository
3. Check browser console for JavaScript errors
4. Ensure repository is public (or you have GitHub Pro for private repos)

## 🔄 Updating Your App

### **Automatic Updates**

With GitHub Actions, every push to `main` branch automatically:
1. Builds your app
2. Runs tests
3. Deploys to GitHub Pages

### **Manual Updates**

If you prefer manual control:
```bash
git add .
git commit -m "Update app"
git push origin main
npm run deploy
```

## 📊 Performance Tips

1. **Image Optimization**: Use compressed images for faster loading
2. **Bundle Size**: Monitor build output size
3. **Caching**: GitHub Pages provides CDN caching
4. **Mobile**: Test on various devices and screen sizes

## 🎉 Success!

Once deployed, your passport photo creator will be available at:
**`https://navneet-g.github.io/remvoebg/`**

Share this URL with users to access your app from anywhere!

---

**Note**: GitHub Pages is free for public repositories. For private repositories, you'll need GitHub Pro or Enterprise.
