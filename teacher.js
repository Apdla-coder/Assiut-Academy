            // Supabase Configuration
            const supabaseUrl = "https://zefsmckaihzfiqqbdake.supabase.co"
            const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtY2thaWh6ZmlxcWJkYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzUzNTgsImV4cCI6MjA2OTgxMTM1OH0.vktk2VkEPtMclb6jb_pFa1DbrqWX9SOZRsBR577o5mc"
            const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)
            
            // متغيرات عامة
            let currentUserId = null;
            let currentUserData = null;
            let courses = [];
            let students = [];
            let attendances = [];
            let currentCourseId = null;
            let currentCourseModules = [];
            let currentCourseLessons = [];
            let lessonsPerCourseChart = null;
            let lessonsByCourse = {};
            let exams = []; // لتخزين بيانات الاختبارات
            let qrScanner = null;
let scannedStudents = new Set();

            // DOM Elements
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const menuToggle = document.getElementById('menuToggle');
            
            // Toggle sidebar on mobile
            menuToggle.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.toggle('active');
                } else {
                    sidebar.classList.toggle('collapsed');
                    mainContent.classList.toggle('sidebar-collapsed');
                }
            });
            
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (event) => {
                if (window.innerWidth <= 768 &&
                    !sidebar.contains(event.target) &&
                    !menuToggle.contains(event.target) &&
                    sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            });
            
            // دالة مساعدة آمنة لتعيين النص لعنصر بواسطة id (لا تُلقي خطأ إذا كان العنصر مفقوداً)
            function safeSetTextById(id, text) {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = text;
                } else {
                    console.warn(`safeSetTextById: element with id="${id}" not found.`);
                }
            }

            // دالة لعرض رسائل الحالة (آمنة — تتحقق من وجود العنصر)
            function showStatus(message, type = 'success') {
                const statusDiv = document.getElementById('statusMessage');
                if (!statusDiv) {
                    // لا نرمي خطأ حتى لا يتوقف تنفيذ السكربت إذا كانت الصفحة بسيطة
                    console.warn('عنصر statusMessage غير موجود في الصفحة. (showStatus)');
                    return;
                }
                statusDiv.textContent = message;
                statusDiv.className = `status-message ${type}`;
                statusDiv.style.display = 'block';
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 5000);
            }
            
            // دالة لإغلاق النوافذ المنبثقة
            function closeModal(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                }
            }
            
            // دالة لتبديل التبويبات الرئيسية
            function switchTab(tabName) {
                // إخفاء جميع محتويات التبويبات
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.style.display = 'none';
                });
                // إظهار التبويب المطلوب
                const activeTab = document.getElementById(`${tabName}Content`);
                if (activeTab) {
                    activeTab.style.display = 'block';
                }
                // تحميل البيانات حسب التبويب
                if (tabName === 'dashboard') {
                    loadDashboardData();
                } else if (tabName === 'profile') {
                    loadProfileData();
                } else if (tabName === 'courses') {
                    loadCourses();
                } else if (tabName === 'students') {
                    loadTeacherStudents();
                } else if (tabName === 'attendances') {
                    loadTeacherAttendances();
                } else if (tabName === 'exams') { // إضافة تبويب الاختبارات
                    loadTeacherExams(); // تحميل الاختبارات
                } else if (tabName === 'myattendance') {
                    loadMyAttendance();
                }
                // Close sidebar on mobile after selection
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.remove('active');
                    }
                }
            }
            
            // دالة لتحديد الرابط النشط في القائمة الجانبية
            function setActiveLink(element) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                element.classList.add('active');
            }
            
            // دوال مساعدة للتنسيق
            function formatCurrency(amount) {
                if (amount === null || amount === undefined || isNaN(amount)) return '0.00 ج.م';
                return `${parseFloat(amount).toFixed(2)} ج.م`;
            }
            
            function formatDate(dateString) {
                if (!dateString) return '-';
                const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
                return new Date(dateString).toLocaleDateString('ar-EG', options);
            }
            
            // دالة لتبديل تبويبات تفاصيل الكورس داخل النافذة المنبثقة
            function switchCourseDetailTab(tabName) {
                // إزالة الفئة النشطة من جميع أزرار التبويب
                document.querySelectorAll('#courseDetailModal .tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                // إضافة الفئة النشطة لزر التبويب المضغوط
                event.currentTarget.classList.add('active');
                // إخفاء جميع محتويات التبويبات
                document.querySelectorAll('.course-detail-tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                // إظهار محتوى التبويب المطلوب
                const activeTabContent = document.getElementById(`course${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
                if (activeTabContent) {
                    activeTabContent.classList.add('active');
                }
                // تحميل البيانات حسب التبويب
                if (tabName === 'modules') {
                    if (currentCourseId) {
                        loadCourseModulesAndLessons(currentCourseId);
                    } else {
                        document.getElementById('modulesList').innerHTML = '<p class="no-data error">خطأ: لم يتم تحديد كورس.</p>';
                    }
                }
            }
            
// 🟢 دالة لتحميل بيانات المستخدم الحالي
async function loadUserData() {
    try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError) throw authError;

        // لو مفيش مستخدم -> وديه على تسجيل الدخول
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        currentUserId = user.id;

        // ✅ ضمان وجود المستخدم في جدول users (upsert)
        const { error: upsertError } = await supabaseClient
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'المعلم',
                role: 'teacher' // أو سيبها فاضية لو ممكن يتغير الدور لاحقًا
            }, { onConflict: 'id' });

        if (upsertError) {
            console.error('❌ خطأ أثناء upsert للمستخدم:', upsertError);
        }

        // جلب بيانات المستخدم من جدول users
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id, full_name, role, specialty')
            .eq('id', currentUserId)
            .maybeSingle();

        if (userError && userError.code !== 'PGRST116') {
            throw userError;
        }

        if (userData) {
            currentUserData = userData;

            // الاسم اللي هيظهر
            let displayName = userData.full_name || 'المعلم';

            // تحقق من الدور
            const params = new URLSearchParams(window.location.search);
            const teacherParam = params.get('teacher_id') || params.get('teacherId');

            if (userData.role !== 'teacher') {
                if (teacherParam) {
                    // لو المستخدم Admin أو غيره، وجايب teacher_id من الرابط
                    const { data: teacherUser, error: teacherErr } = await supabaseClient
                        .from('users')
                        .select('id, full_name, role')
                        .eq('id', teacherParam)
                        .maybeSingle();

                    if (!teacherErr && teacherUser && teacherUser.role === 'teacher') {
                        displayName = teacherUser.full_name || displayName;
                        window.currentViewedTeacherId = teacherUser.id;
                    } else {
                        console.warn('⚠️ لم يُعثر على مستخدم teacher بهذا المعرف.');
                        return;
                    }
                } else {
                    showStatus('ليس لديك الصلاحية للوصول إلى هذه الصفحة.', 'error');
                    document.querySelector('.content').innerHTML =
                      '<p class="no-data error">ليس لديك الصلاحية للوصول إلى هذه الصفحة.</p>';
                    return;
                }
            }

            // تحديث الهيدر
            const userNameHeaderElement = document.getElementById('userNameHeader');
            if (userNameHeaderElement) {
                userNameHeaderElement.textContent = `أهلاً بك، ${displayName}`;
            }

            // تحديث البروفايل
            const profileNameEl = document.getElementById('profileName');
            if (profileNameEl) {
                profileNameEl.textContent =
                    displayName || (currentUserData && currentUserData.full_name) || 'غير محدد';
            }

            // تحميل بيانات الداشبورد
            await loadDashboardData();
        } else {
            console.warn('⚠️ لم يتم العثور على بيانات للمستخدم الحالي.');
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        showStatus('خطأ في تحميل بيانات المستخدم', 'error');
    }
}
            
            // دالة لتحميل بيانات لوحة التحكم (الإحصائيات)
            async function loadDashboardData() {
                try {
                    // 1. عدد الكورسات المسندة للمعلم
                    const { count: coursesCount, error: coursesCountError } = await supabaseClient
                        .from('courses')
                        .select('*', { count: 'exact', head: true })
                        .eq('teacher_id', currentUserId);
                    if (coursesCountError) throw coursesCountError;
                    safeSetTextById('totalCourses', coursesCount || 0);
                    
                    // 2. عدد الدروس في الكورسات المسندة للمعلم
                    const { data: teacherCourses, error: coursesError } = await supabaseClient
                        .from('courses')
                        .select('id')
                        .eq('teacher_id', currentUserId);
                    if (coursesError) throw coursesError;
                    const courseIds = (teacherCourses || []).map(c => c.id);
                    let lessonsCount = 0;
                    if (courseIds.length > 0) {
                        const { count, error: lessonsCountError } = await supabaseClient
                            .from('lessons')
                            .select('*', { count: 'exact', head: true })
                            .in('course_id', courseIds);
                        if (lessonsCountError) throw lessonsCountError;
                        lessonsCount = count || 0;
                    }
                    safeSetTextById('totalLessons', lessonsCount);
                    
                    // 3. عدد الطلاب في الكورسات المسندة للمعلم
                    let studentsCount = 0;
                    if (courseIds.length > 0) {
                        const { count, error: subscriptionsCountError } = await supabaseClient
                            .from('subscriptions')
                            .select('*', { count: 'exact', head: true })
                            .in('course_id', courseIds);
                        if (subscriptionsCountError) throw subscriptionsCountError;
                        studentsCount = count || 0;
                    }
                    safeSetTextById('totalStudents', studentsCount);
                    
                    // 4. إنشاء الرسم البياني
                    await loadLessonsPerCourseChartData();
                } catch (error) {
                    console.error('Error loading dashboard data:', error);
                    showStatus('خطأ في تحميل بيانات لوحة التحكم', 'error');
                }
            }
            
            // دالة لتحميل بيانات الرسم البياني (عدد الدروس لكل كورس)
            async function loadLessonsPerCourseChartData() {
                try {
                    const chartCtx = document.getElementById('lessonsPerCourseChart');
                    if (!chartCtx) return;
                    
                    // أولاً نجيب الكورسات الخاصة بالمعلم
                    const { data: teacherCourses, error: coursesError } = await supabaseClient
                        .from('courses')
                        .select('id, name')
                        .eq('teacher_id', currentUserId);
                    if (coursesError) throw coursesError;
                    const courseIds = (teacherCourses || []).map(c => c.id);
                    const courseNames = (teacherCourses || []).map(c => c.name);
                    
                    // بعدين نحسب عدد الدروس لكل كورس
                    const lessonsPerCourse = {};
                    if (courseIds.length > 0) {
                        const { data: lessonsData, error: lessonsError } = await supabaseClient
                            .from('lessons')
                            .select('course_id')
                            .in('course_id', courseIds);
                        if (lessonsError) throw lessonsError;
                        
                        lessonsData.forEach(lesson => {
                            lessonsPerCourse[lesson.course_id] = (lessonsPerCourse[lesson.course_id] || 0) + 1;
                        });
                    }
                    
                    // تحضير البيانات للرسم البياني
                    const lessonCounts = courseIds.map(id => lessonsPerCourse[id] || 0);
                    
                    // تدمير الرسم البياني السابق إذا كان موجودًا
                    if (lessonsPerCourseChart) {
                        lessonsPerCourseChart.destroy();
                    }
                    
                    // إنشاء الرسم البياني الجديد
                    lessonsPerCourseChart = new Chart(chartCtx, {
                        type: 'bar',
                        data: {
                            labels: courseNames,
                            datasets: [{
                                label: 'عدد الدروس',
                                data: lessonCounts,
                                backgroundColor: 'rgba(249, 115, 22, 0.7)',
                                borderColor: 'rgba(249, 115, 22, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error loading chart data:', error);
                    const chartContainer = document.querySelector('.chart-container');
                    if (chartContainer) {
                        chartContainer.innerHTML = `<p class="no-data">خطأ في تحميل الرسم البياني: ${error.message}</p>`;
                    }
                }
            }
            
            // دالة لعرض تفاصيل الكورس في نافذة منبثقة
            async function showCourseDetails(courseId) {
                const course = courses.find(c => c.id === courseId);
                if (!course) {
                    showStatus('الكورس غير موجود', 'error');
                    return;
                }
                if (!courseId) {
                    showStatus('خطأ: معرف الكورس غير صحيح', 'error');
                    return;
                }
                currentCourseId = courseId;
                
                // ملء بيانات النافذة المنبثقة
                document.getElementById('courseDetailTitle').textContent = course.name;
                document.getElementById('detailCourseName').textContent = course.name;
                document.getElementById('detailCourseDescription').textContent = course.description || '-';
                document.getElementById('detailCourseStartDate').textContent = course.start_date ? formatDate(course.start_date) : '-';
                document.getElementById('detailCourseEndDate').textContent = course.end_date ? formatDate(course.end_date) : '-';
                
                // عرض النافذة المنبثقة
                const modal = document.getElementById('courseDetailModal');
                if (modal) {
                    modal.style.display = 'flex';
                } else {
                    showStatus('خطأ في فتح نافذة التفاصيل', 'error');
                    return;
                }
                
                // إعادة تعيين تبويبات النافذة المنبثقة إلى "نظرة عامة"
                document.querySelectorAll('#courseDetailModal .tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelector('#courseDetailModal .tab-button').classList.add('active');
                document.querySelectorAll('.course-detail-tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.getElementById('courseOverviewTab').classList.add('active');
                
                // تفريغ محتوى الوحدات والدروس
                document.getElementById('modulesList').innerHTML = '<p class="no-data">جاري التحميل...</p>';
            }
            
            // دالة لتحميل الوحدات والدروس الخاصة بكورس معين
            async function loadCourseModulesAndLessons(courseId) {
                const modulesListContainer = document.getElementById('modulesList');
                if (!modulesListContainer) {
                    return;
                }
                modulesListContainer.innerHTML = '<p class="no-data">جاري التحميل...</p>';
                currentCourseModules = [];
                currentCourseLessons = [];
                
                try {
                    // 1. تحميل الوحدات
                    const { data: modulesData, error: modulesError } = await supabaseClient
                        .from('modules')
                        .select('id, title, description, "order"')
                        .eq('course_id', courseId)
                        .order('"order"', { ascending: true });
                    if (modulesError) {
                        throw modulesError;
                    }
                    currentCourseModules = modulesData || [];
                    
                    // 2. تحميل جميع الدروس لهذا الكورس
                    const { data: lessonsData, error: lessonsError } = await supabaseClient
                        .from('lessons')
                        .select('id, title, description, date, module_id')
                        .eq('course_id', courseId);
                    if (lessonsError) {
                        throw lessonsError;
                    }
                    currentCourseLessons = lessonsData || [];
                    
                    // 3. عرض الوحدات والدروس
                    displayModulesAndLessons();
                } catch (error) {
                    console.error('Error loading modules and lessons for course:', courseId, error);
                    const errorMessage = error.message || 'خطأ غير معروف';
                    modulesListContainer.innerHTML = `<p class="no-data error">خطأ في تحميل الوحدات والدروس: ${errorMessage}</p>`;
                    showStatus(`خطأ في تحميل بيانات الوحدات والدروس: ${errorMessage}`, 'error');
                }
            }
            
            // دالة لعرض الوحدات والدروس في نافذة تفاصيل الكورس
            function displayModulesAndLessons() {
                const modulesListContainer = document.getElementById('modulesList');
                if (!modulesListContainer) {
                    return;
                }
                
                if (currentCourseModules.length === 0) {
                    modulesListContainer.innerHTML = '<p class="no-data">لا توجد وحدات في هذا الكورس.</p>';
                    return;
                }
                
                // تجميع الدروس حسب module_id
                const lessonsByModule = {};
                currentCourseLessons.forEach(lesson => {
                    if (!lessonsByModule[lesson.module_id]) {
                        lessonsByModule[lesson.module_id] = [];
                    }
                    lessonsByModule[lesson.module_id].push(lesson);
                });
                
                // إنشاء HTML للوحدات والدروس
                let modulesHtml = '';
                currentCourseModules.forEach(module => {
                    const moduleLessons = lessonsByModule[module.id] || [];
                    modulesHtml += `
                    <div class="module-card">
                        <div class="module-header">
                            <h3>${module.title}</h3>
                            <p>${module.description || ''}</p>
                        </div>
                        <div class="lessons-list">
                            ${moduleLessons.length > 0 ?
                            moduleLessons.map(lesson => `
                                <div class="lesson-item">
                                    <div class="lesson-info">
                                        <strong>${lesson.title}</strong>
                                        <p>${lesson.description || ''}</p>
                                        <small>التاريخ: ${lesson.date ? formatDate(lesson.date) : '-'}</small>
                                    </div>
                                </div>
                                `).join('') :
                            '<p class="no-data">لا توجد دروس في هذه الوحدة.</p>'
                        }
                        </div>
                    </div>
                    `;
                });
                modulesListContainer.innerHTML = modulesHtml;
            }
            
            // دالة لتحميل الكورسات الخاصة بالمعلم
            async function loadCourses() {
                try {
                    const container = document.getElementById('coursesContainer');
                    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل بيانات الكورسات...</p></div>`;
                    
                    // جلب الكورسات الخاصة بالمعلم فقط
                    const { data, error } = await supabaseClient
                        .from('courses')
                        .select(`*`)
                        .eq('teacher_id', currentUserId)
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    
                    courses = data;
                    if (!courses || courses.length === 0) {
                        container.innerHTML = `<p class="no-data">لا توجد كورسات مسندة لك.</p>`;
                        return;
                    }
                    
                    // إنشاء قائمة بطاقات الكورسات
                    let coursesHtml = '<div class="card-list">';
                    data.forEach(course => {
                        coursesHtml += `
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">${course.name}</div>
                                <button class="btn btn-primary btn-xs" onclick="showCourseDetails('${course.id}')">عرض التفاصيل</button>
                            </div>
                            <div class="card-content">
                                <div class="card-field">
                                    <span class="field-label">الوصف:</span>
                                    <span class="field-value">${course.description || '-'}</span>
                                </div>
                                <div class="card-field">
                                    <span class="field-label">البداية:</span>
                                    <span class="field-value">${course.start_date ? formatDate(course.start_date) : '-'}</span>
                                </div>
                                <div class="card-field">
                                    <span class="field-label">النهاية:</span>
                                    <span class="field-value">${course.end_date ? formatDate(course.end_date) : '-'}</span>
                                </div>
                            </div>
                        </div>
                        `;
                    });
                    coursesHtml += '</div>';
                    container.innerHTML = coursesHtml;
                } catch (error) {
                    console.error('Error loading courses:', error);
                    document.getElementById('coursesContainer').innerHTML = `<p class="no-data error">خطأ في تحميل الكورسات: ${error.message}</p>`;
                }
            }
            
// دالة محدثة لتحميل الاختبارات الخاصة بالمعلم بشكل تدريجي
async function loadTeacherExams() {
    console.log("🔍 [اختباراتي] بدء تحميل الاختبارات للمعلم:", currentUserId);
    const container = document.getElementById('examsContainer');
    if (!container) {
        console.error("❌ عنصر examsContainer غير موجود");
        showStatus('خطأ في عرض بيانات الاختبارات.', 'error');
        return;
    }

    try {
        // 1. جلب الكورسات الخاصة بالمعلم
        const { data: teacherCourses, error: coursesError } = await supabaseClient
            .from('courses')
            .select('id, name')
            .eq('teacher_id', currentUserId);
        if (coursesError) throw coursesError;

        if (!teacherCourses?.length) {
            container.innerHTML = '<p class="no-data">⚠️ لا توجد كورسات مسندة لك.</p>';
            return;
        }

        // 2. جلب جميع الامتحانات الخاصة بهذه الكورسات
        const courseIds = teacherCourses.map(c => c.id);
        const { data: examsData, error: examsError } = await supabaseClient
            .from('exams')
            .select('*')
            .in('course_id', courseIds);
        if (examsError) throw examsError;

        // إنشاء خريطة لتسهيل الوصول إلى اسم الكورس وامتحاناته
        const courseMap = {};
        const examsByCourse = {}; // { courseId: [exam1, exam2, ...] }
        teacherCourses.forEach(course => {
            courseMap[course.id] = course.name;
            examsByCourse[course.id] = [];
        });
        examsData.forEach(exam => {
            if (examsByCourse[exam.course_id]) {
                examsByCourse[exam.course_id].push(exam);
            }
        });


        // 3. إنشاء واجهة التصفية (كورس -> امتحان)
let html = `
    <div class="filter-section" style="
        margin-bottom: 20px; 
        padding: 20px; 
        border: 1px solid #ddd; 
        border-radius: 8px; 
        background-color: #f9f9f9;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    ">
        <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: end;">
            <div style="flex: 1; min-width: 250px;">
                <label for="examCourseFilter" style="display: block; margin-bottom: 6px; font-weight: 600;     color: var(--primary);
">
                    اختر الكورس:
                </label>
                <select id="examCourseFilter" style="
                    width: 100%; 
                    padding: 10px; 
                    border: 1px solid #ccc; 
                    border-radius: 4px; 
                    font-size: 16px;
                    background-color: #fff;
                    box-sizing: border-box;
                ">
                    <option value="">-- اختر كورسًا --</option>
                    ${teacherCourses.map(course => `<option value="${course.id}">${course.name}</option>`).join('')}
                </select>
            </div>

            <div style="flex: 1; min-width: 250px;">
                <label for="examSelectFilter" style="display: block; margin-bottom: 6px; font-weight: 600;     color: var(--primary);
">
                    اختر الاختبار:
                </label>
                <select id="examSelectFilter" style="
                    width: 100%; 
                    padding: 10px; 
                    border: 1px solid #ccc; 
                    border-radius: 4px; 
                    font-size: 16px;
    background-color: var(--sidebar-width);
                    box-sizing: border-box;
                " disabled>
                    <option value="">-- اختر كورسًا أولاً --</option>
                </select>
            </div>

            <div style="flex-shrink: 0;">
                <button id="loadExamDataBtn" style="
                    padding: 10px 20px; 
                    background-color: #3498db; 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-size: 16px;
                    font-weight: 500;
                    height: 100%;
                    display: none;
                    transition: background-color 0.3s;
                " onmouseover="this.style.backgroundColor='#2980b9'" onmouseout="this.style.backgroundColor='#3498db'">
                    عرض بيانات الطلاب
                </button>
            </div>
        </div>
    </div>
    <div id="examStudentsTableContainer"></div>
`;
        container.innerHTML = html;

        const courseFilter = document.getElementById('examCourseFilter');
        const examFilter = document.getElementById('examSelectFilter');
        const loadBtn = document.getElementById('loadExamDataBtn');
        const tableContainer = document.getElementById('examStudentsTableContainer');

        // 4. عند تغيير اختيار الكورس
        courseFilter.addEventListener('change', function () {
            const selectedCourseId = this.value;
            examFilter.innerHTML = '<option value="">-- اختر اختبار --</option>';
            examFilter.disabled = true;
            loadBtn.style.display = 'none';
            tableContainer.innerHTML = '';

            if (selectedCourseId && examsByCourse[selectedCourseId] && examsByCourse[selectedCourseId].length > 0) {
                examsByCourse[selectedCourseId].forEach(exam => {
                    const option = document.createElement('option');
                    option.value = exam.id;
                    // عرض اسم الامتحان ودرجة التميز
                    option.textContent = `${exam.title} (/${exam.max_score})`;
                    examFilter.appendChild(option);
                });
                examFilter.disabled = false;
            } else if (selectedCourseId) {
                 examFilter.innerHTML = '<option value="">-- لا توجد اختبارات لهذا الكورس --</option>';
                 examFilter.disabled = true;
            }
        });

        // 5. عند تغيير اختيار الامتحان
        examFilter.addEventListener('change', function() {
            const selectedExamId = this.value;
            if (selectedExamId) {
                loadBtn.style.display = 'inline-block';
                 // يمكنك اختيارياً تحميل البيانات مباشرة عند اختيار الامتحان بدلاً من النقر على زر
                 // loadExamStudentData(courseFilter.value, selectedExamId);
            } else {
                loadBtn.style.display = 'none';
                tableContainer.innerHTML = '';
            }
        });

        // 6. عند النقر على زر تحميل بيانات الطلاب
        loadBtn.addEventListener('click', function() {
             const selectedCourseId = courseFilter.value;
             const selectedExamId = examFilter.value;
             if (selectedCourseId && selectedExamId) {
                 loadExamStudentData(selectedCourseId, selectedExamId);
             }
        });

         // (اختياري) تحميل تلقائي عند اختيار الامتحان
        // examFilter.addEventListener('change', function() {
        //     const selectedCourseId = courseFilter.value;
        //     const selectedExamId = this.value;
        //     if (selectedCourseId && selectedExamId) {
        //         loadExamStudentData(selectedCourseId, selectedExamId);
        //     } else {
        //         tableContainer.innerHTML = '';
        //     }
        // });


    } catch (error) {
        console.error('💥 خطأ غير متوقع في loadTeacherExams:', error);
        container.innerHTML = `<p class="no-data error">❌ حدث خطأ أثناء تحميل بيانات الاختبارات: ${error.message}</p>`;
        showStatus('خطأ في تحميل بيانات الاختبارات.', 'error');
    }
}

// دالة جديدة لتحميل وعرض بيانات الطلاب لكورس واختبار محددين

// دالة محدثة لحفظ درجة الطالب في امتحان معين
async function saveStudentScore(studentId, examId) {
    // جلب القيم من الحقول الخاصة بالطالب الحالي
    const scoreInput = document.getElementById(`score-${studentId}`);
    const dateInput = document.getElementById(`exam-date-${studentId}`);

    const score = scoreInput ? scoreInput.value : '';
    const examDate = dateInput ? dateInput.value : '';

    // التحقق من صحة المدخلات
    if (!examId) {
        alert('⚠️ خطأ: معرف الاختبار غير متوفر.');
        return;
    }
    if (score === '' || isNaN(score) || parseFloat(score) < 0) {
        alert('⚠️ يرجى إدخال درجة صحيحة (رقم غير سالب).');
        return;
    }

    // جلب درجة التميز من الجدول لإجراء تحقق إضافي (اختياري لكن يُفضل)
    // أو افترض أنها تم التحقق منها مسبقًا في واجهة المستخدم
    // const maxScore = ... ; // يمكن جلبه أو تمريره

    // if (parseFloat(score) > maxScore) {
    //     alert(`⚠️ الدرجة لا يمكن أن تتجاوز درجة التميز (${maxScore}).`);
    //     return;
    // }


    console.log(`💾 محاولة حفظ الدرجة ${score} للطالب ${studentId} في الاختبار ${examId} بتاريخ ${examDate}`);

    try {
        const { error } = await supabaseClient
            .from('exam_scores')
            .upsert({
                exam_id: examId,
                student_id: studentId,
                score: parseFloat(score), // التأكد من أنها رقم
                exam_date: examDate || null // السماح بـ null إذا لم يتم إدخال تاريخ
            }, {
                onConflict: 'exam_id,student_id' // تحديد الأعمدة للصراع عند التحديث
            });

        if (error) {
            console.error('❌ خطأ أثناء حفظ الدرجة:', error);
            alert(`❌ حدث خطأ أثناء حفظ الدرجة: ${error.message}`);
            showStatus(`خطأ في حفظ درجة الطالب: ${error.message}`, 'error');
        } else {
            console.log(`✅ تم حفظ الدرجة ${score} للطالب ${studentId} بنجاح.`);
            alert('✅ تم حفظ الدرجة بنجاح');
            showStatus(`تم حفظ درجة الطالب بنجاح.`, 'success');
            // (اختياري) تحديث الحقل ليظهر أنه تم الحفظ (مثلاً بتغيير اللون مؤقتًا)
             scoreInput.style.backgroundColor = '#d4edda'; // لون أخضر فاتح
             setTimeout(() => { scoreInput.style.backgroundColor = ''; }, 1500);
        }
    } catch (err) {
         console.error('💥 خطأ غير متوقع أثناء حفظ الدرجة:', err);
         alert('❌ حدث خطأ غير متوقع أثناء حفظ الدرجة.');
         showStatus('خطأ غير متوقع أثناء حفظ الدرجة.', 'error');
    }
}

// دالة جديدة لتحميل وعرض بيانات الطلاب لكورس واختبار محددين
// دالة جديدة لتحميل وعرض بيانات الطلاب لكورس واختبار محددين
async function loadExamStudentData(courseId, examId) {
    const tableContainer = document.getElementById('examStudentsTableContainer');
    if (!tableContainer) {
        console.error("❌ عنصر examStudentsTableContainer غير موجود");
        showStatus('خطأ في عرض بيانات الطلاب.', 'error');
        return;
    }

    tableContainer.innerHTML = '<p>⏳ جاري تحميل بيانات الطلاب والاختبار...</p>';

    try {
        // 1. التحقق من صحة المدخلات
        if (!courseId || !examId) {
            tableContainer.innerHTML = '<p class="no-data">⚠️ يرجى تحديد الكورس والاختبار.</p>';
            return;
        }

        // 2. جلب معلومات الامتحان المحدد
        const { data: examData, error: examFetchError } = await supabaseClient // تم تصحيح اسم المتغير
            .from('exams')
            .select('title, max_score, course_id')
            .eq('id', examId)
            .single();
        if (examFetchError) throw examFetchError;
        if (!examData || examData.course_id != courseId) { // تحقق إضافي
             tableContainer.innerHTML = '<p class="no-data error">❌ خطأ: بيانات الامتحان غير متسقة.</p>';
             return;
        }


        // 3. جلب الطلاب المشتركين في الكورس المحدد
        const { data: subscriptions, error: subsError } = await supabaseClient
            .from('subscriptions')
            .select('student_id, students:student_id(full_name)')
            .eq('course_id', courseId);
        if (subsError) throw subsError;

        if (!subscriptions?.length) {
            tableContainer.innerHTML = '<p class="no-data">⚠️ لا يوجد طلاب مسجلين في هذا الكورس.</p>';
            return;
        }

        const studentIds = subscriptions.map(sub => sub.student_id);

        // 4. جلب الدرجات المحفوظة مسبقًا لهذا الامتحان ولهؤلاء الطلاب
        const { data: existingScores, error: scoresError } = await supabaseClient // تم تصحيح اسم المتغير
            .from('exam_scores')
            .select('student_id, score, exam_date')
            .eq('exam_id', examId)
            .in('student_id', studentIds);
        if (scoresError) throw scoresError;

        const scoresMap = {}; // { student_id: { score, exam_date } }
        existingScores.forEach(score => {
            scoresMap[score.student_id] = { score: score.score, exam_date: score.exam_date };
        });

        // 5. إنشاء جدول عرض الطلاب وإدخال الدرجات (بشريط بحث)
        let tableHtml = `
            <h3 style="margin-top: 20px; color: #2c3e50;">📊 ${examData.title} (درجة التميز: ${examData.max_score}) - ${document.querySelector(`#examCourseFilter option[value="${courseId}"]`)?.text || 'الكورس'}</h3>
            <div style="margin:10px 0;"><input type="text" id="examStudentsSearch" placeholder="🔍 ابحث عن طالب..." style="width:100%; padding:8px; box-sizing:border-box;"></div>
            <div style="overflow-x: auto;">
            <table class="teacher-table" id="examStudentsTable">
                <thead>
                    <tr>
                        <th style="width: 40%;">اسم الطالب</th>
                        <th style="width: 20%;">التاريخ</th>
                        <th style="width: 20%;">الدرجة (/${examData.max_score})</th>
                        <th style="width: 20%;">الإجراء</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // الحصول على تاريخ اليوم بتنسيق YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        subscriptions.forEach(sub => {
            const studentName = sub.students?.full_name || 'غير معروف';
            const studentId = sub.student_id;
            const existingScoreData = scoresMap[studentId] || {};
            const existingScore = existingScoreData.score ?? '';
            // إذا لم توجد بيانات تاريخ محفوظة، استخدم تاريخ اليوم
            const existingDate = existingScoreData.exam_date ?? today; // تم التعديل هنا

            tableHtml += `
                <tr>
                    <td style="font-size: 0.9rem;">${studentName}</td>
                    <td>
                        <input type="date" id="exam-date-${studentId}" value="${existingDate}" style="padding: 5px; font-size: 0.85rem; width: 100%;">
                    </td>
                    <td>
                        <input type="number" id="score-${studentId}" min="0" max="${examData.max_score}" value="${existingScore}" style="width: 80px; padding: 5px; font-size: 0.85rem;" />
                    </td>
                    <td>
                        <button onclick="saveStudentScore('${studentId}', '${examId}')" style="padding: 5px 10px; background-color: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">💾 حفظ</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
            </div>
            <p style="margin-top: 10px; font-size: 0.8rem; color: #7f8c8d;"><i class="fas fa-info-circle"></i> ملاحظة: يمكنك تعديل التاريخ والدرجة ثم الضغط على "حفظ" لكل طالب.</p>
        `;

        tableContainer.innerHTML = tableHtml;

        // ربط البحث داخل جدول الطلاب لاختبار
        const examSearchInput = document.getElementById('examStudentsSearch');
        if (examSearchInput) {
            examSearchInput.addEventListener('input', function() {
                const q = this.value.toLowerCase();
                document.querySelectorAll('#examStudentsTable tbody tr').forEach(row => {
                    const nameCell = row.querySelector('td');
                    const name = nameCell ? nameCell.textContent.toLowerCase() : '';
                    row.style.display = name.includes(q) ? '' : 'none';
                });
            });
        }

    } catch (error) {
        console.error('💥 خطأ في loadExamStudentData:', error);
        tableContainer.innerHTML = `<p class="no-data error">❌ حدث خطأ أثناء تحميل بيانات الطلاب: ${error.message}</p>`;
        showStatus('خطأ في تحميل بيانات الطلاب.', 'error');
    }
}
// دالة محدثة لحفظ درجة الطالب في امتحان معين

async function loadTeacherStudents() {
                try {
                    const container = document.getElementById('studentsContainer');
                    container.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>جاري تحميل بيانات الطلاب...</p>
                </div>
            `;
                    
                    // 1. جلب الكورسات الخاصة بالمعلم
                    const { data: teacherCourses, error: coursesError } = await supabaseClient
                        .from('courses')
                        .select('id, name')
                        .eq('teacher_id', currentUserId);
                    if (coursesError) throw coursesError;
                    const courseIds = (teacherCourses || []).map(c => c.id);
                    const courseMap = {};
                    (teacherCourses || []).forEach(c => {
                        courseMap[c.id] = c.name;
                    });
                    
                    if (courseIds.length === 0) {
                        container.innerHTML = `<p class="no-data">لا يوجد كورسات مسندة لك، وبالتالي لا يوجد طلاب.</p>`;
                        return;
                    }
                    
                    // 2. جلب اشتراكات الطلاب
                    const { data: subscriptionsData, error: subscriptionsError } = await supabaseClient
                        .from('subscriptions')
                        .select('student_id, course_id, subscribed_at')
                        .in('course_id', courseIds);
                    if (subscriptionsError) throw subscriptionsError;
                    const studentSubscriptions = subscriptionsData || [];
                    
                    // 3. جلب بيانات الطلاب
                    const studentIds = [...new Set(studentSubscriptions.map(sub => sub.student_id))];
                    let studentData = [];
                    if (studentIds.length > 0) {
                        const { data: studentsData, error: studentsError } = await supabaseClient
                            .from('students')
                            .select('id, full_name, phone, email');
                        if (studentsError) throw studentsError;
                        studentData = studentsData || [];
                    }
                    const studentMap = {};
                    studentData.forEach(s => {
                        studentMap[s.id] = s;
                    });
                    
                    if (studentSubscriptions.length === 0) {
                        container.innerHTML = `<p class="no-data">لا يوجد طلاب مسجلين في كورساتك.</p>`;
                        return;
                    }
                    
                    // 4. عرض الطلاب + إضافة صندوق البحث
                    let studentsHtml = `
                <input type="text" id="studentSearch" class="search-box" placeholder="🔍 ابحث عن طالب...">
            `;
                    courseIds.forEach(courseId => {
                        const courseName = courseMap[courseId] || 'غير معروف';
                        const courseStudents = studentSubscriptions.filter(sub => sub.course_id === courseId);
                        studentsHtml += `
                    <div class="course-group" data-course="${courseId}">
                        <h3 class="course-title" style="font-size: 1.1rem;">${courseName}</h3>
                        <div class="card-list">
                `;
                        if (courseStudents.length > 0) {
                            courseStudents.forEach(sub => {
                                const student = studentMap[sub.student_id];
                                studentsHtml += `
                            <div class="card student-card" 
                                data-name="${student ? student.full_name.toLowerCase() : ''}" 
                                data-phone="${student ? student.phone : ''}" 
                                data-email="${student ? student.email.toLowerCase() : ''}">
                                <div class="card-header">
                                    <div class="card-title">${student ? student.full_name : 'غير معروف'}</div>
                                </div>
                                <div class="card-content">
                                    <div class="card-field">
                                        <span class="field-label">الهاتف:</span>
                                        <span class="field-value">${student ? student.phone : '-'}</span>
                                    </div>
                                    <div class="card-field">
                                        <span class="field-label">البريد الإلكتروني:</span>
                                        <span class="field-value">${student ? student.email : '-'}</span>
                                    </div>
                                    <div class="card-field">
                                        <span class="field-label">تاريخ التسجيل:</span>
                                        <span class="field-value">${sub.subscribed_at ? formatDate(sub.subscribed_at) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                            });
                        } else {
                            studentsHtml += `<p class="no-data">لا يوجد طلاب مسجلين.</p>`;
                        }
                        studentsHtml += `
                        </div>
                    </div>
                `;
                    });
                    container.innerHTML = studentsHtml;
                    
                    // 🔍 إضافة البحث
                    document.getElementById('studentSearch').addEventListener('input', function () {
                        const searchValue = this.value.toLowerCase();
                        document.querySelectorAll('.student-card').forEach(card => {
                            const name = card.dataset.name || '';
                            const phone = card.dataset.phone || '';
                            const email = card.dataset.email || '';
                            if (name.includes(searchValue) || phone.includes(searchValue) || email.includes(searchValue)) {
                                card.style.display = '';
                            } else {
                                card.style.display = 'none';
                            }
                        });
                    });
                } catch (error) {
                    console.error('Error loading teacher students:', error);
                    const errorMessage = error.message || 'خطأ غير معروف';
                    document.getElementById('studentsContainer').innerHTML = `
                <p class="no-data error">خطأ في تحميل بيانات الطلاب: ${errorMessage}</p>
            `;
                }
            }
            
