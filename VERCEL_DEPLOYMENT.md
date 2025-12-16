# Vercel Deployment Guide

This guide will help you deploy the Gurudatta trader's admin panel to Vercel.

## Prerequisites

- GitHub account with the repository pushed
- Vercel account (sign up at https://vercel.com)
- MongoDB Atlas cluster set up and accessible

## Step 1: Push Code to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository: `shubham0454/Gurudatta-trader-s`
3. Vercel will auto-detect Next.js

## Step 3: Configure Environment Variables

In Vercel project settings, add these environment variables:

### Required Environment Variables:

```
DATABASE_URL=mongodb+srv://Akshaya_Dairy_Feed_Database:YOUR_PASSWORD@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0
```

**Important**: Replace `YOUR_PASSWORD` with your actual MongoDB Atlas password.

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important**: Use a strong, random string for production (at least 32 characters).

```
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

**Important**: Replace with your actual Vercel deployment URL after first deployment.

## Step 4: Build Settings

Vercel will automatically:
- Run `npm install` (which includes `postinstall` script that runs `prisma generate`)
- Run `npm run build` (which includes `prisma generate && next build`)

## Step 5: Deploy

Click "Deploy" and wait for the build to complete.

## Step 6: Initialize Database

After deployment, you need to push the Prisma schema to MongoDB:

### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link your project:
   ```bash
   vercel link
   ```

4. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```

5. Push Prisma schema:
   ```bash
   npm run db:push
   ```

6. Seed admin user:
   ```bash
   npm run seed:admin
   ```

### Option 2: Using MongoDB Atlas Directly

1. Go to MongoDB Atlas Dashboard
2. Use MongoDB Compass or Atlas UI to verify collections
3. Manually create admin user if needed

## Step 7: Verify Deployment

1. Visit your Vercel deployment URL
2. Login with admin credentials:
   - Mobile: `1234567890` (or the one you seeded)
   - Password: `admin123`

## Troubleshooting

### Build Fails with Prisma Error

**Error**: `Prisma Client has not been generated yet`

**Solution**: 
- The `postinstall` script should handle this automatically
- If it fails, ensure `DATABASE_URL` is set correctly in Vercel environment variables
- Check build logs in Vercel dashboard

### Database Connection Error

**Error**: `P1001: Can't reach database server`

**Solution**:
1. Check MongoDB Atlas Network Access:
   - Go to MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` (allow all IPs) for development
   - Or add Vercel's IP ranges

2. Verify `DATABASE_URL` format:
   - Must include database name: `/akshaya_dairy`
   - Password must be URL-encoded if it contains special characters

### Environment Variables Not Working

**Solution**:
1. Go to Vercel Project Settings → Environment Variables
2. Ensure variables are added for all environments (Production, Preview, Development)
3. Redeploy after adding/changing variables

### Prisma Client Generation Fails

**Solution**:
1. Check that `prisma` is in `devDependencies` (it is)
2. Ensure `postinstall` script runs: `"postinstall": "prisma generate"`
3. Check build logs for specific Prisma errors

## Post-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Admin user seeded (`npm run seed:admin`)
- [ ] Can login to admin panel
- [ ] MongoDB Atlas network access configured
- [ ] Custom domain configured (optional)

## Important Notes

1. **Never commit `.env` file** - Always use Vercel environment variables
2. **Change default admin password** after first login
3. **Use strong JWT_SECRET** in production
4. **Monitor MongoDB Atlas** usage and costs
5. **Set up MongoDB Atlas backups** for production

## Support

If you encounter issues:
1. Check Vercel build logs
2. Check MongoDB Atlas logs
3. Verify all environment variables are set
4. Ensure MongoDB Atlas cluster is running

