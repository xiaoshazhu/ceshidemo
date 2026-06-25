/**
 * JSDoc 文档注释
 * @module App
 */

import './App.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { bitable } from '@lark-base-open/connector-api';
import { 
  Button, 
  Form, 
  Input, 
  Radio, 
  Select, 
  Table, 
  Modal, 
  Badge, 
  Space, 
  message, 
  Tooltip,
  Checkbox,
  TreeSelect
} from 'antd';

const { TextArea } = Input;

// 预定义各模块的字段数据源，用于根据同步模块动态进行字段映射与显示
const MODULE_FIELDS: Record<string, { key: string; label: string; type: string; defaultField: string }[]> = {
  order_report: [
    { key: 'order_id', label: '订单号 (order_id)', type: 'Text', defaultField: 'col_order_id' },
    { key: 'pay_amount', label: '支付金额 (pay_amount)', type: 'Number', defaultField: 'col_pay_amount' },
    { key: 'create_time', label: '下单时间 (create_time)', type: 'DateTime', defaultField: 'col_create_time_v2' },
    { key: 'order_status', label: '订单状态 (order_status)', type: 'Text', defaultField: 'col_order_status' },
    { key: 'shop_name', label: '店铺名称 (shop_name)', type: 'Text', defaultField: 'col_shop_name' },
    { key: 'shop_id', label: '店铺 ID (shop_id)', type: 'Text', defaultField: 'col_shop_id' }
  ],
  dy_balance: [
    { key: 'date', label: '账单日期 (date)', type: 'DateTime', defaultField: 'col_date' },
    { key: 'balance', label: '可用余额 (balance)', type: 'Number', defaultField: 'col_balance' },
    { key: 'pending', label: '待结算金额 (pending)', type: 'Number', defaultField: 'col_pending' },
    { key: 'deposit', label: '保证金余额 (deposit)', type: 'Number', defaultField: 'col_deposit' },
    { key: 'shop_name', label: '店铺名称 (shop_name)', type: 'Text', defaultField: 'col_shop_name' },
    { key: 'shop_id', label: '店铺 ID (shop_id)', type: 'Text', defaultField: 'col_shop_id' }
  ],
  compass_trade: [
    { key: 'date', label: '统计日期 (date)', type: 'DateTime', defaultField: 'col_date' },
    { key: 'gmv', label: '成交金额 (gmv)', type: 'Number', defaultField: 'col_gmv' },
    { key: 'order_cnt', label: '成交订单数 (order_cnt)', type: 'Number', defaultField: 'col_order_cnt' },
    { key: 'refund_amt', label: '退款金额 (refund_amt)', type: 'Number', defaultField: 'col_refund_amt' },
    { key: 'shop_name', label: '店铺名称 (shop_name)', type: 'Text', defaultField: 'col_shop_name' },
    { key: 'shop_id', label: '店铺 ID (shop_id)', type: 'Text', defaultField: 'col_shop_id' }
  ],
  compass_product: [
    { key: 'product_id', label: '商品 ID (product_id)', type: 'Text', defaultField: 'col_product_id' },
    { key: 'product_name', label: '商品名称 (product_name)', type: 'Text', defaultField: 'col_product_name' },
    { key: 'click_uv', label: '商品点击量 (click_uv)', type: 'Number', defaultField: 'col_click_uv' },
    { key: 'pay_buyer_cnt', label: '支付买家数 (pay_buyer_cnt)', type: 'Number', defaultField: 'col_pay_buyer_cnt' },
    { key: 'pay_rate', label: '商品转化率 (pay_rate)', type: 'Number', defaultField: 'col_pay_rate' },
    { key: 'shop_name', label: '店铺名称 (shop_name)', type: 'Text', defaultField: 'col_shop_name' }
  ],
  qianchuan_material: [
    { key: 'material_id', label: '素材 ID (material_id)', type: 'Text', defaultField: 'col_material_id' },
    { key: 'material_name', label: '素材名称 (material_name)', type: 'Text', defaultField: 'col_material_name' },
    { key: 'show_cnt', label: '素材展现量 (show_cnt)', type: 'Number', defaultField: 'col_show_cnt' },
    { key: 'cost', label: '素材消耗 (cost)', type: 'Number', defaultField: 'col_cost' },
    { key: 'ctr', label: '素材点击率 (ctr)', type: 'Number', defaultField: 'col_ctr' },
    { key: 'product_name', label: '推广产品 (product_name)', type: 'Text', defaultField: 'col_product_name' }
  ],
  qianchuan_all: [
    { key: 'plan_id', label: '计划 ID (plan_id)', type: 'Text', defaultField: 'col_plan_id' },
    { key: 'plan_name', label: '计划名称 (plan_name)', type: 'Text', defaultField: 'col_plan_name' },
    { key: 'show_uv', label: '展现数 (show_uv)', type: 'Number', defaultField: 'col_show_uv' },
    { key: 'cost', label: '消耗金额 (cost)', type: 'Number', defaultField: 'col_cost' },
    { key: 'roi', label: 'ROI (roi)', type: 'Number', defaultField: 'col_roi' },
    { key: 'pay_order_cnt', label: '支付订单数 (pay_order_cnt)', type: 'Number', defaultField: 'col_pay_order_cnt' }
  ],
  qianchuan_product: [
    { key: 'product_id', label: '商品 ID (product_id)', type: 'Text', defaultField: 'col_product_id' },
    { key: 'product_name', label: '商品名称 (product_name)', type: 'Text', defaultField: 'col_product_name' },
    { key: 'stat_cost', label: '千川成交金额 (stat_cost)', type: 'Number', defaultField: 'col_stat_cost' },
    { key: 'roi', label: '推广ROI (roi)', type: 'Number', defaultField: 'col_roi' },
    { key: 'click_cnt', label: '点击次数 (click_cnt)', type: 'Number', defaultField: 'col_click_cnt' },
    { key: 'pay_cnt', label: '转化成交量 (pay_cnt)', type: 'Number', defaultField: 'col_pay_cnt' }
  ],
  account_center: [
    { key: 'flow_id', label: '动账流水号 (flow_id)', type: 'Text', defaultField: 'col_flow_id' },
    { key: 'order_id', label: '关联订单号 (order_id)', type: 'Text', defaultField: 'col_order_id' },
    { key: 'sub_order_id', label: '关联子订单号 (sub_order_id)', type: 'Text', defaultField: 'col_sub_order_id' },
    { key: 'check_time', label: '动账时间 (check_time)', type: 'DateTime', defaultField: 'col_check_time_v3' },
    { key: 'biz_scene', label: '动账场景 (biz_scene)', type: 'Text', defaultField: 'col_biz_scene' },
    { key: 'trade_amount', label: '动账详情（元） (trade_amount)', type: 'Number', defaultField: 'col_trade_amount' },
    { key: 'current_balance', label: '账户余额（元） (current_balance)', type: 'Number', defaultField: 'col_current_balance' },
    { key: 'frozen_amount', label: '冻结总额（元） (frozen_amount)', type: 'Number', defaultField: 'col_frozen_amount' },
    { key: 'remark', label: '动账备注 (remark)', type: 'Text', defaultField: 'col_remark' }
  ],
  qianchuan_video_promote: [
    { key: 'video', label: '视频 (video)', type: 'Text', defaultField: 'col_video' },
    { key: 'analysis', label: '分析 (analysis)', type: 'Text', defaultField: 'col_analysis' },
    { key: 'duration', label: '时长 (duration)', type: 'Number', defaultField: 'col_duration' },
    { key: 'create_time', label: '创建时间 (create_time)', type: 'DateTime', defaultField: 'col_create_time' },
    { key: 'assoc_info', label: '关联信息 (assoc_info)', type: 'Text', defaultField: 'col_assoc_info' },
    { key: 'material_source', label: '素材来源 (material_source)', type: 'Text', defaultField: 'col_material_source' },
    { key: 'tags', label: '标签 (tags)', type: 'Text', defaultField: 'col_tags' }
  ],
  alimama_union: [
    { key: 'date', label: '统计日期 (date)', type: 'DateTime', defaultField: 'col_date' },
    { key: 'click_cnt', label: '点击数 (click_cnt)', type: 'Number', defaultField: 'col_click_cnt' },
    { key: 'alipay_num', label: '付款订单数 (alipay_num)', type: 'Number', defaultField: 'col_alipay_num' },
    { key: 'alipay_amt', label: '付款金额 (alipay_amt)', type: 'Number', defaultField: 'col_alipay_amt' },
    { key: 'commission_amt', label: '预估效果收入 (commission_amt)', type: 'Number', defaultField: 'col_commission_amt' }
  ],
  alimama_wanxiang: [
    { key: 'plan_id', label: '计划 ID (plan_id)', type: 'Text', defaultField: 'col_plan_id' },
    { key: 'plan_name', label: '计划名称 (plan_name)', type: 'Text', defaultField: 'col_plan_name' },
    { key: 'cost', label: '消耗金额 (cost)', type: 'Number', defaultField: 'col_cost' },
    { key: 'ctr', label: '点击率 (ctr)', type: 'Number', defaultField: 'col_ctr' },
    { key: 'roi', label: '投资回报率 (roi)', type: 'Number', defaultField: 'col_roi' }
  ],
  jingmai_order: [
    { key: 'order_id', label: '订单号 (order_id)', type: 'Text', defaultField: 'col_order_id' },
    { key: 'pay_amount', label: '支付金额 (pay_amount)', type: 'Number', defaultField: 'col_pay_amount' },
    { key: 'create_time', label: '下单时间 (create_time)', type: 'DateTime', defaultField: 'col_create_time' },
    { key: 'order_status', label: '订单状态 (order_status)', type: 'Text', defaultField: 'col_order_status' }
  ],
  jingmai_finance: [
    { key: 'flow_id', label: '流水号 (flow_id)', type: 'Text', defaultField: 'col_flow_id' },
    { key: 'trade_amount', label: '收支金额 (trade_amount)', type: 'Number', defaultField: 'col_trade_amount' },
    { key: 'check_time', label: '动账时间 (check_time)', type: 'DateTime', defaultField: 'col_check_time' },
    { key: 'remark', label: '备注 (remark)', type: 'Text', defaultField: 'col_remark' }
  ],
  jushuitan_order: [
    { key: 'io_id', label: '出入库单号 (io_id)', type: 'Text', defaultField: 'col_io_id' },
    { key: 'io_type', label: '单据类型 (io_type)', type: 'Text', defaultField: 'col_io_type' },
    { key: 'wms_co_id', label: '分仓编号 (wms_co_id)', type: 'Text', defaultField: 'col_wms_co_id' },
    { key: 'io_date', label: '出入库日期 (io_date)', type: 'DateTime', defaultField: 'col_io_date' },
    { key: 'qty', label: '数量 (qty)', type: 'Number', defaultField: 'col_qty' }
  ],
  jushuitan_inventory: [
    { key: 'seq', label: '序号 (seq)', type: 'Number', defaultField: 'col_seq' },
    { key: 'pic_url', label: '图片 (pic_url)', type: 'Text', defaultField: 'col_pic_url' },
    { key: 'style_code', label: '款式编码 (style_code)', type: 'Text', defaultField: 'col_style_code' },
    { key: 'sku_id', label: '商品编码 (sku_id)', type: 'Text', defaultField: 'col_sku_id' },
    { key: 'sku_name', label: '商品名称 (sku_name)', type: 'Text', defaultField: 'col_sku_name' },
    { key: 'color_spec', label: '颜色及规格 (color_spec)', type: 'Text', defaultField: 'col_color_spec' },
    { key: 'tags', label: '商品标签 (tags)', type: 'Text', defaultField: 'col_tags' },
    { key: 'inventory_qty', label: '实际库存数 (inventory_qty)', type: 'Number', defaultField: 'col_inventory_qty' },
    { key: 'lock_qty', label: '订单占有数 (lock_qty)', type: 'Number', defaultField: 'col_lock_qty' },
    { key: 'usable_qty', label: '可用数量 (usable_qty)', type: 'Number', defaultField: 'col_usable_qty' },
    { key: 'saleable_days', label: '库存可售天数 (saleable_days)', type: 'Number', defaultField: 'col_saleable_days' }
  ],
  qianniu_bill_wechat: [
    { key: 'flow_id', label: '流水号 (flow_id)', type: 'Text', defaultField: 'col_flow_id' },
    { key: 'trade_amount', label: '交易金额 (trade_amount)', type: 'Number', defaultField: 'col_trade_amount' },
    { key: 'check_time', label: '动账时间 (check_time)', type: 'DateTime', defaultField: 'col_check_time' },
    { key: 'remark', label: '收支备注 (remark)', type: 'Text', defaultField: 'col_remark' }
  ],
  qianniu_bill_alipay: [
    { key: 'flow_id', label: '流水号 (flow_id)', type: 'Text', defaultField: 'col_flow_id' },
    { key: 'trade_amount', label: '交易金额 (trade_amount)', type: 'Number', defaultField: 'col_trade_amount' },
    { key: 'check_time', label: '动账时间 (check_time)', type: 'DateTime', defaultField: 'col_check_time' },
    { key: 'remark', label: '收支备注 (remark)', type: 'Text', defaultField: 'col_remark' }
  ],
  qianniu_fund_detail: [
    { key: 'record_time', label: '入账时间 (record_time)', type: 'DateTime', defaultField: 'col_record_time' },
    { key: 'flow_id', label: '支付流水号 (flow_id)', type: 'Text', defaultField: 'col_flow_id' },
    { key: 'order_id', label: '淘宝订单号 (order_id)', type: 'Text', defaultField: 'col_order_id' },
    { key: 'bill_type', label: '入账类型 (bill_type)', type: 'Text', defaultField: 'col_bill_type' },
    { key: 'income', label: '收入金额 (income)', type: 'Number', defaultField: 'col_income' },
    { key: 'outcome', label: '支出金额 (outcome)', type: 'Number', defaultField: 'col_outcome' },
    { key: 'biz_desc', label: '业务描述 (biz_desc)', type: 'Text', defaultField: 'col_biz_desc' },
    { key: 'remark', label: '备注 (remark)', type: 'Text', defaultField: 'col_remark' }
  ],
  xiaohongshu_pugongying: [
    { key: 'note_info', label: '笔记信息 (note_info)', type: 'Text', defaultField: 'col_note_info' },
    { key: 'blogger_info', label: '博主信息 (blogger_info)', type: 'Text', defaultField: 'col_blogger_info' },
    { key: 'note_source', label: '笔记来源 (note_source)', type: 'Text', defaultField: 'col_note_source' },
    { key: 'publish_time', label: '笔记发布时间 (publish_time)', type: 'DateTime', defaultField: 'col_publish_time' },
    { key: 'content_tags', label: '内容标签 (content_tags)', type: 'Text', defaultField: 'col_content_tags' },
    { key: 'blogger_quote', label: '博主报价 (blogger_quote)', type: 'Number', defaultField: 'col_blogger_quote' },
    { key: 'service_fee', label: '服务费金额 (service_fee)', type: 'Number', defaultField: 'col_service_fee' },
    { key: 'is_valid_mode', label: '是否为有效模式 (is_valid_mode)', type: 'Text', defaultField: 'col_is_valid_mode' },
    { key: 'spu_name', label: 'SPU名称 (spu_name)', type: 'Text', defaultField: 'col_spu_name' },
    { key: 'exposure_cnt', label: '曝光量 (exposure_cnt)', type: 'Number', defaultField: 'col_exposure_cnt' }
  ],
  xiaohongshu_chengfeng_account: [
    { key: 'date', label: '统计日期 (date)', type: 'DateTime', defaultField: 'col_date' },
    { key: 'cost', label: '消耗金额 (cost)', type: 'Number', defaultField: 'col_cost' },
    { key: 'show_cnt', label: '展现数 (show_cnt)', type: 'Number', defaultField: 'col_show_cnt' },
    { key: 'click_cnt', label: '点击数 (click_cnt)', type: 'Number', defaultField: 'col_click_cnt' },
    { key: 'roi', label: '投资回报率 (roi)', type: 'Number', defaultField: 'col_roi' }
  ],
  xiaohongshu_juguang_plan: [
    { key: 'plan_id', label: '计划 ID (plan_id)', type: 'Text', defaultField: 'col_plan_id' },
    { key: 'plan_name', label: '计划名称 (plan_name)', type: 'Text', defaultField: 'col_plan_name' },
    { key: 'cost', label: '消耗金额 (cost)', type: 'Number', defaultField: 'col_cost' },
    { key: 'ctr', label: '点击率 (ctr)', type: 'Number', defaultField: 'col_ctr' },
    { key: 'roi', label: '投资回报率 (roi)', type: 'Number', defaultField: 'col_roi' }
  ],
  xiaohongshu_qianfan_balance: [
    { key: 'flow_id', label: '流水号 (flow_id)', type: 'Text', defaultField: 'col_flow_id' },
    { key: 'trade_amount', label: '动账金额 (trade_amount)', type: 'Number', defaultField: 'col_trade_amount' },
    { key: 'check_time', label: '动账时间 (check_time)', type: 'DateTime', defaultField: 'col_check_time' },
    { key: 'remark', label: '动账备注 (remark)', type: 'Text', defaultField: 'col_remark' }
  ]
};