// 🟢 مصفوفة الطلاب اللي اتعمل لهم سكان

// =============================
// 📌 تحميل الكورسات والدروس في نافذة الحضور
// =============================
async function loadCoursesAndLessonsForAttendance() {
    try {
        if (courses.length === 0) await loadCourses();

        const courseSelect = document.getElementById('attendanceCourseFilter');
        courseSelect.innerHTML = '<option value="">اختر كورسًا</option>';
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            courseSelect.appendChild(option);
        });

        document.getElementById('attendanceLesson').innerHTML = '<option value="">اختر كورسًا أولاً</option>';
        document.getElementById('studentAttendanceList').innerHTML =
            '<p class="no-data" style="text-align: center; margin: 20px 0;">اختر درسًا أولاً</p>';

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;
        document.getElementById('attendanceDate').disabled = false;

        lessonsByCourse = {};
        for (const course of courses) {
            const { data: lessonsData, error: lessonsError } = await supabaseClient
                .from('lessons')
                .select('id, title, date')
                .eq('course_id', course.id)
                .order('date', { ascending: true });
            lessonsByCourse[course.id] = !lessonsError && lessonsData ? lessonsData : [];
        }

        const todayDate = new Date().toISOString().split('T')[0];
        for (const courseId in lessonsByCourse) {
            const lessons = lessonsByCourse[courseId];
            const todayLesson = lessons.find(lesson => lesson.date === todayDate);
            if (todayLesson) {
                courseSelect.value = courseId;
                courseSelect.dispatchEvent(new Event('change'));
                await new Promise(resolve => setTimeout(resolve, 100));
                const lessonSelect = document.getElementById('attendanceLesson');
                lessonSelect.value = todayLesson.id;
                lessonSelect.dispatchEvent(new Event('change'));
                break;
            }
        }
    } catch (error) {
        console.error('Error loading courses and lessons for attendance:', error);
        showStatus('خطأ في تحميل الكورسات والدروس', 'error');
    }
}

