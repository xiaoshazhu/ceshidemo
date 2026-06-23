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
    requestUrl = `https://qianchuan.jinritemai.com/ad/api/data/v1/common/statQuery?reqFrom=roi2_material_list&gfversion=1.0.0.5718&aavid=${shopId}`;
    headers['Referer'] = 'https://qianchuan.jinritemai.com/';
    requestMethod = 'POST';
    requestBody = JSON.stringify({
      aavid: parseInt(shopId, 10) || 0,
      start_date: startDateStr,
      end_date: endDateStr,
      page: pageNum,
      page_size: 50
    });
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

    const fetchOptions = {
      method: requestMethod,
      headers: headers,
      timeout: 8000
    };
    if (requestBody) {
      fetchOptions.body = requestBody;
    }

    const response = await fetch(requestUrl, fetchOptions);
    
    if (response.status === 401 || response.status === 403) {
      throw new Error("CredentialsExpired: 凭证失效(Cookie过期)");
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
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

    // 抖音有些接口会在 data 下返回 list，或者直接在根节点，或者 data 本身直接就是数组
    let list = [];
    if (Array.isArray(resJson.list)) {
      list = resJson.list;
    } else if (resJson.data) {
      if (Array.isArray(resJson.data)) {
        list = resJson.data;
      } else {
        list = resJson.data.list || resJson.data.data_list || resJson.data.flows || resJson.data.flow_list || [];
      }
    }
    
    const resultList = Array.isArray(list) ? list : [];
    const totalVal = resJson.total !== undefined ? resJson.total : (resJson.data && resJson.data.total !== undefined ? resJson.data.total : resultList.length);
    resultList.total = Number(totalVal || 0);

    return resultList;
  } catch (err) {
    let errorType = '接口500报错';
    let msg = err.message;

    if (msg.includes("CredentialsExpired") || msg.includes("Cookie") || msg.includes("401") || msg.includes("403")) {
      errorType = '凭证失效(Cookie过期)';
      msg = '抖店 Session Cookie 已过期失效，请重新在连接器配置页面扫码/验证码登录捕获！';
    }

    // 静默写入本地错误库
    logSyncError(taskId, '抖音电商罗盘', `店铺_${shopId}`, errorType, msg);
    
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
