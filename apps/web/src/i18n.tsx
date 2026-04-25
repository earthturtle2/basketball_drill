import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "zh" | "en";

const zh: Record<string, string> = {
  // App shell
  "app.brand": "篮球战术训练",
  "app.myPlays": "我的战术",
  "app.teams": "球队",
  "app.admin": "管理",
  "app.password": "改密码",
  "app.logout": "退出",
  "app.login": "登录",
  "app.register": "注册",
  "app.notFound": "未找到页面",

  // ErrorBoundary
  "error.title": "出了点问题",
  "error.backHome": "返回首页",

  // Login
  "login.title": "教练登录",
  "login.hint": "使用邮箱与密码。学员无需登录，通过教练分享的链接观战。",
  "login.email": "邮箱",
  "login.password": "密码",
  "login.submit": "登录",
  "login.goRegister": "去注册",
  "login.failed": "登录失败",

  // Password
  "password.title": "修改密码",
  "password.hint": "修改后，已有登录会话会失效，需要重新登录。",
  "password.current": "当前密码",
  "password.new": "新密码",
  "password.confirm": "确认新密码",
  "password.submit": "保存新密码",
  "password.saving": "保存中…",
  "password.changed": "密码已修改",
  "password.failed": "修改密码失败",
  "password.mismatch": "两次输入的新密码不一致",

  // Register
  "register.title": "注册教练账号",
  "register.hint": "密码至少 8 位。注册后可创建战术、生成分享链接给学员观看。",
  "register.email": "邮箱",
  "register.password": "密码",
  "register.inviteCode": "邀请码",
  "register.inviteCodePlaceholder": "首个管理员账号可留空",
  "register.submit": "注册并登录",
  "register.goLogin": "已有账号",
  "register.failed": "注册失败",

  // Admin
  "admin.title": "系统管理",
  "admin.hint": "生成注册邀请码，并查看当前系统整体状态。",
  "admin.forbidden": "需要管理员权限",
  "admin.loadFailed": "加载管理数据失败",
  "admin.createFailed": "生成邀请码失败",
  "admin.inviteTitle": "邀请码",
  "admin.inviteHint": "新教练注册时必须填写未使用的邀请码。",
  "admin.createInvite": "生成邀请码",
  "admin.creating": "生成中…",
  "admin.copy": "复制",
  "admin.users": "用户",
  "admin.admins": "管理员",
  "admin.teams": "球队",
  "admin.activePlays": "战术",
  "admin.deletedPlays": "已删战术",
  "admin.shares": "分享",
  "admin.sessions": "会话",
  "admin.invites": "邀请码使用",
  "admin.inviteList": "邀请码列表",
  "admin.noInvites": "暂无邀请码。",
  "admin.createdAt": "创建于",
  "admin.usedAt": "使用于",
  "admin.unused": "未使用",
  "admin.recentUsers": "最近用户",
  "admin.userList": "用户列表",
  "admin.newPassword": "新密码",
  "admin.resetPassword": "重置密码",
  "admin.resetting": "重置中…",
  "admin.passwordTooShort": "新密码至少 8 位",
  "admin.passwordResetDone": "密码已重置",
  "admin.passwordResetFailed": "重置密码失败",

  // Plays list
  "plays.title": "我的战术",
  "plays.hint": "打开一条战术进行可视化编辑、预览动画或生成分享链接。",
  "plays.create": "新建战术",
  "plays.defaultName": "新战术",
  "plays.allTeams": "全部球队",
  "plays.availableAllTeams": "全部球队可用",
  "plays.updatedAt": "更新于",
  "plays.open": "打开",
  "plays.empty": "暂无战术，点「新建战术」开始。",
  "plays.loadFailed": "加载失败",
  "plays.createFailed": "创建失败",

  // Play edit
  "edit.back": "← 我的战术",
  "edit.title": "编辑战术",
  "edit.save": "保存",
  "edit.undo": "撤销",
  "edit.redo": "重做",
  "edit.duplicate": "复制",
  "edit.share": "生成分享链接",
  "edit.delete": "删除",
  "edit.name": "名称",
  "edit.description": "说明",
  "edit.preview": "动画预览",
  "edit.pause": "暂停",
  "edit.play": "播放",
  "edit.prevFrame": "上一帧",
  "edit.nextFrame": "下一帧",
  "edit.jsonTitle": "JSON 编辑（高级）",
  "edit.applyJson": "应用 JSON",
  "edit.viewHint": "学员打开（只读）：",
  "edit.saveFailed": "保存失败",
  "edit.loadFailed": "加载失败",
  "edit.deleteFailed": "删除失败",
  "edit.duplicateFailed": "复制失败",
  "edit.shareFailed": "生成分享失败",
  "edit.confirmDelete": "确定删除该战术？",
  "edit.jsonInvalid": "JSON 无效",
  "edit.missingId": "缺少 id",
  "edit.frameByFrame": "逐帧",
  "edit.loop": "循环",
  "edit.speed": "倍速",
  "edit.copySuffix": "（副本）",
  "edit.statusSaved": "已保存",
  "edit.statusSaving": "保存中…",
  "edit.statusUnsaved": "未保存",
  "edit.team": "球队",
  "edit.noTeam": "不关联球队",
  "edit.rosterTeam": "绘制球员来源",
  "edit.defaultRoster": "默认 1-5 号",
  "edit.assignedTeams": "分配给球队",
  "edit.assignedAllTeamsHint": "未选择球队时，该战术默认所有球队可用。",
  "edit.assignedTeamsHint": "只在选中的球队筛选下显示。",

  // Teams
  "teams.title": "球队管理",
  "teams.hint": "创建球队并维护球员姓名和号码，画战术时可直接选择球员。",
  "teams.name": "球队名称",
  "teams.namePlaceholder": "输入名称",
  "teams.color": "颜色",
  "teams.players": "球员名单",
  "teams.playerName": "球员姓名",
  "teams.playerNamePlaceholder": "姓名",
  "teams.playerNumber": "号码",
  "teams.addPlayer": "添加球员",
  "teams.removePlayer": "移除",
  "teams.add": "添加",
  "teams.save": "保存",
  "teams.cancel": "取消",
  "teams.edit": "编辑",
  "teams.delete": "删除",
  "teams.empty": "暂无球队。",
  "teams.loadFailed": "加载失败",
  "teams.loginRequired": "请先登录后再管理球队。",
  "teams.createFailed": "创建失败",
  "teams.updateFailed": "更新失败",
  "teams.deleteFailed": "删除失败",
  "teams.confirmDelete": "删除该球队？关联的战术不会被删除。",

  // View (shared)
  "view.cantOpen": "无法打开",
  "view.networkError": "网络错误",
  "view.loading": "加载中…",
  "view.time": "时间",
  "view.pause": "暂停",
  "view.play": "播放",
  "view.speed": "倍速",
  "view.frameByFrame": "逐帧",

  // Editor bench
  "bench.court": "球场",
  "bench.half": "半场",
  "bench.full": "全场",
  "bench.players": "球员",
  "bench.addOffenseTitle": "点击后在球场上放置进攻球员",
  "bench.offense": "进攻",
  "bench.addDefenseTitle": "点击后在球场上放置防守球员",
  "bench.defense": "防守",
  "bench.tools": "工具",
  "bench.overall": "总体",
  "bench.playerActions": "球员动作",
  "bench.select": "选择",
  "bench.pass": "传球",
  "bench.screen": "挡拆",
  "bench.clearFrameAction": "清除动作",
  "bench.clearFrameActionTitle": "清除当前帧该球员的动作，恢复到上一帧状态",
  "bench.template": "模板",
  "bench.tipAddOffense": "点击球场放置进攻球员",
  "bench.tipAddDefense": "点击球场放置防守球员",
  "bench.tipPassFrom": "点击传球发起者",
  "bench.tipPassTo": "点击接球球员",
  "bench.tipScreen": "点击设置挡拆的球员",
  "bench.maxOffense": "进攻球员最多 5 人",
  "bench.maxDefense": "防守球员最多 5 人",
  "bench.playerProps": "球员属性",
  "bench.selectPlayerHint": "选择场上球员后，可在这里调整姓名、号码、持球和挡拆方向。",
  "bench.playerName": "姓名",
  "bench.playerNumber": "号码",
  "bench.holdBall": "🏀 持球",
  "bench.remove": "移除",
  "bench.screenAngle": "挡拆朝向",
  "bench.removeScreen": "移除挡拆",

  // Keyframe timeline
  "kf.dragHint": "拖动调整时间",
  "kf.addFrame": "+ 帧",
  "kf.removeFrame": "- 帧",
  "kf.addTitle": "添加关键帧（自动均匀分布在总时长上）",
  "kf.removeTitle": "删除当前关键帧（其余帧自动均匀重排）",
  "kf.duration": "时长",
  "kf.frame": "帧",

  // Template library
  "tpl.title": "选择模板",
  "tpl.close": "关闭",
  "tpl.hint": "选择一个模板将替换当前战术内容",

  // Template names & descriptions
  "tpl.highPnr.name": "高位挡拆",
  "tpl.highPnr.desc": "经典高位挡拆配合，5号球员为1号设置掩护后顺下接球",
  "tpl.fastBreak.name": "快攻 3v2",
  "tpl.fastBreak.desc": "三打二快攻推进，中路持球突破后分球两翼",
  "tpl.horns.name": "Horns 进攻体系",
  "tpl.horns.desc": "双高位站位，控卫传球后两侧掩护创造空间",
  "tpl.handoff.name": "手递手",
  "tpl.handoff.desc": "两人手递手配合，接球后攻击篮筐",
  "tpl.zone131.name": "1-3-1 联防",
  "tpl.zone131.desc": "1-3-1区域联防站位及轮转",

  // Team labels in templates
  "team.offense": "进攻",
  "team.defense": "防守",
};