// =============================
// 📌 عند تغيير الكورس
// =============================
document.getElementById('attendanceCourseFilter').addEventListener('change', function () {
    const courseId = this.value;
    const lessonSelect = document.getElementById('attendanceLesson');
    if (courseId && lessonsByCourse[courseId]) {
        lessonSelect.innerHTML = '<option value="">اختر درسًا</option>';
        lessonsByCourse[courseId].forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson.id;
            option.textContent = `${lesson.title} (${lesson.date ? formatDate(lesson.date) : 'بدون تاريخ'})`;
            lessonSelect.appendChild(option);
        });
        lessonSelect.disabled = false;
    } else {
        lessonSelect.innerHTML = '<option value="">اختر كورسًا أولاً</option>';
        lessonSelect.disabled = true;
    }
    document.getElementById('studentAttendanceList').innerHTML =
        '<p class="no-data" style="text-align: center; margin: 20px 0;">اختر درسًا أولاً</p>';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    document.getElementById('attendanceDate').disabled = false;
});

// =============================
// 📌 عند تغيير الدرس
// =============================
document.getElementById('attendanceLesson').addEventListener('change', async function () {
    const lessonId = this.value;
    const dateInput = document.getElementById('attendanceDate');
    const listContainer = document.getElementById('studentAttendanceList');
    if (lessonId) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.disabled = false;
        const courseId = document.getElementById('attendanceCourseFilter').value;
        if (courseId) {
            await loadStudentsForCourse(courseId);
        } else {
            listContainer.innerHTML = '<p class="no-data">خطأ: لم يتم تحديد الكورس.</p>';
        }
    } else {
        dateInput.value = '';
        dateInput.disabled = true;
        listContainer.innerHTML = '<p class="no-data">اختر درسًا أولاً</p>';
    }
});

