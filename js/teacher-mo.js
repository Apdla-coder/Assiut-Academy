// التطبيق الرئيسي للجوال
class TeacherMobileApp {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentAcademyId = null;
        this.currentUserName = 'المعلم';
        this.lessonsChart = null;
        this.isSidebarOpen = false;
        
        this.init();
    }

    async init() {
        try {
            await this.initializeSupabase();
            await this.setupEventListeners();
            await this.loadUserData();
            await this.setupNavigation();
            
            // تحميل التبويب الافتراضي
            await this.switchTab('dashboard');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showAlert('خطأ في تهيئة التطبيق', 'error');
        }
    }

    async initializeSupabase() {
        const SUPABASE_URL = 'https://nhzbnzcdsebepsmrtona.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oemJuemNkc2ViZXBzbXJ0b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjU4MTEsImV4cCI6MjA3OTI0MTgxMX0.wNSf49MpQjCCopByd3zCz4-TJ2EGGABc3-ICEsAPaFo';
        
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    setupEventListeners() {
        // التحكم في القائمة الجانبية للجوال
        document.getElementById('menuToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.closeSidebar();
        });

        // إغلاق القائمة الجانبية عند النقر خارجها
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebarMobile');
            const menuToggle = document.getElementById('menuToggle');
            
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && this.isSidebarOpen) {
                this.closeSidebar();
            }
        });

        // البحث في الكورسات
        const courseSearch = document.getElementById('courseSearch');
        if (courseSearch) {
            courseSearch.addEventListener('input', this.debounce(() => {
                this.filterCourses(courseSearch.value);
            }, 300));
        }

        // البحث في الطلاب
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', this.debounce(() => {
                this.filterStudents(studentSearch.value);
            }, 300));
        }

        // منع التمرير عندما تكون القائمة الجانبية مفتوحة
        document.addEventListener('touchmove', (e) => {
            if (this.isSidebarOpen) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebarMobile');
        const overlay = document.getElementById('modalOverlay');
        
        if (this.isSidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('sidebarMobile');
        const overlay = document.getElementById('modalOverlay');
        
        sidebar.classList.add('active');
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.isSidebarOpen = true;
        
        // إضافة تأثير الظهور
        setTimeout(() => {
            sidebar.style.right = '0';
        }, 10);
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebarMobile');
        const overlay = document.getElementById('modalOverlay');
        
        sidebar.classList.remove('active');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        this.isSidebarOpen = false;
        
        sidebar.style.right = '-280px';
    }

    async setupNavigation() {
        // تحديث الروابط للتنقل بين التبويبات
        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = link.getAttribute('data-tab');
                this.switchTab(tabName);
                this.closeSidebar();
            });
        });
    }

    async loadUserData() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session?.user) {
                this.currentUserId = session.user.id;
            } else {
                const saved = localStorage.getItem('current_academy_id');
                const savedUser = localStorage.getItem('user_id');
                if (saved && savedUser) {
                    this.currentAcademyId = saved;
                    this.currentUserId = savedUser;
                }
            }

            if (!this.currentUserId) {
                this.showAlert('يرجى تسجيل الدخول أولاً', 'error');
                window.location.href = 'index.html';
                return;
            }

            const { data: profile } = await this.supabase
                .from('profiles')
                .select('full_name,academy_id')
                .eq('id', this.currentUserId)
                .single();

            if (profile) {
                this.currentAcademyId = profile.academy_id;
                this.currentUserName = profile.full_name || 'المعلم';
                localStorage.setItem('current_academy_id', this.currentAcademyId);
            }

            this.updateUI();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showAlert('خطأ في تحميل بيانات المستخدم', 'error');
        }
    }

    updateUI() {
        // تحديث واجهة المستخدم بعد تحميل البيانات
        const userNameElement = document.getElementById('userNameHeader');
        if (userNameElement) {
            userNameElement.textContent = `أهلاً، ${this.currentUserName}`;
        }
    }

    async switchTab(tabName) {
        // إخفاء جميع التبويبات
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // إزالة الفئة النشطة من جميع الروابط
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // إظهار التبويب المطلوب
        const targetTab = document.getElementById(`${tabName}Content`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // تعيين الرابط النشط
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // تحميل بيانات التبويب
        await this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        const loadingMethods = {
            'dashboard': () => this.loadDashboardData(),
            'profile': () => this.loadProfileData(),
            'courses': () => this.loadCoursesData(),
            'students': () => this.loadStudentsData(),
            'exams': () => this.loadExamsData(),
            'attendances': () => this.loadAttendancesData(),
            'reports': () => this.loadReportsData()
        };

        if (loadingMethods[tabName]) {
            await loadingMethods[tabName]();
        }
    }

    async loadDashboardData() {
        if (!this.currentAcademyId || !this.currentUserId) return;

        try {
            const container = document.getElementById('dashboardContent');
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card mobile-stat">
                        <i class="stat-icon fas fa-book"></i>
                        <div class="stat-info">
                            <span class="stat-label">الكورسات</span>
                            <span class="stat-value" id="totalCourses">0</span>
                        </div>
                    </div>
                    <div class="stat-card mobile-stat">
                        <i class="stat-icon fas fa-chalkboard"></i>
                        <div class="stat-info">
                            <span class="stat-label">الدروس</span>
                            <span class="stat-value" id="totalLessons">0</span>
                        </div>
                    </div>
                    <div class="stat-card mobile-stat">
                        <i class="stat-icon fas fa-users"></i>
                        <div class="stat-info">
                            <span class="stat-label">الطلاب</span>
                            <span class="stat-value" id="totalStudents">0</span>
                        </div>
                    </div>
                </div>
                <div class="card mobile-card">
                    <h3 class="card-title">توزيع الدروس على الكورسات</h3>
                    <div class="chart-container">
                        <canvas id="lessonsChart"></canvas>
                    </div>
                </div>
            `;

            // تحميل الإحصائيات
            const [coursesRes, lessonsRes, studentsRes] = await Promise.all([
                this.supabase.from('courses').select('id').eq('teacher_id', this.currentUserId).eq('academy_id', this.currentAcademyId),
                this.supabase.from('lessons').select('id').eq('academy_id', this.currentAcademyId),
                this.supabase.from('subscriptions').select('student_id').eq('academy_id', this.currentAcademyId)
            ]);

            document.getElementById('totalCourses').textContent = coursesRes.data?.length || 0;
            document.getElementById('totalLessons').textContent = lessonsRes.data?.length || 0;
            
            const uniqueStudents = new Set(studentsRes.data?.map(s => s.student_id)).size;
            document.getElementById('totalStudents').textContent = uniqueStudents;

            // تحديث الرسم البياني
            await this.updateLessonsChart();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('خطأ في تحميل بيانات النظرة العامة', 'error');
        }
    }

    async updateLessonsChart() {
        try {
            const { data: courses } = await this.supabase
                .from('courses')
                .select('id,name')
                .eq('teacher_id', this.currentUserId);

            if (!courses || courses.length === 0) return;

            const chartData = await Promise.all(courses.map(async course => {
                const { count } = await this.supabase
                    .from('lessons')
                    .select('*', { count: 'exact', head: true })
                    .eq('course_id', course.id);
                return { name: course.name, lessons: count || 0 };
            }));

            this.renderMobileChart(chartData);
        } catch (error) {
            console.error('Error updating chart:', error);
        }
    }

    renderMobileChart(data) {
        const ctx = document.getElementById('lessonsChart');
        if (!ctx) return;

        if (this.lessonsChart) {
            this.lessonsChart.destroy();
        }

        this.lessonsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    label: 'عدد الدروس',
                    data: data.map(d => d.lessons),
                    backgroundColor: '#5B8DEE',
                    borderColor: '#3D5ACE',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    async loadProfileData() {
        try {
            const container = document.getElementById('profileContainer');
            container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';

            if (!this.currentUserId) {
                container.innerHTML = '<p class="no-data">يرجى تسجيل الدخول</p>';
                return;
            }

            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUserId)
                .single();

            if (error) throw error;

            if (!profile) {
                container.innerHTML = '<p class="no-data">لا توجد بيانات</p>';
                return;
            }

            // جلب سجل الحضور الأخير
            const { data: attendance } = await this.supabase
                .from('teacher_attendance')
                .select('*')
                .eq('teacher_id', this.currentUserId)
                .order('date', { ascending: false })
                .limit(5);

            let html = `
                <div class="profile-info">
                    <div class="info-item">
                        <label>الاسم الكامل:</label>
                        <span>${profile.full_name || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>البريد الإلكتروني:</label>
                        <span>${profile.email || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>رقم الهاتف:</label>
                        <span>${profile.phone || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <label>التخصص:</label>
                        <span>${profile.specialty || 'غير محدد'}</span>
                    </div>
                </div>
                
                <div class="attendance-history">
                    <h3 class="section-title">سجل الحضور الأخير</h3>
            `;

            if (attendance && attendance.length > 0) {
                html += '<div class="attendance-list">';
                attendance.forEach(record => {
                    const checkIn = record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('ar-EG') : '-';
                    const checkOut = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('ar-EG') : '-';
                    html += `
                        <div class="attendance-item">
                            <div class="attendance-date">${new Date(record.date).toLocaleDateString('ar-EG')}</div>
                            <div class="attendance-times">
                                <span>حضور: ${checkIn}</span>
                                <span>انصراف: ${checkOut}</span>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
            } else {
                html += '<p class="no-data">لا توجد سجلات حضور</p>';
            }

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading profile data:', error);
            document.getElementById('profileContainer').innerHTML = '<p class="no-data error">خطأ في تحميل البيانات</p>';
        }
    }

    async loadCoursesData() {
        try {
            const container = document.getElementById('coursesContainer');
            container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';

            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .eq('teacher_id', this.currentUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="no-data">لا توجد كورسات مسندة لك</p>';
                return;
            }

            let html = '<div class="courses-list">';
            data.forEach(course => {
                html += `
                    <div class="course-card" data-course-name="${course.name.toLowerCase()}">
                        <div class="course-title">${course.name}</div>
                        <div class="course-meta">
                            <div class="meta-item">
                                <span class="meta-label">الوصف:</span>
                                <span>${course.description || 'لا يوجد وصف'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">تاريخ البدء:</span>
                                <span>${course.start_date ? new Date(course.start_date).toLocaleDateString('ar-EG') : '-'}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading courses data:', error);
            document.getElementById('coursesContainer').innerHTML = '<p class="no-data error">خطأ في تحميل البيانات</p>';
        }
    }

    async loadStudentsData() {
        try {
            const container = document.getElementById('studentsContainer');
            container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';

            // جلب الكورسات أولاً
            const { data: myCourses } = await this.supabase
                .from('courses')
                .select('id')
                .eq('teacher_id', this.currentUserId);

            const courseIds = myCourses?.map(c => c.id) || [];
            if (courseIds.length === 0) {
                container.innerHTML = '<p class="no-data">لا يوجد كورسات</p>';
                return;
            }

            // جلب الاشتراكات
            const { data: subs } = await this.supabase
                .from('subscriptions')
                .select('student_id')
                .in('course_id', courseIds);

            const studentIds = [...new Set(subs?.map(s => s.student_id) || [])];
            if (studentIds.length === 0) {
                container.innerHTML = '<p class="no-data">لا يوجد طلاب</p>';
                return;
            }

            // جلب بيانات الطلاب
            const { data: students } = await this.supabase
                .from('students')
                .select('full_name,email,phone')
                .in('id', studentIds);

            let html = '<div class="students-list">';
            students?.forEach(s => {
                html += `
                    <div class="student-card" data-student-name="${s.full_name.toLowerCase()}">
                        <div class="student-title">${s.full_name}</div>
                        <div class="student-meta">
                            <div class="meta-item">
                                <span class="meta-label">البريد:</span>
                                <span>${s.email || 'لا يوجد'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">الهاتف:</span>
                                <span>${s.phone || 'لا يوجد'}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html || '<p class="no-data">لا يوجد طلاب</p>';

        } catch (error) {
            console.error('Error loading students data:', error);
            document.getElementById('studentsContainer').innerHTML = '<p class="no-data error">خطأ في تحميل البيانات</p>';
        }
    }

    filterCourses(searchTerm) {
        const courses = document.querySelectorAll('.course-card');
        const term = searchTerm.toLowerCase();
        
        courses.forEach(course => {
            const courseName = course.getAttribute('data-course-name');
            if (courseName.includes(term)) {
                course.style.display = 'block';
            } else {
                course.style.display = 'none';
            }
        });
    }

    filterStudents(searchTerm) {
        const students = document.querySelectorAll('.student-card');
        const term = searchTerm.toLowerCase();
        
        students.forEach(student => {
            const studentName = student.getAttribute('data-student-name');
            if (studentName.includes(term)) {
                student.style.display = 'block';
            } else {
                student.style.display = 'none';
            }
        });
    }

    async loadExamsData() {
        // سيتم تنفيذ هذا في ملف منفصل
        const container = document.getElementById('examsContainer');
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
        
        // تنفيذ تحميل الاختبارات هنا
    }

    async loadAttendancesData() {
        // سيتم تنفيذ هذا في ملف منفصل
        const container = document.getElementById('attendancesContainer');
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
        
        // تنفيذ تحميل الحضور هنا
    }

    async loadReportsData() {
        try {
            const container = document.getElementById('reportsContainer');
            container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';

            if (!this.currentAcademyId || !this.currentUserId) {
                container.innerHTML = '<p class="no-data">لا يمكن تحميل البيانات</p>';
                return;
            }

            // إحصائيات بسيطة للتقرير
            const { data: myCourses } = await this.supabase
                .from('courses')
                .select('id')
                .eq('teacher_id', this.currentUserId);

            const courseIds = myCourses?.map(c => c.id) || [];

            let html = `
                <div class="stats-grid">
                    <div class="stat-card mobile-stat">
                        <i class="stat-icon fas fa-book"></i>
                        <div class="stat-info">
                            <span class="stat-label">الكورسات</span>
                            <span class="stat-value">${courseIds.length}</span>
                        </div>
                    </div>
                    <div class="stat-card mobile-stat">
                        <i class="stat-icon fas fa-users"></i>
                        <div class="stat-info">
                            <span class="stat-label">الطلاب</span>
                            <span class="stat-value" id="reportStudents">0</span>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading reports data:', error);
            document.getElementById('reportsContainer').innerHTML = '<p class="no-data error">خطأ في تحميل البيانات</p>';
        }
    }

    showAlert(message, type = 'success') {
        const alert = document.getElementById('statusMessage');
        alert.textContent = message;
        alert.className = `alert-mobile ${type
