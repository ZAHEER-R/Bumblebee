import Database from "better-sqlite3";


const db = new Database(
  "ultron_memory.db"
);


db.exec(`


CREATE TABLE IF NOT EXISTS memories (

id INTEGER PRIMARY KEY AUTOINCREMENT,

category TEXT,

key TEXT UNIQUE,

value TEXT,

importance INTEGER DEFAULT 1,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS conversations (

id INTEGER PRIMARY KEY AUTOINCREMENT,

role TEXT,

message TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS user_profile (

id INTEGER PRIMARY KEY AUTOINCREMENT,

field TEXT UNIQUE,

value TEXT

);


`);



export default db;