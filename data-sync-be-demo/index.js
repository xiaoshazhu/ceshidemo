/**
 * JSDoc 文档注释
 * @module Index
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

const { getTableMeta } = require("./table_meta.js");
const { getTableRecords } = require("./table_records.js");
const { judgeEncryptSignValid } = require("./request_sign.js");

// 引入 SQLite 数据库操作
const {
  initDb,
  saveAccount,
  getAccounts,
  setActiveAccount,
  deleteAccount,
  saveCapturedBuffer,
  getCapturedBuffer,
  clearCapturedBuffer,
  saveTask,
  updateAccountModule
} = require("./database.js");

const app = express();

// 初始化 SQLite 数据库
initDb().then(() => {
  console.log("✅ [SQLite .db 初始化就绪] 数据表连接创建完毕！");
}).catch(err => {
  console.error("❌ SQLite 初始化失败:", err);
});

// 中间件：支持 Express 解析 JSON 报文
app.use(express.json());

// 跨域资源共享 (CORS) 拦截器：允许抖音页面上的书签提取助手跨域上报凭据
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-base-request-nonce, x-base-request-timestamp, x-base-signature");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 托管前端打包编译后的静态网页资源
app.use(express.static(path.join(__dirname, "../data-sync-fe-demo/dist")));

/**
 * 功能描述：检查服务状态主入口
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.get("/", (req, res) => {
  res.send("飞书连接器后端服务正在平稳运行中！");
});

/**
 * 功能描述：动态解析并返回 meta.json 元数据，将界面加载 URI 动态替换为当前的 ngrok 外部穿透地址
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.get("/meta.json", (req, res) => {
  const host = req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  
  fs.readFile(
    path.join(__dirname, "./public/meta.json"),
    "utf8",
    (err, data) => {
      if (err) {
        return res.status(500).send("读取配置文件错误");
      }
      try {
        const json = JSON.parse(data);
        json.extraData.dataSourceConfigUiUri = `${proto}://${host}/index.html`;
        
        res.set("Content-Type", "application/json");
        res.status(200).send(JSON.stringify(json, null, 2));
      } catch (e) {
        res.status(500).send("解析配置文件 JSON 失败");
      }
    }
  );
});

/**
 * 功能描述：接收飞书多维表格引擎关于字段 Schema 配置的请求
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.post("/api/table_meta", (req, res) => {
  console.log("table_meta 请求数据", req.body);
  const isValid = judgeEncryptSignValid(req);
  console.log("飞书加密签名验证结果：", isValid);

  let syncModule = 'order_report';
  if (req.body) {
    if (req.body.params) {
      try {
        const paramsObj = typeof req.body.params === 'string' ? JSON.parse(req.body.params) : req.body.params;
        let datasourceConfigObj = paramsObj.datasourceConfig;
        if (datasourceConfigObj) {
          if (typeof datasourceConfigObj === 'string') {
            datasourceConfigObj = JSON.parse(datasourceConfigObj);
          }
          let configVal = datasourceConfigObj.value;
          if (configVal) {
            if (typeof configVal === 'string') {
              configVal = JSON.parse(configVal);
            }
            if (configVal.syncModule) {
              syncModule = configVal.syncModule;
            }
          }
        }
      } catch (e) {
        console.warn("解析 table_meta 中的 params.syncModule 失败:", e.message);
      }
    }
    if (syncModule === 'order_report' && req.body.config && req.body.config.value) {
      try {
        const configVal = typeof req.body.config.value === 'string' ? JSON.parse(req.body.config.value) : req.body.config.value;
        if (configVal && configVal.syncModule) {
          syncModule = configVal.syncModule;
        }
      } catch (e) {
        console.warn("解析 table_meta 中的 config.syncModule 失败:", e.message);
      }
    }
  }

  const result = { 
    code: 0, 
    message: "POST请求成功", 
    data: getTableMeta(syncModule) 
  };
  res.status(200).json(result);
});

/**
 * 功能描述：接收飞书多维表格引擎获取数据的请求
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.post("/api/records", async (req, res) => {
  console.log("table_records 请求数据", req.body);
  const isValid = judgeEncryptSignValid(req);
  console.log("飞书加密签名验证结果：", isValid);

  try {
    const result = {
      code: 0,
      message: "POST请求成功",
      data: await getTableRecords(req.body),
    };
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

/**
 * 功能描述：接收由浏览器一键捕获书签回传的 Cookie 凭据、商户 ID 与被访问的模块标识
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.post("/api/v1/connector/sources/login-capture", async (req, res) => {
  const { cookie, shopId, shopName, module } = req.body;
  if (!cookie) {
    return res.status(400).json({ code: 400, message: "Cookie 凭证为空，无法保存" });
  }

  const payload = {
    cookie: cookie,
    shopId: shopId || "",
    shopName: shopName || "抖音电商罗盘店铺",
    module: module || "order_report"
  };

  try {
    // 写入 SQLite 暂存
    await saveCapturedBuffer(payload);
    console.log("✅ [Cookie 拦截成功] 抖音登录凭证已注入 SQLite 暂存数据库:", payload);
    res.status(200).json({ code: 0, message: "登录凭证已拦截成功并存入 .db 数据库" });
  } catch (e) {
    res.status(500).json({ code: 500, message: `写入暂存数据库出错: ${e.message}` });
  }
});

/**
 * 功能描述：接收由浏览器一键书签直接提取的真实数据并持久化到本地 scratch JSON 缓存
 */
