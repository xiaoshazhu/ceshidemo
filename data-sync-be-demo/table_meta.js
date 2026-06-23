/**
 * 功能描述：获取飞书多维表格连接器的数据字段元信息，供配置界面映射及飞书引擎导入时使用。
 * @param {string} module - 同步模块标识
 * @return {object} 返回飞书多维表格定义的数据表 schema
 */
const getTableMeta = (module) => {
  switch (module) {
    case 'account_center':
    case 'deposit_account':
    case 'doudian_goods_payment':
    case 'bill_management':
    case 'commission_refund':
    case 'invoice_management':
    case 'historical_report':
      return {
        tableName: "资金板块-余额明细流水表",
        fields: [
          {
            fieldId: "col_flow_id",
            fieldName: "动账流水号",
            fieldType: 1, // Text
            isPrimary: true,
            description: "动账流水号"
          },
          {
            fieldId: "col_order_id",
            fieldName: "关联订单号",
            fieldType: 1, // Text
            isPrimary: false,
            description: "关联订单号"
          },
          {
            fieldId: "col_sub_order_id",
            fieldName: "关联子订单号",
            fieldType: 1, // Text
            isPrimary: false,
            description: "关联子订单号"
          },
          {
            fieldId: "col_check_time_v3",
            fieldName: "动账时间",
            fieldType: 5, // DateTime
            isPrimary: false,
            property: {
              formatter: "yyyy-MM-dd HH:mm"
            },
            description: "资金明细的动账时间"
          },
          {
            fieldId: "col_biz_scene",
            fieldName: "动账场景",
            fieldType: 1, // Text
            isPrimary: false,
            description: "动账场景类型"
          },
          {
            fieldId: "col_trade_amount",
            fieldName: "动账详情（元）",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "交易明细动账金额（元）"
          },
          {
            fieldId: "col_current_balance",
            fieldName: "账户余额（元）",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "动账交易后的可用账户余额（元）"
          },
          {
            fieldId: "col_frozen_amount",
            fieldName: "冻结总额（元）",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "动账交易时的冻结总额（元）"
          },
          {
            fieldId: "col_remark",
            fieldName: "动账备注",
            fieldType: 1, // Text
            isPrimary: false,
            description: "动账流水备注说明"
          }
        ]
      };
    case 'dy_balance':
      return {
        tableName: "资金对账-抖店余额与待结算表",
        fields: [
          {
            fieldId: "col_date",
            fieldName: "账单日期",
            fieldType: 5, // DateTime
            isPrimary: true,
            property: {
              formatter: "yyyy-MM-dd"
            },
            description: "账单对账日期"
          },
          {
            fieldId: "col_balance",
            fieldName: "可用余额",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "抖店商户可用资金余额"
          },
          {
            fieldId: "col_pending",
            fieldName: "待结算金额",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "抖店待结算冻结资金"
          },
          {
            fieldId: "col_deposit",
            fieldName: "保证金余额",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "店铺类目缴存保证金余额"
          },
          {
            fieldId: "col_shop_name",
            fieldName: "店铺名称",
            fieldType: 1, // Text
            isPrimary: false,
            description: "商户显示店铺名称"
          },
          {
            fieldId: "col_shop_id",
            fieldName: "店铺 ID",
            fieldType: 1, // Text
            isPrimary: false,
            description: "商户店铺数字 ID"
          }
        ]
      };
    case 'compass_trade':
      return {
        tableName: "罗盘经营分析-成交概览表",
        fields: [
          {
            fieldId: "col_date",
            fieldName: "统计日期",
            fieldType: 5, // DateTime
            isPrimary: true,
            property: {
              formatter: "yyyy-MM-dd"
            },
            description: "罗盘经营分析统计日期"
          },
          {
            fieldId: "col_gmv",
            fieldName: "成交金额 (GMV)",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "当天产生的支付 GMV 总金额"
          },
          {
            fieldId: "col_order_cnt",
            fieldName: "成交订单数",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            },
            description: "当天支付成功的订单总量"
          },
          {
            fieldId: "col_refund_amt",
            fieldName: "退款金额",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "当天发起或同意的退款总额"
          },
          {
            fieldId: "col_shop_name",
            fieldName: "店铺名称",
            fieldType: 1, // Text
            isPrimary: false
          },
          {
            fieldId: "col_shop_id",
            fieldName: "店铺 ID",
            fieldType: 1, // Text
            isPrimary: false
          }
        ]
      };
    case 'compass_product':
      return {
        tableName: "罗盘商品分析-商品核心明细表",
        fields: [
          {
            fieldId: "col_product_id",
            fieldName: "商品 ID",
            fieldType: 1, // Text
            isPrimary: true,
            description: "抖音商品唯一数字 ID"
          },
          {
            fieldId: "col_product_name",
            fieldName: "商品名称",
            fieldType: 1, // Text
            isPrimary: false
          },
          {
            fieldId: "col_click_uv",
            fieldName: "商品点击量",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            },
            description: "当天商品详情页点击的独立访客数"
          },
          {
            fieldId: "col_pay_buyer_cnt",
            fieldName: "支付买家数",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            },
            description: "购买并成功支付的独立人数"
          },
          {
            fieldId: "col_pay_rate",
            fieldName: "商品转化率",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "0.00%"
            },
            description: "支付人数占点击人数的比率"
          },
          {
            fieldId: "col_shop_name",
            fieldName: "店铺名称",
            fieldType: 1, // Text
            isPrimary: false
          }
        ]
      };
    case 'qianchuan_material':
      return {
        tableName: "千川投放-素材分析报表",
        fields: [
          {
            fieldId: "col_material_id",
            fieldName: "素材 ID",
            fieldType: 1, // Text
            isPrimary: true,
            description: "千川投放视频/图片素材唯一 ID"
          },
          {
            fieldId: "col_material_name",
            fieldName: "素材名称",
            fieldType: 1, // Text
            isPrimary: false
          },
          {
            fieldId: "col_show_cnt",
            fieldName: "素材展现量",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            },
            description: "广告展现总次数"
          },
          {
            fieldId: "col_cost",
            fieldName: "素材消耗",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "素材投放消耗的广告本金"
          },
          {
            fieldId: "col_ctr",
            fieldName: "素材点击率",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "0.00%"
            },
            description: "展现转化为点击的比率"
          },
          {
            fieldId: "col_product_name",
            fieldName: "推广产品",
            fieldType: 1, // Text
            isPrimary: false
          }
        ]
      };
    case 'qianchuan_all':
      return {
        tableName: "千川投放-全域推广明细表",
        fields: [
          {
            fieldId: "col_plan_id",
            fieldName: "计划 ID",
            fieldType: 1, // Text
            isPrimary: true,
            description: "千川全域广告计划 ID"
          },
          {
            fieldId: "col_plan_name",
            fieldName: "计划名称",
            fieldType: 1, // Text
            isPrimary: false
          },
          {
            fieldId: "col_show_uv",
            fieldName: "展现数",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            }
          },
          {
            fieldId: "col_cost",
            fieldName: "消耗金额",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            }
          },
          {
            fieldId: "col_roi",
            fieldName: "ROI",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "0.00"
            },
            description: "投放投资回报率"
          },
          {
            fieldId: "col_pay_order_cnt",
            fieldName: "支付订单数",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            }
          }
        ]
      };
    case 'qianchuan_product':
      return {
        tableName: "千川投放-单品推广报表",
        fields: [
          {
            fieldId: "col_product_id",
            fieldName: "商品 ID",
            fieldType: 1, // Text
            isPrimary: true
          },
          {
            fieldId: "col_product_name",
            fieldName: "商品名称",
            fieldType: 1, // Text
            isPrimary: false
          },
          {
            fieldId: "col_stat_cost",
            fieldName: "千川成交金额",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            }
          },
          {
            fieldId: "col_roi",
            fieldName: "推广ROI",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "0.00"
            }
          },
          {
            fieldId: "col_click_cnt",
            fieldName: "点击次数",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            }
          },
          {
            fieldId: "col_pay_cnt",
            fieldName: "转化成交量",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0"
            }
          }
        ]
      };
    case 'order_report':
    default:
      return {
        tableName: "抖音小店订单同步表",
        fields: [
          {
            fieldId: "col_order_id",
            fieldName: "订单编号",
            fieldType: 1, // Text
            isPrimary: true,
            description: "抖音官方订单唯一主键 (order_id)"
          },
          {
            fieldId: "col_pay_amount",
            fieldName: "支付金额",
            fieldType: 2, // Number
            isPrimary: false,
            property: {
              formatter: "#,##0.00"
            },
            description: "订单实际支付金额"
          },
          {
            fieldId: "col_create_time_v2",
            fieldName: "下单时间",
            fieldType: 5, // DateTime
            isPrimary: false,
            property: {
              formatter: "yyyy-MM-dd HH:mm"
            },
            description: "订单创建的日期时间"
          },
          {
            fieldId: "col_order_status",
            fieldName: "订单状态",
            fieldType: 1, // Text
            isPrimary: false,
            description: "包含已支付、待发货、已完成、退款中等状态"
          },
          {
            fieldId: "col_shop_name",
            fieldName: "店铺名称",
            fieldType: 1, // Text
            isPrimary: false,
            description: "抖音小店店铺显示名称"
          },
          {
            fieldId: "col_shop_id",
            fieldName: "店铺 ID",
            fieldType: 1, // Text
            isPrimary: false,
            description: "抖音店铺唯一数字 ID"
          }
        ]
      };
  }
};

module.exports = { getTableMeta };