interface Account {
  key: string;
  name: string;
  mode: string;
  status: 'active' | 'expired';
  cookie?: string;
  shopId?: string;
  isActive?: boolean;
  module?: string;
  platform?: string;
}

interface PlatformConfig {
  key: string;
  name: string;
  desc: string;
  icon: string;
  url: string;
}

const PLATFORMS_MAP: PlatformConfig[] = [
  { key: 'douyin', name: '抖音电商', desc: '包含抖店、电商罗盘模块', icon: '🎵', url: 'https://fxg.jinritemai.com/login/common?extra=%7B%22target_url%22%3A%22https%3A%2F%2Ffxg.jinritemai.com%2Fffa%2Fmshop%2Fhomepage%2Findex%22%7D' },
  { key: 'alimama', name: '阿里妈妈', desc: '包含淘宝联盟、万相台投放模块', icon: '🌸', url: 'https://login.taobao.com/member/login.jhtml?redirectURL=https%3A%2F%2Fwww.alimama.com' },
  { key: 'compass', name: '电商罗盘', desc: '包含抖音电商罗盘核心数据', icon: '🧭', url: 'https://compass.jinritemai.com/' },
  { key: 'jingmai', name: '京麦 (金麦)', desc: '京东商家开放平台与后台数据', icon: '📦', url: 'https://passport.shop.jd.com/' },
  { key: 'qianchuan', name: '巨量千川', desc: '巨量千川广告投放与素材分析', icon: '🌊', url: 'https://qianchuan.jinritemai.com/' },
  { key: 'jushuitan', name: '聚水潭 ERP', desc: '订单、出入库与商品库存数据', icon: '💧', url: 'https://www.erp321.com/' },
  { key: 'qianniu', name: '千牛工作台', desc: '微信/支付宝聚合账单与店铺管理', icon: '🐂', url: 'https://qn.taobao.com/' },
  { key: 'xiaohongshu', name: '小红书', desc: '包含小红书蒲公英、千帆平台', icon: '📕', url: 'https://ark.xiaohongshu.com/' }
];

