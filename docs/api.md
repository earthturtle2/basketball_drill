# API 草图（REST，v0）

**Base URL（生产）**：`https://basketball.itorange.online/api/v1`  
**约定**：`Content-Type: application/json`；时间一律 **ISO 8601** UTC 字符串；错误体 `{ "code": "STRING", "message": "人类可读" }`。

---

## 鉴权

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/auth/register` | 教练/管理员注册（若开放自注册；也可关闭，仅后台创建） |
| `POST` | `/auth/login` | 返回 `accessToken`、`refreshToken`、`expiresIn` |
| `POST` | `/auth/refresh` | body: `{ "refreshToken" }` |
| `POST` | `/auth/logout` | 作废 refresh（可选） |

**请求头**：`Authorization: Bearer <accessToken>`（除标为「公开」的端点）。

**角色**（`role`）：`coach` | `org_admin` | `viewer`（仅链接打开时可无登录，用 share token）

---

## 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | `200` + `{ "status": "ok" }`（负载均衡/探活） |

---

## 战术（Tactic / Play）

战术正文为 **JSON 文档**（与 `examples/tactic-play.v1.json` 结构一致，存库存为 JSON 文本）。

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/plays` | 查询列表。Query：`page`, `pageSize`, `q`（名称模糊）, `tag` |
| `POST` | `/plays` | 创建。body：见下方「创建/更新 body」 |
| `GET` | `/plays/{playId}` | 详情（含完整 `document`） |
| `PATCH` | `/plays/{playId}` | 部分更新元数据或 `document`（若支持字段级，可拆 `metadata` / `document`） |
| `DELETE` | `/plays/{playId}` | 软删或硬删（产品策略定） |
| `POST` | `/plays/{playId}/duplicate` | 复制为新战术 |

**创建/更新 body（建议）**：

```json
{
  "name": "高位挡拆-示例",
  "description": "5号提上，1号借掩护突破",
  "tags": ["pick_and_roll", "U12"],
  "document": { }
}
```

其中 `document` 为 **战术 JSON v1 根对象**（与示例文件同结构）；服务端应校验 `document.schemaVersion` 与内嵌规则（球员数量、时间轴范围等）。

---

## 分享（学员只读）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/plays/{playId}/shares` | 创建分享。body 可选：`{ "expiresAt": "...", "password": "可选" }`；返回 `shareId`, `token`, `viewUrl` |
| `GET` | `/shares/{token}` | **公开**（可不带 Bearer）。返回战术元数据 + `document`（或仅元数据，由策略定） |
| `DELETE` | `/shares/{shareId}` | 教练撤销 |

`viewUrl` 示例：`https://basketball.itorange.online/view/{token}`

---

## 用户与机构（可第二阶段）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/me` | 当前用户 profile + `role` |
| `GET/POST` | `/orgs` … | 机构、成员、班级：按需再拆资源 |

---

## 分页与列表响应

**列表**统一：

```json
{
  "items": [ { "id": "uuid", "name": "...", "updatedAt": "..." } ],
  "page": 1,
  "pageSize": 20,
  "total": 100
}
```

---

## 版本与兼容

- URL 路径带 `/api/v1`，**战术 JSON 自带 `schemaVersion: 1`**。日后 v2 战术可在服务端做读时迁移或双读。

---

## 与 Nginx / 同机多站

- 静态站：`/` → `root` 指向前端 build 目录。
- 接口：`/api` → 反代到 Node 监听端口（如 `127.0.0.1:3002`）。  
- 与 `english.*`、`stock.*` 为 **不同 `server_name` 块**，互不影响；证书可用同一泛域或单域证书。
