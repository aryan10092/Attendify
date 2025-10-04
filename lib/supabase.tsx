
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://euttqzpzpyyrzlsshpja.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dHRxenB6cHl5cnpsc3NocGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjMzMjksImV4cCI6MjA3MjQ5OTMyOX0.TGP3DpwvD6gQAQLL7tCyNJGc5UVxh4fLNsQyQVxChLk'
export const supabase = createClient(supabaseUrl, supabaseKey)