const getTreeDataForPlatform = (pKey: string) => {
  switch (pKey) {
    case 'douyin':
      return [
        {
          title: '🚚 订单发货',
          value: 'group_order_delivery',
          selectable: false,
          children: [
            { title: '订单管理', value: 'order_report' },
            { title: '卡券管理', value: 'coupon_manage' },
            { title: '发货中心', value: 'delivery_center' },
            { title: '订单报备', value: 'order_report_delay' },
            { title: '包裹中心', value: 'package_center' },
            { title: '物流工具', value: 'logistic_tools' },
            { title: '电子面单', value: 'electronic_sheet' },
            { title: '物料服务', value: 'material_service' },
            { title: '物料诊断', value: 'material_diagnose' }
          ]
        },
        {
          title: '💰 资金板块',
          value: 'group_compass_finance',
          selectable: false,
          children: [
            { title: '账户中心', value: 'account_center' },
            { title: '保证金账户', value: 'deposit_account' },
            { title: '抖店货款', value: 'doudian_goods_payment' },
            { title: '帐单管理', value: 'bill_management' },
            { title: '返佣管理', value: 'commission_refund' },
            { title: '发票管理', value: 'invoice_management' },
            { title: '历史报表', value: 'historical_report' }
          ]
        }
      ];
    case 'qianchuan':
      return [
        {
          title: '🎥 推广投放 (巨量千川)',
          value: 'group_qianchuan',
          selectable: false,
          children: [
            { title: '素材分析 — 巨量千川素材数据报表', value: 'qianchuan_material' },
            { title: '投放明细 — 巨量千川全域推广明细', value: 'qianchuan_all' },
            { title: '单品投放 — 巨量千川单品推广报表', value: 'qianchuan_product' },
            { title: '视频素材推广商品 (推商品)', value: 'qianchuan_video_promote' }
          ]
        }
      ];
    case 'compass':
      return [
        {
          title: '🧭 电商罗盘',
          value: 'group_compass',
          selectable: false,
          children: [
            { title: '罗盘经营分析-成交概览表', value: 'compass_trade' },
            { title: '罗盘商品分析-商品核心明细表', value: 'compass_product' },
            { title: '资金对账-抖店余额与待结算表', value: 'dy_balance' }
          ]
        }
      ];
    case 'alimama':
      return [
        {
          title: '🌸 阿里妈妈推广',
          value: 'group_alimama',
          selectable: false,
          children: [
            { title: '淘宝联盟推广数据', value: 'alimama_union' },
            { title: '万相台投放明细表', value: 'alimama_wanxiang' }
          ]
        }
      ];
    case 'jingmai':
      return [
        {
          title: '📦 京麦商家平台',
          value: 'group_jingmai',
          selectable: false,
          children: [
            { title: '京东订单流水表', value: 'jingmai_order' },
            { title: '京东资金明细表', value: 'jingmai_finance' }
          ]
        }
      ];
    case 'jushuitan':
      return [
        {
          title: '💧 聚水潭 ERP',
          value: 'group_jushuitan',
          selectable: false,
          children: [
            { title: 'ERP 订单出入库明细表', value: 'jushuitan_order' },
            { title: '商品库存同步表', value: 'jushuitan_inventory' }
          ]
        }
      ];
    case 'qianniu':
      return [
        {
          title: '🐂 千牛工作台',
          value: 'group_qianniu',
          selectable: false,
          children: [
            { title: '微信支付聚合账单', value: 'qianniu_bill_wechat' },
            { title: '支付宝支付账单', value: 'qianniu_bill_alipay' },
            { title: '聚合结算账户收支明细', value: 'qianniu_fund_detail' }
          ]
        }
      ];
    case 'xiaohongshu':
      return [
        {
          title: '📕 小红书平台',
          value: 'group_xiaohongshu',
          selectable: false,
          children: [
            { title: '蒲公英达人合作笔记', value: 'xiaohongshu_pugongying' },
            { title: '乘风账户明细', value: 'xiaohongshu_chengfeng_account' },
            { title: '聚光计划报表', value: 'xiaohongshu_juguang_plan' },
            { title: '千帆资金余额明细', value: 'xiaohongshu_qianfan_balance' }
          ]
        }
      ];
    default:
      return [];
  }
};

/**
 * 功能描述：基于所选的平台与同步模块，动态计算出最精准的网页登录入口 URL
 * @param {string} pKey - 平台唯一标识
 * @param {string} mKey - 同步模块唯一标识
 * @return {string} 返回网页登录的 URL 地址
 */
const getDynamicLoginUrl = (pKey: string, mKey: string): string => {
  if (pKey === 'xiaohongshu') {
    if (mKey === 'xiaohongshu_pugongying') return 'https://pgy.xiaohongshu.com/';
    if (mKey === 'xiaohongshu_juguang_plan') return 'https://ad.xiaohongshu.com/';
    if (mKey === 'xiaohongshu_chengfeng_account') return 'https://cf.xiaohongshu.com/';
    if (mKey === 'xiaohongshu_qianfan_balance') return 'https://ark.xiaohongshu.com/';
    return 'https://ark.xiaohongshu.com/';
  }
  if (pKey === 'alimama') {
    if (mKey === 'alimama_union') return 'https://pub.alimama.com/';
    if (mKey === 'alimama_wanxiang') return 'https://wanxiang.taobao.com/';
    return 'https://www.alimama.com/';
  }
  if (pKey === 'qianniu') {
    if (mKey === 'qianniu_fund_detail') return 'https://myseller.taobao.com/home.htm/whale-accountant/pay/capital/home?active=fund_detail';
    return 'https://myseller.taobao.com/';
  }
  const defaultUrls: Record<string, string> = {
    douyin: 'https://fxg.jinritemai.com/login/common?extra=%7B%22target_url%22%3A%22https%3A%2F%2Ffxg.jinritemai.com%2Fffa%2Fmshop%2Fhomepage%2Findex%22%7D',
    compass: 'https://compass.jinritemai.com/',
    jingmai: 'https://passport.shop.jd.com/',
    qianchuan: 'https://qianchuan.jinritemai.com/',
    jushuitan: 'https://www.erp321.com/',
    qianniu: 'https://qn.taobao.com/'
  };
  return defaultUrls[pKey] || 'https://www.baidu.com';
};

