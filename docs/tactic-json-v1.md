# 战术 JSON v1 字段说明

与 `examples/tactic-play.v1.json` 一致；坐标 **`rules.coordinateSystem: "normalized"`** 时为球场矩形内 **0–1** 归一化（左下角为 (0,0) 或按 `court.orientation` 约定在渲染层统一）。

| 段 | 说明 |
|----|------|
| `schemaVersion` | 固定为 `1`，与 API 中版本迁移策略配合。 |
| `meta` | 名称、说明、战术类别 `category`、标签、场地预设、总时长 `durationMs`（与最后一帧/事件上限一致即可）。 |
| `teams` | 进攻/防守配色与 id，供 UI 用。 |
| `actors` | `player` 含 `team`、`number`，可选 `rosterPlayerId` 关联球队名单；`ball` 可 `heldBy` 某一 `player` id。 |
| `keyframes` | `t` 为相对起点毫秒；`poses` 为 actor id → `x, y, facingDeg`（度，渲染用）。 |
| `events` | 如 `pass`：在 `t` 打教学点；不强制改插值，播放层可做特效。`finish_options` 可在终结时标注投篮点和多个传球选择。 |
| `interpolation` | 关键帧间插值策略提示（前端实现）。 |
| `rules` | 归一化边界、坐标系说明。 |

**兼容**：`meta.category` 为可选字段；旧战术没有该字段时仍按 v1 解析，应用层可显示为“未分类”或在保存时补齐。

**扩展**：可增加 `actors` 人数、`events.kind` 枚举（`screen`, `cut` 等），保持向后兼容时只增字段、不改 `schemaVersion` 或升到 `2`。

## `finish_options` 事件

用于在战术播放/编辑画面中显示“终结选择”标注。事件本身不改变球权，只作为教学可视化。

```json
{
  "t": 7600,
  "kind": "finish_options",
  "from": "o1",
  "note": "Primary read is the rim; counters are outlet passes if help commits.",
  "options": [
    { "kind": "shot", "label": "Rim", "x": 0.95, "y": 0.5, "priority": "primary" },
    { "kind": "pass", "label": "Corner 2", "to": "o2", "priority": "counter" },
    { "kind": "pass", "label": "Nail 4", "to": "o4", "priority": "counter" }
  ]
}
```

- `from`：做终结阅读的持球人。
- `options[].kind`：`shot` 表示投篮/上篮点；`pass` 表示传球点。
- `shot` 选项用 `x/y` 标注球场位置；`pass` 选项优先用 `to` 指向接应球员，也可用 `x/y` 标注空位点。
- `label` 会直接显示在球场上；`priority` 目前用于主选/备选的视觉强调。
