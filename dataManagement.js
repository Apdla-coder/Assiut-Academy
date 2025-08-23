// dataManager.js

// Import necessary modules
// import { showStatus, /* other needed UI functions */ } from './app.js'; // Or pass them as callbacks
// import { updateDashboardCharts, updateStudentList, /* ... */ } from './uiManager.js'; // Or pass callbacks

// Assume global variables from app.js are accessible (or passed as parameters)
// let students = [], courses = [], subscriptions = [], payments = [], attendances = [], teachers = [], modules = [], userRole = null, userId = null;

// ===== Initial Data Fetching =====
async function fetchInitialData() {
    try {
        // 1. Load Courses
        const { data: coursesData, error: coursesError } = await supabaseClient
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (coursesError) throw coursesError;
        window.courses = coursesData || []; // Update global or pass back

        // 2. Load Modules
        const { data: modulesData, error: modulesError } = await supabaseClient
            .from('modules')
            .select('*')
            .order('course_id')
            .order('order');

        if (modulesError) throw modulesError;
        window.modules = modulesData || [];

        // 3. Load Students
        const { data: studentsData, error: studentsError } = await supabaseClient
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });

        if (studentsError) throw studentsError;
        window.students = studentsData || [];

        // 4. Load Teachers (if needed for exams)
        if (userRole === 'secretary' || userRole === 'admin') {
            const { data: teachersData, error: teachersError } = await supabaseClient
                .from('users')
                .select('id, full_name')
                .eq('role', 'teacher');

            if (!teachersError) {
                 window.teachers = teachersData || [];
            } else {
                console.error("Error loading teachers:", teachersError);
                window.teachers = [];
            }
        }

        // Load initial subscriptions, payments, attendances if needed immediately
        // Or let real-time listeners populate them

    } catch (error) {
        console.error("Error fetching initial data:", error);
        showStatus('خطأ في تحميل البيانات الأساسية', 'error');
        // Consider redirecting or disabling parts of the app
    }
}

// ===== Real-time Listeners =====
function initializeRealtimeListeners() {
    // Example for students
    const studentChannel = supabaseClient.channel('public:students');
    studentChannel
        .on(
            'postgres_changes',
            {
                event: '*', // Listen for INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'students',
            },
            (payload) => {
                console.log('Change received for students!', payload);
                handleRealtimeStudentChange(payload); // Defined below
            }
        )
        .subscribe();

    // Similar listeners for courses, subscriptions, payments, attendances
    // Example for subscriptions
    const subscriptionChannel = supabaseClient.channel('public:subscriptions');
    subscriptionChannel
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'subscriptions',
                // filter: 'user_id=eq.' + userId // Optional: filter by user if relevant
            },
            (payload) => {
                console.log('Change received for subscriptions!', payload);
                handleRealtimeSubscriptionChange(payload); // Defined below
            }
        )
        .subscribe();

    // Add listeners for courses, payments, attendances, modules, users (for role changes if needed)
    // Remember to unsubscribe channels when needed (e.g., on logout)
    // supabaseClient.removeChannel(studentChannel);
}

// ===== Real-time Change Handlers =====
function handleRealtimeStudentChange(payload) {
    const newRecord = payload.new;
    const oldRecord = payload.old;
    const eventType = payload.eventType; // 'INSERT', 'UPDATE', 'DELETE'

    switch (eventType) {
        case 'INSERT':
            window.students.push(newRecord);
            // Trigger UI update for student list if on that tab
            if (document.getElementById('studentsContent')?.style.display !== 'none') {
                 updateStudentList(); // Function in uiManager.js
            }
            break;
        case 'UPDATE':
             const index = window.students.findIndex(s => s.id === newRecord.id);
             if (index !== -1) {
                 window.students[index] = newRecord;
                 // Trigger UI update for student list/details
                 if (document.getElementById('studentsContent')?.style.display !== 'none') {
                      updateStudentList();
                 }
                 // If student details modal is open for this student, update it too
             }
            break;
        case 'DELETE':
             window.students = window.students.filter(s => s.id !== oldRecord.id);
             // Trigger UI update
             if (document.getElementById('studentsContent')?.style.display !== 'none') {
                  updateStudentList();
             }
            break;
        default:
            break;
    }
    // Potentially update dashboard counts or activity log
    // loadDashboardData(); // Or update specific parts
}