const getPlaceholder = (pKey: string) => {
  switch (pKey) {
    case 'douyin': return '请输入数字格式的抖音店铺 ID，例如：982734';
    case 'alimama': return '请输入阿里妈妈/淘宝账号 ID，例如：8821734';
    case 'compass': return '请输入电商罗盘店铺 ID，例如：982734';
    case 'jingmai': return '请输入京麦/京东店铺 ID，例如：100028';
    case 'qianchuan': return '请输入巨量千川广告主 ID，例如：16892734';
    case 'jushuitan': return '请输入聚水潭商户/店铺 ID，例如：502934';
    case 'qianniu': return '请输入千牛店铺 ID，例如：682734';
    case 'xiaohongshu': return '请输入小红书店铺 ID，例如：8349273';
    default: return '请输入店铺 ID / 账号 ID';
  }
};

/**
 * 功能描述：主应用入口组件，负责渲染飞书连接器配置面板，处理左侧菜单滚动监听、账号两步式绑定以及模式 B 网页登录捕获逻辑。
 * @return {JSX.Element} 返回 React 渲染组件树
 */
export default function App(): JSX.Element {
  // 基础状态
  const [activeMenu, setActiveMenu] = useState<string>('datasource');
  const [platform, setPlatform] = useState<string>('douyin');
  const [userId, setUserId] = useState<string>('');
  const [tenantKey, setTenantKey] = useState<string>('');
  
  // 账号相关状态
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [accountSourceType, setAccountSourceType] = useState<string>('shared');
  
  // 共享账号下拉选项
  const [sharedAccounts, setSharedAccounts] = useState<{ id: string; name: string }[]>([]);
  const [selectedSharedAccountId, setSelectedSharedAccountId] = useState<string>('');

  // 新账号绑定表单状态
  const [newAccountMode, setNewAccountMode] = useState<string>('mode_b'); // mode_b = 网页模拟登录, mode_a = API
  const [appKey, setAppKey] = useState<string>('');
  const [appSecret, setAppSecret] = useState<string>('');
  const [pastedCookie, setPastedCookie] = useState<string>('');
  const [allowShare, setAllowShare] = useState<boolean>(true);
  const [isNewAccountActive, setIsNewAccountActive] = useState<boolean>(true); // 绑定后是否立即启用新账号
  
  // 网页登录捕获状态
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [capturedCookie, setCapturedCookie] = useState<string>('');
  const [capturedShopId, setCapturedShopId] = useState<string>('');
  const [capturedShopName, setCapturedShopName] = useState<string>('');
  const [pollingTimer, setPollingTimer] = useState<any>(null);

  // 参数与字段映射设置
  const [syncModule, setSyncModule] = useState<string>('order_report');
  const [shopIdParam, setShopIdParam] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('30');
  const [bitableFields, setBitableFields] = useState<{ value: string; label: string }[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({
    order_id: 'col_order_id',
    create_time: 'col_create_time_v2',
    pay_amount: 'col_pay_amount',
    order_status: 'col_order_status',
    shop_name: 'col_shop_name',
    shop_id: 'col_shop_id'
  });
  const [refreshFrequency, setRefreshFrequency] = useState<string>('hour');

  // 账户中心高级参数状态
  const [merchantUid, setMerchantUid] = useState<string>('7291551609760710657');
  const [payChannel, setPayChannel] = useState<string>('aggregate'); // aggregate / wechat / douyin
  const [timeType, setTimeType] = useState<string>('relative'); // relative / custom
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // DOM 容器的 Ref，用于滚动定位和监听
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 初始化拉取飞书基本信息
  useEffect(() => {
    bitable.getConfig().then(config => {
      console.log('飞书连接器先前配置：', config);
      if (config) {
        // 回填先前配置
        if (config.platform) setPlatform(config.platform);
        if (config.syncModule) setSyncModule(config.syncModule);
        if (config.shopIdParam) setShopIdParam(config.shopIdParam);
        if (config.dateRange) setDateRange(config.dateRange);
        if (config.fieldMappings && Object.keys(config.fieldMappings).length > 0) {
          setFieldMappings(config.fieldMappings);
        }
        if (config.refreshFrequency) setRefreshFrequency(config.refreshFrequency);
        if (config.merchantUid) setMerchantUid(config.merchantUid);
        if (config.payChannel) setPayChannel(config.payChannel);
        if (config.timeType) setTimeType(config.timeType);
        if (config.customStartDate) setCustomStartDate(config.customStartDate);
        if (config.customEndDate) setCustomEndDate(config.customEndDate);
      }
    });

    bitable.getUserId().then(id => {
      setUserId(id || 'unknown');
    });

    bitable.getTenantKey().then(key => {
      setTenantKey(key || 'unknown');
    });

    // 从后端 SQLite 数据库加载已绑定账号，并拉取共享账号
    fetchAccounts();
    fetchSharedAccounts();
  }, []);

  // 监听 platform 发生切换，自动切换参数和模块的默认激活状态
  useEffect(() => {
    const activeAcc = accounts.find((a: any) => a.isActive && a.platform === platform);
    
    // 获取当前平台所有有效的同步模块列表
    const platformTree = getTreeDataForPlatform(platform);
    const validModules: string[] = [];
    platformTree.forEach(group => {
      if (group.children) {
        group.children.forEach(child => {
          validModules.push(child.value);
        });
      }
    });
    
    const defaultModules: Record<string, string> = {
      douyin: 'order_report',
      qianchuan: 'qianchuan_material',
      compass: 'compass_trade',
      alimama: 'alimama_union',
      jingmai: 'jingmai_order',
      jushuitan: 'jushuitan_order',
      qianniu: 'qianniu_bill_wechat',
      xiaohongshu: 'xiaohongshu_pugongying'
    };
    const defaultMod = defaultModules[platform] || validModules[0] || 'order_report';

    if (activeAcc) {
      setShopIdParam(activeAcc.shopId || (platform === 'qianniu' ? '499066699' : ''));
      if (activeAcc.module && validModules.includes(activeAcc.module)) {
        setSyncModule(activeAcc.module);
      } else {
        setSyncModule(defaultMod);
      }
    } else {
      if (platform === 'qianniu') {
        setShopIdParam('499066699');
      } else {
        setShopIdParam('');
      }
      setSyncModule(defaultMod);
    }
  }, [platform, accounts]);

  // 监听 syncModule 的变化以动态更新源字段与飞书多维表格列的默认映射
  useEffect(() => {
    const fields = MODULE_FIELDS[syncModule] || MODULE_FIELDS.account_center || MODULE_FIELDS.order_report;
    const bitableOptions = fields.map(f => {
      let emoji = '📝';
      if (f.type === 'DateTime') emoji = '📅';
      else if (f.type === 'Number') emoji = '💰';
      
      const labelText = f.label.split(' (')[0];
      const typeText = f.type === 'Text' ? '文本型' : f.type === 'Number' ? '数字型' : '日期型';
      return {
        value: f.defaultField,
        label: `${emoji} ${labelText} (${typeText})`
      };
    });
    setBitableFields(bitableOptions);

    // 重新初始化默认字段映射
    const initialMappings: Record<string, string> = {};
    fields.forEach(f => {
      initialMappings[f.key] = f.defaultField;
    });
    setFieldMappings(initialMappings);
  }, [syncModule]);

  // 轮询管理：当 isPolling 变化时启动或关闭定时器
  useEffect(() => {
    if (isPolling) {
      const timer = setInterval(() => {
        checkCaptureStatus();
      }, 2000);
      setPollingTimer(timer);
      return () => clearInterval(timer);
    } else {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        setPollingTimer(null);
      }
    }
  }, [isPolling]);

  // 实现 Scrollspy：监听右侧滚动区域并自动高亮左侧导航
  useEffect(() => {
    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const sections = ['datasource', 'account', 'params', 'fields', 'guide'];
      let currentSection = 'datasource';
      let minDiff = Infinity;

      for (const section of sections) {
        const el = document.getElementById(`section-${section}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          // 计算各 section 顶部相对于滚动容器顶部的距离差
          const diff = Math.abs(rect.top - containerRect.top);
          if (diff < minDiff && rect.top - containerRect.top <= 100) {
            minDiff = diff;
            currentSection = section;
          }
        }
      }
      setActiveMenu(currentSection);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  /**
   * 功能描述：从本地 SQLite 数据库中拉取已绑定的账户列表
   * @return {Promise<void>} 无返回值
   */
  const fetchAccounts = async (): Promise<void> => {
    try {
      const response = await fetch('/api/v1/connector/accounts');
      if (response.ok) {
        const data = await response.json();
        const mappedList = data.map((item: any) => ({
          key: item.key,
          name: item.name,
          mode: item.mode,
          status: item.status,
          cookie: item.cookie,
          shopId: item.shopId,
          isActive: item.is_active === 1,
          module: item.module,
          platform: item.platform
        }));
        setAccounts(mappedList);
      }
    } catch (e) {
      console.error('从 SQLite 数据库获取账户列表失败', e);
    }
  };

  /**
   * 功能描述：在本地数据库中切换当前启用的活跃同步账号
   * @param {string} key - 账号主键
   * @return {Promise<void>} 无返回值
   */
  const handleSetActiveAccount = async (key: string): Promise<void> => {
    try {
      const response = await fetch('/api/v1/connector/accounts/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      if (response.ok) {
        message.success("已成功切换并启用该数据源同步账号！");
        await fetchAccounts();
      }
    } catch (e) {
      message.error("切换启用账号失败");
    }
  };

  /**
   * 功能描述：拉取企业共享账号列表
   * @return {Promise<void>} 无返回值
   */
  const fetchSharedAccounts = async (): Promise<void> => {
    try {
      const response = await fetch('/api/v1/connector/shared-accounts');
      if (response.ok) {
        const data = await response.json();
        setSharedAccounts(data);
        if (data.length > 0) {
          setSelectedSharedAccountId(data[0].id);
        }
      }
    } catch (e) {
      console.warn('获取共享账号列表失败，使用本地 Mock 数据', e);
      setSharedAccounts([
        { id: 'dy_share_01', name: '抖音罗盘-运营部共享01' },
        { id: 'dy_share_02', name: '抖音小店-财务共享02' }
      ]);
    }
  };

  /**
   * 功能描述：向后端查询 Cookie 是否已被书签助手成功拦截并上报，同时自动识别同步模块
   * @return {Promise<void>} 无返回值
   */
  const checkCaptureStatus = async (): Promise<void> => {
    try {
      const response = await fetch('/api/v1/connector/sources/capture-status');
      if (response.ok) {
        const data = await response.json();
        if (data.captured && data.cookie) {
          setIsPolling(false);
          setCapturedCookie(data.cookie);
          setCapturedShopId(data.shopId || '');
          const pName = PLATFORMS_MAP.find(p => p.key === platform)?.name || '抖店';
          setCapturedShopName(data.shopName || `已拦截${pName}`);
          if (data.module) {
            setSyncModule(data.module);
            message.success(`🎉 成功从页面拦截到${pName}凭据及 [${data.module === 'order_report' ? '订单流水' : '数据罗盘'}] 动作！`);
          } else {
            message.success(`🎉 成功拦截到${pName}登录凭据！店铺名: ${data.shopName || '未命名'}`);
          }
        }
      }
    } catch (e) {
      console.error('轮询捕获状态接口出错', e);
    }
  };

  /**
   * 功能描述：平滑滚动定位到右侧指定区块
   * @param {string} sectionId 区块的 HTML 元素 ID 后缀
   * @return {void} 无返回值
   */
  const scrollToSection = (sectionId: string): void => {
    setActiveMenu(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /**
   * 功能描述：打开关联账号的两步式弹窗
   * @return {void} 无返回值
   */
  const openAccountModal = (): void => {
    setCurrentStep(1);
    setIsAccountModalOpen(true);
    setCapturedCookie('');
    setCapturedShopId('');
    setCapturedShopName('');
    setPastedCookie('');
    setIsPolling(false);
    setIsNewAccountActive(true); // 默认启用新绑定账号
    // 清理一次后端凭证捕获缓冲区
    fetch('/api/v1/connector/sources/capture-clear', { method: 'POST' }).catch(() => {});
  };

  /**
   * 功能描述：触发打开外部电商/平台官方登录页，并开始后台轮询以监听 Cookie 上报
   * @return {void} 无返回值
   */
  const handleStartSimulatedLogin = (): void => {
    const selectedPlatform = PLATFORMS_MAP.find(p => p.key === platform) || PLATFORMS_MAP[0];
    const targetUrl = getDynamicLoginUrl(platform, syncModule);
    window.open(targetUrl, '_blank', 'width=800,height=600,left=200,top=100');
    setIsPolling(true);
    message.loading({ content: `正在轮询捕获 ${selectedPlatform.name} 登录凭证，请在新页面中登录并运行书签脚本...`, key: 'poll', duration: 0 });
  };

  /**
   * 功能描述：保存并关联选择的账号信息（共享或个人自建）
   * @return {void} 无返回值
   */
  const handleSaveAccountRelation = async (): Promise<void> => {
    let newAcc: Account | null = null;
    
    if (accountSourceType === 'shared') {
      const selected = sharedAccounts.find(a => a.id === selectedSharedAccountId);
      if (!selected) {
        message.error('请选择一个有效的共享账号');
        return;
      }
      newAcc = {
        key: `shared_${Date.now()}`,
        name: `${selected.name} (企业共享)`,
        mode: '企业共享免密',
        status: 'active',
        module: syncModule,
        platform: platform
      };
    } else {
      // 绑定自建新账号
      if (newAccountMode === 'mode_b') {
        let finalCookie = capturedCookie || pastedCookie;
        let finalShopId = capturedShopId;
        let finalShopName = capturedShopName;

        // 如果 React 状态中没有 Cookie，进行一次强制同步拉取以检查后端暂存区
        if (!finalCookie) {
          try {
            const response = await fetch('/api/v1/connector/sources/capture-status');
            if (response.ok) {
              const data = await response.json();
              if (data.captured && data.cookie) {
                finalCookie = data.cookie;
                finalShopId = data.shopId || '';
                finalShopName = data.shopName || '已拦截抖店';
                setCapturedCookie(data.cookie);
                setCapturedShopId(finalShopId);
                setCapturedShopName(finalShopName);
                setIsPolling(false);
              }
            }
          } catch (e) {
            console.error('最后尝试获取凭证失败', e);
          }
        }

        if (!finalCookie) {
          message.error('请在下方登录或手动粘贴您的 Cookie 凭证！');
          return;
        }
        
        let displayShopId = finalShopId;
        if (!displayShopId) {
          const match = finalCookie.match(/(?:shop_id|shop_id_str|member_id|seller_id|userId)=(\d+)/);
          displayShopId = match ? match[1] : '手动录入';
        }

        const selectedPlatform = PLATFORMS_MAP.find(p => p.key === platform) || PLATFORMS_MAP[0];
        newAcc = {
          key: `self_${Date.now()}`,
          name: `${finalShopName || (selectedPlatform.name + '模拟登录账号')} (ID: ${displayShopId})`,
          mode: '模拟登录',
          status: 'active',
          cookie: finalCookie,
          shopId: displayShopId,
          module: syncModule,
          platform: platform
        };
      } else {
        // API 模式
        if (!appKey || !appSecret) {
          message.error('请输入完整的 AppKey 与 AppSecret');
          return;
        }
        newAcc = {
          key: `api_${Date.now()}`,
          name: `官方接口账户 (Key: ${appKey.substring(0, 5)}...)`,
          mode: '官方 API',
          status: 'active',
          module: syncModule,
          platform: platform
        };
      }
    }
    
    if (newAcc) {
      try {
        const response = await fetch('/api/v1/connector/accounts/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: newAcc.key,
            name: newAcc.name,
            mode: newAcc.mode,
            status: newAcc.status,
            cookie: newAcc.cookie || '',
            shopId: newAcc.shopId || '',
            is_active: isNewAccountActive ? 1 : 0,
            module: newAcc.module || '',
            platform: platform
          })
        });
        if (response.ok) {
          message.success('新账号已成功绑定并存盘！');
          await fetchAccounts();
        } else {
          const errData = await response.json().catch(() => ({}));
          message.error(`绑定失败: ${errData.message || '服务器响应错误'}`);
        }
      } catch (e: any) {
        message.error(`写入数据库失败: ${e.message || e}`);
      }
    }
    
    message.destroy('poll');
    setIsAccountModalOpen(false);
  };

  /**
   * 功能描述：在本地 SQLite 数据库中解除某个关联的账号
   * @param {string} key - 账号主键
   * @return {Promise<void>} 无返回值
   */
  const handleDeleteAccount = async (key: string): Promise<void> => {
    try {
      const response = await fetch(`/api/v1/connector/accounts/${key}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        message.info('账号已解除关联');
        await fetchAccounts();
      }
    } catch (e) {
      message.error("删除账号失败");
    }
  };

  /**
   * 功能描述：执行“自动映射同名列”逻辑，自动模糊匹配数据源字段与飞书多维表格现有列名
   * @return {void} 无返回值
   */
  const handleAutoMapFields = (): void => {
    const fields = MODULE_FIELDS[syncModule] || MODULE_FIELDS.order_report;
    const defaultMapping: Record<string, string> = {};
    fields.forEach(f => {
      defaultMapping[f.key] = f.defaultField;
    });
    setFieldMappings(defaultMapping);
    message.success(`⚡ 已根据同名原则为您自动映射了该模块的 ${fields.length} 个列字段！`);
  };

  /**
   * 功能描述：处理字段映射下拉框的改变事件
   * @param {string} sourceKey 数据源字段标识
   * @param {string} bitableFieldId 飞书列字段标识
   * @return {void} 无返回值
   */
  const handleMapFieldChange = (sourceKey: string, bitableFieldId: string): void => {
    setFieldMappings({
      ...fieldMappings,
      [sourceKey]: bitableFieldId
    });
  };

  /**
   * 功能描述：提交最终任务配置，调用飞书 API 保存并退出配置弹窗
   * @return {Promise<void>} 无返回值
   */
  const handleSaveAndGoNext = async (): Promise<void> => {
    // 校验必要参数
    if (accounts.length === 0) {
      message.error('请至少关联一个账号进行数据同步！');
      return;
    }
    if (!shopIdParam) {
      message.error(`请输入需要同步的${PLATFORMS_MAP.find(p => p.key === platform)?.name || '平台'} 店铺 ID (Shop ID / Account ID)！`);
      return;
    }

    const activeAccount = accounts.find(a => a.isActive && a.platform === platform) || accounts.find(a => a.platform === platform);

    if (!activeAccount) {
      const pName = PLATFORMS_MAP.find(p => p.key === platform)?.name || '当前平台';
      message.error(`请先关联并选择一个【${pName}】平台的有效授权账号！`);
      return;
    }

    const config = {
      platform,
      syncModule,
      shopIdParam,
      dateRange,
      fieldMappings,
      refreshFrequency,
      merchantUid,
      payChannel,
      timeType,
      customStartDate,
      customEndDate,
      accountInfo: {
        mode: activeAccount ? activeAccount.mode : '模拟登录',
        name: activeAccount ? activeAccount.name : `${PLATFORMS_MAP.find(p => p.key === platform)?.name || '抖店'}模拟账号`,
        cookie: (activeAccount && activeAccount.cookie) || pastedCookie,
        shopId: (activeAccount && activeAccount.shopId) || shopIdParam
      }
    };

    try {
      // 1. 同时保存到我们自己的后端，以便定时同步读取
      const response = await fetch('/api/v1/sync/tasks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('后端任务保存失败');
      }

      // 2. 调用飞书接口保存配置并跳转下一步
      console.log('保存配置到飞书多维表格：', config);
      bitable.saveConfigAndGoNext({
        value: JSON.stringify(config)
      });
    } catch (e: any) {
      message.error(`任务保存失败: ${e.message}`);
    }
  };

  // 动态生成的书签脚本代码
  const bookmarkCode = useMemo(() => {
    const selectedPlatform = PLATFORMS_MAP.find(p => p.key === platform) || PLATFORMS_MAP[0];
    const hostOrigin = window.location.origin;
    const code = `javascript:(function(){
      var cookie = document.cookie;
      var shopId = '${shopIdParam}';
      if (!shopId && '${platform}' === 'qianniu') {
        shopId = '499066699';
      }
      if (!shopId) {
        var match = cookie.match(/(?:owner_co_id|authorize_co_id|co_id|shop_id|shop_id_str|member_id|seller_id|userId|customer_id)=(\\d+)/);
        if (match) {
          shopId = match[1];
        }
      }
      if (!shopId) {
        var urlMatch = window.location.href.match(/[?&](owner_co_id|authorize_co_id|co_id|shopId|shop_id|sellerId|seller_id|advertiserId|advertiser_id|userId|customer_id)=(\\d+)/);
        if (urlMatch) shopId = urlMatch[2];
      }
      if (!shopId) {
        shopId = prompt("请输入您的 ${selectedPlatform.name} 店铺 ID / 账号 ID (选填/必填):");
      }
      var shopName = document.title || "${selectedPlatform.name}店铺";
      if ('${platform}' === 'qianniu') {
        shopName = '高原安旗舰店:财务';
      }

      if ('${platform}' === 'qianniu' && window.lib && window.lib.mtop) {
        var cycleFrom = new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0];
        var cycleTo = new Date().toISOString().split('T')[0];
        window.lib.mtop.request({
          api: 'mtop.taobao.finance.fund.bill.query',
          v: '1.0',
          data: {
            pageNo: 1,
            pageSize: 100,
            billCycleFrom: cycleFrom,
            billCycleTo: cycleTo,
            billCode: "BILL_DETAIL"
          }
        }).then(function(res) {
          var dataList = [];
          if (res && res.data && res.data.tableValues && Array.isArray(res.data.tableValues.data)) {
            dataList = res.data.tableValues.data;
          }
          var xhr = new XMLHttpRequest();
          xhr.open("POST", "${hostOrigin}/api/v1/connector/sources/data-capture", true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                alert("🎉 千牛一键捕获并提取真实账单数据成功！已上报 " + dataList.length + " 条真实记录。请返回飞书多维表格点击保存并同步！");
              } else {
                alert("❌ 数据上报失败: HTTP " + xhr.status);
              }
            }
          };
          xhr.send(JSON.stringify({
            cookie: cookie,
            shopId: shopId,
            shopName: shopName,
            module: "${syncModule}",
            dataList: dataList
          }));
        }).catch(function(err) {
          alert("❌ 无法提取真实账单: " + (err && err.message ? err.message : String(err)));
        });
        return;
      }

      var serverUrl = "${hostOrigin}/api/v1/connector/sources/login-capture-get";
      var url = serverUrl + "?cookie=" + encodeURIComponent(cookie) + "&shopId=" + encodeURIComponent(shopId || "default") + "&shopName=" + encodeURIComponent(shopName) + "&module=${syncModule}";
      window.open(url, "_blank");
    })();`;
    return code.replace(/\\r?\\n\\s*/g, '').replace(/\r?\n\s*/g, '');
  }, [platform, syncModule, shopIdParam]);

  return (
    <div className="connector-container">
      {/* 左侧导航栏 */}
      <div className="left-nav">
        <div className="nav-title">⚙️ 配置控制台</div>
        <div 
          className={`nav-item ${activeMenu === 'datasource' ? 'active' : ''}`}
          onClick={() => scrollToSection('datasource')}
        >
          🔗 数据源选择
        </div>
        <div 
          className={`nav-item ${activeMenu === 'account' ? 'active' : ''}`}
          onClick={() => scrollToSection('account')}
        >
          🔑 账号设置
        </div>
        <div 
          className={`nav-item ${activeMenu === 'params' ? 'active' : ''}`}
          onClick={() => scrollToSection('params')}
        >
          ⚙️ 参数设置
        </div>
        <div 
          className={`nav-item ${activeMenu === 'fields' ? 'active' : ''}`}
          onClick={() => scrollToSection('fields')}
        >
          📊 字段设置
        </div>
        <div 
          className={`nav-item ${activeMenu === 'guide' ? 'active' : ''}`}
          onClick={() => scrollToSection('guide')}
        >
          ❓ 使用说明
        </div>
      </div>

      {/* 右侧表单滚动区域 */}
      <div className="right-content" ref={scrollContainerRef}>
        
        {/* Section 1: 数据源选择 */}
        <section className="form-section" id="section-datasource">
          <div className="section-header">1. 对接数据源平台</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {PLATFORMS_MAP.map(p => (
              <div 
                key={p.key}
                className={`platform-card ${platform === p.key ? 'selected' : ''}`}
                onClick={() => setPlatform(p.key)}
              >
                <span style={{ fontSize: '24px' }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: 账号设置 */}
        <section className="form-section" id="section-account">
          <div className="section-header">2. 账号授权设置</div>
          <div style={{ marginBottom: '16px' }}>
            <Button type="primary" ghost onClick={openAccountModal}>
              ➕ 关联新账号
            </Button>
          </div>
          <Table 
            dataSource={accounts.filter(a => a.platform === platform)} 
            pagination={false} 
            size="small"
            columns={[
              {
                title: '启用',
                key: 'active',
                width: 60,
                align: 'center',
                render: (_, record) => (
                  <Radio 
                    checked={record.isActive} 
                    onChange={() => handleSetActiveAccount(record.key)}
                  />
                )
              },
              {
                title: '账号/店铺名称',
                dataIndex: 'name',
                key: 'name',
                render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
              },
              {
                title: '对接模式',
                dataIndex: 'mode',
                key: 'mode',
                render: (mode) => <Badge color="blue" text={mode} />
              },
              {
                title: '凭证状态',
                dataIndex: 'status',
                key: 'status',
                render: (status) => (
                  status === 'active' 
                    ? <Badge status="success" text="正常 (长效保活中)" />
                    : <Badge status="error" text="凭证失效(Cookie过期)" />
                )
              },
              {
                title: '操作',
                key: 'action',
                render: (_, record) => (
                  <Space size="middle">
                    <a onClick={openAccountModal}>重新连接</a>
                    <a style={{ color: '#ff4d4f' }} onClick={() => handleDeleteAccount(record.key)}>删除</a>
                  </Space>
                )
              }
            ]}
          />
        </section>

        {/* Section 3: 参数设置 */}
        <section className="form-section" id="section-params">
          <div className="section-header">3. 同步参数设置</div>
          <Form layout="vertical">
            <Form.Item label="目标同步动作 / 模块" required>
              <TreeSelect 
                style={{ width: '100%' }}
                value={syncModule} 
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                placeholder="请选择目标同步动作 / 模块"
                treeDefaultExpandAll
                onChange={(val) => setSyncModule(val)}
                treeData={getTreeDataForPlatform(platform)}
              />
            </Form.Item>
            
            <Form.Item 
              label={`${PLATFORMS_MAP.find(p => p.key === platform)?.name || '平台'} 店铺 ID (Shop ID / Account ID)`} 
              required 
              tooltip="模式 B 请求时需要拼接店铺主键。系统检测到网页登录成功后会自动填入该项。"
            >
              <Input 
                placeholder={getPlaceholder(platform)} 
                value={shopIdParam}
                onChange={(e) => setShopIdParam(e.target.value)}
              />
            </Form.Item>
            {syncModule === 'account_center' && (
              <>
                <Form.Item 
                  label="商户 UID (merchant_uid)" 
                  required 
                  tooltip="余额明细查询所需的商户 UID 主键"
                >
                  <Input 
                    placeholder="请输入数字商户 UID，例如：7291551609760710657" 
                    value={merchantUid}
                    onChange={(e) => setMerchantUid(e.target.value)}
                  />
                </Form.Item>

                <Form.Item label="支付通道" required>
                  <Select 
                    value={payChannel}
                    onChange={(val) => setPayChannel(val)}
                    options={[
                      { value: 'aggregate', label: '💳 聚合支付' },
                      { value: 'wechat', label: '🟢 微信支付' },
                      { value: 'douyin', label: '🎵 抖音支付' }
                    ]}
                  />
                </Form.Item>

                <Form.Item label="时间同步类型" required>
                  <Select 
                    value={timeType}
                    onChange={(val) => setTimeType(val)}
                    options={[
                      { value: 'relative', label: '📅 相对天数范围' },
                      { value: 'custom', label: '⏱️ 自定义日期范围（传参同步）' }
                    ]}
                  />
                </Form.Item>

                {timeType === 'custom' && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(0, 0, 0, 0.85)' }}>开始日期 *</label>
                      <Input 
                        type="date"
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)} 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(0, 0, 0, 0.85)' }}>结束日期 *</label>
                      <Input 
                        type="date"
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)} 
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {(syncModule !== 'account_center' || timeType === 'relative') && (
              <Form.Item label="同步时间范围" required>
                <Select 
                  value={dateRange}
                  onChange={(val) => setDateRange(val)}
                  options={[
                    { value: '3', label: '回溯近 3 天数据（高频增量，推荐）' },
                    { value: '7', label: '回溯近 7 天数据' },
                    { value: '30', label: '回溯近 30 天数据（多页拉取）' }
                  ]}
                />
              </Form.Item>
            )}
          </Form>
        </section>

        {/* Section 4: 字段设置 */}
        <section className="form-section" id="section-fields">
          <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
            <span>4. 字段与同步配置</span>
            <Button 
              type="primary" 
              size="small" 
              onClick={handleAutoMapFields}
              style={{ fontSize: '12px' }}
            >
              ⚡ 自动映射同名列
            </Button>
          </div>
          
          <div style={{ marginBottom: '16px', color: '#595959', fontSize: '13px' }}>
            目标多维数据表映射配置：
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#8c8c8c' }}>源数据字段</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#8c8c8c' }}>字段类型</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#8c8c8c' }}>目标多维表格映射列</th>
              </tr>
            </thead>
            <tbody>
              {(MODULE_FIELDS[syncModule] || MODULE_FIELDS.order_report).map(f => (
                <tr key={f.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 500, fontSize: '13px' }}>{f.label}</td>
                  <td style={{ padding: '12px 10px', fontSize: '12px', color: '#8c8c8c' }}>{f.type}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <Select
                      style={{ width: '220px' }}
                      placeholder="选择要写入的列"
                      value={fieldMappings[f.key]}
                      onChange={(val) => handleMapFieldChange(f.key, val)}
                      options={bitableFields}
                      allowClear
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Form layout="vertical">
            <Form.Item label="⏰ 自动定时刷新频率" required>
              <Select 
                value={refreshFrequency}
                onChange={(val) => setRefreshFrequency(val)}
                options={[
                  { value: 'hour', label: '每小时自动静默同步（采用捕获凭证长效保活）' },
                  { value: 'none', label: '不自动刷新（仅限用户在表格内手动触发）' }
                ]}
              />
            </Form.Item>
          </Form>
        </section>

        {/* Section 5: 使用说明 */}
        <section className="form-section" id="section-guide">
          <div className="section-header">5. 网页模拟登录与书签助手安装指南</div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#595959' }}>
            <p><strong>关于模式 B (Cookie 捕获免验证码同步) 的工作原理：</strong></p>
            <ol>
              <li>点击账号关联界面的 <strong>“点击开始网页模拟登录”</strong>，系统将引导打开 {PLATFORMS_MAP.find(p => p.key === platform)?.name || '商家'} 登录主页。</li>
              <li>在浏览器子窗口中登录您的商家账号。</li>
              <li>登录完成后，<strong>运行我们提供的“一键捕获书签”</strong>，该脚本将会跨域安全上报您当前的 Session Cookie 给本服务器。</li>
              <li>后端捕获到 Cookie 后，子窗口会自动关闭并确认绑定。定时任务会启用 Session 保换（Keep-Alive）心跳包，通常可在后台**持续免密同步数周**。</li>
            </ol>
            
            <p style={{ marginTop: '16px' }}><strong>🛠 浏览器捕获助手一键安装：</strong></p>
            <p>请将下面的黄色按钮直接<strong>拖动（Drag）到您的浏览器书签栏（Bookmark Bar）</strong>中；或者在登录后的 {PLATFORMS_MAP.find(p => p.key === platform)?.name || '商家'} 网页控制台 (F12 Console) 中复制运行以下代码：</p>
            
            <div style={{ margin: '14px 0' }}>
              <a 
                href={bookmarkCode}
                className="ant-btn ant-btn-primary" 
                style={{ 
                  background: '#d4b106', 
                  borderColor: '#d4b106', 
                  color: '#fff',
                  borderRadius: '20px',
                  fontWeight: 600,
                  boxShadow: '0 4px 10px rgba(212, 177, 6, 0.2)'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  message.info('💡 请将该按钮直接拖动到浏览器书签栏，不可直接点击运行哦。');
                }}
              >
                🖱️ 拖拽此按钮至书签栏 ({PLATFORMS_MAP.find(p => p.key === platform)?.name || '商家'}凭证捕获助手)
              </a>
            </div>

            <div className="bookmark-code-container">
              <Button 
                size="small" 
                type="primary" 
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(bookmarkCode);
                  message.success('脚本代码已复制到剪贴板！');
                }}
              >
                复制
              </Button>
              <code>{bookmarkCode}</code>
            </div>
          </div>
        </section>
      </div>

      {/* 底部操作按钮 */}
      <div className="bottom-bar">
        <Button size="large" onClick={() => bitable.saveConfigAndGoNext({})}>取消</Button>
        <Button size="large" type="primary" onClick={handleSaveAndGoNext}>创建 / 保存</Button>
      </div>

      {/* 关联账号步骤弹窗 (Modal) */}
      <Modal
        title={`关联账号设置 (${currentStep}/2)`}
        open={isAccountModalOpen}
        onCancel={() => {
          setIsAccountModalOpen(false);
          setIsPolling(false);
          message.destroy('poll');
        }}
        footer={[
          currentStep === 2 ? (
            <Button key="back" onClick={() => setCurrentStep(1)}>返回上一步</Button>
          ) : null,
          currentStep === 1 ? (
            <Button key="next" type="primary" onClick={() => setCurrentStep(2)}>下一步</Button>
          ) : (
            <Button key="submit" type="primary" onClick={handleSaveAccountRelation}>确认关联并绑定</Button>
          )
        ]}
      >
        <div style={{ padding: '12px 0' }}>
          {currentStep === 1 ? (
            <div>
              <p style={{ fontWeight: 500, marginBottom: '12px' }}>📌 请选择账号来源类型:</p>
              <Radio.Group 
                value={accountSourceType} 
                onChange={(e) => setAccountSourceType(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <Radio value="shared">
                  <div style={{ display: 'inline-block', verticalAlign: 'top', marginLeft: '8px' }}>
                    <div style={{ fontWeight: 600 }}>使用企业共享账号</div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      复用企业内其他协作者已公开发布的脱敏账号。免输入密钥/扫码，安全免密绑定。
                    </div>
                  </div>
                </Radio>
                <Radio value="self">
                  <div style={{ display: 'inline-block', verticalAlign: 'top', marginLeft: '8px' }}>
                    <div style={{ fontWeight: 600 }}>绑定/授权自己的全新账号</div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      通过官方 AppKey/AppSecret 或网页扫码登录方式，添加您的个人商户接入。
                    </div>
                  </div>
                </Radio>
              </Radio.Group>
            </div>
          ) : (
            <div>
              {accountSourceType === 'shared' ? (
                <div>
                  <p style={{ fontWeight: 500, marginBottom: '12px' }}>使用企业共享账号</p>
                  <Form layout="vertical">
                    <Form.Item label="选择共享账号 *" required>
                      <Select 
                        value={selectedSharedAccountId} 
                        onChange={(val) => setSelectedSharedAccountId(val)}
                        options={sharedAccounts.map(a => ({ value: a.id, label: a.name }))}
                      />
                    </Form.Item>
                  </Form>
                  <div style={{ marginTop: '16px' }}>
                    <Checkbox 
                      checked={isNewAccountActive} 
                      onChange={(e) => setIsNewAccountActive(e.target.checked)}
                    >
                      绑定后立即启用该账号作为同步账号
                    </Checkbox>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 500, marginBottom: '12px' }}>绑定个人新账号</p>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <Radio.Group 
                      value={newAccountMode} 
                      onChange={(e) => setNewAccountMode(e.target.value)}
                      buttonStyle="solid"
                    >
                      <Radio.Button value="mode_b">🌐 网页模拟登录连接 (模式 B)</Radio.Button>
                      <Radio.Button value="mode_a">🛡️ 官方 API 授权连接 (模式 A)</Radio.Button>
                    </Radio.Group>
                  </div>

                  {newAccountMode === 'mode_b' ? (
                    <div>
                      <div className="capture-box">
                        <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>
                          请点击下方按钮打开官方登录页，并在登录后运行书签脚本或控制台代码进行凭证回传。
                        </p>
                        
                        <Button 
                          type="primary" 
                          onClick={handleStartSimulatedLogin}
                          disabled={isPolling}
                        >
                          🔑 点击开始网页模拟登录
                        </Button>

                        <div style={{ marginTop: '12px' }}>
                          {isPolling ? (
                            <div className="capture-status-badge badge-waiting">
                              <span>⏳ 正在等待浏览器脚本回传 Cookie 凭据...</span>
                            </div>
                          ) : capturedCookie ? (
                            <div className="capture-status-badge badge-success">
                              <span>🟢 凭证自动拦截成功 (已获取)</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '6px' }}>
                              （未启动拦截）
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', background: '#fafafa', border: '1px solid #f0f0f0', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                          🛠️ 安装与使用书签助手（捕获凭证）:
                        </div>
                        <div style={{ fontSize: '12px', color: '#595959', marginBottom: '8px', lineHeight: '1.4' }}>
                          1. 显示浏览器书签栏（快捷键：Ctrl/Cmd + Shift + B）。<br />
                          2. 直接 <b>拖拽</b> 下方黄色按钮至您的浏览器书签栏。<br />
                          3. 登录 {PLATFORMS_MAP.find(p => p.key === platform)?.name || '商家'} 后台主页后，<b>点击该书签</b>即可自动上报并绑定。
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <a 
                            href={bookmarkCode}
                            className="ant-btn ant-btn-primary" 
                            style={{ 
                              background: '#d4b106', 
                              borderColor: '#d4b106', 
                              color: '#fff',
                              borderRadius: '20px',
                              fontWeight: 600,
                              fontSize: '12px',
                              padding: '4px 12px',
                              height: 'auto',
                              boxShadow: '0 2px 6px rgba(212, 177, 6, 0.15)'
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              message.info('💡 请将此按钮直接拖动到浏览器书签栏上保存。');
                            }}
                          >
                            🖱️ 拖拽此按钮至书签栏 ({PLATFORMS_MAP.find(p => p.key === platform)?.name || '商家'}凭证捕获助手)
                          </a>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>
                          或者：直接复制并在登录后的网页控制台 (Console) 中贴入回车运行：
                        </div>
                        <div className="bookmark-code-container" style={{ marginTop: '4px', position: 'relative' }}>
                          <Button 
                            size="small" 
                            type="primary" 
                            className="copy-btn"
                            style={{ fontSize: '11px', padding: '0 8px', height: '20px', position: 'absolute', right: '4px', top: '4px' }}
                            onClick={() => {
                              navigator.clipboard.writeText(bookmarkCode);
                              message.success('脚本代码已复制到剪贴板！');
                            }}
                          >
                            复制
                          </Button>
                          <code style={{ fontSize: '10px', display: 'block', wordBreak: 'break-all', maxHeight: '60px', overflowY: 'auto' }}>{bookmarkCode}</code>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '6px' }}>
                          💡 <b>手动录入通道</b>：如果无法通过书签脚本自动上报，可在下方直接粘贴 Cookie 字符串：
                        </div>
                        <TextArea 
                          rows={3} 
                          placeholder="请输入 Cookie 凭证串 (TextArea，手动粘贴优先)" 
                          value={pastedCookie}
                          onChange={(e) => setPastedCookie(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Form layout="vertical">
                        <Form.Item label="AppKey / ClientID *" required>
                          <Input 
                            placeholder="请输入开放平台 AppKey" 
                            value={appKey}
                            onChange={(e) => setAppKey(e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item label="AppSecret *" required>
                          <Input.Password 
                            placeholder="请输入 AppSecret (将进行密文掩码脱敏)" 
                            value={appSecret}
                            onChange={(e) => setAppSecret(e.target.value)}
                          />
                        </Form.Item>
                      </Form>
                    </div>
                  )}

                  <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                    <Checkbox 
                      checked={allowShare} 
                      onChange={(e) => setAllowShare(e.target.checked)}
                    >
                      允许该账号在企业内共享复用 (其他协作协作者可免密关联)
                    </Checkbox>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <Checkbox 
                      checked={isNewAccountActive} 
                      onChange={(e) => setIsNewAccountActive(e.target.checked)}
                    >
                      绑定后立即启用该账号作为同步账号
                    </Checkbox>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}