const en: Record<string, string> = {
  // App shell
  "app.brand": "Basketball Drill",
  "app.myPlays": "My Plays",
  "app.teams": "Teams",
  "app.admin": "Admin",
  "app.password": "Password",
  "app.logout": "Logout",
  "app.login": "Login",
  "app.register": "Register",
  "app.notFound": "Page not found",

  // ErrorBoundary
  "error.title": "Something went wrong",
  "error.backHome": "Back to Home",

  // Login
  "login.title": "Coach Login",
  "login.hint": "Use email & password. Students don't need to log in — they watch via the shared link.",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Login",
  "login.goRegister": "Register",
  "login.failed": "Login failed",

  // Password
  "password.title": "Change Password",
  "password.hint": "Existing login sessions will be invalidated after the password changes.",
  "password.current": "Current Password",
  "password.new": "New Password",
  "password.confirm": "Confirm New Password",
  "password.submit": "Save New Password",
  "password.saving": "Saving…",
  "password.changed": "Password changed",
  "password.failed": "Failed to change password",
  "password.mismatch": "The new passwords do not match",

  // Register
  "register.title": "Register Coach Account",
  "register.hint": "Password must be at least 8 characters. After registering you can create plays and share them with students.",
  "register.email": "Email",
  "register.password": "Password",
  "register.inviteCode": "Invite Code",
  "register.inviteCodePlaceholder": "Optional for the first admin account",
  "register.submit": "Register & Login",
  "register.goLogin": "Already have an account",
  "register.failed": "Registration failed",

  // Admin
  "admin.title": "System Admin",
  "admin.hint": "Generate registration invite codes and monitor the whole system.",
  "admin.forbidden": "Admin permission required",
  "admin.loadFailed": "Failed to load admin data",
  "admin.createFailed": "Failed to generate invite code",
  "admin.inviteTitle": "Invite Codes",
  "admin.inviteHint": "New coaches must enter an unused invite code when registering.",
  "admin.createInvite": "Generate Invite",
  "admin.creating": "Generating…",
  "admin.copy": "Copy",
  "admin.users": "Users",
  "admin.admins": "Admins",
  "admin.teams": "Teams",
  "admin.activePlays": "Plays",
  "admin.deletedPlays": "Deleted Plays",
  "admin.shares": "Shares",
  "admin.sessions": "Sessions",
  "admin.invites": "Invite Usage",
  "admin.inviteList": "Invite Code List",
  "admin.noInvites": "No invite codes yet.",
  "admin.createdAt": "Created",
  "admin.usedAt": "Used",
  "admin.unused": "Unused",
  "admin.recentUsers": "Recent Users",
  "admin.userList": "User List",
  "admin.newPassword": "New password",
  "admin.resetPassword": "Reset Password",
  "admin.resetting": "Resetting…",
  "admin.passwordTooShort": "Password must be at least 8 characters",
  "admin.passwordResetDone": "password reset",
  "admin.passwordResetFailed": "Failed to reset password",

  // Plays list
  "plays.title": "My Plays",
  "plays.hint": "Open a play to visually edit, preview animations, or generate a share link.",
  "plays.create": "New Play",
  "plays.defaultName": "New Play",
  "plays.allTeams": "All Teams",
  "plays.availableAllTeams": "Available to all teams",
  "plays.updatedAt": "Updated",
  "plays.open": "Open",
  "plays.empty": "No plays yet. Click \"New Play\" to get started.",
  "plays.loadFailed": "Failed to load",
  "plays.createFailed": "Failed to create",

  // Play edit
  "edit.back": "← My Plays",
  "edit.title": "Edit Play",
  "edit.save": "Save",
  "edit.undo": "Undo",
  "edit.redo": "Redo",
  "edit.duplicate": "Duplicate",
  "edit.share": "Share Link",
  "edit.delete": "Delete",
  "edit.name": "Name",
  "edit.description": "Description",
  "edit.preview": "Animation Preview",
  "edit.pause": "Pause",
  "edit.play": "Play",
  "edit.prevFrame": "Prev Frame",
  "edit.nextFrame": "Next Frame",
  "edit.jsonTitle": "JSON Editor (Advanced)",
  "edit.applyJson": "Apply JSON",
  "edit.viewHint": "Student view (read-only):",
  "edit.saveFailed": "Failed to save",
  "edit.loadFailed": "Failed to load",
  "edit.deleteFailed": "Failed to delete",
  "edit.duplicateFailed": "Failed to duplicate",
  "edit.shareFailed": "Failed to generate share link",
  "edit.confirmDelete": "Are you sure you want to delete this play?",
  "edit.jsonInvalid": "Invalid JSON",
  "edit.missingId": "Missing id",
  "edit.frameByFrame": "Frame step",
  "edit.loop": "Loop",
  "edit.speed": "Speed",
  "edit.copySuffix": " (Copy)",
  "edit.statusSaved": "Saved",
  "edit.statusSaving": "Saving…",
  "edit.statusUnsaved": "Unsaved",
  "edit.team": "Team",
  "edit.noTeam": "No team",
  "edit.rosterTeam": "Roster Source",
  "edit.defaultRoster": "Default #1-#5",
  "edit.assignedTeams": "Assign to Teams",
  "edit.assignedAllTeamsHint": "With no teams selected, this play is available to all teams.",
  "edit.assignedTeamsHint": "This play appears under the selected team filters.",

  // Teams
  "teams.title": "Team Management",
  "teams.hint": "Create teams and maintain player names and numbers for tactic drawing.",
  "teams.name": "Team Name",
  "teams.namePlaceholder": "Enter name",
  "teams.color": "Color",
  "teams.players": "Roster",
  "teams.playerName": "Player Name",
  "teams.playerNamePlaceholder": "Name",
  "teams.playerNumber": "Number",
  "teams.addPlayer": "Add Player",
  "teams.removePlayer": "Remove",
  "teams.add": "Add",
  "teams.save": "Save",
  "teams.cancel": "Cancel",
  "teams.edit": "Edit",
  "teams.delete": "Delete",
  "teams.empty": "No teams yet.",
  "teams.loadFailed": "Failed to load",
  "teams.loginRequired": "Please log in before managing teams.",
  "teams.createFailed": "Failed to create",
  "teams.updateFailed": "Failed to update",
  "teams.deleteFailed": "Failed to delete",
  "teams.confirmDelete": "Delete this team? Associated plays will not be deleted.",

  // View (shared)
  "view.cantOpen": "Unable to open",
  "view.networkError": "Network error",
  "view.loading": "Loading…",
  "view.time": "Time",
  "view.pause": "Pause",
  "view.play": "Play",
  "view.speed": "Speed",
  "view.frameByFrame": "Frame step",

  // Editor bench
  "bench.court": "Court",
  "bench.half": "Half",
  "bench.full": "Full",
  "bench.players": "Players",
  "bench.addOffenseTitle": "Click then place an offensive player on the court",
  "bench.offense": "Offense",
  "bench.addDefenseTitle": "Click then place a defensive player on the court",
  "bench.defense": "Defense",
  "bench.tools": "Tools",
  "bench.overall": "General",
  "bench.playerActions": "Player Actions",
  "bench.select": "Select",
  "bench.pass": "Pass",
  "bench.screen": "Screen",
  "bench.clearFrameAction": "Clear Action",
  "bench.clearFrameActionTitle": "Clear this player's action in the current frame and restore the previous-frame state",
  "bench.template": "Template",
  "bench.tipAddOffense": "Click the court to place an offensive player",
  "bench.tipAddDefense": "Click the court to place a defensive player",
  "bench.tipPassFrom": "Click the passer",
  "bench.tipPassTo": "Click the receiver",
  "bench.tipScreen": "Click the screener",
  "bench.maxOffense": "Max 5 offensive players",
  "bench.maxDefense": "Max 5 defensive players",
  "bench.playerProps": "Player Properties",
  "bench.selectPlayerHint": "Select a player on the court to edit name, number, ball status, and screen direction.",
  "bench.playerName": "Name",
  "bench.playerNumber": "Number",
  "bench.holdBall": "🏀 Ball",
  "bench.remove": "Remove",
  "bench.screenAngle": "Screen Direction",
  "bench.removeScreen": "Remove Screen",

  // Keyframe timeline
  "kf.dragHint": "Drag to adjust time",
  "kf.addFrame": "+ Frame",
  "kf.removeFrame": "- Frame",
  "kf.addTitle": "Add keyframe (evenly spaced across duration)",
  "kf.removeTitle": "Delete keyframe (remaining frames re-spaced evenly)",
  "kf.duration": "Duration",
  "kf.frame": "Frame",

  // Template library
  "tpl.title": "Choose Template",
  "tpl.close": "Close",
  "tpl.hint": "Selecting a template will replace the current play",

  // Template names & descriptions
  "tpl.highPnr.name": "High Pick & Roll",
  "tpl.highPnr.desc": "Classic high PnR — #5 sets a screen for #1 then rolls to the basket",
  "tpl.fastBreak.name": "Fast Break 3v2",
  "tpl.fastBreak.desc": "Three-on-two fast break, middle lane drives then kicks out to the wings",
  "tpl.horns.name": "Horns Offense",
  "tpl.horns.desc": "Double-high formation, point guard passes then uses screens on both sides",
  "tpl.handoff.name": "Handoff",
  "tpl.handoff.desc": "Two-man handoff action, receiver attacks the rim",
  "tpl.zone131.name": "1-3-1 Zone",
  "tpl.zone131.desc": "1-3-1 zone defense positioning and rotations",

  // Team labels in templates
  "team.offense": "Offense",
  "team.defense": "Defense",
};

const dicts: Record<Lang, Record<string, string>> = { zh, en };

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("lang");
    return saved === "en" ? "en" : "zh";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback(
    (key: string) => dicts[lang][key] ?? key,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}

export { LangContext };

export function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      style={{ fontWeight: 600, minWidth: 44, letterSpacing: 0.02 }}
    >
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