function handleRealtimeSubscriptionChange(payload) {
     const newRecord = payload.new;
     const oldRecord = payload.old;
     const eventType = payload.eventType;

     switch (eventType) {
         case 'INSERT':
             window.subscriptions.push(newRecord);
             if (document.getElementById('subscriptionsContent')?.style.display !== 'none') {
                  // updateSubscriptionList(); // Function in uiManager.js
                  loadSubscriptions(); // Reload the specific tab data
             }
             // Update dashboard if needed
             break;
         case 'UPDATE':
              const index = window.subscriptions.findIndex(s => s.id === newRecord.id);
              if (index !== -1) {
                  window.subscriptions[index] = newRecord;
                  if (document.getElementById('subscriptionsContent')?.style.display !== 'none') {
                       loadSubscriptions();
                  }
              }
             break;
         case 'DELETE':
              window.subscriptions = window.subscriptions.filter(s => s.id !== oldRecord.id);
              if (document.getElementById('subscriptionsContent')?.style.display !== 'none') {
                   loadSubscriptions();
              }
             break;
         default:
             break;
     }
     // Update dashboard counts or activity log
     // loadDashboardData();
}

// ... (Similar handlers for courses, payments, attendances)

// ===== Data Loading Functions for Tabs (Fetch latest data on demand) =====
// These functions now fetch fresh data from Supabase instead of relying on potentially stale global arrays or cache.

async function loadStudents(forceRefresh = false) {
    const container = document.getElementById('studentsContainer');
    if (!container) return;

    try {
        container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات الطلاب...</p></div>`;

        // Fetch fresh data
        const { data, error } = await supabaseClient
            .from('students')
            .select('*') // Add filters/joins if needed for display
            .order('created_at', { ascending: false });

        if (error) throw error;

        window.students = data || []; // Update global cache

        // Update UI using function from uiManager.js
        updateStudentList(); // Pass data if uiManager doesn't use global

    } catch (error) {
        console.error("Error loading students:", error);
        container.innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات الطلاب: ${error.message}</p></div>`;
        showStatus('حدث خطأ أثناء تحميل بيانات الطلاب', 'error');
    }
}

async function loadCourses(forceRefresh = false) {
    const container = document.getElementById('coursesContainer');
    if (!container) return;

    try {
        container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات الكورسات...</p></div>`;

        const { data, error } = await supabaseClient
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        window.courses = data || [];

        updateCourseList(); // Function in uiManager.js

    } catch (error) {
        console.error("Error loading courses:", error);
        container.innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات الكورسات: ${error.message}</p></div>`;
        showStatus('حدث خطأ أثناء تحميل بيانات الكورسات', 'error');
    }
}

async function loadSubscriptions(forceRefresh = false) {
    const container = document.getElementById('subscriptionsContainer');
    if (!container) return;

    try {
        container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات الاشتراكات...</p></div>`;

        // Fetch with necessary joins
        const { data, error } = await supabaseClient
            .from('subscriptions')
            .select(`
                *,
                students(full_name),
                courses(name)
            `)
            .order('subscribed_at', { ascending: false });

        if (error) throw error;

        window.subscriptions = data || [];

        updateSubscriptionList(); // Function in uiManager.js

    } catch (error) {
        console.error("Error loading subscriptions:", error);
        container.innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات الاشتراكات: ${error.message}</p></div>`;
        showStatus('حدث خطأ أثناء تحميل بيانات الاشتراكات', 'error');
    }
}

async function loadPayments(forceRefresh = false) {
    const container = document.getElementById('paymentsContainer');
    if (!container) return;

    try {
        container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل بيانات المدفوعات...</p></div>`;

        const { data, error } = await supabaseClient
            .from('payments')
            .select(`
                *,
                students(full_name),
                courses(name),
                subscriptions(status) // Might be needed for status display
            `)
            .order('paid_at', { ascending: false });

        if (error) throw error;

        window.payments = data || [];

        updatePaymentList(); // Function in uiManager.js

    } catch (error) {
        console.error("Error loading payments:", error);
        container.innerHTML = `<div class="loading"><p>خطأ في تحميل بيانات المدفوعات: ${error.message}</p></div>`;
        showStatus('حدث خطأ أثناء تحميل بيانات المدفوعات', 'error');
    }
}

async function loadAttendances(forceRefresh = false) {
    const container = document.getElementById('attendancesContainer');
    if (!container) return;

    try {
        container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جارٍ تحميل سجلات الحضور...</p></div>`;

        const { data, error } = await supabaseClient
            .from('attendances')
            .select(`
                *,
                students(full_name),
                courses(name)
            `)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        window.attendances = data || [];

        updateAttendanceList(); // Function in uiManager.js

    } catch (error) {
        console.error("Error loading attendances:", error);
        container.innerHTML = `<div class="loading"><p>خطأ في تحميل سجلات الحضور: ${error.message}</p></div>`;
        showStatus('حدث خطأ أثناء تحميل سجلات الحضور', 'error');
    }
}

// ... (loadDashboardData, loadRecentActivity, loadTeacherExamsForSecretary, loadStudentsForParents, loadDataManagement functions
//  should also fetch fresh data and call corresponding UI update functions)

// Export necessary functions
// export { fetchInitialData, initializeRealtimeListeners, loadStudents, loadCourses, loadSubscriptions, loadPayments, loadAttendances /* ... others ... */ };