// =============================
// 📌 تحميل الطلاب حسب الكورس
// =============================
async function loadStudentsForCourse(courseId) {
    try {
        const listContainer = document.getElementById('studentAttendanceList');
        if (!courseId) {
            listContainer.innerHTML = '<p class="no-data">يرجى اختيار كورس.</p>';
            return;
        }

        const { data: subscriptions, error: subsError } = await supabaseClient
            .from('subscriptions')
            .select('student_id')
            .eq('course_id', courseId);
        if (subsError) throw subsError;

        if (!subscriptions || subscriptions.length === 0) {
            listContainer.innerHTML = '<p class="no-data">لا يوجد طلاب مسجلين.</p>';
            return;
        }

        const studentIds = subscriptions.map(sub => sub.student_id);
        const { data: students, error: studentsError } = await supabaseClient
            .from('students')
            .select('id, full_name')
            .in('id', studentIds)
            .order('full_name');
        if (studentsError) throw studentsError;

        if (!students || students.length === 0) {
            listContainer.innerHTML = '<p class="no-data">لا توجد بيانات طلاب.</p>';
            return;
        }

        updateStudentListDisplay(students);
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('studentAttendanceList').innerHTML = `<p class="no-data">خطأ: ${error.message}</p>`;
    }
}

// =============================
// 📌 تسجيل الغياب مع الحضور عند Submit
// =============================
async function addAttendanceWithAbsents() {
    try {
        const lessonId = document.getElementById('attendanceLesson').value;
        const courseId = document.getElementById('attendanceCourseFilter').value;
        const date = document.getElementById('attendanceDate').value;
        const generalNotes = document.getElementById('attendanceNotes').value;

        if (!lessonId || !courseId || !date) {
            showStatus('من فضلك اختر الكورس والدرس وتأكد من التاريخ', 'error');
            return;
        }

        const { data: subscriptions, error: subError } = await supabaseClient
            .from("subscriptions")
            .select("student_id")
            .eq("course_id", courseId);
        if (subError) throw subError;

        const absentStudents = subscriptions
            .map(s => s.student_id)
            .filter(id => !scannedStudents.has(id));

        const absentRecords = absentStudents.map(id => ({
            student_id: id,
            lesson_id: lessonId,
            course_id: courseId,
            date: date,
            status: "absent",
            notes: generalNotes || null
        }));

        if (absentRecords.length > 0) {
            const { error: insertError } = await supabaseClient
                .from("attendances")
                .insert(absentRecords);
            if (insertError) throw insertError;
        }

        showStatus(`✅ تم تسجيل حضور وغياب الطلاب`, "success");
        closeModal('attendanceModal');
        if (document.getElementById('attendancesContent').style.display !== 'none') {
            loadTeacherAttendances();
        }
        scannedStudents.clear();
    } catch (error) {
        console.error("Error saving attendance:", error);
        showStatus(`خطأ في تسجيل الحضور: ${error.message}`, "error");
    }
}
document.getElementById("attendanceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addAttendanceWithAbsents();
});

