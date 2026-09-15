# 客户订单列表字段

依据 PayFi API Reference v1.2.2 第6.3和9.5节。界面隐藏接口字段名，以下供接入时映射。

菜单：账户概览、收款账户、充值订单、付款订单、账户信息。付款申请由付款订单页或概览进入。

| 充值列表 | API字段 |
|---|---|
| 充值单号 / 商户订单号 | payment_order_no / order_sn |
| 充值金额 | amount + coin |
| 商户应收 | merchant_receivable_amount + coin |
| 正常到账 / 异常到账 | normal_amount / trouble_amount |
| 网络、状态、创建时间 | network / status / created_time |

商户应收为创建时确定的扣费后金额，不代表链上到账。异常到账不参与完成判定。详情另展示费用总额、完成/关闭时间。真实接口有平台费与合作方费，当前模型保留总费，接入时应保留两项明细，不人为拆分。

| 付款列表 | API字段 |
|---|---|
| 付款单号 / 申请编号 | settlement_order_no / settlement_sn |
| 支付金额 | sell_amount + sell_coin（USDT） |
| 预计到账 | receive_amount + receive_coin（USD） |
| 实际到账 | actual_receive_amount + actual_receive_coin |
| 状态、创建时间 | status / created_time |

实际到账未返回时显示破折号。详情另展示参与兑换金额actual_sell_amount、手续费、汇率exchange_rate、银行快照、用途和completed_time。支持PENDING、PROCESSING、COMPLETED、CANCEL、TERMINATED，不使用FAILED。

当前搜索为本地订单号/SN匹配，状态筛选为本地过滤。真实API仅提供SN精确筛选（须带merchant_no），接入时不得假设支持订单号模糊搜索。分页、时间范围参数及服务端字段适配属于接口接入工作。
