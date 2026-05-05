import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'sql.freedb.tech',
  user: process.env.DB_USER || 'u_CnYAf8',
  password: process.env.DB_PASS || 'xzh9p9vNPI2F',
  database: process.env.DB_NAME || 'freedb_QO4yx7Bw', // Check your FreeDB dashboard for the exact name
};

const JWT_SECRET = process.env.JWT_SECRET || 'debt-tracker-secret-key';

let pool: mysql.Pool;

async function initDb() {
  try {
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL successfully');
    
    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        fullname VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure 'fullname' column exists in 'users'
    try {
      await connection.query('ALTER TABLE users ADD COLUMN fullname VARCHAR(255) AFTER username');
    } catch (e) {}

    await connection.query(`
      CREATE TABLE IF NOT EXISTS debtors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        area VARCHAR(255),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Ensure 'area' column exists in 'debtors'
    try {
      await connection.query('ALTER TABLE debtors ADD COLUMN area VARCHAR(255) AFTER email');
    } catch (e) {}

    await connection.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        debtor_id INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description TEXT,
        status ENUM('pending', 'paid') DEFAULT 'pending',
        debt_date DATE,
        paid_at DATETIME NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (debtor_id) REFERENCES debtors(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Ensure 'paid_at' column exists in 'debts'
    try {
      await connection.query('ALTER TABLE debts ADD COLUMN paid_at DATETIME NULL AFTER debt_date');
    } catch (e) {}

    // Create default accounts if not exists
    const createDefaultAccount = async (username: string, fullname: string, pass: string, role: string) => {
      const [rows]: any = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
      if (rows.length === 0) {
        const hashedPassword = await bcrypt.hash(pass, 10);
        const [result]: any = await connection.query('INSERT INTO users (username, fullname, password, role) VALUES (?, ?, ?, ?)', [username, fullname, hashedPassword, role]);
        console.log(`Default ${role} created: ${username} / ${pass}`);
        return result.insertId;
      }
      return rows[0].id;
    };

    const adminId = await createDefaultAccount('admin', 'Administrator', 'admin123', 'admin');
    await createDefaultAccount('user', 'Người dùng mẫu', 'user123', 'user');

    // Add sample data if empty
    const [debtRows]: any = await connection.query('SELECT COUNT(*) as count FROM debts');
    if (debtRows[0].count === 0) {
      console.log('Inserting sample data...');
      
      // Sample Debtor 1
      const [debtor1]: any = await connection.query(
        'INSERT INTO debtors (name, phone, created_by) VALUES (?, ?, ?)',
        ['Nguyễn Văn A', '0901234567', adminId]
      );
      
      // Sample Debt 1
      await connection.query(
        'INSERT INTO debts (debtor_id, amount, description, status, debt_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [debtor1.insertId, 5000000, 'Tiền mượn nhập hàng', 'pending', '2024-03-01', adminId]
      );

      // Sample Debtor 2
      const [debtor2]: any = await connection.query(
        'INSERT INTO debtors (name, phone, created_by) VALUES (?, ?, ?)',
        ['Trần Thị B', '0987654321', adminId]
      );
      
      // Sample Debt 2
      await connection.query(
        'INSERT INTO debts (debtor_id, amount, description, status, debt_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [debtor2.insertId, 2500000, 'Nợ tiền ăn trưa nhóm', 'paid', '2024-03-15', adminId]
      );
      
      console.log('Sample data inserted successfully.');
    }

    connection.release();
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Middleware for auth
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, fullname: user.fullname }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullname: user.fullname } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debtors', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'admin') return res.json([]);
  try {
    const [rows] = await pool.query('SELECT * FROM debtors WHERE created_by = ? ORDER BY name ASC', [req.user.id]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debts', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'admin') return res.json([]);
  try {
    const [rows] = await pool.query(`
      SELECT debts.*, debtors.name as debtor_name, debtors.area as debtor_area
      FROM debts 
      JOIN debtors ON debts.debtor_id = debtors.id 
      WHERE debts.created_by = ?
      ORDER BY debts.debt_date DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/areas', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'admin') return res.json([]);
  try {
    const [rows]: any = await pool.query(
      'SELECT DISTINCT area FROM debtors WHERE created_by = ? AND area IS NOT NULL AND area != "" ORDER BY area ASC',
      [req.user.id]
    );
    res.json(rows.map((r: any) => r.area));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const [userCount]: any = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const [debtStats]: any = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM debts');
    const [paidStats]: any = await pool.query("SELECT SUM(amount) as total FROM debts WHERE status = 'paid'");
    
    // Get historical data for chart (last 7 days of debt creation)
    const [history]: any = await pool.query(`
      SELECT DATE(debt_date) as date, SUM(amount) as amount 
      FROM debts 
      WHERE debt_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(debt_date)
      ORDER BY date ASC
    `);

    // Get distribution by area for admin chart (aggregate only)
    const [areaDist]: any = await pool.query(`
      SELECT debtors.area as name, SUM(debts.amount) as value
      FROM debts
      JOIN debtors ON debts.debtor_id = debtors.id
      GROUP BY debtors.area
    `);
    
    // Get database metadata
    const [tables]: any = await pool.query('SHOW TABLES');
    const [dbSize]: any = await pool.query(`
      SELECT SUM(data_length + index_length) / 1024 / 1024 AS size_mb 
      FROM information_schema.TABLES 
      WHERE table_schema = DATABASE()
    `);
    
    // Get registration history (proxy for logins/activity)
    const [regHistory]: any = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM users 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    // Get debt creation history
    const [creationHistory]: any = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM debts 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    // Get payment history
    const [paymentHistory]: any = await pool.query(`
      SELECT DATE_FORMAT(paid_at, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM debts 
      WHERE paid_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    res.json({
      totalUsers: userCount[0].count,
      activeUsers: Math.floor(userCount[0].count * 0.8), // Mock active users
      totalDebtCount: debtStats[0].count,
      totalDebtAmount: debtStats[0].total || 0,
      totalPaidAmount: paidStats[0].total || 0,
      analytics: {
        registrations: regHistory,
        creations: creationHistory,
        payments: paymentHistory
      },
      dbStatus: {
        isConnected: true,
        tableCount: tables.length,
        estimatedSizeMB: parseFloat(dbSize[0].size_mb || 0).toFixed(2)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const [rows] = await pool.query('SELECT id, username, fullname, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { username, password, fullname, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, fullname, role || 'user']
    );
    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debts', authenticateToken, async (req: any, res) => {
  const { debtorName, amount, description, status, debt_date, phone, email, area } = req.body;
  const userId = req.user.id;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Find or create debtor
      let debtorId;
      const [debtorRows]: any = await connection.query('SELECT id FROM debtors WHERE name = ? AND created_by = ?', [debtorName, userId]);
      
      if (debtorRows.length > 0) {
        debtorId = debtorRows[0].id;
        // Optionally update area if provided
        if (area) {
          await connection.query('UPDATE debtors SET area = ? WHERE id = ?', [area, debtorId]);
        }
      } else {
        const [result]: any = await connection.query(
          'INSERT INTO debtors (name, phone, email, area, created_by) VALUES (?, ?, ?, ?, ?)',
          [debtorName, phone || '', email || '', area || '', userId]
        );
        debtorId = result.insertId;
      }

      // Add debt
      await connection.query(
        'INSERT INTO debts (debtor_id, amount, description, status, debt_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [debtorId, amount, description, status || 'pending', debt_date || new Date(), userId]
      );

      await connection.commit();
      res.status(201).json({ message: 'Debt added successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/debts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const paidAt = status === 'paid' ? new Date() : null;
    await pool.query('UPDATE debts SET status = ?, paid_at = ? WHERE id = ?', [status, paidAt, id]);
    res.json({ message: 'Debt updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/debtors/:id/pay-all', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const paidAt = new Date();
    await pool.query(
      'UPDATE debts SET status = ?, paid_at = ? WHERE debtor_id = ? AND created_by = ? AND status = "pending"',
      ['paid', paidAt, id, userId]
    );
    res.json({ message: 'All debts marked as paid for this debtor' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware
async function startServer() {
  await initDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
