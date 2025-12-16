# Gurudatta trader's - Admin Panel

A comprehensive admin panel for managing cow feed business operations including users, feeds, bills, payments, and reports.

## Features

- **User Management**: Create, edit, and manage customer information
- **Feed Management**: Manage different types of cow feeds with weights, brands, prices, and stock
- **Billing System**: Create bills with multiple feed items, custom pricing per user, and track payments
- **Payment Tracking**: Record payments, track pending amounts, and manage creditors/debtors
- **Dashboard**: View today's sales, monthly sales, pending amounts, and visual charts
- **Reports**: Generate PDF reports for sales data
- **Authentication**: Secure admin login with JWT tokens
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Charts**: Recharts
- **PDF Generation**: jsPDF

## Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB Atlas account and cluster
- Environment variables configured

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="mongodb+srv://Akshaya_Dairy_Feed_Database:YOUR_PASSWORD@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0"
JWT_SECRET="your-secret-key-change-this-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important**: The database name (`akshaya_dairy`) must be included in the connection string before the `?` query parameters.

**Important**: Replace `YOUR_PASSWORD` with your actual MongoDB Atlas database password.

### 3. Set Up Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Create Initial Admin User

Run the seed script to create an admin user:

```bash
npx ts-node scripts/seed-admin.ts
```

Or manually create an admin user using Prisma Studio:

```bash
npm run db:studio
```

Default admin credentials (change after first login):
- Mobile: `1234567890`
- Password: `admin123`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── users/        # User management
│   │   ├── feeds/        # Feed management
│   │   ├── bills/        # Bill management
│   │   ├── payments/     # Payment processing
│   │   ├── dashboard/    # Dashboard stats
│   │   └── reports/      # PDF reports
│   ├── dashboard/        # Dashboard page
│   ├── users/            # User management pages
│   ├── feeds/            # Feed management page
│   ├── bills/            # Bill management pages
│   ├── reports/          # Reports page
│   └── login/            # Login page
├── components/           # Reusable components
├── lib/                  # Utilities and helpers
│   ├── auth.ts          # Authentication utilities
│   ├── prisma.ts        # Prisma client
│   ├── validation.ts    # Zod schemas
│   └── api.ts           # API helper functions
├── prisma/
│   └── schema.prisma    # Database schema
└── scripts/
    └── seed-admin.ts    # Admin user seed script
```

## Database Schema

### Models

- **Admin**: Admin users for login
- **User**: Customer information
- **Feed**: Cow feed types with weights, brands, prices, and stock
- **Bill**: Bills with items and payment tracking
- **BillItem**: Individual items in a bill
- **Transaction**: Payment transactions

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `GET /api/users/[id]` - Get user details
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Feeds
- `GET /api/feeds` - Get all feeds
- `POST /api/feeds` - Create feed
- `GET /api/feeds/[id]` - Get feed details
- `PUT /api/feeds/[id]` - Update feed
- `DELETE /api/feeds/[id]` - Delete feed

### Bills
- `GET /api/bills` - Get all bills (optional userId query param)
- `POST /api/bills` - Create bill
- `GET /api/bills/[id]` - Get bill details

### Payments
- `POST /api/payments` - Record payment

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Reports
- `GET /api/reports/pdf` - Generate PDF report (query params: type, userId)

## Usage Guide

### Creating a User

1. Navigate to "Users" in the sidebar
2. Click "+ Add User"
3. Fill in user details (name, mobile, address, email)
4. Click "Create"

### Adding Feeds

1. Navigate to "Feeds" in the sidebar
2. Click "+ Add Feed"
3. Enter feed details:
   - Name (e.g., "Tiwana")
   - Brand (optional)
   - Weight in kg (e.g., 25 or 50)
   - Default price per unit
   - Initial stock quantity
4. Click "Create"

### Creating a Bill

1. Navigate to "Bills" in the sidebar
2. Click "+ Create Bill"
3. Select a user
4. Add feed items:
   - Select feed type
   - Enter quantity
   - Adjust unit price (defaults to feed's default price, can be customized)
5. Click "Create Bill"

### Recording Payments

1. Navigate to a user's profile or bill details
2. Click "Pay" or "Make Payment"
3. Enter payment amount and description
4. Click "Process Payment"

### Generating Reports

1. Navigate to "Reports" in the sidebar
2. Select report type (Today, This Month, This Year)
3. Optionally filter by user
4. Click "Generate PDF Report"

## Features in Detail

### Custom Pricing

When creating a bill, you can set custom prices for each feed item per user. The system defaults to the feed's default price but allows customization.

### Stock Management

Stock is automatically decremented when bills are created. The system prevents creating bills if stock is insufficient.

### Payment Tracking

- Bills track total amount, paid amount, and pending amount
- Status automatically updates: "pending", "partial", or "paid"
- All transactions are recorded with timestamps

### Dashboard Analytics

- Today's sales
- Monthly sales
- Total pending amount
- Total users and feeds
- Total stock remaining
- Creditors list (users with pending payments)
- Sales charts (last 7 days)

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Zod
- Protected API routes
- Secure cookie handling

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Database Management

```bash
# Open Prisma Studio
npm run db:studio

# Generate Prisma Client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push
```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env` file
- Verify database exists

### Authentication Issues

- Clear browser cookies/localStorage
- Check JWT_SECRET in `.env`
- Verify admin user exists in database

### Build Errors

- Delete `.next` folder and rebuild
- Run `npm run db:generate` after schema changes
- Check TypeScript errors

## License

This project is proprietary software for Gurudatta trader's.

## Support

For issues or questions, please contact the development team.

