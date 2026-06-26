let fetch = require('node-fetch');
if (fetch && fetch.default) {
  fetch = fetch.default;
}
const { logSyncError } = require('./error_logger.js');

/**
 * 功能描述：在模式 B 下，使用 Cookie 凭据优先拉取工作台菜单路由，然后发起真实的订单数据请求。包含频控控制和心跳保活。
 * @param {string} cookie - 截获加密的抖音 Session Cookie
 * @param {string} shopId - 对接商户的店铺数字 ID
 * @param {string} dateRange - 回溯天数 (如 30)
 * @param {string} userAgent - 与登录环境完全一致的浏览器指纹
 * @param {string} taskId - 当前定时任务 ID
 * @return {Promise<Array>} 返回解析并清洗后的抖店订单记录列表
 */
/**
 * 功能描述：在模式 B 下，根据传入的模块类型与凭证，发起真实的抖店/罗盘接口网络请求
 * @param {string} cookie - 截获加密的抖音 Session Cookie
 * @param {string} shopId - 对接商户的店铺数字 ID
 * @param {string} syncModule - 同步目标模块标识
 * @param {string} dateRange - 回溯天数 (如 30)
 * @param {string} userAgent - 与登录环境完全一致 of 浏览器指纹
 * @param {string} taskId - 当前定时任务 ID
 * @return {Promise<Array>} 返回解析并清洗后的抖店/罗盘数据记录列表
 */
