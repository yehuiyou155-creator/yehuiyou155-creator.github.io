
"use strict";
/* ============================================================================
 * 宿舍减脂记录工具 v2
 * 数据层：单 key(df_data) + schemaVersion + migrate()
 * 无任何外部请求 / CDN / 字体 / 脚本
 * ========================================================================== */

/* ---------------------- 常量 ---------------------- */
var KEY = "df_data", SCHEMA = 3;
var CATS = ["蛋白","主食","蔬菜","调味","水果"];
var UNITS = [
  {id:"g",     label:"克"},
  {id:"ml",    label:"毫升"},
  {id:"bag",   label:"袋 / 包"},
  {id:"pcs",   label:"个 / 根 / 只"},
  {id:"cup",   label:"杯"},
  {id:"slice", label:"片"},
  {id:"scoop", label:"勺"}
];
var UNIT_NAME = {g:"克", ml:"毫升", bag:"袋", pcs:"个", cup:"杯", slice:"片", scoop:"勺"};
var COUNT_UNITS = ["bag","pcs","cup","slice","scoop"]; // 论个/论袋：+1 有意义
var MASS_UNITS  = ["g","ml"];                          // 论克：改用 +50g / +100g
var ACT = {sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very:1.9};
var ACT_LABEL = {sedentary:"久坐（几乎不动）", light:"轻度活动（每周 1–3 次）", moderate:"中度活动（每周 3–5 次）", active:"高强度（每周 6–7 次）", very:"极高强度（体力活 / 双练）"};
var MEALS = [["breakfast","早餐"],["lunch","午餐"],["dinner","晚餐"],["snack","加餐"]];
var MEALS3 = [["breakfast","早餐"],["lunch","午餐"],["dinner","晚餐"]];
var MEAL_NAME = {breakfast:"早餐", lunch:"午餐", dinner:"晚餐", snack:"加餐"};

/* ============ 每餐智能搭配：档位常量（只进表不进算法） ============ */
var GOAL_ORDER = ["fatloss", "maintain", "gain"];
var GOAL_LABEL = { fatloss:"减脂", maintain:"维持", gain:"增肌" };
var LEVEL_HINTS = {
  1:"基本不练，纯日常活动",
  2:"每周 1–2 次轻强度",
  3:"每周 3–4 次中强度",
  4:"每周 5–6 次高强度",
  5:"力量训练为主，每周 5 次+"
};
/* deficit: 减脂档缺口模板 kcal/日（仍被 1000/25%/BMR 三闸钳）；
   surplus: 增肌档盈余；protein: 蛋白系数 g/kg 模板（实际仍受 35%热量闸/200g 夹，UI 显示实际值） */
var PLAN_TPL = {
  fatloss:  { deficit:[100, 130, 160, 190, 220], protein:[1.6, 1.7, 1.8, 1.9, 2.0] },
  maintain: { deficit:0, protein:1.4 },
  gain:     { surplus:150, protein:2.0 }
};
/* 宏量角色（角色纯度三约束 §3.2a）：蛋白类=prot 只担蛋白达成；
   主食=carb 只担碳水/热量；蔬菜水果调味=fill 点缀。次要营养在最终核算照常计入。 */
function roleOf(f){
  if (f.cat === "蛋白") return "prot";
  if (f.cat === "主食") return "carb";
  return "fill";
}

