UPDATE users
SET password_hash = '$2b$10$EoYe2P9jISfblisOh2ZlNespYs231FP0s2zZQ5mivlUrwK45Grcwe'   -- Hash REAL de "admin123"
WHERE email = 'admin@laboratorio.com';