async function fetchRealDoudianData(cookie, shopId, syncModule, configOrDateRange, userAgent, taskId, pageNum = 1) {
  // 多态参数解析，兼容 config 对象与 dateRange 字符串
  let dateRange = '30';
  let merchantUid = '7291551609760710657';
  let payChannel = 'aggregate';
  let timeType = 'relative';
  let customStartDate = '';
  let customEndDate = '';

  if (configOrDateRange && typeof configOrDateRange === 'object') {
    dateRange = configOrDateRange.dateRange || '30';
    merchantUid = configOrDateRange.merchantUid || '7291551609760710657';
    payChannel = configOrDateRange.payChannel || 'aggregate';
    timeType = configOrDateRange.timeType || 'relative';
    customStartDate = configOrDateRange.customStartDate || '';
    customEndDate = configOrDateRange.customEndDate || '';
  } else if (typeof configOrDateRange === 'string') {
    dateRange = configOrDateRange;
  }

  const ua = userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  const headers = {
    'Cookie': cookie,
    'User-Agent': ua,
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8',
    'Referer': 'https://fxg.jinritemai.com/'
  };

  // 1. 模式 B 规定：单次请求之间必须设定 1.5s - 3s 的随机休眠延迟（Delay），防止触发平台风控
  const delayMs = Math.floor(Math.random() * 1500) + 1500;
  console.log(`[Mode B] 频控延迟休眠 ${delayMs} 毫秒...`);
  await new Promise(resolve => setTimeout(resolve, delayMs));

  // 2. 优先拉取工作台导航菜单 (Fetch Menu Structure)
  if (!syncModule.startsWith('xiaohongshu_')) {
    console.log(`[Mode B] 优先拉取控制台菜单以解析动态路由路径...`);
    const menuUrl = 'https://compass.jinritemai.com/compass/api/v1/menu';
    try {
      const menuResp = await fetch(menuUrl, { headers: { ...headers, 'Referer': 'https://compass.jinritemai.com/' }, timeout: 6000 });
      const menuContentType = menuResp.headers.get('content-type') || '';
      if (menuResp.status === 200 && !menuContentType.includes('text/html')) {
        const menuJson = await menuResp.json();
        console.log(`[Mode B] 菜单路由树解析成功，动态数据节点路径正常`);
      } else {
        console.warn(`[Mode B] 菜单预检接口未返回有效 JSON (status: ${menuResp.status})，将跳过预检`);
      }
    } catch (err) {
      console.warn(`[Mode B] 菜单预检接口请求发生异常，已跳过预检: ${err.message}`);
    }
  }

  // 3. 计算日期时间
  const dateRangeDays = parseInt(dateRange, 10) || 30;
  const endDateStr = new Date().toISOString().split('T')[0];
  const startDateStr = new Date(Date.now() - dateRangeDays * 24 * 3600000).toISOString().split('T')[0];

  let requestUrl = '';
  let requestMethod = 'GET';
  let requestBody = null;

  // 根据不同的 syncModule 走对应的真实接口请求
  if (syncModule === 'compass_trade') {
    requestUrl = `https://compass.jinritemai.com/compass/api/v1/trade/overview?shop_id=${shopId}&start_date=${startDateStr}&end_date=${endDateStr}`;
    headers['Referer'] = 'https://compass.jinritemai.com/';
  } else if (syncModule === 'compass_product') {
    requestUrl = `https://compass.jinritemai.com/compass/api/v1/product/detail?shop_id=${shopId}&start_date=${startDateStr}&end_date=${endDateStr}`;
    headers['Referer'] = 'https://compass.jinritemai.com/';
  } else if (syncModule === 'dy_balance') {
    requestUrl = `https://fxg.jinritemai.com/ffa/g/finance/getShopAccountItem?shop_id=${shopId}&start_time=${startDateStr}&end_time=${endDateStr}`;
    headers['Referer'] = 'https://fxg.jinritemai.com/';
  } else if (syncModule === 'account_center') {
    // 资金模块 — 账户中心 (queryAccountFlows 接口余额明细同步)
    requestUrl = `https://fxg.jinritemai.com/settlement/account/queryAccountFlows?req_source=dou_dian_pc`;
    headers['Referer'] = 'https://fxg.jinritemai.com/';
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Origin'] = 'https://fxg.jinritemai.com';
    requestMethod = 'POST';

    // 确定支付通道对应的 uid_type & member_type
    let uidType = 2404;
    let memberType = 2;
    if (payChannel === 'wechat') {
      uidType = 2204;
      memberType = 6;
    } else if (payChannel === 'douyin') {
      uidType = 2304;
      memberType = 2;
    }

    // 确定时间戳
    let startTimeMs = Date.now() - 30 * 24 * 3600000;
    let endTimeMs = Date.now();
    
    if (timeType === 'custom' && customStartDate && customEndDate) {
      const parsedStart = Date.parse(customStartDate.replace(/-/g, '/') + ' 00:00:00');
      const parsedEnd = Date.parse(customEndDate.replace(/-/g, '/') + ' 23:59:59');
      if (!isNaN(parsedStart) && !isNaN(parsedEnd)) {
        startTimeMs = parsedStart;
        endTimeMs = parsedEnd;
      }
    } else {
      const days = parseInt(dateRange, 10) || 30;
      startTimeMs = Date.parse(new Date(Date.now() - days * 24 * 3600000).toISOString().split('T')[0].replace(/-/g, '/') + ' 00:00:00');
      endTimeMs = Date.parse(new Date().toISOString().split('T')[0].replace(/-/g, '/') + ' 23:59:59');
    }

    const formParams = new URLSearchParams();
    formParams.append('uid_type', String(uidType));
    formParams.append('member_type', String(memberType));
    formParams.append('merchant_uid', String(merchantUid));
    formParams.append('page', String(pageNum));
    formParams.append('pageSize', '500');
    formParams.append('start_time', String(startTimeMs));
    formParams.append('end_time', String(endTimeMs));
    requestBody = formParams.toString();
  } else if (syncModule === 'qianchuan_video_promote') {
    requestUrl = `https://qianchuan.jinritemai.com/ad/api/data/v1/common/statQuery?reqFrom=video-filter-list&gfversion=1.0.0.5718&aavid=${shopId}`;
    headers['Referer'] = 'https://qianchuan.jinritemai.com/';
    requestMethod = 'POST';
    requestBody = JSON.stringify({
      aavid: parseInt(shopId, 10) || 0,
      start_date: startDateStr,
      end_date: endDateStr,
      page: pageNum,
      page_size: 50
    });
  } else if (syncModule === 'xiaohongshu_pugongying') {
    // 小红书蒲公英：工作台中的笔记合作我的数据笔记报告
    requestUrl = `https://pgy.xiaohongshu.com/api/solar/content/note/list`;
    headers['Referer'] = 'https://pgy.xiaohongshu.com/';
    requestMethod = 'POST';
    requestBody = JSON.stringify({
      page: pageNum,
      page_size: 20
    });
  } else if (syncModule === 'jushuitan_inventory') {
    // 聚水潭商品库存查询接口
    const coId = shopId || "15422431";
    requestUrl = `https://apiweb.erp321.com/webapi/ItemApi/ItemSku/GetPageListV2?__from=web_component&owner_co_id=${coId}&authorize_co_id=${coId}`;
    
    // 从 Cookie 中智能提取并定位 uid
    let uidVal = "22013638";
    const uidMatch = cookie.match(/u_id=(\d+)/);
    if (uidMatch) uidVal = uidMatch[1];

    headers['Referer'] = 'https://apiweb.erp321.com/';
    headers['Origin'] = 'https://apiweb.erp321.com';
    headers['gwfp'] = 'd23eb015e172e99146fc6a2ae051609b';
    headers['webbox-route-path'] = '/erp-components/goods-selector/';
    headers['webbox-request-id'] = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    requestMethod = 'POST';
    requestBody = JSON.stringify({
      ip: "",
      uid: uidVal,
      coid: coId,
      page: {
        currentPage: pageNum,
        pageSize: 50,
        pageAction: 1
      },
      data: {
        sku_type: 1,
        queryFlds: [
          "pic", "i_id", "sku_id", "name", "properties_value", "labels", "qty", "order_lock", 
          "orderable", "salesTrends30", "daysInventory", "purchaseQty", "purchase_qty", 
          "purchase_plan_arrive", "lock_qty", "lwh_result_lock_qty", "min_qty", "max_qty", 
          "min_day", "max_day", "pick_lock", "return_qty", "in_qty", "allocate_qty", 
          "sale_refund_qty", "virtual_qty", "unlock_qty", "stock_opensync", "bin", 
          "sales_qty_yesterday", "sales_qty_7", "sales_qty_15", "afs_qty_yesterday", 
          "afs_qty_7", "afs_qty_15", "qty_modified", "multiTimeStocks_3", "multiTimeStocks_5", 
          "multiTimeStocks_7", "multiTimeStocks_10", "multiTimeStocks_15", "multiTimeStocks_20", 
          "multiTimeStocks_25", "multiTimeStocks_30", "multiTimeStocks_45", "is_series_number", 
          "sale_price", "c_id", "supplier_id", "supplier_name", "pic_big"
        ],
        orderBy: "",
        c_id: "",
        stock_type: 6
      }
    });
  } else if (syncModule === 'qianniu_fund_detail') {
    const crypto = require('crypto');
    const tVal = String(Date.now());
    let token = "";
    if (cookie) {
      const tokenMatch = cookie.match(/_m_h5_tk=([a-f0-9]+)_[0-9]+/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
    }
    const appKey = "12574478";
    const mtopData = JSON.stringify({
      billCycleFrom: startDateStr,
      billCycleTo: endDateStr,
      pageNo: pageNum || 1,
      pageSize: 50,
      billCode: "BILL_DETAIL"
    });
    const sign = crypto.createHash("md5").update(`${token}&${tVal}&${appKey}&${mtopData}`).digest("hex");
    requestUrl = `https://acs.m.taobao.com/h5/mtop.taobao.finance.fund.bill.query/1.0/?jsv=2.6.1&appKey=${appKey}&t=${tVal}&sign=${sign}&api=mtop.taobao.finance.fund.bill.query&v=1.0&ttid=11320%40taobao_WEB_9.9.99&dataType=originaljsonp&type=originaljsonp&data=${encodeURIComponent(mtopData)}`;
    headers['Referer'] = 'https://myseller.taobao.com/';
    requestMethod = 'GET';
  } else if (syncModule === 'jingmai_finance') {
    requestUrl = `https://ims.jdpay.com/capital/completeData.do?accountId=${shopId || '110266763006'}&dateType=1&startDate=${startDateStr}%2000:00:00&endDate=${endDateStr}%2023:59:59&page=${pageNum}&pageSize=50`;
    headers['Referer'] = 'https://ims.jdpay.com/';
    requestMethod = 'GET';
  } else {
    // 默认：订单发货 -> 订单管理 (order_report 等)
    requestUrl = `https://fxg.jinritemai.com/ffa/g/order/searchList`;
    headers['Referer'] = 'https://fxg.jinritemai.com/';
    requestMethod = 'POST';
    requestBody = JSON.stringify({
      shop_id: parseInt(shopId, 10) || 0,
      page: 0,
      size: 50,
      start_time: startDateStr + ' 00:00:00',
      end_time: endDateStr + ' 23:59:59'
    });
  }

  console.log(`[Mode B] 真实请求 URL: ${requestUrl}, Method: ${requestMethod}`);

  try {
    // 判断 Cookie 的有效性
    if (!cookie || cookie.startsWith('mock_') || cookie.length < 30) {
      throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
    }

    // 千牛平台专属特征前置校验：必须包含淘宝核心 Cookie 特征（_tb_token_ 或 cookie2）
    if (syncModule === 'qianniu_fund_detail' && !cookie.includes('_tb_token_') && !cookie.includes('cookie2')) {
      throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
    }

    // 京麦平台专属特征前置校验：必须包含京东金融核心 Cookie 特征（light_key 或 pin）
    if (syncModule.startsWith('jingmai_') && !cookie.includes('light_key') && !cookie.includes('pin')) {
      throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
    }

    const fetchOptions = {
      method: requestMethod,
      headers: headers,
      timeout: 8000
    };
    if (requestBody) {
      fetchOptions.body = requestBody;
    }

    let response = await fetch(requestUrl, fetchOptions);

    // 针对聚水潭库存接口，如返回 405 Method Not Allowed，则尝试回退到 GET 请求方式重试
    if (syncModule === 'jushuitan_inventory' && requestMethod === 'POST' && response.status === 405) {
      console.warn(`[Mode B] 聚水潭 GetPageListV2 POST 请求返回 405，正在自动降级使用 GET 方式重试...`);
      const getUrl = `${requestUrl}&page_index=${pageNum}&page_size=50&page=${pageNum}&limit=50`;
      const getOptions = {
        method: 'GET',
        headers: headers,
        timeout: 8000
      };
      response = await fetch(getUrl, getOptions);
    }
    
    if (response.status === 401 || response.status === 403) {
      throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
    }

    // 独立解析千牛的 MTOP 或 HTML 响应
    if (syncModule === 'qianniu_fund_detail') {
      let text = await response.text();
      // 剥离 jsonp 回调包裹（如果返回了 mtopjsonpXX(...) 格式）
      if (text.includes("mtopjsonp") || /^[a-zA-Z0-9_]+\(/.test(text.trim())) {
        const startIdx = text.indexOf("(");
        const endIdx = text.lastIndexOf(")");
        if (startIdx !== -1 && endIdx !== -1) {
          text = text.substring(startIdx + 1, endIdx);
        }
      }
      console.log("[Mode B] 淘宝 Mtop 原始响应内容:", text);
      let resJson = {};
      try {
        resJson = JSON.parse(text);
      } catch (parseErr) {
        console.warn("[Mode B] 解析 MTOP JSON 失败，可能返回了非 JSON 内容，内容前100字符:", text.substring(0, 100));
        // 如果是 HTML 页面，检查是否包含登录重定向
        if (text.includes("login.taobao.com") || text.includes("login.htm") || text.includes("relogin") || text.includes("请登录")) {
          throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
        }
      }

      // 校验 MTOP 响应中的登录失效状态
      const retList = resJson.ret || [];
      const retMsg = retList.join(",");
      if (retMsg.includes("FAIL_SYS_SESSION_EXPIRED") || retMsg.includes("ERR_SID_INVALID") || retMsg.includes("SESSION") || retMsg.includes("未登录") || text.includes("login.taobao.com")) {
        throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
      }

      console.log(`[Mode B] 成功检测到千牛工作台处于有效登录状态，解析真实明细数据！`);
      let list = [];
      if (resJson.data) {
        if (resJson.data.tableValues && Array.isArray(resJson.data.tableValues.data)) {
          list = resJson.data.tableValues.data;
        } else {
          list = resJson.data.billDetailList || resJson.data.list || resJson.data.items || [];
        }
      }
      
      // 如果接口返回了真实的明细数据，直接清洗和使用
      if (list && list.length > 0) {
        console.log(`[Mode B] 从淘宝 MTOP 接口中成功抓取到 ${list.length} 条真实财务流水记录！`);
        const realData = list.map((item, idx) => {
          const incomeVal = Number(item.inflowAmount || item.income || (Number(item.amount) > 0 ? item.amount : 0) || 0);
          const outcomeVal = Number(item.outflowAmount || item.outcome || (Number(item.amount) < 0 ? Math.abs(item.amount) : 0) || 0);
          
          return {
            id: item.id || item.flowId || `TX_REAL_${idx}`,
            flow_id: item.id || item.flowId || `TX_REAL_${idx}`,
            record_time: item.accountTime || item.recordTime || item.time || Date.now(),
            order_id: item.tradeId || item.orderId || item.orderNo || "",
            bill_type: item.transType || item.billType || item.type || "其他收支",
            income: incomeVal,
            outcome: outcomeVal,
            biz_desc: item.stlBillInfo || item.bizDesc || item.description || "",
            remark: item.memo || item.remark || ""
          };
        });
        
        if (resJson.data.tableValues && resJson.data.tableValues.totalNum) {
          realData.total = parseInt(resJson.data.tableValues.totalNum, 10) || realData.length;
        } else {
          realData.total = realData.length;
        }
        return realData;
      }

      // 如果没有拉取到数据，返回空数组，以便调用方可以尝试从本地捕获的真实缓存文件中读取
      console.log(`[Mode B] 淘宝真实接口未返回有效数据，返回空数组以尝试本地缓存...`);
      return [];
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await response.text();
      // 如果包含登录重定向的关键词，则认为 Cookie 失效了
      if (text.includes("login.taobao.com") || text.includes("login.htm") || text.includes("relogin") || text.includes("请登录")) {
        throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
      }
      throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
    }

    const resJson = await response.json();
    console.log(`[Doudian API Response] URL: ${requestUrl}, resJson:`, JSON.stringify(resJson));
    
    // 校验响应内容中的未登录或受限标记
    const errCode = String(resJson.code || resJson.errorCode || '');
    const errMsg = resJson.message || resJson.msg || resJson.errorMsg || '';
    
    if (errCode === '40004' || errCode === '10008' || errCode === '401' || (errMsg && (errMsg.includes("登录") || errMsg.includes("会话") || errMsg.includes("expire") || errMsg.includes("失效") || errMsg.includes("未授权")))) {
      throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
    }

    if (errCode && errCode !== '0' && errCode !== '200') {
      throw new Error(`DoudianAPIError: [code=${errCode}] ${errMsg || '接口返回错误'}`);
    }

    // 抖音/小红书有些接口会在 data 下返回 list/note_list，或者直接在根节点，或者 data 本身直接就是数组
    // 京麦 completeData.do 接口数据在 resJson.data.ssbinfos 下，聚水潭在 resJson.data.data 下
    let list = [];
    if (Array.isArray(resJson)) {
      list = resJson;
    } else if (Array.isArray(resJson.list)) {
      list = resJson.list;
    } else if (Array.isArray(resJson.items)) {
      list = resJson.items;
    } else if (Array.isArray(resJson.rows)) {
      list = resJson.rows;
    } else if (resJson.data) {
      if (Array.isArray(resJson.data)) {
        list = resJson.data;
      } else {
        list = resJson.data.ssbinfos || resJson.data.data || resJson.data.list || resJson.data.data_list || resJson.data.items || resJson.data.flows || resJson.data.flow_list || resJson.data.note_list || [];
      }
    }
    
    const resultList = Array.isArray(list) ? list : [];
    const totalVal = resJson.total !== undefined ? resJson.total 
                    : (resJson.data && resJson.data.total !== undefined ? resJson.data.total 
                    : (resJson.data && resJson.data.count !== undefined ? resJson.data.count 
                    : resultList.length));
    resultList.total = Number(totalVal || 0);

    return resultList;
  } catch (err) {
    let errorType = '接口500报错';
    let msg = err.message;
    const isQianniu = syncModule.startsWith('qianniu_');
    const isXhs = syncModule.startsWith('xiaohongshu_');
    const isJst = syncModule.startsWith('jushuitan_');
    const isJingmai = syncModule.startsWith('jingmai_');
    const platformName = isQianniu ? '千牛工作台' : isXhs ? '小红书平台' : isJst ? '聚水潭ERP' : isJingmai ? '京麦平台' : '抖音电商罗盘';

    if (msg.includes("CredentialsExpired") || msg.includes("Cookie") || msg.includes("401") || msg.includes("403")) {
      errorType = '凭证失效(Cookie过期)';
      msg = `${platformName} 登录 Session 凭证已过期失效，请重新在连接器配置页面完成登录上报捕获！`;
    }

    // 静默写入本地错误库
    logSyncError(taskId, platformName, `商户_${shopId}`, errorType, msg);
    
    // 抛出异常供 records 同步阶段进行真实连接的处理，绝不静默降级，带上详细错误消息
    throw new Error(`${errorType}: ${msg}`);
  }
}

/**
 * 功能描述：在模式 B 下，使用 Cookie 凭据拉取订单（为了向后兼容）
 * @param {string} cookie - 截获加密的抖音 Session Cookie
 * @param {string} shopId - 对接商户的店铺数字 ID
 * @param {string} dateRange - 回溯天数
 * @param {string} userAgent - 浏览器指纹
 * @param {string} taskId - 任务 ID
 * @return {Promise<Array>} 返回抖店订单记录列表
 */
async function fetchDoudianOrders(cookie, shopId, dateRange, userAgent, taskId) {
  return fetchRealDoudianData(cookie, shopId, 'order_report', dateRange, userAgent, taskId);
}

/**
 * 功能描述：Session 心跳保活机制 (Keep-Alive)。每 30 分钟发起一次获取店铺信息的轻量请求，激活并延长 Cookie 有效期。
 * @param {string} cookie - 加密的抖音 Cookie 凭证
 * @param {string} userAgent - 登录设备 UA 浏览器指纹
 * @return {Promise<boolean>} 返回保活请求是否成功
 */
async function keepAliveSession(cookie, userAgent) {
  if (!cookie || cookie.startsWith('mock_')) return false;

  const headers = {
    'Cookie': cookie,
    'User-Agent': userAgent || 'Mozilla/5.0',
    'Accept': 'application/json'
  };

  try {
    const response = await fetch('https://compass.jinritemai.com/compass/api/v1/shop/basic_info', { headers, timeout: 4000 });
    if (response.status === 200) {
      console.log(`[心跳保活] 成功对抖音罗盘进行 Session Keep-Alive 延长凭证有效期。`);
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`[心跳保活] 定时保活网络请求失败，静默退出。`);
    return false;
  }
}

module.exports = { fetchDoudianOrders, fetchRealDoudianData, keepAliveSession };
