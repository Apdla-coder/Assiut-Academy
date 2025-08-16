# 🎓 Secretary Dashboard - School Management System

## 📋 Overview

This is a comprehensive school management system built for secretaries to manage students, courses, subscriptions, payments, attendance, exams, and parent communications. The system is built with modern web technologies and uses Supabase as the backend database.

## ✨ Features

### 👤 Student Management
- ✅ Add, edit, and delete students
- ✅ Store student details including parent contact information
- ✅ View comprehensive student profiles with complete history
- ✅ Print student reports
- ✅ Search and filter students

### 📚 Course Management
- ✅ Create and manage courses
- ✅ Assign teachers to courses
- ✅ Set course pricing and duration
- ✅ Track course enrollment
- ✅ Course details with modules and lessons

### 💰 Payment Management
- ✅ Record student payments
- ✅ Track payment status (paid, pending, cancelled)
- ✅ Support multiple payment methods (cash, card, transfer)
- ✅ Calculate remaining balances
- ✅ Generate payment receipts
- ✅ Monthly revenue tracking and charts

### 📅 Attendance Management
- ✅ Record daily attendance
- ✅ Track attendance statistics by course
- ✅ Real-time attendance updates
- ✅ Attendance rate calculations
- ✅ Generate attendance reports

### 📝 Subscription Management
- ✅ Manage student course subscriptions
- ✅ Track subscription status
- ✅ Group subscriptions by course
- ✅ Add notes and comments

### 🧪 Exam Management
- ✅ Create and manage exams
- ✅ Link exams to courses and modules
- ✅ Set maximum scores
- ✅ Track exam scores and results

### 📱 WhatsApp Integration
- ✅ Send comprehensive student reports to parents via WhatsApp
- ✅ Automatic phone number formatting for Egyptian numbers
- ✅ Include attendance, payment, and subscription data in reports

### 👥 Secretary Attendance
- ✅ Secretary check-in/check-out tracking
- ✅ Daily attendance status monitoring

### 📊 Dashboard & Analytics
- ✅ Real-time statistics dashboard
- ✅ Student distribution charts
- ✅ Revenue tracking with visual charts
- ✅ Recent activity feed
- ✅ Monthly revenue logs

### 🔄 Real-time Updates
- ✅ Live data synchronization across all modules
- ✅ Automatic refresh when data changes
- ✅ Real-time subscription to database changes

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL)
- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Responsive**: Mobile-first design

## 📁 Project Structure

```
secretary-dashboard/
├── index.html                 # Login page
├── dashboard.html            # Main dashboard
├── cleaned_secretary_dashboard.js  # Main application logic
├── additional_modules.js     # Additional functionality modules
├── styles.css               # Styling
├── logo.png                 # Institution logo
└── README.md               # This file
```

## 🚀 Setup Instructions

### Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Web Server**: Any modern web server (Apache, Nginx, or local development server)

### Database Setup

1. **Create a new Supabase project**
2. **Run the following SQL to create the required tables**:

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'student',
    phone VARCHAR,
    avatar_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    parent_phone VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    teacher_id UUID REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Modules table
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    "order" INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lessons table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR DEFAULT 'active',
    notes TEXT
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2),
    method VARCHAR DEFAULT 'cash',
    status VARCHAR DEFAULT 'paid',
    paid_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- Attendances table
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Exams table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Exam scores table
CREATE TABLE exam_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Secretary attendance table
CREATE TABLE secretary_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secretary_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

3. **Create the required RPC function for student course distribution**:

```sql
CREATE OR REPLACE FUNCTION get_student_course_distribution()
RETURNS TABLE(course_name VARCHAR, student_count BIGINT)
LANGUAGE sql
AS $$
    SELECT 
        c.name as course_name,
        COUNT(s.id) as student_count
    FROM courses c
    LEFT JOIN subscriptions sub ON c.id = sub.course_id
    LEFT JOIN students s ON sub.student_id = s.id
    GROUP BY c.id, c.name
    ORDER BY student_count DESC;
$$;
```