/* 预设 16 种食材（§4.4）：每 100g 热/蛋/碳/脂 + 默认单位 + 单位重量 */
var BUILTIN = [
  {id:"f01", name:"即食鸡胸肉",     cat:"蛋白", kcal:120, p:24,  c:2,   f:1.5, unit:"bag",   per:100, unitLabel:"袋"},
  {id:"f02", name:"去皮鸡腿（即食）", cat:"蛋白", kcal:145, p:22,  c:0,   f:6,   unit:"bag",   per:100, unitLabel:"袋"},
  {id:"f03", name:"去皮鸭腿（即食）", cat:"蛋白", kcal:160, p:20,  c:0,   f:9,   unit:"bag",   per:110, unitLabel:"袋"},
  {id:"f04", name:"水煮蛋",         cat:"蛋白", kcal:155, p:13,  c:1.1, f:11,  unit:"pcs",   per:50,  unitLabel:"个"},
  {id:"f05", name:"荞麦面（熟）",    cat:"主食", kcal:110, p:4,   c:23,  f:0.6, unit:"g",     per:1,   unitLabel:"克"},
  {id:"f06", name:"魔芋荞麦面（熟）", cat:"主食", kcal:25,  p:1,   c:5,   f:0.2, unit:"bag",   per:200, unitLabel:"袋"},
  {id:"f07", name:"黄瓜",           cat:"蔬菜", kcal:16,  p:0.8, c:3,   f:0.1, unit:"pcs",   per:200, unitLabel:"根"},
  {id:"f08", name:"西红柿",         cat:"蔬菜", kcal:18,  p:0.9, c:3.9, f:0.2, unit:"pcs",   per:180, unitLabel:"个"},
  {id:"f09", name:"彩椒",           cat:"蔬菜", kcal:26,  p:1,   c:6,   f:0.3, unit:"pcs",   per:150, unitLabel:"个"},
  {id:"f10", name:"胡萝卜",         cat:"蔬菜", kcal:41,  p:0.9, c:10,  f:0.2, unit:"pcs",   per:120, unitLabel:"根"},
  {id:"f11", name:"圆白菜",         cat:"蔬菜", kcal:24,  p:1.3, c:4.6, f:0.2, unit:"g",     per:1,   unitLabel:"克"},
  {id:"f12", name:"油醋汁",         cat:"调味", kcal:250, p:0.5, c:4,   f:27,  unit:"scoop", per:10,  unitLabel:"勺"},
  {id:"f13", name:"苹果",           cat:"水果", kcal:52,  p:0.3, c:14,  f:0.2, unit:"pcs",   per:200, unitLabel:"个"},
  {id:"f14", name:"香蕉",           cat:"水果", kcal:89,  p:1.1, c:23,  f:0.3, unit:"pcs",   per:110, unitLabel:"根"},
  {id:"f15", name:"橙子",           cat:"水果", kcal:47,  p:0.9, c:12,  f:0.1, unit:"pcs",   per:150, unitLabel:"个"},
  {id:"f16", name:"葡萄",           cat:"水果", kcal:69,  p:0.7, c:18,  f:0.2, unit:"g",     per:1,   unitLabel:"克"}
];

