# Vijayalakshmi Boyar Matrimony App

A community-focused matrimony platform for the Boyar community.

## 📋 Project Status
- ✅ Backend API fully functional (Express.js on port 5001)
- ✅ Frontend UI operational (React.js on port 3000)
- ✅ Database configured (SQLite)
- ✅ User authentication working (JWT)
- ✅ Profile management with image handling
- ✅ Image compression (<50KB automatic)
- ✅ Indian state/city dropdowns (cascading)
- ✅ Gallery support (up to 9 images per user)
- ✅ Email & Phone OTP Verification
- ✅ Admin Photo Verification System

## Project Structure

```
├── backend/
│   ├── controllers/      # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/       # Auth, validation
│   ├── utils/           # Helpers (image upload, JWT, DB, OTP)
│   ├── prisma/          # Database schema & seeds
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── pages/       # Page components (Login, Profile, etc)
│   │   ├── components/  # Reusable components
│   │   ├── services/    # API calls
│   │   ├── contexts/    # React Context (Auth)
│   │   ├── hooks/       # Custom hooks (useAuth)
│   │   ├── data/        # Static data (Indian locations)
│   │   └── utils/       # Helpers (image compression)
│   └── public/          # Static assets
├── database/            # Database setup docs
├── PROFILE_UPDATES.md   # Profile features documentation
└── README.md           # This file
```

## ✨ Features

### Core Features
- **Authentication**: Register → Login with JWT tokens stored in localStorage
- **Profile Management**: Complete user profile with 15+ editable fields
- **Image Handling**: 
  - Profile photo (1 image, uploadable)
  - Photo gallery (up to 9 images)
  - Automatic client-side compression (<50KB)
  - Cloudinary cloud storage
- **User Information**:
  - Personal: Name, Gender, DOB, Age, Phone
  - Location: State (28 states) + City (cascading dropdown)
  - Professional: Education, Profession, Income range
  - Appearance: Height, Weight, Complexion
  - Personal: Bio, Marital Status, Family Values, About Family
- **Interest System**: Connect with other profiles
- **Messaging**: Direct messaging between matched users
- **Search/Matching**: Find compatible profiles
- **Verification System**:
  - Email OTP verification (via Gmail SMTP)
  - Phone OTP verification (via Twilio SMS)
  - **Fallback**: If SMS fails, OTP sent via email automatically
  - Admin photo verification and approval
- **Admin Panel**:
  - Dashboard with statistics
  - Photo verification queue (approve/reject photos)
  - User management with verification status

### Technology Stack
- **Frontend**: 
  - React.js 18.2 with React Router v6
  - Material-UI v5 (@mui/material)
  - React Hook Form (form management)
  - Axios (HTTP client)
  - React Hot Toast (notifications)
  - TanStack React Query (data fetching)
  
- **Backend**: 
  - Node.js with Express.js
  - Prisma ORM (database access)
  - JWT authentication
  - Multer + Cloudinary (file uploads)
  - Input validation middleware
  - Nodemailer (email OTP)
  - Twilio (SMS OTP)
  
- **Database**: 
  - SQLite (development)
  - Prisma schema with migrations
  
- **Cloud Services**:
  - Cloudinary (image hosting)

## 🚀 Getting Started

