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
  if (req.body && req.body.params) {
    try {
      const paramsObj = JSON.parse(req.body.params);
      if (paramsObj.datasourceConfig) {
        const datasourceConfigObj = JSON.parse(paramsObj.datasourceConfig);
        if (datasourceConfigObj.value) {
          const configVal = JSON.parse(datasourceConfigObj.value);
          if (configVal.syncModule) {
            syncModule = configVal.syncModule;
          }
        }
      }
    } catch (e) {
      console.warn("解析 table_meta 中的 syncModule 失败，使用默认值:", e.message);
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
  try {
    await saveAccount(req.body);
    res.status(200).json({ code: 0, message: "账号已保存至数据库" });
  } catch (e) {
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
    const activeAccount = accountsList.find(a => a.is_active === 1);
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
