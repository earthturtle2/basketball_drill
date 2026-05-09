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
| `GET` | `/plays` | 查询列表。Query：`page`, `pageSize`, `q`（名称模糊）, `tag`, `category`, `teamId`；`items` 中每条含 `category` 与 `libraryScope`（`hidden`、`partial` 或 `all_coaches`） |
| `POST` | `/plays` | 创建。body：见下方「创建/更新 body」 |
| `GET` | `/plays/{playId}` | 详情（含完整 `document` 与 `libraryScope`） |
| `PATCH` | `/plays/{playId}` | 部分更新元数据或 `document`（若支持字段级，可拆 `metadata` / `document`） |
| `DELETE` | `/plays/{playId}` | 软删或硬删（产品策略定） |
| `POST` | `/plays/{playId}/duplicate` | 复制为新战术 |
| `GET` | `/plays/library` | **全员模版库**（分页、搜索与 `/plays` 同 query）。只返回 `libraryScope=all_coaches` 且未删除的战术；条目含 `author` |
| `GET` | `/plays/library/{playId}` | 从模版库取详情（自己战术始终可读；他人战术需未隐藏）。响应含 `isOwner`, `author`, 以及与普通详情相同的 `document` 等 |
| `POST` | `/plays/library/{playId}/duplicate` | 复制为当前用户的新战术。他人战术须仍在模版库中；自己战术等效于从「我的」复制 |
| `GET` | `/tactic-categories` | 当前教练的全局战术类别列表（包含已保存的自定义类别、战术与比赛准备中使用过的类别） |
| `POST` | `/tactic-categories` | 手动加入全局战术类别。body: `{ "name": "半场进攻" }` |

新建战术的 **`libraryScope` 默认 `hidden`**：仅作者在「我的战术」中可见；发布到全员「战术模版库」必须显式改为 `all_coaches`，`partial` 由作者在编辑页选择具体账号。

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/admin/plays` | 管理员：列出未删战术、作者与当前 `libraryScope`（`page`, `pageSize`, `q`, `libraryScope=all_coaches\|hidden\|any`） |
| `PATCH` | `/admin/plays/{playId}/library` | body: `{ "libraryScope": "all_coaches" \| "hidden" }` |

**创建/更新 body（建议）**：

```json
{
  "name": "高位挡拆-示例",
  "description": "5号提上，1号借掩护突破",
  "category": "半场进攻",
  "tags": ["pick_and_roll", "U12"],
  "document": { }
}
```

其中 `category` 为战术类别；传入新类别时服务端会自动加入该教练的全局类别列表，后续比赛准备可直接复用。`document` 为 **战术 JSON v1/v2 根对象**；服务端应校验 `document.schemaVersion` 与内嵌规则（球员数量、时间轴范围等）。为保持兼容，旧数据缺少 `category` 或 `document.meta.category` 时仍可读取。

---

## 分享（学员只读）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/plays/{playId}/shares` | 创建长期有效分享。body 可为空；`token` 使用「战术名称-6位随机数」格式，返回 `shareId`, `token`, `viewUrl`，`expiresAt` 固定为 `null` |
| `GET` | `/shares/{token}` | **公开**（可不带 Bearer）。返回战术元数据 + `document`（或仅元数据，由策略定） |
| `DELETE` | `/shares/{shareId}` | 教练撤销 |

`viewUrl` 示例：`https://basketball.itorange.online/view/高位挡拆-123456`

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

- URL 路径带 `/api/v1`；**战术 JSON 支持 `schemaVersion: 1 | 2`**。v2 在 `events` 上增加教学语义字段，v1 旧文档继续双读。

---

## 与 Nginx / 同机多站

- 静态站：`/` → `root` 指向前端 build 目录。
- 接口：`/api` → 反代到 Node 监听端口（如 `127.0.0.1:3002`）。  
- 与 `english.*`、`stock.*` 为 **不同 `server_name` 块**，互不影响；证书可用同一泛域或单域证书。