### Application Setup

1. **Clone or download the project files**
2. **Update the Supabase configuration** in `cleaned_secretary_dashboard.js`:

```javascript
const supabaseUrl = "YOUR_SUPABASE_URL"
const supabaseKey = "YOUR_SUPABASE_ANON_KEY"
```

3. **Set up Row Level Security (RLS) policies** in Supabase for your tables
4. **Create user accounts** in Supabase Auth with the role 'secretary'
5. **Deploy to your web server**

## 🔧 Configuration

### Environment Variables

Update the following in your JavaScript files:

- `supabaseUrl`: Your Supabase project URL
- `supabaseKey`: Your Supabase anon public key

### User Roles

The system supports the following user roles:
- `secretary`: Full access to all features
- `teacher`: Limited access (if implemented)
- `student`: Student portal access (if implemented)

## 📱 Usage

### Getting Started

1. **Login**: Use your Supabase credentials to log in
2. **Dashboard**: View overall statistics and recent activity
3. **Navigation**: Use the sidebar to navigate between different modules

### Main Functions

1. **Students**: Add, edit, view, and manage student records
2. **Courses**: Create and manage courses with pricing
3. **Subscriptions**: Track student course enrollments
4. **Payments**: Record and track payments with receipt generation
5. **Attendance**: Mark attendance and view statistics
6. **Exams**: Create exams and track scores
7. **Parents**: Send WhatsApp reports to parents

### WhatsApp Reports

1. Navigate to the "Parents" tab
2. Click "إرسال التقرير" for any student
3. The system will format the phone number and open WhatsApp
4. Send the pre-formatted report to the parent

## 🏗️ System Architecture

### Code Organization

The application is organized into two main JavaScript files:

1. **`cleaned_secretary_dashboard.js`**: Core functionality
   - Authentication and initialization
   - Dashboard and charts
   - Student management
   - Real-time subscriptions
   - Utility functions

2. **`additional_modules.js`**: Extended functionality
   - Course management
   - Subscription management
   - Payment management
   - Attendance management
   - Exam management
   - WhatsApp reporting
   - Student details modal

### Data Flow

1. **Authentication**: Supabase Auth handles user login/logout
2. **Data Loading**: Functions load data from Supabase on tab switch
3. **Real-time Updates**: Supabase Realtime provides live data sync
4. **CRUD Operations**: Create, read, update, delete operations via Supabase API
5. **UI Updates**: Dynamic HTML generation with data binding

### Key Improvements Made

1. **Code Organization**: Separated concerns into logical modules
2. **Error Handling**: Comprehensive try-catch blocks and user feedback
3. **Performance**: Efficient data loading and caching strategies
4. **User Experience**: Loading states, status messages, and responsive design
5. **Maintainability**: Clean, documented code with consistent patterns
6. **Real-time Features**: Live data synchronization across all modules

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Supabase credentials
   - Check RLS policies
   - Ensure user has correct role

2. **Data Not Loading**
   - Check network connection
   - Verify table permissions
   - Check browser console for errors

3. **WhatsApp Not Opening**
   - Ensure valid phone numbers
   - Check phone number formatting
   - Verify WhatsApp is installed

4. **Charts Not Displaying**
   - Ensure Chart.js is loaded
   - Check for data availability
   - Verify canvas elements exist

### Debug Mode

Enable debug mode by opening browser console and running:
```javascript
console.log('Debug mode enabled');
// Add any debug logging as needed
```

## 🚀 Future Enhancements

- [ ] Email notifications
- [ ] Advanced reporting with PDF export
- [ ] Bulk operations for students and payments
- [ ] Course scheduling and calendar integration
- [ ] Student portal for self-service
- [ ] Advanced analytics and insights
- [ ] Multi-language support
- [ ] Mobile app development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Support

For support and questions, please contact:
- Technical Support: [your-email@domain.com]
- Documentation: [documentation-link]

---

**Made with ❤️ for educational institutions** 
