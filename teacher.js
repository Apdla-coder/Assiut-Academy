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
            
            // دالة لعرض رسائل الحالة
            function showStatus(message, type = 'success') {
                const statusDiv = document.getElementById('statusMessage');
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
            
            // دالة لتحميل بيانات المستخدم الحالي
            async function loadUserData() {
                try {
                    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
                    if (authError) throw authError;
                    if (!user) {
                        window.location.href = 'login.html';
                        return;
                    }
                    currentUserId = user.id;
                    const { data: userData, error: userError } = await supabaseClient
                        .from('users')
        .select('id, full_name, role, specialty, avatar_url') // إضافة avatar_url
                        .eq('id', currentUserId)
                        .single();
                    if (userError && userError.code !== 'PGRST116') {
                        throw userError;
                    }
                    if (userData) {
                        currentUserData = userData;
                        const displayName = userData.full_name || 'المعلم';
                        // تحديث اسم المستخدم في الهيدر
                        const userNameHeaderElement = document.getElementById('userNameHeader');
                        if (userNameHeaderElement) {
                            userNameHeaderElement.textContent = displayName;
                        } else {
                            console.error('العنصر بـ id="userNameHeader" غير موجود في الـ HTML.');
                        }
                        if (userData.role !== 'teacher') {
                            showStatus('ليس لديك الصلاحية للوصول إلى هذه الصفحة. يجب أن تكون معلمًا.', 'error');
                            document.querySelector('.content').innerHTML = '<p class="no-data error">ليس لديك الصلاحية للوصول إلى هذه الصفحة.</p>';
                            return;
                        }
                        await loadDashboardData();
                    } else {
                        showStatus('خطأ في تحميل بيانات المستخدم', 'error');
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
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
                    document.getElementById('totalCourses').textContent = coursesCount || 0;
                    
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
                    document.getElementById('totalLessons').textContent = lessonsCount;
                    
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
                    document.getElementById('totalStudents').textContent = studentsCount;
                    
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
                document.getElementById('detailCoursePrice').textContent = formatCurrency(course.price).replace('SAR', 'ج.م').replace('ج.م', '');
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
                                    <span class="field-label">السعر:</span>
                                    <span class="field-value">${formatCurrency(course.price).replace('SAR', 'ج.م')}</span>
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
            
            async function loadTeacherExams() {
                console.log("🔍 [اختباراتي] بدء تحميل الاختبارات للمعلم:", currentUserId);
                const container = document.getElementById('examsContainer');
                if (!container) {
                    console.error("❌ عنصر examsContainer غير موجود");
                    return;
                }
                container.innerHTML = '<p>⏳ جاري تحميل بيانات الاختبارات...</p>';
                
                try {
                    // 1. جلب الكورسات الخاصة بالمعلم
                    const { data: teacherCourses, error: coursesError } = await supabaseClient
                        .from('courses')
                        .select('id, name')
                        .eq('teacher_id', currentUserId);
                    if (coursesError) throw coursesError;
                    if (!teacherCourses?.length) {
                        container.innerHTML = '<p>⚠️ لا يوجد كورسات مسندة لك.</p>';
                        return;
                    }
                    const courseIds = teacherCourses.map(c => c.id);
                    const courseMap = Object.fromEntries(teacherCourses.map(c => [c.id, c.name]));
                    
                    // 2. جلب الوحدات الخاصة بهذه الكورسات
                    const { data: modulesData, error: modulesError } = await supabaseClient
                        .from('modules')
                        .select('id, title, course_id')
                        .in('course_id', courseIds);
                    if (modulesError) throw modulesError;
                    if (!modulesData?.length) {
                        container.innerHTML = '<p>⚠️ لا توجد وحدات مرتبطة بكورساتك.</p>';
                        return;
                    }
                    const moduleIds = modulesData.map(m => m.id);
                    const moduleMap = Object.fromEntries(modulesData.map(m => [m.id, m.title]));
                    
                    // 3. جلب جميع الطلاب المشتركين في هذه الكورسات
                    const { data: studentsData, error: studentsError } = await supabaseClient
                        .from('subscriptions')
                        .select('student_id, course_id, students:student_id(full_name)')
                        .in('course_id', courseIds);
                    if (studentsError) throw studentsError;
                    if (!studentsData?.length) {
                        container.innerHTML = '<p>⚠️ لا يوجد طلاب مشتركين في كورساتك.</p>';
                        return;
                    }
                    
                    // 4. جلب جميع الامتحانات المرتبطة بالوحدات
                    const { data: examsData, error: examsError } = await supabaseClient
                        .from('exams')
                        .select('*')
                        .in('module_id', moduleIds);
                    if (examsError) throw examsError;
                    if (!examsData?.length) {
                        container.innerHTML = '<p>⚠️ لا توجد اختبارات مرتبطة بوحدات كورساتك.</p>';
                        return;
                    }
                    
                    // 5. إنشاء حقل بحث
                    let html = `
                <input type="text" id="studentSearch" placeholder="🔍 ابحث باسم الطالب" style="padding:8px; margin-bottom:15px; width:100%; max-width:300px;">
            `;
                    
                    // 6. عرض جدول الطلاب مع اختيار الامتحان وإدخال الدرجة وتعديل التاريخ
                    courseIds.forEach(courseId => {
                        const courseName = courseMap[courseId] || '-';
                        html += `<h3 style="margin-top:20px; color:#2c3e50; font-size: 1.1rem;">📚 ${courseName}</h3>`;
                        html += `<div style="overflow-x: auto;">
                            <table class="teacher-table">
                            <thead>
                                <tr>
                                    <th>اسم الطالب</th>
                                    <th>الاختبار</th>
                                    <th>التاريخ</th>
                                    <th>الدرجة</th>
                                    <th>حفظ</th>
                                </tr>
                            </thead>
                            <tbody>`;
                        studentsData.filter(s => s.course_id === courseId).forEach(student => {
                            html += `<tr>
                                <td style="font-size: 0.8rem;">${student.students?.full_name || '-'}</td>
                                <td>
                                    <select id="exam-select-${student.student_id}" style="padding:3px; font-size: 0.75rem;">
                                        <option value="">-- اختر اختبار --</option>
                                        ${examsData.filter(e => e.course_id === courseId).map(exam => `
                                            <option value="${exam.id}">${exam.title} (/${exam.max_score})</option>
                                        `).join('')}
                                    </select>
                                </td>
                                <td>
                                    <input type="date" id="exam-date-${student.student_id}" style="padding:3px; font-size: 0.75rem;">
                                </td>
                                <td>
                                    <input type="number" id="score-${student.student_id}" min="0" style="width:60px; padding:3px; font-size: 0.75rem;" />
                                </td>
                                <td>
                                    <button onclick="saveStudentScore('${student.student_id}')" style="padding:3px 6px; background:#27ae60; color:white; border:none; cursor:pointer; font-size: 0.75rem;">💾 حفظ</button>
                                </td>
                            </tr>`;
                        });
                        html += `</tbody></table></div>`;
                    });
                    container.innerHTML = html;
                    
                    // 7. إضافة خاصية البحث
                    document.getElementById('studentSearch').addEventListener('input', function () {
                        const searchValue = this.value.toLowerCase();
                        document.querySelectorAll('.teacher-table tbody tr').forEach(row => {
                            const studentName = row.cells[0].innerText.toLowerCase();
                            row.style.display = studentName.includes(searchValue) ? '' : 'none';
                        });
                    });
                } catch (error) {
                    console.error('💥 خطأ غير متوقع في loadTeacherExams:', error);
                    container.innerHTML = '<p>❌ حدث خطأ أثناء تحميل بيانات الاختبارات.</p>';
                }
            }
            
            async function saveStudentScore(studentId) {
                const examId = document.getElementById(`exam-select-${studentId}`).value;
                const score = document.getElementById(`score-${studentId}`).value;
                const examDate = document.getElementById(`exam-date-${studentId}`).value;
                
                if (!examId) {
                    alert('⚠️ يرجى اختيار الاختبار.');
                    return;
                }
                if (score === '' || isNaN(score)) {
                    alert('⚠️ يرجى إدخال درجة صحيحة.');
                    return;
                }
                
                console.log(`💾 حفظ الدرجة ${score} للطالب ${studentId} في الاختبار ${examId} بتاريخ ${examDate}`);
                const { error } = await supabaseClient
                    .from('exam_scores')
                    .upsert({
                        exam_id: examId,
                        student_id: studentId,
                        score: score,
                        exam_date: examDate || null
                    });
                if (error) {
                    console.error('❌ خطأ أثناء حفظ الدرجة:', error);
                    alert('حدث خطأ أثناء حفظ الدرجة');
                } else {
                    alert('✅ تم حفظ الدرجة بنجاح');
                }
            }
            
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
            
            // دالة محدثة لتحميل الكورسات والدروس في نافذة الحضور
            async function loadCoursesAndLessonsForAttendance() {
                try {
                    // تحميل الكورسات
                    if (courses.length === 0) await loadCourses();
                    
                    // ملء قائمة الكورسات في النافذة
                    const courseSelect = document.getElementById('attendanceCourseFilter');
                    courseSelect.innerHTML = '<option value="">اختر كورسًا</option>';
                    courses.forEach(course => {
                        const option = document.createElement('option');
                        option.value = course.id;
                        option.textContent = course.name;
                        courseSelect.appendChild(option);
                    });
                    
                    // إعادة تعيين قائمة الدروس
                    document.getElementById('attendanceLesson').innerHTML = '<option value="">اختر كورسًا أولاً</option>';
                    document.getElementById('studentAttendanceList').innerHTML = '<p class="no-data" style="text-align: center; margin: 20px 0;">اختر درسًا أولاً</p>';
                    
                    // تعيين تاريخ اليوم الحالي بشكل افتراضي
                    const today = new Date().toISOString().split('T')[0];
                    document.getElementById('attendanceDate').value = today;
                    document.getElementById('attendanceDate').disabled = false; // تمكين الحقل ليتمكن المعلم من تعديله إذا أراد
                    
                    // تحميل الدروس لكل كورس
                    lessonsByCourse = {};
                    for (const course of courses) {
                        const { data: lessonsData, error: lessonsError } = await supabaseClient
                            .from('lessons')
                            .select('id, title, date')
                            .eq('course_id', course.id)
                            .order('date', { ascending: true });
                        if (!lessonsError && lessonsData) {
                            lessonsByCourse[course.id] = lessonsData;
                        } else {
                            console.warn(`لم يتم تحميل دروس الكورس ${course.id}:`, lessonsError?.message);
                            lessonsByCourse[course.id] = [];
                        }
                    }
                    
                    // تحديد الكورس والدرس تلقائيًا بناءً على تاريخ اليوم
                    const todayDate = new Date().toISOString().split('T')[0];
                    let foundLesson = false;
                    for (const courseId in lessonsByCourse) {
                        const lessons = lessonsByCourse[courseId];
                        const todayLesson = lessons.find(lesson => lesson.date === todayDate);
                        if (todayLesson) {
                            // تحديد الكورس
                            courseSelect.value = courseId;
                            courseSelect.dispatchEvent(new Event('change'));
                            // انتظار قليلاً لتحميل الدروس
                            await new Promise(resolve => setTimeout(resolve, 100));
                            // تحديد الدرس
                            const lessonSelect = document.getElementById('attendanceLesson');
                            lessonSelect.value = todayLesson.id;
                            lessonSelect.dispatchEvent(new Event('change'));
                            foundLesson = true;
                            break; // توقف عند أول كورس يحتوي على درس اليوم
                        }
                    }
                    if (!foundLesson) {
                        console.log("لم يتم العثور على درس لليوم الحالي.");
                    }
                } catch (error) {
                    console.error('Error loading courses and lessons for attendance:', error);
                    showStatus('خطأ في تحميل الكورسات والدروس', 'error');
                }
            }
            
            // عند تغيير اختيار الكورس في نافذة الحضور
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
                // إعادة تعيين باقي الحقول
                document.getElementById('studentAttendanceList').innerHTML = '<p class="no-data" style="text-align: center; margin: 20px 0;">اختر درسًا أولاً</p>';
                // تعيين تاريخ اليوم الحالي بشكل افتراضي
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('attendanceDate').value = today;
                document.getElementById('attendanceDate').disabled = false; // تمكين الحقل ليتمكن المعلم من تعديله إذا أراد
            });
            
            // عند تغيير اختيار الدرس
            document.getElementById('attendanceLesson').addEventListener('change', async function () {
                const lessonId = this.value;
                const dateInput = document.getElementById('attendanceDate');
                const listContainer = document.getElementById('studentAttendanceList');
                if (lessonId) {
                    // تعيين تاريخ اليوم الحالي بشكل افتراضي بغض النظر عن تاريخ الدرس
                    const today = new Date().toISOString().split('T')[0];
                    dateInput.value = today;
                    dateInput.disabled = false; // تمكين الحقل ليتمكن المعلم من تعديله إذا أراد
                    // تحميل طلاب الكورس
                    const courseId = document.getElementById('attendanceCourseFilter').value;
                    if (courseId) {
                        await loadStudentsForCourse(courseId);
                    } else {
                        listContainer.innerHTML = '<p class="no-data" style="text-align: center; margin: 20px 0; color: #666;">خطأ: لم يتم تحديد الكورس.</p>';
                    }
                } else {
                    dateInput.value = '';
                    dateInput.disabled = true;
                    listContainer.innerHTML = '<p class="no-data" style="text-align: center; margin: 20px 0;">اختر درسًا أولاً</p>';
                }
            });
            

        // دالة لجلب طلاب كورس معين وعرضهم في النافذة (نسخة محدثة)
async function loadStudentsForCourse(courseId) {
  try {
    const listContainer = document.getElementById('studentAttendanceList');
    if (!listContainer) {
      console.error('Container not found');
      return;
    }

    if (!courseId) {
      listContainer.innerHTML = '<p class="no-data">يرجى اختيار كورس.</p>';
      return;
    }

    listContainer.innerHTML = '<p class="no-data">جاري تحميل الطلاب...</p>';

    const { data: subscriptions, error: subsError } = await supabaseClient
      .from('subscriptions')
      .select('student_id')
      .eq('course_id', courseId);

    if (subsError) throw subsError;

    if (!subscriptions || subscriptions.length === 0) {
      listContainer.innerHTML = '<p class="no-data">لا يوجد طلاب مسجلين في هذا الكورس.</p>';
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
    console.error('Error loading students for course:', error);
    const listContainer = document.getElementById('studentAttendanceList');
    if (listContainer) {
      listContainer.innerHTML = `<p class="no-data">خطأ في تحميل الطلاب: ${error.message}</p>`;
    }
  }
}            
            // دالة محدثة لإضافة الحضور الجماعي
            async function addAttendance() {
                try {
                    const lessonId = document.getElementById('attendanceLesson').value;
                    const courseId = document.getElementById('attendanceCourseFilter').value;
                    const date = document.getElementById('attendanceDate').value;
                    const generalNotes = document.getElementById('attendanceNotes').value;
                    
                    if (!lessonId || !date) {
                        showStatus('من فضلك اختر الدرس وتأكد من التاريخ', 'error');
                        return;
                    }
                    
                    // جمع بيانات الطلاب المختارين
                    const attendanceRecords = [];
                    document.querySelectorAll('.student-checkbox:checked').forEach(checkbox => {
                        const studentId = checkbox.dataset.studentId;
                        const statusSelect = document.querySelector(`.student-status[data-student-id="${studentId}"]`);
                        const status = statusSelect ? statusSelect.value : 'absent';
                        attendanceRecords.push({
                            lesson_id: lessonId,
                            course_id: courseId,
                            student_id: studentId,
                            date: date,
                            status: status,
                            notes: generalNotes || null
                        });
                    });
                    
                    if (attendanceRecords.length === 0) {
                        showStatus('من فضلك اختر على الأقل طالب واحد', 'error');
                        return;
                    }
                    
                    // إرسال البيانات لقاعدة البيانات
                    const { data, error } = await supabaseClient
                        .from('attendances')
                        .insert(attendanceRecords);
                    if (error) throw error;
                    
                    showStatus(`تم تسجيل حضور ${attendanceRecords.length} طالب`);
                    closeModal('attendanceModal');
                    if (document.getElementById('attendancesContent').style.display !== 'none') {
                        loadTeacherAttendances();
                    }
                } catch (error) {
                    console.error('Error adding attendance:', error);
                    showStatus(`خطأ في تسجيل الحضور: ${error.message}`, 'error');
                }
            }
            
            // ربط حدث الإرسال مرة واحدة فقط عند تحميل الصفحة
            document.getElementById('attendanceForm').addEventListener('submit', async function (e) {
                e.preventDefault();
                await addAttendance();
            });
            
            // دالة فتح نافذة تسجيل الحضور
            async function showAddAttendanceModal() {
                try {
                    const modal = document.getElementById('attendanceModal');
                    if (!modal) {
                        console.error('نافذة attendanceModal غير موجودة');
                        showStatus('خطأ في فتح نافذة الحضور', 'error');
                        return;
                    }
                    
                    // تحميل الكورسات والدروس
                    await loadCoursesAndLessonsForAttendance();
                    
                    // تجهيز النموذج
                    document.getElementById('attendanceModalTitle').textContent = 'تسجيل حضور الدرس';
                    document.getElementById('attendanceForm').reset();
                    document.getElementById('studentAttendanceList').innerHTML =
                        '<p class="no-data" style="text-align: center; margin: 20px 0;">اختر درسًا أولاً</p>';
                    
                    // عرض النافذة
                    modal.style.display = 'flex';
                } catch (error) {
                    console.error('Error showing add attendance modal:', error);
                    showStatus('خطأ في فتح نافذة الحضور', 'error');
                }
            }
            
            // دالة محدثة لتحميل وعرض الطلاب حسب الكورسات في تبويب "حضور الطلاب"
            async function loadTeacherAttendances() {
                try {
                    const container = document.getElementById('attendancesContainer');
                    if (!container) {
                        console.error('Container for attendances not found.');
                        return;
                    }
                    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل بيانات الحضور...</p></div>`;
                    
                    // 1. جلب الكورسات الخاصة بالمعلم
                    const { data: teacherCourses, error: coursesError } = await supabaseClient
                        .from('courses')
                        .select('id, name')
                        .eq('teacher_id', currentUserId)
                        .order('name', { ascending: true }); // ترتيب الكورسات أبجديًا
                    if (coursesError) throw coursesError;
                    const courseIds = (teacherCourses || []).map(c => c.id);
                    const courseMap = {};
                    (teacherCourses || []).forEach(c => courseMap[c.id] = c.name);
                    
                    // تحقق من إن في كورسات قبل ما تكمل
                    if (courseIds.length === 0) {
                        container.innerHTML = `<p class="no-data">لا يوجد كورسات مسندة لك.</p>`;
                        return;
                    }
                    
                    // 2. جلب اشتراكات الطلاب في كورسات المعلم
                    const { data: subscriptionsData, error: subscriptionsError } = await supabaseClient
                        .from('subscriptions')
                        .select('student_id, course_id')
                        .in('course_id', courseIds);
                    if (subscriptionsError) throw subscriptionsError;
                    
                    // 3. جلب بيانات الطلاب
                    const studentIds = [...new Set(subscriptionsData.map(sub => sub.student_id))]; // IDs فريدة
                    let studentData = [];
                    if (studentIds.length > 0) {
                        const { data: studentsData, error: studentsError } = await supabaseClient
                            .from('students')
                            .select('id, full_name');
                        if (studentsError) throw studentsError;
                        studentData = studentsData || [];
                    }
                    const studentMap = {};
                    studentData.forEach(s => {
                        studentMap[s.id] = s;
                    });
                    
                    // 4. تجميع الطلاب حسب الكورس
                    const studentsByCourse = {}; // {courseId: [studentSubscription, ...]}
                    subscriptionsData.forEach(sub => {
                        const courseId = sub.course_id;
                        if (!studentsByCourse[courseId]) {
                            studentsByCourse[courseId] = [];
                        }
                        studentsByCourse[courseId].push(sub); // ن pushes الاشتراك
                    });
                    
                    // 5. عرض الكورسات والطلاب
                    let html = '';
                    // التكرار على كل كورس يوجد فيه طلاب
                    for (const courseId in studentsByCourse) {
                        const courseName = courseMap[courseId] || 'غير معروف';
                        const courseStudentsSubs = studentsByCourse[courseId]; // قائمة الاشتراكات لهذا الكورس
                        html += `
                    <div class="course-box"> <!-- بداية صندوق الكورس -->
                        <div class="course-title" style="font-size: 1.1rem;">${courseName}</div> <!-- عنوان الكورس -->
                        <div class="card-list"> <!-- قائمة بطاقات الطلاب لهذا الكورس -->
                `;
                        if (courseStudentsSubs.length > 0) {
                            courseStudentsSubs.forEach(sub => {
                                const student = studentMap[sub.student_id];
                                const studentName = student ? student.full_name : 'غير معروف';
                                const studentId = student ? student.id : null;
                                html += `
                            <div class="card student-card">
                                <div class="card-header">
                                    <div class="card-title">${studentName}</div>
                                    <button class="btn btn-primary btn-xs view-attendance-btn"
                                            onclick="showStudentAttendanceRecords('${studentId}', '${courseId}')"
                                            ${!studentId ? 'disabled' : ''}>
                                        <i class="fas fa-list"></i> عرض السجل
                                    </button>
                                </div>
                            </div>
                        `;
                            });
                        } else {
                            html += `<p class="no-data">لا يوجد طلاب مسجلين.</p>`;
                        }
                        html += `
                        </div> <!-- نهاية قائمة بطاقات الطلاب لهذا الكورس -->
                    </div> <!-- نهاية صندوق الكورس -->
                `;
                    }
                    
                    // إذا لم يكن هناك طلاب في أي كورس
                    if (html === '') {
                        html = `<p class="no-data">لا يوجد طلاب مسجلين في كورساتك.</p>`;
                    }
                    container.innerHTML = html;
                } catch (error) {
                    console.error('Error loading teacher attendances (by course):', error);
                    const errorMessage = error.message || 'خطأ غير معروف';
                    const container = document.getElementById('attendancesContainer');
                    if (container) {
                        container.innerHTML = `<p class="no-data error">خطأ في تحميل بيانات الحضور: ${errorMessage}</p>`;
                    }
                    showStatus(`خطأ في تحميل بيانات الحضور: ${errorMessage}`, 'error');
                }
            }
            
            // دالة لعرض سجل حضور طالب محدد في كورس محدد داخل نافذة منبثقة
            async function showStudentAttendanceRecords(studentId, courseId) {
                if (!studentId || !courseId) {
                    showStatus('بيانات الطالب أو الكورس غير متوفرة.', 'error');
                    return;
                }
                const modalId = 'studentAttendanceRecordsModal';
                let modal = document.getElementById(modalId);
                // إنشاء النافذة المنبثقة إذا لم تكن موجودة
                if (!modal) {
                    const modalHTML = `
                <div id="${modalId}" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title" id="studentAttendanceModalTitle">سجل حضور الطالب</h2>
                            <span class="close" onclick="closeModal('${modalId}')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div id="studentAttendanceModalContent">
                                <p class="no-data">جاري تحميل السجل...</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('${modalId}')"><i class="fas fa-times"></i> إغلاق</button>
                        </div>
                    </div>
                </div>
            `;
                    document.body.insertAdjacentHTML('beforeend', modalHTML);
                    modal = document.getElementById(modalId); // تحديث المتغير بعد الإنشاء
                }
                
                // تجهيز النافذة المنبثقة
                const modalTitle = document.getElementById('studentAttendanceModalTitle');
                const modalContent = document.getElementById('studentAttendanceModalContent');
                modalTitle.textContent = 'جاري التحميل...';
                modalContent.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>جاري تحميل سجل الحضور...</p></div>';
                
                // عرض النافذة
                modal.style.display = 'flex';
                
                try {
                    // 1. جلب اسم الطالب
                    const { data: studentData, error: studentError } = await supabaseClient
                        .from('students')
                        .select('full_name')
                        .eq('id', studentId)
                        .single();
                    if (studentError) throw studentError;
                    const studentName = studentData?.full_name || 'غير معروف';
                    
                    // 2. جلب اسم الكورس
                    const { data: courseData, error: courseError } = await supabaseClient
                        .from('courses')
                        .select('name')
                        .eq('id', courseId)
                        .single();
                    if (courseError) throw courseError;
                    const courseName = courseData?.name || 'غير معروف';
                    
                    // 3. تحديث عنوان النافذة
                    modalTitle.textContent = `سجل حضور: ${studentName} - ${courseName}`;
                    
                    // 4. جلب سجلات الحضور للطالب في هذا الكورس
                    const { data: attendanceRecords, error: attendanceError } = await supabaseClient
                        .from('attendances')
                        .select(`
                    date,
                    status,
                    notes,
                    lessons (title)
                `)
                        .eq('student_id', studentId)
                        .eq('course_id', courseId)
                        .order('date', { ascending: false }); // الأحدث أولاً
                    if (attendanceError) throw attendanceError;
                    
                    // 5. عرض السجلات
                    if (!attendanceRecords || attendanceRecords.length === 0) {
                        modalContent.innerHTML = `<p class="no-data">لا توجد سجلات حضور لهذا الطالب في هذا الكورس.</p>`;
                        return;
                    }
                    
                    let recordsHtml = `
                <div style="overflow-x: auto;">
                <table style="width:100%; border-collapse: collapse; text-align: right; font-size: 0.8rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid #eee; background-color: #f8f9fa;">
                            <th style="padding: 8px; font-weight:bold;">الدرس</th>
                            <th style="padding: 8px; font-weight:bold;">التاريخ</th>
                            <th style="padding: 8px; font-weight:bold;">الحالة</th>
                            <th style="padding: 8px; font-weight:bold;">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
                    attendanceRecords.forEach(record => {
                        const lessonTitle = record.lessons?.title || 'درس غير محدد';
                        const statusText = record.status === 'present' ? 'حاضر' :
                            record.status === 'absent' ? 'غائب' :
                                record.status === 'late' ? 'متأخر' : record.status || '-';
                        const notes = record.notes || '-';
                        recordsHtml += `
                    <tr style="border-bottom: 1px solid #f5f5f5;">
                        <td style="padding: 8px;">${lessonTitle}</td>
                        <td style="padding: 8px;">${record.date ? formatDate(record.date) : '-'}</td>
                        <td style="padding: 8px;">${statusText}</td>
                        <td style="padding: 8px;">${notes}</td>
                    </tr>
                `;
                    });
                    recordsHtml += `
                    </tbody>
                </table>
                </div>
            `;
                    modalContent.innerHTML = recordsHtml;
                } catch (error) {
                    console.error('Error loading student attendance records:', error);
                    const errorMessage = error.message || 'خطأ غير معروف';
                    const modalContent = document.getElementById('studentAttendanceModalContent');
                    if (modalContent) {
                        modalContent.innerHTML = `<p class="no-data error">خطأ في تحميل سجل الحضور: ${errorMessage}</p>`;
                    }
                    showStatus(`خطأ في تحميل سجل الحضور: ${errorMessage}`, 'error');
                }
            }
            
            // دالة لتحديث عرض قائمة الطلاب في نافذة الحضور
        // دالة لتحديث عرض قائمة الطلاب في نافذة الحضور
        function updateStudentListDisplay(students) {
            const listContainer = document.getElementById('studentAttendanceList');
            const searchTermElement = document.getElementById('studentSearchInModal');
            const searchTerm = searchTermElement ? searchTermElement.value.toLowerCase() : '';
            let html = '';
            students.forEach(student => {
                // تطبيق الفلترة
                if (searchTerm && !student.full_name.toLowerCase().includes(searchTerm)) {
                    return; // تخطي هذا الطالب إذا لم يتطابق مع البحث
                }
                html += `
        <div class="student-item">
            <div class="student-header">
                <label class="student-name">
                    <input type="checkbox" class="student-checkbox" data-student-id="${student.id}" checked>
                    ${student.full_name}
                </label>
            </div>
            <select class="student-status-select" data-student-id="${student.id}">
                <option value="present" selected>حاضر</option>
                <option value="absent">غائب</option>
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
            
            // إعادة ربط الأحداث - لا حاجة لإعادة ربطها هنا لأننا نربطها مرة واحدة في loadStudentsForCourse
            // document.querySelectorAll('.student-checkbox').forEach(checkbox => {
            //     checkbox.addEventListener('change', updateSelectAllCheckbox);
            // });
        }        
        
        // دالة لجلب طلاب كورس معين وعرضهم في النافذة (نسخة محدثة)
                // ربط البحث - التأكد من وجود العنصر أولاً
                const searchInput = document.getElementById('studentSearchInModal');
                if (searchInput) {
                    // إزالة أي مستمع أحداث سابق بنفس الاسم لتجنب التكرار
                    if (window.handleSearchInput) {
                        searchInput.removeEventListener('input', window.handleSearchInput);
                    }
                    // تعريف دالة مستقلة لتجنب مشاكل النطاق
                    window.handleSearchInput = function() {
                        // التأكد من أن students معرفة في النطاق الحالي
                        // إذا لم تكن متوفرة، يمكن استدعاء loadStudentsForCourse مجددًا أو تمرير البيانات بطريقة أخرى
                        // لكن في هذا السياق، نفترض أن students متوفرة من النطاق الخارجي
                        updateStudentListDisplay(students);
                    };
                    searchInput.addEventListener('input', window.handleSearchInput);
                } else {
                    console.warn('عنصر studentSearchInModal غير موجود في الصفحة عند محاولة ربط الحدث');
                }        
        
        
        // تعديل دالة setAllAttendance لتتناسب مع التصميم الجديد
            function setAllAttendance(status) {
                document.querySelectorAll('.student-status-select').forEach(select => {
                    select.value = status;
                });
                document.querySelectorAll('.student-checkbox').forEach(checkbox => {
                    checkbox.checked = true;
                });
                showStatus(`تم تحديد الحضور "${getStatusText(status)}" للجميع.`, 'success');
            }
            
            // تعديل دالة clearAllAttendance
            function clearAllAttendance() {
                document.querySelectorAll('.student-checkbox').forEach(checkbox => {
                    checkbox.checked = false;
                });
                document.querySelectorAll('.student-status-select').forEach(select => {
                    select.selectedIndex = 0;
                });
                showStatus('تم مسح جميع الاختيارات.', 'success');
            }
            
            // دالة لتحديد/إلغاء تحديد جميع الطلاب
            function toggleAllStudents(isChecked) {
                document.querySelectorAll('.student-checkbox').forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            }
            
            // دالة مساعدة لتحويل الحالة إلى نص عربي
            function getStatusText(status) {
                switch (status) {
                    case 'present': return 'حاضر';
                    case 'absent': return 'غائب';
                    case 'late': return 'متأخر';
                    default: return status;
                }
            }
            
            // دوال الحضور الشخصي للمعلم
            async function checkTodayStatus() {
                const today = new Date().toISOString().split('T')[0];
                const { data } = await supabaseClient.from('teacher_attendance').select('*').eq('teacher_id', currentUserId).eq('date', today).single();
                if (data) {
                    document.getElementById('checkInBtn').disabled = !!data.check_in_time;
                    document.getElementById('checkOutBtn').disabled = !!data.check_out_time;
                }
            }
            
            async function recordCheckIn() {
                const today = new Date().toISOString().split('T')[0];
                const { data: exists, error: checkError } = await supabaseClient
                    .from('teacher_attendance')
                    .select('*')
                    .eq('teacher_id', currentUserId)
                    .eq('date', today)
                    .single();
                if (checkError && checkError.code !== 'PGRST116') {
                    console.error("Error checking attendance:", checkError);
                    showStatus(`خطأ في التحقق من الحضور: ${checkError.message}`, 'error');
                    return;
                }
                if (exists) {
                    showStatus(`سجلت حضورك بالفعل في ${exists.check_in_time}`, 'error');
                    return;
                }
                // استخدام الوقت بالتنسيق الصحيح (أرقام لاتينية)
                const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                const { error: insertError } = await supabaseClient
                    .from('teacher_attendance')
                    .insert([
                        {
                            teacher_id: currentUserId,
                            date: today,
                            check_in_time: time
                        }
                    ]);
                if (insertError) {
                    console.error("Error recording check-in:", insertError);
                    showStatus(`خطأ في تسجيل الحضور: ${insertError.message}`, 'error');
                } else {
                    showStatus(`تم تسجيل حضورك ${time}`);
                    document.getElementById('checkInBtn').disabled = true;
                    checkTodayStatus();
                    loadMyAttendance();
                }
            }
            
            async function recordCheckOut() {
                const today = new Date().toISOString().split('T')[0];
                const { data: row, error: fetchError } = await supabaseClient
                    .from('teacher_attendance')
                    .select('*')
                    .eq('teacher_id', currentUserId)
                    .eq('date', today)
                    .single();
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
                    showStatus(`سجلت انصرافك بالفعل ${row.check_out_time}`, 'error');
                    return;
                }
                // استخدام الوقت بالتنسيق الصحيح (أرقام لاتينية)
                const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                const { error: updateError } = await supabaseClient
                    .from('teacher_attendance')
                    .update({ check_out_time: time })
                    .eq('id', row.id);
                if (updateError) {
                    console.error("Error recording check-out:", updateError);
                    showStatus(`خطأ في تسجيل الانصراف: ${updateError.message}`, 'error');
                } else {
                    showStatus(`تم تسجيل انصرافك ${time}`);
                    document.getElementById('checkOutBtn').disabled = true;
                    checkTodayStatus();
                    loadMyAttendance();
                }
            }
            
            function calcStay(start, end) {
                const [sh, sm] = start.split(':').map(Number);
                const [eh, em] = end.split(':').map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm);
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return `${h}س ${m}د`;
            }
            

            
            // دالة لتحميل بيانات الملف الشخصي
        // دالة لتحميل بيانات الملف الشخصي
// دالة لتحميل بيانات الملف الشخصي
// دالة لتحميل بيانات الملف الشخصي
        // دالة لتحميل بيانات الملف الشخصي
        async function loadProfileData() {
            try {
                // تحديث معلومات المستخدم الأساسية
                document.getElementById('profileName').textContent = currentUserData.full_name || 'غير محدد';
                document.getElementById('profileRole').textContent = currentUserData.role === 'teacher' ? 'معلم' : currentUserData.role;
                
                // تحديث الصورة الشخصية
                const avatarUrl = currentUserData.avatar_url || 'https://placehold.co/120x120?text=PP';
                document.getElementById('profileImage').src = avatarUrl;
                
                // تحميل بيانات النموذج
                document.getElementById('fullName').value = currentUserData.full_name || '';
                document.getElementById('email').value = currentUserData.email || '';
                document.getElementById('phone').value = currentUserData.phone || '';
                document.getElementById('specialty').value = currentUserData.specialty || '';
                
                // تحميل سجل الحضور الشخصي (آخر 5 تسجيلات)
                await loadProfileAttendanceRecords();
                
                // --- ربط الأحداث بعد التأكد من وجود العناصر ---
                // 1. ربط نموذج الملف الشخصي بحدث الإرسال
                const profileForm = document.getElementById('profileForm');
                if (profileForm) {
                    // التحقق مما إذا كان الحدث مربوطًا بالفعل لتجنب التكرار
                    if (!profileForm.dataset.profileFormListenerAdded) {
                        profileForm.addEventListener('submit', saveProfileChanges);
                        // وضع علامة لتجنب ربط الحدث مجددًا
                        profileForm.dataset.profileFormListenerAdded = 'true';
                    }
                } else {
                    console.warn('عنصر profileForm غير موجود في الصفحة عند محاولة ربط الحدث');
                }

                
            } catch (error) {
                console.error('Error loading profile data:', error);
                showStatus('خطأ في تحميل بيانات الملف الشخصي', 'error');
            }
        }

// دالة لتحميل سجل الحضور الشخصي في قسم الملف الشخصي
// دالة لتحميل سجل الحضور الشخصي في قسم الملف الشخصي
// دالة لتحميل سجل الحضور الشخصي في قسم الملف الشخصي
async function loadProfileAttendanceRecords() {
    console.log("loadProfileAttendanceRecords: بدء التنفيذ");
    
    const containerId = 'profileAttendanceRecords';
    const container = document.getElementById(containerId);

    // التحقق من وجود العنصر فورًا
    if (!container) {
        console.error(`loadProfileAttendanceRecords: العنصر بـ id="${containerId}" غير موجود في DOM.`);
        return;
    }

    try {
        console.log("loadProfileAttendanceRecords: التحقق من currentUserId:", currentUserId);

        // التحقق من أن currentUserId معرف
        if (!currentUserId) {
            throw new Error("لم يتم تعيين معرف المستخدم الحالي (currentUserId).");
        }

        console.log(`loadProfileAttendanceRecords: جاري جلب سجلات الحضور للمستخدم ${currentUserId}...`);

        // جلب سجلات حضور المعلم من جدول teacher_attendance
        const { data, error } = await supabaseClient
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', currentUserId)
            .order('date', { ascending: false })
            .limit(5); // جلب آخر 5 تسجيلات

        console.log("loadProfileAttendanceRecords: نتيجة الاستعلام من Supabase:", { data, error });

        // التحقق من وجود أخطاء في الاستعلام
        if (error) {
            console.error("loadProfileAttendanceRecords: خطأ في استعلام Supabase:", error);
            throw error;
        }

        // التحقق من وجود بيانات
        if (!data || data.length === 0) {
            console.log("loadProfileAttendanceRecords: لا توجد سجلات حضور للمستخدم.");
            container.innerHTML = '<p class="no-data">لا توجد سجلات حضور.</p>';
            return;
        }

        console.log(`loadProfileAttendanceRecords: تم العثور على ${data.length} سجل(ات) حضور.`);

        // إنشاء HTML لعرض السجلات
        let attendanceHtml = '';
        data.forEach(record => {
            console.log("loadProfileAttendanceRecords: معالجة السجل:", record);
            
            // حساب مدة البقاء إذا كان وقت الحضور والانصراف متوفران
            let stay = '-';
            if (record.check_in_time && record.check_out_time) {
                try {
                    stay = calcStay(record.check_in_time, record.check_out_time);
                    console.log(`loadProfileAttendanceRecords: حساب المدة بين ${record.check_in_time} و ${record.check_out_time} = ${stay}`);
                } catch (calcError) {
                    console.error("loadProfileAttendanceRecords: خطأ في حساب المدة:", calcError);
                    stay = 'خطأ في الحساب';
                }
            } else {
                console.log("loadProfileAttendanceRecords: أوقات الحضور أو الانصراف غير متوفرة.");
            }

            attendanceHtml += `
            <div class="profile-attendance-record">
                <div class="profile-attendance-date">${record.date || '---'}</div>
                <div class="profile-attendance-times">
                    <div class="profile-attendance-time">حضور: ${record.check_in_time || '-'}</div>
                    <div class="profile-attendance-time">انصراف: ${record.check_out_time || '-'}</div>
                    <div class="profile-attendance-stay">المدة: ${stay}</div>
                </div>
            </div>
            `;
        });

        console.log("loadProfileAttendanceRecords: تحديث محتوى الحاوية بسجلات الحضور.");
        container.innerHTML = attendanceHtml;
        console.log("loadProfileAttendanceRecords: تم تحميل سجل الحضور بنجاح.");

    } catch (error) {
        console.error('loadProfileAttendanceRecords: Error caught in catch block:', error);
        
        // محاولة تحديث الحاوية برسالة خطأ
        const errorMessage = error.message || error.toString() || 'خطأ غير معروف';
        console.log("loadProfileAttendanceRecords: محاولة عرض رسالة الخطأ:", errorMessage);

        // التحقق مرة أخرى من وجود الحاوية قبل التحديث
        const errorContainer = document.getElementById(containerId);
        if (errorContainer) {
            errorContainer.innerHTML = `<p class="no-data error">خطأ في تحميل سجل الحضور: ${errorMessage}</p>`;
            console.log("loadProfileAttendanceRecords: تم عرض رسالة الخطأ للمستخدم.");
        } else {
            console.error(`loadProfileAttendanceRecords: العنصر بـ id="${containerId}" غير موجود عند محاولة عرض رسالة الخطأ.`);
        }
    } finally {
        console.log("loadProfileAttendanceRecords: انتهى التنفيذ.");
    }
}


            // دالة لإظهار حالة العملية
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


// دالة لإعادة تعيين نموذج الملف الشخصي
            function resetProfileForm() {
                document.getElementById('fullName').value = currentUserData.full_name || '';
                document.getElementById('email').value = currentUserData.email || '';
                document.getElementById('phone').value = currentUserData.phone || '';
                document.getElementById('specialty').value = currentUserData.specialty || '';
            }
            
            // دالة لحفظ تغييرات الملف الشخصي
            async function saveProfileChanges(event) {
                event.preventDefault();
                
                const fullName = document.getElementById('fullName').value;
                const email = document.getElementById('email').value;
                const phone = document.getElementById('phone').value;
                const specialty = document.getElementById('specialty').value;
                
                try {
                    // تحديث بيانات المستخدم في جدول users
                    const { data, error } = await supabaseClient
                        .from('users')
                        .update({
                            full_name: fullName,
                            email: email,
                            phone: phone,
                            specialty: specialty
                        })
                        .eq('id', currentUserId);
                    
                    if (error) throw error;
                    
                    // تحديث البيانات المحلية
                    currentUserData.full_name = fullName;
                    currentUserData.email = email;
                    currentUserData.phone = phone;
                    currentUserData.specialty = specialty;
                    
                    // تحديث اسم المستخدم في الهيدر
                    document.getElementById('userNameHeader').textContent = fullName;
                    document.getElementById('profileName').textContent = fullName;
                    
                    showStatus('تم حفظ التغييرات بنجاح', 'success');
                } catch (error) {
                    console.error('Error saving profile changes:', error);
                    showStatus(`خطأ في حفظ التغييرات: ${error.message}`, 'error');
                }
            }
            
    // دالة لفتح نافذة تغيير الصورة
    function openAvatarModal() {
        document.getElementById('avatarUrlInput').value = currentUserData.avatar_url || '';
        document.getElementById('avatarModal').style.display = 'flex';
    }

    // دالة لإغلاق نافذة تغيير الصورة
    function closeAvatarModal() {
        document.getElementById('avatarModal').style.display = 'none';
    }

    // دالة لحفظ رابط الصورة الجديدة
    async function saveAvatarUrl() {
        const avatarUrl = document.getElementById('avatarUrlInput').value;
        
        if (!avatarUrl) {
            showStatus('يرجى إدخال رابط الصورة', 'error');
            return;
        }

        try {
            // تحديث رابط الصورة في قاعدة البيانات
            const { data, error } = await supabaseClient
                .from('users')
                .update({ avatar_url: avatarUrl })
                .eq('id', currentUserId);

            if (error) throw error;

            // تحديث الصورة في الواجهة
            document.getElementById('profileImage').src = avatarUrl;
            document.getElementById('avatarModal').style.display = 'none';
            
            // تحديث البيانات المحلية
            currentUserData.avatar_url = avatarUrl;
            
            showStatus('تم تغيير الصورة الشخصية بنجاح', 'success');
        } catch (error) {
            console.error('Error saving avatar URL:', error);
            showStatus(`خطأ في تغيير الصورة: ${error.message}`, 'error');
        }
    }

// دالة لتحميل بيانات الملف الشخصي
async function loadProfileData() {
    console.log("loadProfileData: بدء التنفيذ");
    try {
        // التحقق من وجود currentUserData
        if (!currentUserData) {
            console.error("loadProfileData: currentUserData غير معرف");
            showStatus('خطأ في تحميل بيانات الملف الشخصي: بيانات المستخدم غير متوفرة', 'error');
            return;
        }

        // تحديث معلومات المستخدم الأساسية
        document.getElementById('profileName').textContent = currentUserData.full_name || 'غير محدد';
        document.getElementById('profileRole').textContent = currentUserData.role === 'teacher' ? 'معلم' : currentUserData.role;
        
        // تحديث الصورة الشخصية
        const avatarUrl = currentUserData.avatar_url || 'https://placehold.co/120x120?text=PP';
        document.getElementById('profileImage').src = avatarUrl;
        
        // تحميل بيانات النموذج
        document.getElementById('fullName').value = currentUserData.full_name || '';
        document.getElementById('email').value = currentUserData.email || '';
        document.getElementById('phone').value = currentUserData.phone || '';
        document.getElementById('specialty').value = currentUserData.specialty || '';
        
        console.log("loadProfileData: جاري تحميل سجل الحضور...");
        // تحميل سجل الحضور الشخصي (آخر 5 تسجيلات)
        await loadProfileAttendanceRecords(); // <-- التأكد من استدعاء الدالة
        console.log("loadProfileData: تم الانتهاء من تحميل سجل الحضور.");
        
        // --- ربط الأحداث بعد التأكد من وجود العناصر ---
        // 1. ربط نموذج الملف الشخصي بحدث الإرسال
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            if (!profileForm.dataset.profileFormListenerAdded) {
                profileForm.addEventListener('submit', saveProfileChanges);
                profileForm.dataset.profileFormListenerAdded = 'true';
                console.log("loadProfileData: تم ربط حدث submit لنموذج الملف الشخصي.");
            }
        } else {
            console.warn('loadProfileData: عنصر profileForm غير موجود في الصفحة عند محاولة ربط الحدث');
        }

        // 2. ربط حدث تغيير الصورة الشخصية (للتحميل المحلي)
        const profileImageInput = document.getElementById('profileImageInput');
        if (profileImageInput) {
            if (!profileImageInput.dataset.profileImageInputListenerAdded) {
                profileImageInput.removeEventListener('change', window.handleProfileImageChange);
                window.handleProfileImageChange = function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            document.getElementById('profileImage').src = event.target.result;
                            showStatus('تم تغيير الصورة الشخصية', 'success');
                        }
                        reader.readAsDataURL(file);
                    }
                };
                profileImageInput.addEventListener('change', window.handleProfileImageChange);
                profileImageInput.dataset.profileImageInputListenerAdded = 'true';
                console.log("loadProfileData: تم ربط حدث change لتحميل الصورة.");
            }
        }

    } catch (error) {
        console.error('loadProfileData: Error caught:', error);
        showStatus(`خطأ في تحميل بيانات الملف الشخصي: ${error.message}`, 'error');
    } finally {
        console.log("loadProfileData: انتهى التنفيذ.");
    }
}
    // تحديث دالة تحميل بيانات المستخدم
    async function loadUserData() {
        try {
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
            if (authError) throw authError;
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            currentUserId = user.id;
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('id, full_name, role, specialty, avatar_url') // إضافة avatar_url
                .eq('id', currentUserId)
                .single();
            if (userError && userError.code !== 'PGRST116') {
                throw userError;
            }
            if (userData) {
                currentUserData = userData;
                // ... (باقي الكود كما هو) ...
            } else {
                showStatus('خطأ في تحميل بيانات المستخدم', 'error');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showStatus('خطأ في تحميل بيانات المستخدم', 'error');
        }
    }

            // ربط نموذج الملف الشخصي بحدث الإرسال
            document.getElementById('profileForm').addEventListener('submit', saveProfileChanges);
            

            
        document.addEventListener('DOMContentLoaded', async () => {
            await loadUserData(); // أولاً حمّل بيانات المستخدم
            switchTab('dashboard'); // بعدها انتقل للتبويب المطلوب

            });