app.post("/api/v1/connector/sources/data-capture", async (req, res) => {
  const { cookie, shopId, shopName, module, dataList } = req.body;
  if (!cookie) {
    return res.status(400).json({ code: 400, message: "Cookie 凭证为空" });
  }

  const payload = {
    cookie: cookie,
    shopId: shopId || "",
    shopName: shopName || "千牛工作台店铺",
    module: module || "qianniu_fund_detail"
  };

  try {
    const { saveCapturedBuffer } = require("./database.js");
    await saveCapturedBuffer(payload);
    console.log("✅ [data-capture] 凭证已注入 SQLite 暂存数据库:", payload);

    if (Array.isArray(dataList) && dataList.length > 0) {
      const fs = require('fs');
      const cachePath = '/Users/wangxun/.gemini/antigravity-ide/brain/471893df-480c-4f75-a67b-5d13cb419620/scratch/qianniu_cache.json';
      fs.writeFileSync(cachePath, JSON.stringify(dataList, null, 2), 'utf8');
      console.log(`✅ [data-capture] 成功将 ${dataList.length} 条真实数据写入本地缓存文件: ${cachePath}`);
    }

    res.status(200).json({ code: 0, message: "数据及凭据接收成功！" });
  } catch (e) {
    res.status(500).json({ code: 500, message: `保存失败: ${e.message}` });
  }
});