// 📌 تحديث عرض قائمة الطلاب في نافذة الحضور
// =============================
function updateStudentListDisplay(students) {
    const listContainer = document.getElementById('studentAttendanceList');
    const searchTermElement = document.getElementById('studentSearchInModal');
    const searchTerm = searchTermElement ? searchTermElement.value.toLowerCase() : '';
    let html = '';

    students.forEach(student => {
        // فلترة بالبحث
        if (searchTerm && !student.full_name.toLowerCase().includes(searchTerm)) {
            return;
        }

        // 🟢 لو الطالب معمول له سكان → حاضر
        const isScanned = scannedStudents.has(student.id);
        const checkedAttr = isScanned ? 'checked' : '';
        const presentSelected = isScanned ? 'selected' : '';
        const absentSelected = !isScanned ? 'selected' : '';

        html += `
        <div class="student-item">
            <div class="student-header">
                <label class="student-name">
                    <input type="checkbox" class="student-checkbox" data-student-id="${student.id}" ${checkedAttr}>
                    ${student.full_name}
                </label>
            </div>
            <select class="student-status-select" data-student-id="${student.id}">
                <option value="present" ${presentSelected}>حاضر</option>
                <option value="absent" ${absentSelected}>غائب</option>
                <option value="late">متأخر</option>
            </select>
        </div>
        `;
    });

    if (html === '') {
        html = '<p class="no-data" style="text-align: center; margin: 20px 0; color: #666;">لا توجد نتائج للبحث.</p>';
    }

    if (listContainer) {
        listContainer.innerHTML = html;
    }
}

