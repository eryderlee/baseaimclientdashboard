# ClientHub - Custom Client Dashboard

A comprehensive, modern client dashboard for managing partnerships, onboarding, and collaboration. Built with Next.js 14+, TypeScript, Prisma, and shadcn/ui.

## Features

### Core Functionality
- **Authentication** - Secure login/registration with NextAuth.js and role-based access (CLIENT/ADMIN)
- **Unified Dashboard** - Single-page overview with all key metrics and widgets
- **Document Management** - Upload, organize, share documents with drag-and-drop
- **Real-time Chat** - Communication center with message history and notifications
- **Progress Tracking** - Visual milestone tracking with status and completion rates
- **Payment Integration** - Stripe-ready invoice and billing management
- **Analytics & Reporting** - Visual charts and metrics with Recharts
- **Admin Dashboard** - Manage all clients and monitor platform activity

### Technical Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: shadcn/ui + Tailwind CSS
- **Authentication**: NextAuth.js v5
- **File Storage**: Vercel Blob (configurable)
- **Payments**: Stripe integration
- **Charts**: Recharts

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (or Prisma Postgres)

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd client-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Update `.env` with your configuration:
   ```env
   # Database (already configured with Prisma Postgres)
   DATABASE_URL="your-database-url"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key-change-this"

   # Stripe (optional - for payment features)
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."

   # File Upload (optional - Vercel Blob)
   BLOB_READ_WRITE_TOKEN="vercel_blob_..."
   ```

4. **Set up the database**
   ```bash
   # Push the schema to your database
   npx prisma db push

   # (Optional) Open Prisma Studio to view data
   npx prisma studio
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
client-dashboard/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/           # Dashboard pages
│   │   ├── page.tsx         # Main dashboard
│   │   ├── documents/       # Document management
│   │   ├── chat/            # Communication center
│   │   ├── progress/        # Progress tracking
│   │   ├── analytics/       # Analytics dashboard
│   │   ├── billing/         # Payment & billing
│   │   ├── settings/        # User settings
│   │   └── admin/           # Admin dashboard
│   ├── api/                 # API routes
│   │   ├── auth/
│   │   ├── documents/
│   │   ├── messages/
│   │   └── notifications/
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── dashboard/           # Dashboard components
├── lib/
│   ├── auth.ts              # Auth configuration
│   ├── prisma.ts            # Prisma client
│   ├── stripe.ts            # Stripe client
│   └── utils.ts             # Utilities
├── prisma/
│   └── schema.prisma        # Database schema
└── prisma.config.ts         # Prisma configuration
```

## Database Schema

The application uses the following main models:
- **User** - User accounts with authentication
- **Client** - Client profiles with company information
- **Document** - File metadata and organization
- **Message** - Chat messages
- **Notification** - User notifications
- **Milestone** - Progress tracking milestones
- **Invoice** - Billing and payments
- **Subscription** - Recurring subscriptions
- **Activity** - Audit log of user actions
- **Folder** - Document organization

## Usage

### Creating Your First Admin User

After registration, update a user's role to ADMIN in Prisma Studio or database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

### Key Workflows

1. **Client Onboarding**
   - Client registers via `/register`
   - Completes profile in settings
   - Admin sets up milestones and assigns tasks

2. **Document Sharing**
   - Upload documents via drag-and-drop
   - Files are organized and accessible
   - Admin can approve/reject documents

3. **Communication**
   - Real-time chat with message history
   - Notifications for important updates
   - Activity timeline tracks all actions

4. **Progress Tracking**
   - Milestones show project phases
   - Visual progress bars and status
   - Completion rates calculated automatically

5. **Billing**
   - Invoices created by admin
   - Clients can view and pay invoices
   - Payment history and receipts

## Customization

### Adding Custom Features

The modular structure makes it easy to extend:

1. **Add a new page**: Create in `app/dashboard/[feature]/page.tsx`
2. **Add API routes**: Create in `app/api/[feature]/route.ts`
3. **Add database models**: Update `prisma/schema.prisma` and run `npx prisma db push`
4. **Add components**: Create in `components/dashboard/`

### Styling

- Uses Tailwind CSS for styling
- shadcn/ui components for consistency
- Customize theme in `app/globals.css`
- Modify color scheme in `tailwind.config.ts`

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Import project from GitHub
   - Configure environment variables
   - Deploy

3. **Set up database**
   - Use Vercel Postgres or external PostgreSQL
   - Run migrations: `npx prisma db push`

4. **Configure Stripe webhooks** (if using payments)
   - Add webhook endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Update `STRIPE_WEBHOOK_SECRET`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Auth encryption secret | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | Optional |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | Optional |

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npx tsc --noEmit
```

### Database Commands
```bash
# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate Prisma Client
npx prisma generate
```

## Troubleshooting

### Database connection issues
- Verify `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check firewall/network settings

### Authentication not working
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies

### File uploads failing
- Set up `BLOB_READ_WRITE_TOKEN` for production
- For development, files will use local paths

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for your projects!

## Support

For issues or questions:
- Create an issue on GitHub
- Email: support@clienthub.example.com

## Roadmap

Future enhancements:
- [ ] Real-time WebSocket chat (upgrade from polling)
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Calendar integration
- [ ] Task management
- [ ] Team collaboration features
- [ ] API documentation

---

Built with ❤️ using Next.js and modern web technologies
