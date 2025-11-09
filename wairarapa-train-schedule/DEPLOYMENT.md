# Deployment Guide

## Deploy to Vercel

### Method 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project directory**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? Choose your account
   - Link to existing project? `N` (for first deployment)
   - What's your project's name? `wairarapa-train-schedule`
   - In which directory is your code located? `./`

5. **Set Environment Variable**:
   ```bash
   vercel env add REACT_APP_METLINK_API_KEY
   ```
   Then paste your API key when prompted.

6. **Redeploy with environment variable**:
   ```bash
   vercel --prod
   ```

### Method 2: Using Vercel Dashboard

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure Project**:
   - Framework Preset: `Create React App`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

6. **Add Environment Variable**:
   - Go to Project Settings → Environment Variables
   - Add: `REACT_APP_METLINK_API_KEY` = `your_api_key_here`
   - Apply to: Production, Preview, and Development

7. **Deploy**: Click "Deploy"

### Method 3: Git Integration (Automatic)

1. **Connect Repository**:
   - Link your GitHub repo to Vercel
   - Every push to `main` branch auto-deploys

2. **Environment Variables**:
   - Set in Vercel dashboard under Project Settings
   - Available for all deployments

## Important Notes

### Environment Variables
- **Required**: `REACT_APP_METLINK_API_KEY`
- Set in Vercel dashboard or via CLI
- Apply to Production, Preview, and Development environments

### Build Configuration
- Framework: Create React App
- Build Command: `npm run build`
- Output Directory: `build`
- Node Version: 18.x (recommended)

### Domain Configuration
- Vercel provides automatic HTTPS
- Custom domains can be added in Project Settings
- Suggested domain: `wairarapa-trains.vercel.app`

### Performance
- Automatic static optimization
- Global CDN distribution
- Fast builds with caching

## Troubleshooting

### Common Issues
1. **Missing API Key**: Add `REACT_APP_METLINK_API_KEY` to environment variables
2. **Build Fails**: Check Node.js version compatibility
3. **API Errors**: Verify API key is correct and has proper permissions

### Vercel Logs
- View deployment logs in Vercel dashboard
- Use `vercel logs` command for CLI access

## Post-Deployment

### Verify Deployment
1. Visit your Vercel URL
2. Check that train data loads correctly
3. Verify auto-refresh functionality
4. Test on mobile devices

### Monitoring
- Monitor via Vercel Analytics
- Set up alerts for downtime
- Check API usage in Metlink dashboard

## URLs
- **Production**: `https://your-project.vercel.app`
- **Preview**: Auto-generated for each deployment
- **Dashboard**: `https://vercel.com/dashboard`