# MongoDB Atlas Migration Guide

This project has been migrated from PostgreSQL to MongoDB Atlas.

## Connection String

Your MongoDB Atlas connection string format:
```
mongodb+srv://Akshaya_Dairy_Feed_Database:<db_password>@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0
```

**Important**: The database name (`akshaya_dairy`) must be included in the connection string before the `?` query parameters.

## Setup Steps

### 1. Update Environment Variables

Create or update your `.env` file with the MongoDB connection string:

```env
DATABASE_URL="mongodb+srv://Akshaya_Dairy_Feed_Database:YOUR_PASSWORD@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important**: Replace `YOUR_PASSWORD` with your actual MongoDB Atlas database password.

### 2. Generate Prisma Client

```bash
npm run db:generate
```

### 3. Push Schema to MongoDB

```bash
npm run db:push
```

This will create the collections in your MongoDB Atlas database:
- `admins`
- `users`
- `feeds`
- `bills`
- `billitems`
- `transactions`

### 4. Create Admin User

```bash
npm run seed:admin
```

This creates an admin user with:
- Mobile: `1234567890`
- Password: `admin123`

**Important**: Change the password after first login!

### 5. Start Development Server

```bash
npm run dev
```

## MongoDB Atlas Configuration

### Network Access

Make sure your MongoDB Atlas cluster allows connections from your IP address:
1. Go to MongoDB Atlas Dashboard
2. Navigate to Network Access
3. Add your current IP address or use `0.0.0.0/0` for development (not recommended for production)

### Database User

Ensure you have a database user created:
1. Go to Database Access in MongoDB Atlas
2. Create a user with username: `Akshaya_Dairy_Feed_Database`
3. Set a strong password
4. Grant read/write permissions

## Key Changes from PostgreSQL

1. **ID Fields**: Now use MongoDB ObjectId instead of CUID
2. **Collections**: Models are mapped to MongoDB collections
3. **Relations**: MongoDB relations work similarly but use ObjectId references
4. **Indexes**: All indexes are preserved and will be created automatically

## Troubleshooting

### Connection Error

- Verify your MongoDB Atlas cluster is running
- Check network access settings
- Verify username and password in connection string
- Ensure the database user has proper permissions

### Schema Push Issues

- Make sure you're connected to the internet
- Verify your MongoDB Atlas connection string is correct
- Check MongoDB Atlas logs for any errors

## Next Steps

1. Update your `.env` file with the correct password
2. Run `npm run db:generate`
3. Run `npm run db:push`
4. Seed your admin user
5. Start developing!

