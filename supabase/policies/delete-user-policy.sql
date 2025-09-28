-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow service role to delete users
CREATE POLICY "Enable delete for service_role" ON public.users
FOR DELETE USING (true);

-- Allow service role to select users
CREATE POLICY "Enable select for service_role" ON public.users
FOR SELECT USING (true);

-- Grant permissions to service role
GRANT DELETE, SELECT ON public.users TO service_role;