// =============================
// 📌 QR Scanner
// =============================
document.getElementById("startQrScan").addEventListener("click", () => {
    const qrReader = document.getElementById("qr-reader");
    qrReader.style.display = "block";
    document.getElementById("stopQrScan").style.display = "inline-block";
    document.getElementById("startQrScan").style.display = "none";

    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
            try {
                const studentData = JSON.parse(decodedText);
                const lessonId = document.getElementById("attendanceLesson").value;
                const courseId = document.getElementById("attendanceCourseFilter").value;
                const date = document.getElementById("attendanceDate").value;

                if (!lessonId || !courseId || !date) {
                    alert("⚠️ اختر الكورس والدرس قبل استخدام QR");
                    return;
                }

                if (scannedStudents.has(studentData.student_id)) {
                    console.log(`⚠️ الطالب ${studentData.student_id} اتسجل بالفعل.`);
                    return;
                }

                scannedStudents.add(studentData.student_id);

                const { error } = await supabaseClient.from("attendances").insert([{
                    student_id: studentData.student_id,
                    lesson_id: lessonId,
                    course_id: courseId,
                    date: date,
                    status: "present"
                }]);

                if (error) {
                    alert("❌ خطأ: " + error.message);
                    scannedStudents.delete(studentData.student_id);
                } else {
                    alert("✅ تم تسجيل حضور الطالب عبر QR");
                }
            } catch {
                alert("⚠️ QR غير صالح");
            }
        },
        (err) => console.warn("خطأ في قراءة QR:", err)
    );
});

