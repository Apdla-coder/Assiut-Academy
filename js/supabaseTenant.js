  // Supabase Configuration
  const supabaseUrl = "https://zefsmckaihzfiqqbdake.supabase.co"
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzcnlycHF0YnJkbHdxeHh4eXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTU2NDIsImV4cCI6MjA3OTAzMTY0Mn0.yJzpt5lBgu7CGSpVgMWwO7C_-0WBmsoBE62gBt0eejU"
  const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

// جيب الـ academy_id الحالي من localStorage أو من context أو من أي مكان بتحفظه فيه
export const getCurrentAcademyId = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('current_academy_id') || null
}

// دي الدالة السحرية: بدل ما تستخدم supabase.from() مباشرة، استخدم دي
export const supabaseTenant = () => {
  const academyId = getCurrentAcademyId()

  // لو مفيش academy مختارة → ارجع client عادي (للـ login مثلاً)
  if (!academyId) {
    return supabase
  }

  // لو في academy → كل query هتضيف .eq('academy_id', academyId) تلقائي
  return {
    from: (table) => {
      const query = supabase.from(table).select.bind(supabase.from(table))
      const original = supabase.from(table)

      // نعدل كل الدوال المهمة (select, insert, update, delete, upsert)
      return {
        select: (columns = '*') => original.select(columns).eq('academy_id', academyId),
        insert: (values) => {
          const data = Array.isArray(values) ? values.map(v => ({ ...v, academy_id: academyId })) : { ...values, academy_id: academyId }
          return original.insert(data)
        },
        update: (values) => original.update(values).eq('academy_id', academyId),
        delete: () => original.delete().eq('academy_id', academyId),
        upsert: (values) => {
          const data = Array.isArray(values) ? values.map(v => ({ ...v, academy_id: academyId })) : { ...values, academy_id: academyId }
          return original.upsert(data)
        },
        // لو عايز single() أو maybeSingle() أو أي حاجة تانية، ضيفها بنفس الطريقة
        single: () => original.select('*').eq('academy_id', academyId).single(),
      }
    },

    // لو عايز storage أو auth أو functions، هيشتغلوا عادي
    storage: supabase.storage,
    auth: supabase.auth,
    rpc: supabase.rpc,
  }
}