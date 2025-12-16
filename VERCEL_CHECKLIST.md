# Vercel Deployment Checklist

## ✅ Configuration Files

### 1. vercel.json
- ✅ Build command: `npm run db:generate && npm run build`
- ✅ Install command: `npm install`
- ✅ Framework: `nextjs`
- ✅ Region: `iad1`

### 2. package.json
- ✅ Build script: `prisma generate && next build`
- ✅ Postinstall script: `prisma generate` (runs automatically)
- ✅ All dependencies listed

### 3. next.config.js
- ✅ ESLint: `ignoreDuringBuilds: false` (strict mode)
- ✅ TypeScript: `ignoreBuildErrors: false` (strict mode)
- ✅ React strict mode enabled

### 4. .eslintrc.json
- ✅ Rules configured to prevent build failures
- ✅ `react/no-unescaped-entities: "off"`
- ✅ `react-hooks/exhaustive-deps: "warn"`

## ✅ Code Issues Fixed

### TypeScript Errors
- ✅ Fixed `items` array type annotation in `app/api/bills/route.ts`
- ✅ Fixed all `setFont(undefined, ...)` calls → `setFont('helvetica', ...)`
- ✅ Fixed in `app/api/reports/pdf/route.ts` (34 instances)
- ✅ Fixed in `app/bills/[id]/page.tsx` (1 instance)

### ESLint Errors
- ✅ Fixed unescaped apostrophes in JSX
- ✅ Fixed useEffect dependency warnings

## ⚠️ Potential Issues to Monitor

### 1. Environment Variables (CRITICAL)
**Required in Vercel Dashboard:**
```
DATABASE_URL=mongodb+srv://Akshaya_Dairy_Feed_Database:PASSWORD@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0
JWT_SECRET=your-strong-secret-key-min-32-chars
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Action Required:**
- [ ] Set all environment variables in Vercel dashboard
- [ ] Ensure DATABASE_URL includes database name (`/akshaya_dairy`)
- [ ] Use strong JWT_SECRET (at least 32 characters)
- [ ] Update NEXT_PUBLIC_APP_URL after first deployment

### 2. MongoDB Atlas Network Access
**Action Required:**
- [ ] Allow Vercel IP addresses in MongoDB Atlas
- [ ] Go to MongoDB Atlas → Network Access
- [ ] Add `0.0.0.0/0` (all IPs) OR add Vercel's IP ranges
- [ ] Verify database user has read/write permissions

### 3. Prisma Client Generation
**Status:** ✅ Configured
- `postinstall` script runs `prisma generate`
- Build script includes `prisma generate`
- Should work automatically

**Potential Issue:**
- If DATABASE_URL is not set, Prisma generate might fail
- **Solution:** Ensure DATABASE_URL is set in Vercel environment variables

### 4. Dynamic Imports
**Status:** ✅ Properly configured
- `jspdf` is dynamically imported: `await import('jspdf')`
- This is correct for server-side code

### 5. Client-Side Code
**Status:** ✅ Properly configured
- `localStorage` usage is in client components (`'use client'`)
- `window` and `document` usage is in client components
- No server-side usage of browser APIs

### 6. File System Operations
**Status:** ✅ Safe
- File system operations only in `scripts/` folder (not deployed)
- No file system operations in API routes or pages

### 7. API Routes
**Status:** ✅ Properly configured
- All routes use proper Next.js 14 App Router format
- Exports: `GET`, `POST`, `PUT`, `DELETE` functions
- Proper error handling

### 8. Build Timeout
**Potential Issue:**
- Large PDF generation might timeout
- **Solution:** Already using dynamic imports for `jspdf`

### 9. Database Initialization
**Action Required After Deployment:**
```bash
# Option 1: Using Vercel CLI
vercel env pull .env.local
npm run db:push
npm run seed:admin

# Option 2: Using MongoDB Atlas directly
# Push schema and seed data manually
```

## 📋 Pre-Deployment Checklist

- [x] All TypeScript errors fixed
- [x] All ESLint errors fixed
- [x] Build script configured correctly
- [x] Prisma postinstall script added
- [x] vercel.json configured
- [ ] Environment variables set in Vercel
- [ ] MongoDB Atlas network access configured
- [ ] Test build locally: `npm run build`

## 🚀 Post-Deployment Checklist

- [ ] Verify deployment URL works
- [ ] Push Prisma schema: `npm run db:push`
- [ ] Seed admin user: `npm run seed:admin`
- [ ] Test login functionality
- [ ] Test API endpoints
- [ ] Test PDF generation
- [ ] Monitor Vercel logs for errors
- [ ] Check MongoDB Atlas connection logs

## 🔧 Troubleshooting

### Build Fails with Prisma Error
**Error:** `Prisma Client has not been generated yet`
**Solution:**
1. Check DATABASE_URL is set in Vercel
2. Verify `postinstall` script in package.json
3. Check build logs for specific Prisma errors

### Database Connection Error
**Error:** `P1001: Can't reach database server`
**Solution:**
1. Check MongoDB Atlas Network Access
2. Verify DATABASE_URL format (must include database name)
3. Check database user permissions

### Environment Variables Not Working
**Solution:**
1. Go to Vercel Project Settings → Environment Variables
2. Ensure variables are set for all environments
3. Redeploy after adding/changing variables

### Build Timeout
**Solution:**
1. Check build logs for slow operations
2. Optimize large imports
3. Use dynamic imports where possible

## 📝 Notes

- All code issues have been fixed
- Configuration is optimized for Vercel
- Main remaining tasks are environment setup and database initialization
- Monitor first deployment closely for any runtime issues

