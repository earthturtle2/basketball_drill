# 战术 JSON v1 字段说明

与 `examples/tactic-play.v1.json` 一致；坐标 **`rules.coordinateSystem: "normalized"`** 时为球场矩形内 **0–1** 归一化（左下角为 (0,0) 或按 `court.orientation` 约定在渲染层统一）。

| 段 | 说明 |
|----|------|
| `schemaVersion` | 固定为 `1`，与 API 中版本迁移策略配合。 |
| `meta` | 名称、说明、标签、场地预设、总时长 `durationMs`（与最后一帧/事件上限一致即可）。 |
| `teams` | 进攻/防守配色与 id，供 UI 用。 |
| `actors` | `player` 含 `team`、`number`；`ball` 可 `heldBy` 某一 `player` id。 |
| `keyframes` | `t` 为相对起点毫秒；`poses` 为 actor id → `x, y, facingDeg`（度，渲染用）。 |
| `events` | 如 `pass`：在 `t` 打教学点；不强制改插值，播放层可做特效。 |
| `interpolation` | 关键帧间插值策略提示（前端实现）。 |
| `rules` | 归一化边界、坐标系说明。 |

**扩展**：可增加 `actors` 人数、`events.kind` 枚举（`screen`, `cut` 等），保持向后兼容时只增字段、不改 `schemaVersion` 或升到 `2`。
