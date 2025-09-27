import { serve } from 'https://deno.land/std@0.204.0/http/server.ts';
import { cre  catch (error: any) {
    console.error('Error in delete operation:', error);
    
    // إرجاع استجابة الخطأ مع تفاصيل أكثر
    const errorMessage = error.message || 'An error occurred while deleting the user';
    console.error('Returning error response:', errorMessage);
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.details || {},
        code: error.code || 'UNKNOWN_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // تغيير كود الحالة إلى 500 للأخطاء الداخلية
      }
    )SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';

// تعريف أنواع البيانات
interface DeleteUserRequest {
  userId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

serve(async (req: Request) => {
  console.log('Received request:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // تحقق من طريقة الطلب
    if (req.method !== 'POST') {
      console.error('Invalid method:', req.method);
      throw new Error('Method not allowed')
    }

    // استخراج البيانات من الطلب
    const body = await req.json();
    console.log('Request body:', body);
    
    const { userId } = body as DeleteUserRequest;

    if (!userId) {
      throw new Error('User ID is required')
    }

    // إنشاء عميل Supabase مع صلاحيات الخدمة
    const supabaseClient = createClient(
      // استخدم القيم المباشرة للتجربة
      'https://zefsmckaihzfiqqbdake.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtY2thaWh6ZmlxcWJkYWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDIzNTM1OCwiZXhwIjoyMDY5ODExMzU4fQ.Ebb0swXnl8Wx3n8syoAhGrwHYXKVik8jqhraX_1MANs'
    )

    console.log('Starting delete operation for user:', userId);

    // حذف المستخدم من نظام المصادقة أولاً
    console.log('Deleting user from auth system...');
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Auth deletion error:', authError);
      throw new Error(`Auth deletion failed: ${authError.message}`);
    }
    
    console.log('User deleted from auth system successfully');

    // ثم حذف المستخدم من جدول users
    console.log('Deleting user from users table...');
    const { error: deleteError } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      throw new Error(`Database deletion failed: ${deleteError.message}`);
    }
    
    console.log('User deleted from database successfully');

    // إرجاع استجابة نجاح
    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    // إرجاع استجابة الخطأ
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while deleting the user',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})