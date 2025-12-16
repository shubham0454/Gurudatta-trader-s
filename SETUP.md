# Quick Setup Guide

Follow these steps to get the Gurudatta trader's Admin Panel up and running:

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up MongoDB Atlas Database

1. Make sure you have a MongoDB Atlas account
2. Create a cluster (or use existing cluster: `cluster0.qrr3jlj`)
3. Create a database user with username: `Akshaya_Dairy_Feed_Database`
4. Configure network access to allow connections from your IP (or `0.0.0.0/0` for development)

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="mongodb+srv://Akshaya_Dairy_Feed_Database:YOUR_PASSWORD@cluster0.qrr3jlj.mongodb.net/?appName=Cluster0"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Replace `YOUR_PASSWORD` with your MongoDB Atlas database password.

## Step 4: Initialize Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

## Step 5: Create Admin User

```bash
npm run seed:admin
```

This creates an admin user with:
- Mobile: `1234567890`
- Password: `admin123`

**Important**: Change the password after first login!

You can also customize the admin credentials by setting environment variables:
```env
ADMIN_MOBILE="your-mobile-number"
ADMIN_PASSWORD="your-password"
ADMIN_NAME="Your Name"
```

## Step 6: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 7: Login

Use the default credentials:
- Mobile Number: `1234567890`
- Password: `admin123`

## Next Steps

1. **Add Feeds**: Go to "Feeds" and add your cow feed types (e.g., Tiwana 25kg, Tiwana 50kg)
2. **Add Users**: Go to "Users" and add your customers
3. **Create Bills**: Go to "Bills" and start creating bills for your customers
4. **Track Payments**: Record payments from the user profile or bill details page

## Troubleshooting

### Database Connection Error

- Verify MongoDB Atlas cluster is running and accessible
- Check DATABASE_URL in `.env` file (ensure password is correct)
- Verify network access is configured in MongoDB Atlas
- Ensure database user has proper read/write permissions
- Check MongoDB Atlas logs for connection errors

### Prisma Errors

- Run `npm run db:generate` after any schema changes
- Delete `node_modules/.prisma` and regenerate if needed

### Port Already in Use

- Change the port: `npm run dev -- -p 3001`
- Or kill the process using port 3000

### Build Errors

- Delete `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Regenerate Prisma: `npm run db:generate`

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a strong `JWT_SECRET`
3. Use a production PostgreSQL database
4. Build the application: `npm run build`
5. Start the server: `npm start`

## Support

If you encounter any issues, check:
- Database connection
- Environment variables
- Prisma client generation
- Node.js version (should be 18+)

