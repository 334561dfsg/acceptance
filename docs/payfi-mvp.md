# PayFi 开户与美元结算 MVP

## 流程

当前客户账户 → 申请创建商户 → KYC 资料及材料 → 通道审核 → 提交银行收款人 → 银行审核 → USDT 收款增加余额 → USDT 换 USD 询价/确认 → 订单详情。

不是提交 KYC 后就可以直接交易：银行资料创建要求通道 AVAILABLE，兑换确认要求 APPROVED 收款人、AVAILABLE/STABLE 通道及足额正常余额。

## 功能和接口对应

| 动作         | 文档 API                                  | 实现                                                                                                                 |
| ------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 开户         | POST /api/v1/merchants                    | 当前演示邮箱关联普通商户，创建后 ACTIVE / UNAVAILABLE，保存稳定 merchant_sn                                          |
| 上传 KYC     | POST /api/v1/merchants/kyc/files          | 本地文件选择和元数据、大小/扩展名检查；模拟 file_no，未上传真实内容                                                  |
| 提交 KYC     | POST /api/v1/merchants/kyc                | HK_ENTERPRISE，完整 company_info、legal_attachments、ubo_attachments，日期映射 yyyyMMdd，sync_to_psp=true            |
| KYC 进度     | GET /api/v1/merchants/detail              | UNDER_REVIEW；演示审核通过到 AVAILABLE，退回到 UNAVAILABLE 并保留资料                                                |
| 银行模板     | GET /api/v1/payees/templates              | 本地六种 USD 对公场景：香港 SWIFT/RTGS、美国 SWIFT，各含 SELF/THIRD_PARTY；接入时必须实时获取模板                    |
| 银行材料     | POST /api/v1/files                        | PDF/JPG/JPEG/PNG，最多10MB；本地选择未真实上传                                                                       |
| 提交银行     | POST /api/v1/payees                       | payee_type=SELF/THIRD_PARTY，holder_type=COMPANY，payment_method=BANK_ACCOUNT，按场景选择 routing_type；结果 PENDING |
| 银行驳回更新 | POST /api/v1/payees/update                | 仅 DECLINED、通道 AVAILABLE；payee_no + 全量银行/收款人资料 + 材料；恢复 PENDING                                     |
| 银行进度     | GET /api/v1/payees/detail、/list          | 演示审核 APPROVED / DECLINED；不是客户真实审批权限                                                                   |
| U 收款       | POST /api/v1/payments；GET /detail、/list | 创建收款、模拟正常足额到账，重复完成不重复入账                                                                       |
| 关闭收款     | POST /api/v1/payments/close               | PENDING/PARTIAL → TERMINATED                                                                                         |
| 余额         | GET /api/v1/accounts/balance              | 正常可用与冻结单列，不创造平台 USD 余额                                                                              |
| 费用         | POST /api/v1/fees/query                   | 固定0.5%演示总费用，非真实收费标准                                                                                   |
| 兑换询价     | POST /api/v1/settlements/query-rate       | USDT→USD，保存申请 SN、收款人快照、5分钟到期时间、扣费后参与换汇金额                                                 |
| 确认/取消    | POST /api/v1/settlements/confirm          | CONFIRM / CANCEL；SELF→WITHDRAW、THIRD_PARTY→PAYOUT；重新校验通道、账户、余额及到期时间                              |
| 交易订单     | GET /api/v1/settlements/list、/detail     | 金额、费用、汇率、银行快照、用途、申请编号、预计/实际到账、创建/完成时间                                             |

`payfi-contract.ts` 是接口路径及请求映射，`onboarding.ts` 中 kycPayload 及 banks.ts 的 accountPayload 保存实际字段结构。目前仍是前端 mock，无 HTTP transport。

## KYC 范围与校验

本期仅香港企业和护照身份材料，不声称覆盖全部开户场景。

- 企业：类型、注册号、中英文名称、注册/执照日期、三项股权性质布尔、行业（文档单选枚举）、官网、注册/运营地址。
- 法人及 1–10 位受益人：中英文姓名、护照号码、出生/签发/失效日期、居住地址及 PP 附件。
- 企业材料：BR/CI/NNC1/NAR/BAP；外资企业额外 SSC；无官网额外 BUSINESS_DOCUMENT；退回可补 extra_document。
- KYC 文件严格小于10MB；银行证明不超过10MB。不同材料扩展名按字典限制。
- 本地基础校验不替代服务端完整正则、国家/州字典、文件内容匹配与文件归属验证。
- API v1.2.2 优先：首次/补件 UNAVAILABLE 只能 sync=true；AVAILABLE 更新只能 false。当前不提供审核通过后编辑；UNDER_REVIEW 不可修改。

## 演示边界

美元换 U 功能已删除。不增加文档不存在的美元入金或买币接口。

模拟审核和到账按钮仅用于演示，正式环境必须移除，由服务端通知、验签和订单查询驱动。API 秘钥与 HMAC、Ed25519 验签不得放在浏览器。

资金采用 BigInt 固定八位精度，业务申请限制两位小数，结算值向下截断。报价不扣款，确认冻结，完成核销冻结。真实结算必须读取实际返回费率和金额，不能沿用客户端定价。

MVP 暂不覆盖文档未列出的银行场景、已通过资料编辑、退款/异常资金、部分到账处理、正式认证、持久化及失败补偿。刷新清空演示资料；请使用测试数据。

## 多账户与付款

企业账户与银行账户独立展示。多个银行分别维护编号和审核状态，仅 APPROVED 可供 USD 付款选择。非删除账户禁止相同账号与相同 payee_type 重复添加。驳回后可修改资料重新审核；有待确认或处理中付款的账户不可删除，其余可模拟 DELETING → DELETED。付款保存所选银行快照，按收款关系确定提现或第三方付款。USDT 充值单与 USD 付款单分开记录，平台不增加 USD 余额。