/* ---------------------- 小工具 ---------------------- */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function num(v, d){ var n = parseFloat(v); return isFinite(n) ? n : (d === undefined ? 0 : d); }
function r0(n){ return Math.round(n); }
function r1(n){ return Math.round(n * 10) / 10; }
function pad2(n){ return String(n).padStart(2, "0"); }
function todayKey(){ var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function fmtDate(ds){ var p = ds.split("-"); return p[1] + "-" + p[2]; }
function weekdayOf(ds){ var d = new Date(ds + "T00:00:00"); return "周" + "日一二三四五六".charAt(d.getDay()); }
function shiftDate(ds, n){ var d = new Date(ds + "T00:00:00"); d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function uid(){ return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function toast(msg){ var t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(function(){ t.classList.remove("show"); }, 1600); }

/* ============================================================================
 * 一、数据层
 * ========================================================================== */
var DB = null;
var STORAGE_OK = true;

function defaultDB(){
  return {
    schemaVersion: SCHEMA,
    profile: { gender:"male", age:20, height:null, weight:null, activity:"light", deficit:500,
               goal:"fatloss", level:3, surplus:0,
               split:{ breakfast:30, lunch:40, dinner:30 } },
    foods: BUILTIN.map(function(f){ return Object.assign({}, f, {builtin:true}); }),
    overrides: {},
    logs: {},
    /* workouts/equipPref：训练模块 v3 预留（与搭配共用同一次版本升级，谁先落地谁补字段） */
    workouts: {},
    equipPref: { level:"fresh", goal:"fatloss", owned:{}, barWeight:20 },
    flags: { backupPrompted:false, disclaimerSeen:false, thinOverride:false, trainDisclaimerSeen:false }
  };
}

function safeGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }

/* migrate：绝不靠改 key 名做版本；v1 三键合并 + 缺字段补齐 */
function migrate(){
  var raw = safeGet(KEY), d = null;
  if (raw) { try { d = JSON.parse(raw); } catch(e){ d = null; } }

  var fromV1 = false;
  if (!d || typeof d !== "object") {
    var p1 = safeGet("df_profile_v1");
    var f1 = safeGet("df_foods_v1");
    var c1 = safeGet("df_custom_v1");
    var l1 = safeGet("df_logs_v1");
    if (p1 || f1 || c1 || l1) {
      fromV1 = true;
      d = { schemaVersion:1, profile:null, foods:null, overrides:{}, logs:{}, flags:{} };
      try { if (p1) d.profile = JSON.parse(p1); } catch(e){}
      try { if (l1) d.logs = JSON.parse(l1) || {}; } catch(e){}
      var arr = [];
      try { if (f1) arr = arr.concat(JSON.parse(f1) || []); } catch(e){}
      try { if (c1) arr = arr.concat(JSON.parse(c1) || []); } catch(e){}
      d.foods = arr;
    }
  }

  if (!d || typeof d !== "object") { DB = defaultDB(); DB.flags.migratedFrom = fromV1; save(); return; }

  var base = defaultDB();

  /* 1) profile */
  var p = d.profile && typeof d.profile === "object" ? d.profile : {};
  base.profile = {
    gender: p.gender === "female" ? "female" : "male",
    age: num(p.age, 20) || 20,
    height: (p.height === "" || p.height == null || !isFinite(num(p.height, NaN))) ? null : num(p.height),
    weight: (p.weight === "" || p.weight == null || !isFinite(num(p.weight, NaN))) ? null : num(p.weight),
    activity: ACT[p.activity] ? p.activity : "light",
    deficit: isFinite(num(p.deficit, 500)) ? Math.max(0, num(p.deficit, 500)) : 500,
    goal: (p.goal === "maintain" || p.goal === "gain") ? p.goal : "fatloss",
    level: (p.level >= 1 && p.level <= 5) ? Math.round(num(p.level, 3)) : 3,
    surplus: isFinite(num(p.surplus, 0)) ? Math.max(0, num(p.surplus, 0)) : 0,
    split: { breakfast:30, lunch:40, dinner:30 }
  };
  if (p.split && typeof p.split === "object") {
    base.profile.split.breakfast = clamp(num(p.split.breakfast, 30), 0, 100);
    base.profile.split.lunch     = clamp(num(p.split.lunch, 40), 0, 100);
    base.profile.split.dinner    = clamp(num(p.split.dinner, 30), 0, 100);
  }

  /* 2) foods：内置恒在；v1 里被改过数值的内置食材 → 落成 overrides；其余作自定义 */
  var custom = [], seen = {}, ov = (d.overrides && typeof d.overrides === "object" && !Array.isArray(d.overrides)) ? d.overrides : {};
  var oldList = Array.isArray(d.foods) ? d.foods : [];
  var builtById = {}; BUILTIN.forEach(function(b){ builtById[b.id] = b; });
  var builtByName = {}; BUILTIN.forEach(function(b){ builtByName[b.name] = b; });
  oldList.forEach(function(f){
    if (!f || typeof f !== "object" || !f.name) return;
    var hit = builtById[f.id] || builtByName[f.name];
    if (hit) {
      var diff = {};
      ["kcal","p","c","f"].forEach(function(k){
        if (f[k] != null && isFinite(num(f[k], NaN)) && num(f[k]) !== hit[k]) diff[k] = num(f[k]);
      });
      if (Object.keys(diff).length) ov[hit.id] = Object.assign({}, ov[hit.id] || {}, diff);
      return;
    }
    if (seen[f.name]) return; seen[f.name] = 1;
    custom.push({
      id: f.id || uid(), name: String(f.name), cat: CATS.indexOf(f.cat) >= 0 ? f.cat : "蛋白",
      kcal: num(f.kcal, 0), p: num(f.p, 0), c: num(f.c, 0), f: num(f.f, 0),
      unit: UNITS.some(function(u){ return u.id === f.unit; }) ? f.unit : "g",
      per: num(f.per, 1) > 0 ? num(f.per, 1) : (f.unit && f.unit !== "g" && f.unit !== "ml" ? 100 : 1),
      unitLabel: f.unitLabel || UNIT_NAME[f.unit] || "克",
      builtin: false
    });
  });
  base.foods = BUILTIN.map(function(b){ return Object.assign({}, b, {builtin:true}); }).concat(custom);
  base.overrides = ov;

  /* 3) logs：meals 必须是对象且含 snack；item 补齐 unit/unitLabel/manual */
  var logs = (d.logs && typeof d.logs === "object" && !Array.isArray(d.logs)) ? d.logs : {};
  Object.keys(logs).forEach(function(k){
    var L = logs[k]; if (!L || typeof L !== "object") return;
    var meals = (L.meals && typeof L.meals === "object" && !Array.isArray(L.meals)) ? L.meals : {};
    var out = { breakfast:[], lunch:[], dinner:[], snack:[] };
    MEALS.forEach(function(m){
      var arr = Array.isArray(meals[m[0]]) ? meals[m[0]] : [];
      out[m[0]] = arr.map(function(it){ return normItem(it); }).filter(Boolean);
    });
    base.logs[k] = {
      weight: (L.weight == null || !isFinite(num(L.weight, NaN))) ? null : r1(num(L.weight)),
      meals: out
    };
  });

  /* 4) flags */
  var fl = (d.flags && typeof d.flags === "object") ? d.flags : {};
  base.flags = {
    backupPrompted: !!fl.backupPrompted,
    disclaimerSeen: !!fl.disclaimerSeen,
    thinOverride: !!fl.thinOverride,
    trainDisclaimerSeen: !!fl.trainDisclaimerSeen
  };
  base.schemaVersion = SCHEMA;
  base.flags.migratedFrom = fromV1 || (num(d.schemaVersion, 0) < SCHEMA);
  DB = base;
  save();
}

function normItem(it){
  if (!it || typeof it !== "object") return null;
  var o = {
    fid: it.fid || null,
    name: String(it.name || "未命名"),
    qty: num(it.qty, it.grams != null ? num(it.grams, 0) : 1),
    unit: UNITS.some(function(u){ return u.id === it.unit; }) ? it.unit : "g",
    unitLabel: it.unitLabel || UNIT_NAME[it.unit] || "克",
    grams: (it.grams == null || !isFinite(num(it.grams, NaN))) ? null : num(it.grams),
    kcal: num(it.kcal, 0), p: num(it.p, 0), c: num(it.c, 0), f: num(it.f, 0),
    manual: !!it.manual
  };
  if (o.manual) o.grams = null;
  return o;
}

/* save：try/catch + 持久横幅（非 alert） */
function save(){
  try {
    localStorage.setItem(KEY, JSON.stringify(DB));
    if (!STORAGE_OK) { STORAGE_OK = true; hideBanner(); }
    return true;
  } catch(e){
    STORAGE_OK = false;
    showBanner("⚠ 数据未能保存到本机，请立即导出备份");
    return false;
  }
}
function showBanner(text){ $("bannerText").textContent = text; $("banner").classList.add("show"); }
function hideBanner(){ $("banner").classList.remove("show"); }

/* 唯一正确的取值方式：逐字段 merge，用 ?? 不用 || */
function eff(food){
  var o = DB.overrides[food.id] != null ? DB.overrides[food.id] : {};
  return Object.assign({}, food, o);
}
function findFood(id){ for (var i = 0; i < DB.foods.length; i++) if (DB.foods[i].id === id) return DB.foods[i]; return null; }
function unitLabelOf(f){ return f.unitLabel || UNIT_NAME[f.unit] || "克"; }
/* 单份的重量：论克取 100g 作为一份；其余取单位重量 */
function servingGrams(f){ return (f.unit === "g" || f.unit === "ml") ? 100 : (num(f.per, 0) > 0 ? num(f.per, 0) : 100); }

/* 只读：不落盘，渲染用；写操作一律走 ensureDay */
function getDay(ds){
  var L = DB.logs[ds];
  var out = { weight:null, meals:{} };
  MEALS.forEach(function(m){ out.meals[m[0]] = []; });
  if (!L || typeof L !== "object") return out;
  if (L.weight != null && isFinite(num(L.weight, NaN))) out.weight = r1(num(L.weight));
  var meals = (L.meals && typeof L.meals === "object" && !Array.isArray(L.meals)) ? L.meals : {};
  MEALS.forEach(function(m){ if (Array.isArray(meals[m[0]])) out.meals[m[0]] = meals[m[0]]; });
  return out;
}
/* 可写：返回真实引用，push 后需 save() */
function ensureDay(ds){
  if (!DB.logs[ds] || typeof DB.logs[ds] !== "object") DB.logs[ds] = { weight:null, meals:{} };
  var L = DB.logs[ds];
  if (!L.meals || typeof L.meals !== "object" || Array.isArray(L.meals)) L.meals = {};
  MEALS.forEach(function(m){ if (!Array.isArray(L.meals[m[0]])) L.meals[m[0]] = []; });
  if (L.weight != null && !isFinite(num(L.weight, NaN))) L.weight = null;
  return L;
}
function dayHasContent(ds){
  var L = DB.logs[ds]; if (!L || typeof L !== "object") return false;
  if (L.weight != null && isFinite(num(L.weight, NaN))) return true;
  var meals = L.meals || {};
  return MEALS.some(function(m){ return Array.isArray(meals[m[0]]) && meals[m[0]].length; });
}
function logDayCount(){ return Object.keys(DB.logs).filter(dayHasContent).length; }
function dayCalories(ds){
  var L = DB.logs[ds]; if (!L || !L.meals) return 0;
  var t = 0; MEALS.forEach(function(m){ (L.meals[m[0]] || []).forEach(function(it){ t += it.kcal; }); });
  return Math.round(t);
}
function dayMacros(ds){
  var L = DB.logs[ds], t = { kcal:0, p:0, c:0, f:0 };
  if (!L || !L.meals) return t;
  MEALS.forEach(function(m){ (L.meals[m[0]] || []).forEach(function(it){
    t.kcal += it.kcal; t.p += it.p; t.c += it.c; t.f += it.f; }); });
  t.kcal = Math.round(t.kcal); t.p = r1(t.p); t.c = r1(t.c); t.f = r1(t.f);
  return t;
}
function hasAnyLog(){ return Object.keys(DB.logs).some(dayHasContent); }
/* 条目数量文案：论克直接给克重，论个给「1 袋 · 110g」 */
function amountText(it){
  if (it.manual) return "手动估算";
  if (it.unit === "g" || it.unit === "ml") return Math.round(num(it.grams, 0)) + " g";
  return r1(it.qty) + " " + it.unitLabel + " · " + Math.round(num(it.grams, 0)) + "g";
}

/* ============================================================================
 * 二、算法（§2，照抄不发挥）
 * ========================================================================== */
function calcBMR(p){
  var b = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === "male" ? b + 5 : b - 161;
}
function bmiLevel(b){
  if (b < 18.5) return { key:"thin",    label:"偏瘦" };
  if (b < 24)   return { key:"normal",  label:"正常" };
  if (b < 28)   return { key:"over",    label:"超重" };
  return { key:"obese", label:"肥胖" };
}
function compute(){
  var p = DB.profile;
  if (!(p.height > 0) || !(p.weight > 0)) return null;

  var bmrRaw  = calcBMR(p);
  var bmr     = Math.round(bmrRaw);
  var tdeeRaw = bmrRaw * (ACT[p.activity] || 1.2);
  var bmi     = p.weight / Math.pow(p.height / 100, 2);
  var lvl     = bmiLevel(bmi);
  var thinBlock = (lvl.key === "thin") && !DB.flags.thinOverride;

  /* 目标方向（档位）：增肌=盈余并入热量口径+高蛋白；维持=缺口0；减脂=用户缺口/档位模板。
     减脂与维持 surplus=0 → 行为与旧版完全一致（向后兼容）。盈余是"主动多吃"，非运动消耗补贴。 */
  var isGain = (p.goal === "gain") && !thinBlock;
  var surplus = isGain ? Math.max(0, num(p.surplus, 0)) : 0;
  var effTdeeRaw = tdeeRaw + surplus;
  var tdee    = Math.round(effTdeeRaw);

  var userDeficit = Math.max(0, num(p.deficit, 0));
  var want = thinBlock ? 0 : userDeficit;
  var cap1000 = 1000, cap25 = effTdeeRaw * 0.25;
  var deficit = Math.min(want, cap1000, cap25);

  var warns = [];
  if (thinBlock && userDeficit > 0) {
    warns.push({ type:"warn", text:"当前 BMI " + r1(bmi) + " 属偏瘦范围，建议维持而非继续减脂" });
  }
  var hitBmr = (effTdeeRaw - deficit) < bmrRaw;
  var base = Math.max(effTdeeRaw - deficit, bmrRaw);
  var targetCal = Math.round(base / 10) * 10;

  /* 钳位提示按触发原因三选一：触底 > 1000 上限 > 25% 闸（三个都真实生效，只是文案取最要紧的一条） */
  if (hitBmr) {
    warns.push({ type:"warn", text:"已触底：目标不低于基础代谢 " + bmr + " kcal。如需更大缺口，请先提高活动量" });
  } else if (want > cap1000 && cap1000 <= cap25) {
    warns.push({ type:"warn", text:"缺口已限制为 1000 kcal（单日安全上限）" });
  } else if (want > cap25) {
    warns.push({ type:"warn", text:"缺口已限制为 " + Math.round(cap25) + " kcal（不超过每日消耗的 25%）" });
  }

  /* 宏量：以未取整的 base 计算，保证与目标热量配平
     蛋白系数按档位：增肌 2.0 / 维持 1.4 / 减脂按强度 1.6–2.0；老数据无档位字段→1.8（零回归）。
     系数只是模板上限，仍受 35% 热量闸与 200g 硬上限夹，UI 永远展示实际值。 */
  var pf;
  if (isGain) pf = 2.0;
  else if (p.goal === "maintain") pf = 1.4;
  else if (p.goal === "fatloss" && p.level >= 1 && p.level <= 5) pf = PLAN_TPL.fatloss.protein[Math.round(p.level) - 1];
  else pf = 1.8;
  var protein = Math.min(pf * p.weight, base * 0.35 / 4, 200);
  protein = Math.round(protein);
  var fat = clamp(base * 0.25 / 9, 0.5 * p.weight, base * 0.35 / 9);
  fat = Math.round(fat);
  var carb = (base - 4 * protein - 9 * fat) / 4;
  var macroWarn = null;
  if (carb < 50) {
    fat = Math.max(0.5 * p.weight, (base - 4 * protein - 200) / 9);
    fat = Math.round(fat);
    carb = (base - 4 * protein - 9 * fat) / 4;
    if (carb < 50) {
      protein = Math.min(protein, Math.round(1.6 * p.weight));
      carb = (base - 4 * protein - 9 * fat) / 4;
      if (carb < 50) {
        carb = Math.max(0, carb);
        macroWarn = "⚠ 当前目标无法同时满足蛋白与脂肪下限，已优先保证蛋白。建议提高目标热量。";
      }
    }
  }
  carb = Math.round(carb);
  if (macroWarn) warns.push({ type:"warn", text:macroWarn });

  /* 三餐拆分：锁定晚餐 = 100 − 早 − 午；加餐不参与 */
  var sb = clamp(num(p.split.breakfast, 30), 0, 100);
  var sl = clamp(num(p.split.lunch, 40), 0, 100);
  var sd = 100 - sb - sl;
  var splitWarn = null;
  if (sb + sl >= 95) splitWarn = "早餐+午餐已占 " + Math.round(sb + sl) + "%，晚餐至少留 5%";

  return {
    bmr: bmr, tdee: tdee, bmi: r1(bmi), bmiLabel: lvl.label, thinBlock: thinBlock,
    goal: p.goal || "fatloss", level: p.level || 3, isGain: isGain, pFactor: pf,
    deficitWanted: userDeficit, deficit: Math.round(effTdeeRaw - base),
    targetCal: targetCal, protein: protein, fat: fat, carb: carb,
    split: { breakfast: sb, lunch: sl, dinner: sd }, splitWarn: splitWarn, warns: warns,
    mealTarget: {
      breakfast: Math.round(targetCal * sb / 100),
      lunch: Math.round(targetCal * sl / 100),
      dinner: Math.round(targetCal * Math.max(0, sd) / 100),
      snack: null
    },
    mealMacro: {
      breakfast: { p: Math.round(protein * sb / 100), c: Math.round(carb * sb / 100), f: Math.round(fat * sb / 100) },
      lunch:     { p: Math.round(protein * sl / 100), c: Math.round(carb * sl / 100), f: Math.round(fat * sl / 100) },
      dinner:    { p: Math.round(protein * Math.max(0, sd) / 100), c: Math.round(carb * Math.max(0, sd) / 100), f: Math.round(fat * Math.max(0, sd) / 100) }
    }
  };
}

/* ============================================================================
 * 三、状态与导航
 * ========================================================================== */
var state = {
  tab: "today",
  date: todayKey(),
  logMonths: 2,
  sheet: null,
  foodQ: "", foodCat: "全部",
  calcWarn: null,
  /* 训练页：筛选态 + 卡内交互态（本批为界面预览，不入库、不落盘） */
  trainScene: "全部", trainMuscle: "全部", trainLv: "全部",
  trainSelAct: {}, trainUI: {}, trainTut: {},
  trainSafety: false, trainWarm: false, trainRef: false, planSel: null
};

function setTab(t){
  state.tab = t;
  ["today","train","calc","foods","logs"].forEach(function(k){
    var el = $("view-" + k); if (el) el.classList.toggle("active", k === t);
  });
  Array.prototype.forEach.call($("tabbar").children, function(b){ b.setAttribute("aria-current", b.dataset.tab === t ? "true" : "false"); });
  $("pageTitle").textContent = { today:"今日", train:"训练", calc:"计算", foods:"食材库", logs:"记录" }[t];
  $("pageSub").textContent = {
    today: "记一笔就好，不用记准",
    train: "按器材学动作，记重量和组数",
    calc:  "填完身高体重才有目标",
    foods: "数据取自你自己的库",
    logs:  "看趋势，不看单日"
  }[t];
  if (t === "today") renderToday();
  if (t === "train") { renderTrain(); if (!DB.flags.trainDisclaimerSeen) openModal(trainIntroHTML()); }
  if (t === "calc")  renderCalc();
  if (t === "foods") renderFoods();
  if (t === "logs")  renderLogs();
  window.scrollTo(0, 0);
}

/* ============================================================================