document.getElementById("stopQrScan").addEventListener("click", () => {
    if (qrScanner) {
        qrScanner.stop().then(() => {
            qrScanner.clear();
            document.getElementById("qr-reader").style.display = "none";
            document.getElementById("startQrScan").style.display = "inline-block";
            document.getElementById("stopQrScan").style.display = "none";
        });
    }
});
            
// ✅ التحقق من حضور اليوم
async function checkTodayStatus() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', currentUserId)
        .eq('date', today)
        .maybeSingle();

    if (error) {
        console.error("checkTodayStatus error:", error);
        return;
    }

    if (data) {
        document.getElementById('checkInBtn').disabled = !!data.check_in_time;
        document.getElementById('checkOutBtn').disabled = !!data.check_out_time;
    }
}

// ✅ تسجيل الحضور
async function recordCheckIn() {
    const today = new Date().toISOString().split('T')[0];

    const { data: exists, error: checkError } = await supabaseClient
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', currentUserId)
        .eq('date', today)
        .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking attendance:", checkError);
        showStatus(`خطأ في التحقق من الحضور: ${checkError.message}`, 'error');
        return;
    }
    if (exists) {
        showStatus(`سجلت حضورك بالفعل في ${new Date(exists.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`, 'error');
        return;
    }

    const now = new Date().toISOString(); // datetime كامل
    const { error: insertError } = await supabaseClient
        .from('teacher_attendance')
        .insert([{
            teacher_id: currentUserId,
            date: today,
            check_in_time: now
        }]);

    if (insertError) {
        console.error("Error recording check-in:", insertError);
        showStatus(`خطأ في تسجيل الحضور: ${insertError.message}`, 'error');
    } else {
        showStatus(`تم تسجيل حضورك ${new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`);
        document.getElementById('checkInBtn').disabled = true;
        checkTodayStatus();
        loadProfileAttendanceRecords(); // تحديث سجل الحضور في الملف الشخصي
    }
}

// ✅ تسجيل الانصراف
async function recordCheckOut() {
    const today = new Date().toISOString().split('T')[0];

    const { data: row, error: fetchError } = await supabaseClient
        .from('teacher_attendance')
        .select('id, check_in_time, check_out_time') // 🎯 نجيب id فقط والحقول المطلوبة
        .eq('teacher_id', currentUserId)
        .eq('date', today)
        .maybeSingle();

    console.log("📌 Attendance row fetched:", row);

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching attendance record:", fetchError);
        showStatus(`خطأ في جلب سجل الحضور: ${fetchError.message}`, 'error');
        return;
    }
    if (!row) {
        showStatus('سجل حضورك أولاً', 'error');
        return;
    }
    if (row.check_out_time) {
        showStatus(`سجلت انصرافك بالفعل ${new Date(row.check_out_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`, 'error');
        return;
    }

    const now = new Date().toISOString(); // datetime كامل
    console.log("📌 Trying to update checkout with:", now, "for row id:", row.id);

    const { data: updated, error: updateError } = await supabaseClient
        .from('teacher_attendance')
        .update({ check_out_time: now })
        .eq('id', row.id)
        .select(); // 🎯 عشان يرجع البيانات بعد التحديث

    if (updateError) {
        console.error("Error recording check-out:", updateError);
        showStatus(`خطأ في تسجيل الانصراف: ${updateError.message}`, 'error');
    } else {
        console.log("✅ Checkout updated successfully:", updated);
        showStatus(`تم تسجيل انصرافك ${new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`);
        document.getElementById('checkOutBtn').disabled = true;
        checkTodayStatus();
        loadProfileAttendanceRecords(); // تحديث سجل الحضور
    }
}

