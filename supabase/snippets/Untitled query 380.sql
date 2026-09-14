select * from permissions where module = 'workers';

select users.email, permissions.* from users 
join user_permissions on users.id = user_permissions.user_id 
join permissions on permissions.id = user_permissions.permission_id
where users.email like '%admin%' and permissions.module like '%wo%';