### Prerequisites
- Node.js v16+ 
- npm or yarn
- Cloudinary account (for image upload) - [Sign up free](https://cloudinary.com)
- Twilio account (for SMS) - [Sign up free](https://twilio.com)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd d:\VS_CODE\viji_marimony
   npm run install-deps  # Installs both backend & frontend deps
   ```

2. **Setup environment variables**

   Backend `.env` file:
   ```
   DATABASE_URL="file:./dev.db"
   JWT_SECRET=your-secret-key-here
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Initialize database:**
   ```bash
   cd backend
   npx prisma db push
   ```

### Development Mode

**Option 1: Run everything (from root)**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
cd backend
node server.js
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- API Base: http://localhost:5001/api

### Production Build

```bash
cd frontend
npm run build  # Creates optimized build in build/ folder
```

## 📸 Profile Features

### Image Upload & Compression
- **Automatic Compression**: Images are compressed to <50KB before upload
- **Profile Photo**: Single image (primary profile picture)
- **Photo Gallery**: Up to 9 images (showcase multiple photos)
- **Cloudinary Storage**: Images hosted on cloud (not in database)
- **Error Handling**: Graceful fallbacks if compression fails

### Location Selection
- **28 Indian States**: Full list including all union territories
- **Cascading Dropdowns**: Select state → cities auto-load
- **City List**: 5-15 major cities per state
- **Examples**:
  - Select "Karnataka" → Shows: Bangalore, Mysore, Mangalore, etc
  - Select "Tamil Nadu" → Shows: Chennai, Coimbatore, Madurai, etc

### Profile Fields (Editable)
- Gender, Date of Birth, Age
- Phone, Country, State, City
- Marital Status
- Education, Profession, Income
- Height, Weight, Complexion
- Bio, Family Values, About Family

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - New user registration
- `POST /api/auth/login` - User login (returns JWT)

### Profile
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile fields
- `POST /api/profile/photo` - Upload profile photo
- `POST /api/profile/photos` - Upload gallery photos (up to 9)
- `DELETE /api/profile/photo` - Delete gallery photo

### Verification
- `POST /api/verification/email/send-otp` - Send email OTP
- `POST /api/verification/email/verify` - Verify email OTP
- `POST /api/verification/phone/send-otp` - Send phone OTP (with fallback email)
- `POST /api/verification/phone/verify` - Verify phone OTP
- `GET /api/verification/status` - Get verification status

### Admin (Admin users only)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/photos/pending` - Pending photo verifications
- `PUT /api/admin/photos/:id/approve` - Approve photo
- `PUT /api/admin/photos/:id/reject` - Reject photo with reason
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/verification` - Manual verification

### Other
- `GET /` - Health check
- `GET /api/search` - Search profiles
- `GET /api/interests` - Manage interests
- `GET /api/messages` - Messaging system

## 🧪 Testing

### Test Registration & Login
1. Open http://localhost:3000
2. Click "Register"
3. Fill form: Email, Password, Name, Phone, etc.
4. Submit → Get redirected to Login
5. Login with credentials
6. See Dashboard

### Test Verification
1. After login, go to "Verification" from menu
2. **Email Tab**: Click "Send OTP" → Check email → Enter OTP → Verify
3. **Phone Tab**: 
   - Click "Send OTP" → Check phone/SMS
   - If SMS fails, OTP auto-sent to email
   - Enter OTP → Verify
4. Once both verified, get "Verified" badge

### Test Admin Panel (Admin users only)
1. Login with admin email (info@vijayalakshmiboyarmatrimony.com)
2. "Admin Panel" link appears in menu
3. View dashboard stats
4. Review pending photo approvals
5. Approve/reject user photos

### Test Profile Features
1. After login, click "Profile"
2. Click "Edit" button
3. Upload profile photo (auto-compresses)
4. Select a state from dropdown
5. Verify city dropdown updates with that state's cities
6. Edit fields (phone, education, bio, etc)
7. Click "Save" to submit
8. Upload gallery photos (up to 9)

### Test Image Compression
1. Upload a large image (>50KB)
2. Open browser DevTools → Network tab
3. Check Cloudinary request → Image should be <50KB
4. Verify quality is acceptable

## 📝 Admin Contact
- Email: info@vijayalakshmiboyarmatrimony.com
- Phone: +91 7639150271

## 🎯 Community Focus
Built specifically for the Boyar community with:
- Community-specific profile fields
- Cultural understanding (family values, marital status)
- Personalized matching preferences
- Trust and verification system
