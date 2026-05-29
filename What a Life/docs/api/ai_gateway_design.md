# AI Gateway 设计说明

## 1. 目标

- 屏蔽底层模型厂商差异，保持前端接口稳定。
- 把 NPC 人设、业务上下文、安全策略在服务端统一处理。
- 在 key 失效、超时、上游异常时提供可用降级路径。

## 2. 组件设计

## 2.1 AIGateway

- 输入：标准化 `ChatNpcRequest`。
- 输出：标准化 `ChatNpcResponse`。
- 责任：
  - Provider 选择（当前默认 OpenAI 兼容）
  - 请求编排与重试
  - 返回 token/耗时元数据

## 2.2 PromptRegistry

- 双源策略：
  - 文件源：`prompts/npc_descriptions.md`（默认基线）
  - 数据库源：`prompt_templates`（在线覆写）
- 优先级：`db_override > file > hardcoded fallback`
- 能力：
  - 按 `role_code + version` 取生效提示词
  - 审计版本变化（谁在何时更新了提示词）

## 2.3 ChatOrchestrator

- 组装系统提示词：
  - NPC 角色定义
  - 用户画像（考研时间、预算护栏）
  - 当前状态（职业、任务完成率、惩罚状态）
- 对消息窗口裁剪（例如保留最近 12~20 条）防止 token 爆炸。

## 2.4 FallbackResponder

- 触发场景：
  - Provider 超时
  - 5xx 错误
  - 响应结构异常
- 行为：
  - 返回规则模板回复（带 `fallbackUsed=true`）
  - 指导用户稍后重试

## 3. 错误码策略

- `AI_KEY_MISSING`：未提供 key
- `AI_KEY_INVALID`：key 无效或过期
- `AI_PROVIDER_TIMEOUT`：上游超时
- `AI_PROVIDER_UNAVAILABLE`：上游不可用
- `AI_EMPTY_RESPONSE`：模型空响应
- `AI_INPUT_INVALID`：参数不合法

## 4. 安全策略

- API Key 不落盘，不写日志明文。
- 日志中仅保留 key 指纹（例如后四位 + 哈希）。
- 输入限制：
  - 单条消息最大长度
  - 会话消息条数上限
  - 请求频率限制（本地 MVP 可先轻量）
- 输出安全：
  - 基础内容审查（避免明显高风险指令）
  - 系统提示词不回传前端

## 5. 可观测性

- 指标：
  - 请求成功率
  - 平均/95 分位延迟
  - fallback 触发率
  - 单轮 token 消耗
- 结构化日志字段：
  - `requestId`, `role`, `provider`, `model`, `latencyMs`, `statusCode`, `fallbackUsed`

## 6. 演进建议

- Phase 1：单 Provider（OpenAI 兼容）+ 本地 key 直传。
- Phase 2：引入 `apiKeyRef`（本地加密存储或云端密钥托管）。
- Phase 3：多 Provider 路由（成本优先/质量优先/故障切换）。
