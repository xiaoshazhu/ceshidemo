/**
 * JSDoc 文档注释
 * @module Database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'connector.db');
const db = new sqlite3.Database(dbPath);

/**
 * 功能描述：初始化 SQLite 数据库表结构，创建 accounts、captured_buffer、tasks 以及 errors 结构表。
 * @return {Promise<void>} 返回初始化数据库的 Promise
 */
function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. 账号表，新增 is_active 字段标示当前同步任务中启用的账号
      db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          key TEXT PRIMARY KEY,
          name TEXT,
          mode TEXT,
          status TEXT,
          cookie TEXT,
          shopId TEXT,
          is_active INTEGER DEFAULT 0
        )
      `);

      // 2. 捕获缓存表
      db.run(`
        CREATE TABLE IF NOT EXISTS captured_buffer (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          captured INTEGER,
          cookie TEXT,
          shopId TEXT,
          shopName TEXT,
          module TEXT
        )
      `);

      // 初始化一条空捕获记录，避免查询时无数据
      db.get("SELECT COUNT(*) as count FROM captured_buffer", (err, row) => {
        if (!err && row.count === 0) {
          db.run("INSERT INTO captured_buffer (captured, cookie, shopId, shopName, module) VALUES (0, '', '', '', '')");
        }
      });

      // 3. 定时同步任务配置表
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          config TEXT
        )
      `);

      // 4. 故障异常表，对齐多维表格 Schema 字段
      db.run(`
        CREATE TABLE IF NOT EXISTS errors (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          platform TEXT,
          shop_name TEXT,
          error_type TEXT,
          error_message TEXT,
          status TEXT
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          // 尝试升级旧 accounts 表结构以支持 module 与 platform 字段
          db.run("ALTER TABLE accounts ADD COLUMN module TEXT", () => {
            db.run("ALTER TABLE accounts ADD COLUMN platform TEXT", () => {
              // 自动修复迁移旧存量数据中为空的 platform 字段，统一归于默认的抖音数据源下
              db.run("UPDATE accounts SET platform = 'douyin' WHERE platform IS NULL OR platform = ''", (errMigrate) => {
                resolve();
              });
            });
          });
        }
      });
    });
  });
}

/**
 * 功能描述：基于同步动作模块自动识别归属的数据源平台 (用作容错兜底)
 * @param {string} module - 同步模块标识
 * @return {string} 返回所属平台键值
 */
function detectPlatformByModule(module) {
  if (!module) return 'douyin';
  const m = String(module);
  if (m.startsWith('xiaohongshu_')) return 'xiaohongshu';
  if (m.startsWith('qianchuan_')) return 'qianchuan';
  if (m.startsWith('alimama_')) return 'alimama';
  if (m.startsWith('jingmai_')) return 'jingmai';
  if (m.startsWith('jushuitan_')) return 'jushuitan';
  if (m.startsWith('qianniu_')) return 'qianniu';
  return 'douyin';
}

/**
 * 功能描述：保存或更新自建新账号
 * @param {object} account - 账号对象
 * @return {Promise<void>} 无返回值
 */
function saveAccount(account) {
  const platformVal = account.platform || detectPlatformByModule(account.module);
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const insertAccount = () => {
        db.run(
          `INSERT OR REPLACE INTO accounts (key, name, mode, status, cookie, shopId, is_active, module, platform) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            account.key,
            account.name,
            account.mode,
            account.status,
            account.cookie || '',
            account.shopId || '',
            account.is_active || 0,
            account.module || '',
            platformVal
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      };

      if (account.is_active === 1) {
        db.run("UPDATE accounts SET is_active = 0 WHERE platform = ?", [account.platform || ''], (err) => {
          if (err) return reject(err);
          insertAccount();
        });
      } else {
        insertAccount();
      }
    });
  });
}

/**
 * 功能描述：获取所有已绑定的账号列表
 * @return {Promise<Array>} 返回账号列表数组
 */
function getAccounts() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM accounts", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * 功能描述：设置当前启用的活跃账号，将指定的 key 设为活跃 (is_active=1)，其余设为 0
 * @param {string} key - 启用的账号主键
 * @return {Promise<void>} 无返回值
 */
function setActiveAccount(key) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `UPDATE accounts SET is_active = 0 
         WHERE platform = (SELECT platform FROM accounts WHERE key = ?)`, 
        [key], 
        (err) => {
          if (err) return reject(err);
          db.run("UPDATE accounts SET is_active = 1 WHERE key = ?", [key], (err2) => {
            if (err2) reject(err2);
            else resolve();
          });
        }
      );
    });
  });
}

/**
 * 功能描述：解除与删除某个绑定的账号
 * @param {string} key - 账号主键
 * @return {Promise<void>} 无返回值
 */
function deleteAccount(key) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM accounts WHERE key = ?", [key], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * 功能描述：将书签捕获上报的凭证和识别的模块暂存写入捕获数据库中
 * @param {object} buffer - 捕获对象，包含 cookie、shopId、shopName、module 等
 * @return {Promise<void>} 无返回值
 */
function saveCapturedBuffer(buffer) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE captured_buffer SET captured = 1, cookie = ?, shopId = ?, shopName = ?, module = ? WHERE id = 1`,
      [buffer.cookie, buffer.shopId || '', buffer.shopName || '', buffer.module || 'order_report'],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * 功能描述：查询当前数据库中是否有书签回传的捕获凭证与对应模块
 * @return {Promise<object>} 返回捕获缓存对象
 */
function getCapturedBuffer() {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM captured_buffer WHERE id = 1", [], (err, row) => {
      if (err) reject(err);
      else resolve(row || { captured: 0, cookie: '', shopId: '', shopName: '', module: '' });
    });
  });
}

/**
 * 功能描述：清空捕获凭证缓冲区，重置状态
 * @return {Promise<void>} 无返回值
 */
function clearCapturedBuffer() {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE captured_buffer SET captured = 0, cookie = '', shopId = '', shopName = '', module = '' WHERE id = 1",
      [],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * 功能描述：保存同步任务配置
 * @param {string} id - 任务主键 ID
 * @param {object} config - 配置参数对象
 * @return {Promise<void>} 无返回值
 */
function saveTask(id, config) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR REPLACE INTO tasks (id, config) VALUES (?, ?)",
      [id, JSON.stringify(config)],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * 功能描述：更新指定账号关联的同步动作模块
 * @param {string} key - 账号主键
 * @param {string} module - 模块标识
 * @return {Promise<void>} 无返回值
 */
function updateAccountModule(key, module) {
  return new Promise((resolve, reject) => {
    db.run("UPDATE accounts SET module = ? WHERE key = ?", [module, key], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * 功能描述：持久化保存同步故障异常记录
 * @param {object} error - 异常明细对象
 * @return {Promise<void>} 无返回值
 */
function saveError(error) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO errors (id, timestamp, platform, shop_name, error_type, error_message, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [error.id, error.timestamp, error.platform, error.shopName, error.errorType, error.errorMessage, error.status],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  initDb,
  saveAccount,
  getAccounts,
  setActiveAccount,
  deleteAccount,
  saveCapturedBuffer,
  getCapturedBuffer,
  clearCapturedBuffer,
  saveTask,
  updateAccountModule,
  saveError
};
