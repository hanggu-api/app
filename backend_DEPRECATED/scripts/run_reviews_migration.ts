import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('DB Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME
});

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'conserta_db'
};

async function main() {
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    console.log('📦 Recreating reviews table...');

    await connection.execute('DROP TABLE IF EXISTS reviews');

    await connection.execute(`
      CREATE TABLE reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id CHAR(36) NOT NULL,
        reviewer_id BIGINT NOT NULL,
        reviewee_id BIGINT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_review (service_id, reviewer_id),
        FOREIGN KEY (service_id) REFERENCES service_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Reviews table created successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

main();
