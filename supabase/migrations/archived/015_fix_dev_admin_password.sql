-- Solo desarrollo: asegura la contraseña del admin del seed.
-- Email: admin@laboratorio.com
-- Password: Admin123!@#$
UPDATE users
SET password_hash = '$2b$10$RskUD4Aa6nd8jljqvuFvT.LtgsRm6xMqnBYlm/IlqhOXooSxgTiVm'
WHERE email = 'admin@laboratorio.com';
