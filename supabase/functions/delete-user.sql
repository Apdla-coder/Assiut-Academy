-- Function to delete a user and related data
create or replace function delete_user_by_id(user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    -- Delete user data from all related tables
    delete from users where id = user_id;
    
    -- يمكنك إضافة المزيد من عمليات الحذف هنا إذا كان هناك جداول مرتبطة
    -- مثال: delete from user_preferences where user_id = user_id;
    
    -- Return success
    return;
exception
    when others then
        -- Log error and re-raise
        raise exception 'Failed to delete user: %', SQLERRM;
end;
$$;