/**
 * 功能描述：接收由浏览器一键书签 GET 方式回传的凭据（绕过严格的 CSP 跨域策略拦截）
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.get("/api/v1/connector/sources/login-capture-get", async (req, res) => {
  const { cookie, shopId, shopName, module } = req.query;
  if (!cookie) {
    return res.status(400).send("<h1>错误：Cookie 凭证为空</h1>");
  }

  const payload = {
    cookie: cookie,
    shopId: shopId || "",
    shopName: shopName || "小红书/电商平台店铺",
    module: module || "xiaohongshu_pugongying"
  };

  try {
    // 写入 SQLite 暂存
    await saveCapturedBuffer(payload);
    console.log("✅ [GET 凭证拦截成功] 登录凭证已注入 SQLite 暂存数据库:", payload);
    
    // 返回精致的玻璃拟态自动关闭成功确认页
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>凭证上报成功</title>
        <style>
          body {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.18);
            max-width: 400px;
          }
          h1 { color: #2b821d; font-size: 24px; margin-bottom: 10px; }
          p { color: #555; font-size: 14px; line-height: 1.6; }
          .loader {
            margin: 20px auto 0;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🎉 上报成功！</h1>
          <p>小红书 / 电商平台登录凭证已安全传输至连接器。<br>本窗口将在 2 秒后自动关闭，请返回多维表格配置页面继续。</p>
          <div class="loader"></div>
        </div>
        <script>
          setTimeout(function() {
            window.close();
          }, 2000);
        </script>
      </body>
      </html>
    `);
  } catch (e) {
    res.status(500).send(`<h1>写入暂存数据库出错</h1><p>${e.message}</p>`);
  }
});

/**
 * 功能描述：提供给前端 H5 弹窗轮询以查看当前是否成功捕获了 Cookie 凭证与关联模块
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.get("/api/v1/connector/sources/capture-status", async (req, res) => {
  try {
    const data = await getCapturedBuffer();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 功能描述：清空捕获凭证数据库缓冲区
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.post("/api/v1/connector/sources/capture-clear", async (req, res) => {
  try {
    await clearCapturedBuffer();
    res.status(200).json({ code: 0, message: "捕获缓冲区已清空" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 功能描述：提供可被免密关联的企业共享账号列表
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.get("/api/v1/connector/shared-accounts", (req, res) => {
  const sharedList = [
    { id: "dy_share_01", name: "抖音罗盘-运营部共享01 (店铺ID: 982734)" },
    { id: "dy_share_02", name: "巨量千川-市场推广组共享 (广告主ID: 109283)" },
    { id: "dy_share_03", name: "聚水潭ERP-仓储管理专用共享" }
  ];
  res.status(200).json(sharedList);
});

/**
 * 功能描述：获取所有已绑定/关联的本地新账号列表
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.get("/api/v1/connector/accounts", async (req, res) => {
  try {
    const list = await getAccounts();
    res.status(200).json(list);
  } catch (e) {
    res.status(500).json({ code: 500, message: `获取账号列表出错: ${e.message}` });
  }
});

/**
 * 功能描述：向 SQLite 数据库中添加绑定自己的全新账号
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.post("/api/v1/connector/accounts/add", async (req, res) => {
  console.log("👉 [添加账号请求] Body:", req.body);
  try {
    await saveAccount(req.body);
    console.log("✅ 账号成功存入数据库:", req.body.key);
    res.status(200).json({ code: 0, message: "账号已保存至数据库" });
  } catch (e) {
    console.error("❌ 添加账号出错:", e);
    res.status(500).json({ code: 500, message: `添加账号出错: ${e.message}` });
  }
});

/**
 * 功能描述：将指定账号设为活跃账号，并将其他账号设为非活跃
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.post("/api/v1/connector/accounts/active", async (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ code: 400, message: "缺乏 key 关键字段" });
  }
  try {
    await setActiveAccount(key);
    res.status(200).json({ code: 0, message: "活跃账号已更新" });
  } catch (e) {
    res.status(500).json({ code: 500, message: `更新活跃状态出错: ${e.message}` });
  }
});

/**
 * 功能描述：在本地数据库中解除某个关联的账号
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.delete("/api/v1/connector/accounts/:key", async (req, res) => {
  const { key } = req.params;
  try {
    await deleteAccount(key);
    res.status(200).json({ code: 0, message: "该账号已从数据库中移除" });
  } catch (e) {
    res.status(500).json({ code: 500, message: `移除账号出错: ${e.message}` });
  }
});

/**
 * 功能描述：保存从前端提交的任务配置，用于后端心跳保活和后续定时增量同步任务
 * @param {object} req - Express 请求
 * @param {object} res - Express 响应
 */
app.post("/api/v1/sync/tasks/save", async (req, res) => {
  console.log("保存同步任务配置", req.body);
  const { syncModule } = req.body;

  // 1. 获取当前活跃账号并更新其绑定的模块
  try {
    const accountsList = await getAccounts();
    const activeAccount = accountsList.find(a => a.is_active === 1 && a.platform === req.body.platform);
    if (activeAccount && syncModule) {
      await updateAccountModule(activeAccount.key, syncModule);
      console.log(`✅ 已同步更新当前活跃账号 [${activeAccount.name}] 对应的模块为: ${syncModule}`);
    }
  } catch (e) {
    console.error("更新活跃账号模块出错:", e);
  }

  // 2. 保存到 SQLite tasks 中
  try {
    await saveTask('bitable_task', req.body);
  } catch (e) {
    console.error("写入 SQLite 任务配置出错:", e);
  }

  // 3. 依然保留一份任务文件 (兼容性支持)
  const taskDir = path.join(__dirname, 'data');
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }
  try {
    fs.writeFileSync(
      path.join(taskDir, 'tasks.json'),
      JSON.stringify(req.body, null, 2),
      'utf8'
    );
    res.status(200).json({ code: 0, message: "同步任务配置在后台存储成功" });
  } catch (e) {
    res.status(500).json({ code: 500, message: `保存任务配置出错: ${e.message}` });
  }
});

// 监听 3000 端口
app.listen(3000, () => {
  console.log("🚀 Express 飞书连接器后端服务器在端口 3000 上启动运行！");
});