// ✅ حساب مدة البقاء (من timestamp لـ timestamp)
function calcStay(start, end) {
    const sh = new Date(start);
    const eh = new Date(end);
    const mins = Math.floor((eh - sh) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}س ${m}د`;
}

// ✅ تحميل سجل الحضور الشخصي
async function loadProfileAttendanceRecords() {
    const containerId = 'profileAttendanceRecords';
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`loadProfileAttendanceRecords: العنصر بـ id="${containerId}" غير موجود في DOM.`);
        return;
    }

    try {
        if (!currentUserId) {
            throw new Error("لم يتم تعيين معرف المستخدم الحالي (currentUserId).");
        }

        const { data, error } = await supabaseClient
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', currentUserId)
            .order('date', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد سجلات حضور.</p>';
            return;
        }

        let attendanceHtml = '';
        data.forEach(record => {
            let stay = '-';
            if (record.check_in_time && record.check_out_time) {
                stay = calcStay(record.check_in_time, record.check_out_time);
            }

            attendanceHtml += `
            <div class="profile-attendance-record">
                <div class="profile-attendance-date">${record.date || '---'}</div>
                <div class="profile-attendance-times">
                    <div class="profile-attendance-time">حضور: ${record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                    <div class="profile-attendance-time">انصراف: ${record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                    <div class="profile-attendance-stay">المدة: ${stay}</div>
                </div>
            </div>`;
        });

        container.innerHTML = attendanceHtml;
    } catch (error) {
        console.error('loadProfileAttendanceRecords error:', error);
        container.innerHTML = `<p class="no-data error">خطأ في تحميل سجل الحضور: ${error.message}</p>`;
    }
}



// مصفوفة لتخزين الطلاب اللي اتسجلوا

// مصفوفة الطلاب اللي اتسجلوا

// زر تشغيل الكاميرا
document.getElementById("startQrScan").addEventListener("click", () => {
  const qrReader = document.getElementById("qr-reader");
  qrReader.style.display = "block";
  document.getElementById("stopQrScan").style.display = "inline-block";
  document.getElementById("startQrScan").style.display = "none";

  // إعداد الماسح
  qrScanner = new Html5Qrcode("qr-reader");
  qrScanner.start(
    { facingMode: "environment" }, // الكاميرا الخلفية
    { fps: 10, qrbox: 250 },
    async (decodedText) => {
      try {
        const studentData = JSON.parse(decodedText); // QR فيه {"student_id":"123"}
        const lessonId = document.getElementById("attendanceLesson").value;
        const courseId = document.getElementById("attendanceCourseFilter").value;
        const date = document.getElementById("attendanceDate").value;

        if (!lessonId || !courseId || !date) {
          alert("⚠️ من فضلك اختر الكورس والدرس قبل استخدام QR");
          return;
        }

        // ✅ لو الطالب اتسجل قبل كده متسجلش تاني
        if (scannedStudents.has(studentData.student_id)) {
          console.log(`⚠️ الطالب ${studentData.student_id} اتسجل بالفعل.`);
          return;
        }

        // إضافة الطالب للمجموعة
        scannedStudents.add(studentData.student_id);

        // إدخال الحضور في جدول attendances
        const { error } = await supabaseClient
          .from("attendances")
          .insert([{
            student_id: studentData.student_id,
            lesson_id: lessonId,
            course_id: courseId,
            date: date,
            status: "present"
          }]);

        if (error) {
          alert("❌ خطأ: " + error.message);
          scannedStudents.delete(studentData.student_id); // رجعه تاني لو حصل خطأ
        } else {
          alert("✅ تم تسجيل حضور الطالب عبر QR");
          loadTeacherAttendances(); // تحديث الجدول
        }
      } catch (e) {
        alert("⚠️ QR غير صالح");
      }
    },
    (err) => {
      console.warn("خطأ في قراءة QR:", err);
    }
  );
});

// زر إيقاف الكاميرا يدوي
document.getElementById("stopQrScan").addEventListener("click", () => {
  if (qrScanner) {
    qrScanner.stop().then(() => {
      qrScanner.clear();
      document.getElementById("qr-reader").style.display = "none";
      document.getElementById("startQrScan").style.display = "inline-block";
      document.getElementById("stopQrScan").style.display = "none";
      scannedStudents.clear(); // ✅ تصفير القائمة عند إغلاق الكاميرا
    });
  }
});


// ✅ عرض رسالة حالة
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status';
        }, 3000);
    } else {
        console.warn('عنصر statusMessage غير موجود في الصفحة.');
    }
}

// ✅ إعادة تعيين نموذج الملف الشخصي
function resetProfileForm() {
    document.getElementById('fullName').value = currentUserData.full_name || '';
    document.getElementById('email').value = currentUserData.email || '';
    document.getElementById('phone').value = currentUserData.phone || '';
    document.getElementById('specialty').value = currentUserData.specialty || '';
}

// ✅ حفظ تغييرات الملف الشخصي
async function saveProfileChanges(event) {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const specialty = document.getElementById('specialty').value;

    try {
        const { error } = await supabaseClient
            .from('users')
            .update({
                full_name: fullName,
                email,
                phone,
                specialty
            })
            .eq('id', currentUserId);

        if (error) throw error;

        currentUserData.full_name = fullName;
        currentUserData.email = email;
        currentUserData.phone = phone;
        currentUserData.specialty = specialty;

        document.getElementById('userNameHeader').textContent = fullName;
        document.getElementById('profileName').textContent = fullName;

        showStatus('✅ تم حفظ التغييرات بنجاح', 'success');
    } catch (err) {
        console.error('Error saving profile changes:', err);
        showStatus(`❌ خطأ في حفظ التغييرات: ${err.message}`, 'error');
    }
}

// ✅ تحميل بيانات الملف الشخصي
async function loadProfileData() {
    try {
        if (!currentUserData) {
            showStatus('⚠️ بيانات المستخدم غير متوفرة', 'error');
            return;
        }

        document.getElementById('profileName').textContent = currentUserData.full_name || 'غير محدد';
        document.getElementById('profileRole').textContent = currentUserData.role === 'teacher' ? 'معلم' : currentUserData.role;
        document.getElementById('fullName').value = currentUserData.full_name || '';
        document.getElementById('email').value = currentUserData.email || '';
        document.getElementById('phone').value = currentUserData.phone || '';
        document.getElementById('specialty').value = currentUserData.specialty || '';

        await loadProfileAttendanceRecords();
    } catch (err) {
        console.error('loadProfileData error:', err);
        showStatus(`❌ خطأ في تحميل بيانات الملف الشخصي: ${err.message}`, 'error');
    }
}

// ✅ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadProfileData();
    switchTab('dashboard');

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfileChanges);
    }
});
