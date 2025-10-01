-- One-time update to set the first user as admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'divitbatra1102@gmail.com';