 * 八、添加食物弹层（含手动估算 / 弹层内新建）
 * ========================================================================== */
function openSheet(title, html){
  $("sheetTitle").textContent = title;
  $("sheetBody").innerHTML = html;
  $("sheet").classList.add("show");
  $("scrim").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeSheet(){
  $("sheet").classList.remove("show");
  $("scrim").classList.remove("show");
  $("sheet").style.transform = "";
  document.body.style.overflow = "";
  state.sheet = null;
}

function openAdd(date, meal){
  state.sheet = { type:"add", date:date, meal:meal, sel:null, unit:null, qty:null,
                  manual:false, newForm:false, cat:"全部", err:{} };
  openSheet("添加到" + MEAL_NAME[meal] + " · " + fmtDate(date), addSheetHTML());
}

function addSheetHTML(){
  var S = state.sheet, h = "";
  /* 顶部常驻「手动估算」 */
  if (!S.manual) {
    h += '<div class="notice info" style="margin-bottom:10px;">食堂那顿没包装？'
       + '<div class="mt6"><button type="button" class="btn ghost sm" data-act="manualToggle">手动估算（不用选食材）</button></div></div>';
  } else {
    h += '<div class="card"><h2>食堂（手动估）</h2>'
       + '<div class="row"><div style="flex:1;"><label class="fld">热量 kcal *</label>'
       + '<input type="number" inputmode="decimal" id="mKcal" placeholder="如 600"></div>'
       + '<div style="flex:1;"><label class="fld">蛋白 g</label>'
       + '<input type="number" inputmode="decimal" id="mP" placeholder="选填"></div></div>'
       + '<div class="row mt10"><div style="flex:1;"><label class="fld">碳水 g</label>'
       + '<input type="number" inputmode="decimal" id="mC" placeholder="选填"></div>'
       + '<div style="flex:1;"><label class="fld">脂肪 g</label>'
       + '<input type="number" inputmode="decimal" id="mF" placeholder="选填"></div></div>'
       + (S.err.kcal ? '<div class="err">' + esc(S.err.kcal) + '</div>' : '')
       + '<div class="row mt10"><button type="button" class="btn block" data-act="manualSave">加入' + MEAL_NAME[S.meal] + '</button>'
       + '<button type="button" class="btn ghost" data-act="manualToggle">返回</button></div>'
       + '<div class="f-cap mt6">估算的条目不参与克重折算，历史里会标「手动估算」。</div></div>';
    return h;
  }

  /* 选中食材 → 数量确认视图（弹窗内第二步；单位用胶囊 chips，不再弹系统选择框） */
  if (S.sel) {
    var f = S.sel, e = eff(f);
    var u = S.unit || f.unit || "g";
    var per = (u === "g" || u === "ml") ? 1 : (num(f.per, 0) > 0 ? num(f.per, 0) : 100);
    if (S.qty == null) S.qty = (u === "g" || u === "ml") ? 100 : 1;
    var unitTxt = (u === "g" || u === "ml") ? "按克记" : ("1 " + esc(unitLabelOf(f)) + " ≈ " + per + " g");
    h += '<button type="button" class="backlink" data-act="qtyBack">‹ 返回选食材</button>'
       + '<div class="card qtybox">'
       + '<div class="q-name">' + esc(f.name) + '</div>'
       + '<div class="q-sub">每 100g · ' + e.kcal + ' kcal · 蛋' + e.p + ' 碳' + e.c + ' 脂' + e.f + '</div>'
       + '<div class="q-lbl">单位</div>'
       + '<div class="chips">' + UNITS.map(function(x){
            return '<button type="button" class="chip" data-act="punit" data-v="' + x.id + '" aria-pressed="' + (x.id === u) + '">' + x.label + '</button>';
          }).join("") + '</div>'
       + '<div class="q-lbl">数量</div>'
       + '<div class="q-qtyrow"><input type="number" inputmode="decimal" step="0.5" id="qQty" value="' + S.qty + '">'
       + '<span class="q-ulabel">' + esc(unitLabelOf(f)) + '</span></div>'
       + '<div class="chips mt10">'
       + (COUNT_UNITS.indexOf(u) >= 0
           ? '<button type="button" class="chip" data-act="quick" data-q="1">+1 ' + esc(unitLabelOf(f)) + '</button>'
             + '<button type="button" class="chip" data-act="quick" data-q="2">+2 ' + esc(unitLabelOf(f)) + '</button>'
           : '<button type="button" class="chip" data-act="quick" data-q="50">+50g</button>'
             + '<button type="button" class="chip" data-act="quick" data-q="100">+100g</button>')
       + '</div>'
       + '<div class="f-cap mt6">' + unitTxt + '</div>'
       + (S.err.qty ? '<div class="err">' + esc(S.err.qty) + '</div>' : '')
       + '<button type="button" class="btn block mt10" data-act="confirmAdd">确认加入' + MEAL_NAME[S.meal] + '</button>'
       + '</div>';
    return h;
  }

  h += '<input type="text" id="pq" value="' + esc(state.foodQ) + '" placeholder="搜索食材">';
  h += '<div class="chips mt10">' + ["全部"].concat(CATS).map(function(c){
      return '<button type="button" class="chip" data-act="pcat" data-v="' + esc(c) + '" aria-pressed="' + (S.cat === c) + '">' + c + '</button>';
    }).join("") + '</div>';
  if (S.newForm) {
    h += '<div class="card mt10"><h2>新建食材并加入本餐</h2>'
       + '<label class="fld">名称</label><input type="text" id="nfName" placeholder="如 食堂红烧肉">'
       + '<div class="mt10"><label class="fld">分类</label><select id="nfCat">'
       + CATS.map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join("") + '</select></div>'
       + '<div class="row mt10"><div style="flex:1;"><label class="fld">热量 /100g</label><input type="number" inputmode="decimal" id="nfKcal"></div>'
       + '<div style="flex:1;"><label class="fld">蛋白 /100g</label><input type="number" inputmode="decimal" id="nfP"></div></div>'
       + '<div class="row mt10"><div style="flex:1;"><label class="fld">碳水 /100g</label><input type="number" inputmode="decimal" id="nfC"></div>'
       + '<div style="flex:1;"><label class="fld">脂肪 /100g</label><input type="number" inputmode="decimal" id="nfF"></div></div>'
       + '<div class="row mt10"><div style="flex:1;"><label class="fld">单位</label><select id="nfUnit">'
       + UNITS.map(function(u){ return '<option value="' + u.id + '"' + (u.id === "g" ? " selected" : "") + '>' + u.label + '</option>'; }).join("") + '</select></div>'
       + '<div style="flex:1;"><label class="fld">单位重量 (g)</label><input type="number" inputmode="decimal" id="nfPer" value="100"></div></div>'
       + '<div class="mt10"><label class="fld">单位叫法</label><input type="text" id="nfLabel" placeholder="如 袋 / 个 / 根"></div>'
       + (S.err.nf ? '<div class="err">' + esc(S.err.nf) + '</div>' : '')
       + '<div class="row mt10"><button type="button" class="btn block" data-act="newFoodSave">新建并加入本餐</button>'
       + '<button type="button" class="btn ghost" data-act="newFormToggle">取消</button></div></div>';
    return h;
  }

  h += '<div id="pickerList" class="mt10">' + pickerHTML() + '</div>';
  return h;
}

/* 本餐已加入的某食材累计数量（qty 累加：袋+袋=袋，g+g=g），给列表里打 ✓ 用 */
function addedInMeal(date, meal, fid){
  if (!date || !meal || !fid) return 0;
  var L = DB.logs[date]; if (!L || !L.meals) return 0;
  var arr = L.meals[meal] || [];
  var s = 0;
  arr.forEach(function(it){ if (it.fid === fid) s += num(it.qty, 0); });
  return s;
}

function pickerHTML(){
  var q = state.foodQ.trim(), h = "";
  var cat = state.sheet && state.sheet.cat ? state.sheet.cat : state.foodCat;
  var list = DB.foods.filter(function(f){
    if (cat !== "全部" && f.cat !== cat) return false;
    if (q && f.name.indexOf(q) < 0) return false;
    return true;
  });
  if (!list.length) {
    return '<div class="empty">没找到「' + esc(q || "该分类") + '」。可以手动估算，或新建为自定义食材</div>'
      + '<button type="button" class="btn block" data-act="newFormToggle">+ 新建食材并加入本餐</button>';
  }
  var Sd = state.sheet;
  list.forEach(function(f){
    var e = eff(f), on = Sd && Sd.sel && Sd.sel.id === f.id;
    var unitTxt = (f.unit === "g" || f.unit === "ml") ? "论克记" : ("1 " + esc(unitLabelOf(f)) + " ≈ " + num(f.per, 100) + " g");
    var added = Sd ? addedInMeal(Sd.date, Sd.meal, f.id) : 0;
    var addedLine = added > 0
      ? '<div class="f-cap" style="color:var(--ok);margin-top:2px;">✓ 本餐已加 ' + Math.round(added * 10) / 10 + ' ' + esc(unitLabelOf(f)) + '</div>'
      : '';
    h += '<div class="pickrow" data-act="pick" data-id="' + f.id + '" aria-pressed="' + (!!on) + '">'
       + '<div style="flex:1;min-width:0;"><div class="pn">' + esc(f.name) + '</div>'
       + '<div class="pd">每 100g ' + e.kcal + ' kcal · 蛋' + e.p + ' 碳' + e.c + ' 脂' + e.f + ' · ' + unitTxt + '</div>'
       + addedLine
       + '</div>'
       + '<span style="color:var(--sage);font-weight:700;">选</span></div>';
  });
  return h;
}

/* 生成条目快照 */
function makeItem(food, qty, unit, unitLabel){
  var e = eff(food);
  var per = (unit === "g" || unit === "ml") ? 1 : (num(food.per, 0) > 0 ? num(food.per, 0) : 100);
  var grams = qty * per;
  return {
    fid: food.id, name: food.name, qty: qty, unit: unit, unitLabel: unitLabel || unitLabelOf(food),
    grams: grams,
    kcal: Math.round(grams * e.kcal / 100),
    p: r1(grams * e.p / 100), c: r1(grams * e.c / 100), f: r1(grams * e.f / 100),
    manual: false
  };
}

function pushItem(date, meal, item){
  var L = ensureDay(date);
  L.meals[meal].push(item);
  save();
}
function pushItems(date, meal, items){
  var L = ensureDay(date);
  items.forEach(function(it){ L.meals[meal].push(it); });
  save();
}

/* ============================================================================
 * 十二、每餐智能搭配（档位 → 三餐菜单）
 * 角色纯度三约束（计划书 §3.2a）：
 *  ① 蛋白目标达成只统计"蛋白"角色（prot）的贡献——绝不用荞麦面这类碳水去补蛋白缺口；
 *  ② 最终核算 = 全部条目营养实际合计（碳水/蔬果自带的蛋白照常计入总蛋白并如实展示）；
 *  ③ 同类不堆叠：同餐同类 ≤2 种、同种食物不重复选两个不同份量；凑不出走差量诊断，不硬凑。
 * ========================================================================== */
function applyPlanGoal(goal, level){
  var p = DB.profile;
  p.goal = goal; p.level = level;
  if (goal === "maintain") { p.deficit = 0; p.surplus = 0; }
  else if (goal === "gain") { p.deficit = 0; p.surplus = PLAN_TPL.gain.surplus; }
  else { p.deficit = PLAN_TPL.fatloss.deficit[level - 1]; p.surplus = 0; }
  save();
}
function planSummary(g, lv){
  if (g === "gain")    return "增肌：每日盈余约 " + PLAN_TPL.gain.surplus + " kcal，蛋白按 2.0 g/kg（受安全闸限制，取实际值）";
  if (g === "maintain") return "维持：热量吃到消耗持平，蛋白按 1.4 g/kg";
  return "减脂·强度" + lv + "：缺口约 " + PLAN_TPL.fatloss.deficit[lv - 1] + " kcal/日，蛋白约 " + PLAN_TPL.fatloss.protein[lv - 1] + " g/kg";
}
function isMassUnit(f){ return f.unit === "g" || f.unit === "ml"; }
function qtyOptsOf(f){ return isMassUnit(f) ? [50, 100, 150, 200, 250, 300] : [1, 2, 3]; }

/* 每餐生成一组方案（opts ≤3，主蛋白/主食来源互不相同） */
function planOneMeal(target, pTarget){
  var pool = DB.foods.slice();
  var prots = [], carbs = [], fills = [];
  pool.forEach(function(f){
    var e = eff(f), r = roleOf(f);
    if (e.kcal <= 0) return;
    if (r === "prot") prots.push(f);
    else if (r === "carb") carbs.push(f);
    else fills.push(f);
  });
  var out = { target: target, pTarget: pTarget, opts: [], empty: false, msg: "" };
  if (!prots.length) { out.empty = true; out.msg = "蛋白类食材是空的——先加即食鸡胸、水煮蛋这类，才能配餐"; return out; }
  if (!carbs.length) { out.empty = true; out.msg = "主食类食材是空的——建议加荞麦面、即食玉米这类填碳水的"; return out; }

  function mk(f, q){ return makeItem(f, q, f.unit || "g", unitLabelOf(f)); }
  function run(padFrac, minPad){
    var pad = Math.max(Math.round(target * padFrac), minPad);
    var lo = target - pad, hi = target + pad;
    var best = [], seen = {};

    function add(items){
      var kcal = 0, pAll = 0, pProt = 0, keyP = null, keyC = null;
      items.forEach(function(it){
        kcal += it.kcal; pAll += it.p;
        var f = findFood(it.fid), r = f ? roleOf(f) : "fill";
        if (r === "prot") { pProt += it.p; if (keyP == null) keyP = it.fid; }
        else if (r === "carb" && keyC == null) keyC = it.fid;
      });
      kcal = Math.round(kcal); pAll = r1(pAll); pProt = r1(pProt);
      if (kcal > hi) return;
      var diff = kcal - target;
      var inBand = kcal >= lo && kcal <= hi;
      var score;
      if (inBand) score = Math.abs(diff);
      else if (kcal < lo) score = (lo - kcal) * 3 + 1;
      else score = (kcal - hi) * 3 + 2;
      if (pProt < pTarget * 0.85) score += 300;          /* 蛋白未达标：宁可判分差，也不加碳水硬凑（§3.2a-1） */
      if (keyP == null) score += 600;                     /* 缺蛋白主料 */
      if (keyC == null) score += 200;                     /* 缺碳水主料 → 结构不完整，垫底 */
      var key = (keyP || "p") + "|" + (keyC || "c");
      if (seen[key] !== undefined && seen[key] <= score) return;
      seen[key] = score;
      best.push({ items: items, kcal: kcal, pAll: pAll, pProt: pProt,
                  diff: diff, inBand: inBand, score: score, key: key });
    }

    /* 蛋白主：单种 1–3 份；双种（异种各 1–2 份）——同类不堆叠，种数≤2 */
    var protCombos = [];
    prots.forEach(function(f){
      qtyOptsOf(f).forEach(function(q){
        var it = mk(f, q);
        protCombos.push({ items: [it] });
      });
    });
    prots.forEach(function(f, i){
      prots.slice(i + 1).forEach(function(g){
        qtyOptsOf(f).forEach(function(qf){
          qtyOptsOf(g).forEach(function(qg){
            var itf = mk(f, qf), itg = mk(g, qg);
            if (itf.kcal + itg.kcal > hi + 150) return;
            protCombos.push({ items: [itf, itg] });
          });
        });
      });
    });

    /* 碳水主：单种一份或多份；双种（异种）——同一食物不重复两份量 */
    var carbCombos = [[]];
    carbs.forEach(function(f){
      qtyOptsOf(f).forEach(function(q){
        var it = mk(f, q);
        carbCombos.push([it]);
      });
    });
    carbs.forEach(function(f, i){
      carbs.slice(i + 1).forEach(function(g){
        var qs1 = isMassUnit(f) ? [50, 100, 150, 200] : [1, 2];
        var qs2 = isMassUnit(g) ? [50, 100, 150, 200] : [1, 2];
        qs1.forEach(function(q1){ qs2.forEach(function(q2){
          carbCombos.push([mk(f, q1), mk(g, q2)]);
        }); });
      });
    });

    protCombos.forEach(function(pc){
      carbCombos.forEach(function(cc){
        add(pc.items.concat(cc.items));
      });
    });

    /* 够接近还不够（kcal 低于下界）：补一样蔬果点缀（小份，单项） */
    var lowOnes = best.slice();
    lowOnes.sort(function(a, b){ return a.score - b.score; });
    lowOnes.slice(0, 25).forEach(function(b){
      if (b.kcal >= lo) return;
      fills.forEach(function(f){
        var used = {}; b.items.forEach(function(it){ used[it.fid] = 1; });
        if (used[f.id]) return;
        var qq = isMassUnit(f) ? [50, 100] : [1];
        qq.forEach(function(q){
          add(b.items.concat(mk(f, q)));
        });
      });
    });

    best.sort(function(a, b){ return a.score - b.score; });
    var hasBand = best.some(function(b){ return b.inBand; });
    var top = [], dup = {};
    best.forEach(function(b){
      if (top.length >= 6) return;
      if (dup[b.key]) return;
      dup[b.key] = 1; top.push(b);
    });
    return { top: top, hasBand: hasBand, lo: lo, hi: hi };
  }

  /* 先按 ±12%（≥50kcal）试；无达标方案再放宽 ±20% */
  var r1 = run(0.12, 50);
  if (!r1.hasBand) {
    var r2 = run(0.20, 80);
    if (r2.hasBand) { out.opts = r2.top.slice(0, 3); out.msg = "库内组合有限，已放宽到 ±20%，仍接近目标"; return out; }
    out.opts = r1.top.slice(0, 3);
    if (out.opts.length) {
      var bestOne = out.opts[0];
      if (bestOne.diff > 0) out.msg = "库内配出的最接近组合超出目标约 " + bestOne.diff + " kcal";
      else out.msg = "库内配出的最接近组合差 " + (-bestOne.diff) + " kcal 才到目标——去食材库补点主食/蛋白会更灵活";
    } else {
      out.empty = true;
      out.msg = "库内暂时配不出这一餐——去食材库加些常见主食/蛋白/蔬果再试";
    }
    return out;
  }
  out.opts = r1.top.slice(0, 3);
  return out;
}

function buildPlans(){
  var c = compute(); if (!c) return null;
  var plans = {};
  MEALS3.forEach(function(m){
    plans[m[0]] = planOneMeal(c.mealTarget[m[0]], c.mealMacro[m[0]].p);
  });
  return plans;
}

/* ============ planner bottom sheet ============ */
function openPlanner(){
  if (!compute()) { toast("先填好身高体重"); setTab("calc"); return; }
  state.sheet = { type:"planner", date: state.date || todayKey(),
                  goal: DB.profile.goal || "fatloss", level: DB.profile.level || 3,
                  opt:{ breakfast:0, lunch:0, dinner:0 }, plans: buildPlans() };
  openSheet("按档位配三餐", plannerSheetHTML());
}

function plannerSheetHTML(){
  var S = state.sheet, c = compute(), h = "";
  if (!c) return '<div class="empty">先填好身高体重才能配餐</div>';
  var g = S.goal, lv = S.level;
  h += '<div class="card">'
     + '<div class="row-between"><span class="f-number">' + GOAL_LABEL[g] + ' · 强度' + lv + '</span>'
     + '<span class="f-cap">每日目标 ' + c.targetCal + ' kcal · 蛋白 ' + c.protein + ' g</span></div>'
     + '<div class="mt10"><label class="fld">目标</label><div class="seg">'
     + GOAL_ORDER.map(function(go){
        return '<button type="button" data-act="pGoal" data-v="' + go + '" aria-pressed="' + (g === go) + '">' + GOAL_LABEL[go] + '</button>';
       }).join("")
     + '</div></div>'
     + '<div class="mt10"><label class="fld">每周训练强度</label><div class="chips">'
     + [1, 2, 3, 4, 5].map(function(n){
        return '<button type="button" class="chip" data-act="pLevel" data-v="' + n + '" aria-pressed="' + (lv === n) + '">' + n + '</button>';
       }).join("")
     + '</div>'
     + '<div class="f-cap mt6">' + esc(planSummary(g, lv)) + '。改档位即重新配餐并写入目标。</div>'
     + '</div>';
  h += plannerPlansHTML(S);
  h += '<div class="f-cap" style="text-align:center;padding:4px 0;">配餐按你食材库里的整袋/整个来凑，数字大概齐、能反查。记入后可随时删。</div>';
  return h;
}

function plannerPlansHTML(S){
  var h = "", c = compute();
  if (!S.plans || !c) { h += '<div class="notice info">选好档位后这里出三餐方案</div>'; return h; }
  MEALS3.forEach(function(m){
    var pm = S.plans[m[0]];
    if (!pm) return;
    var idx = Math.min(S.opt[m[0]] || 0, Math.max(0, pm.opts.length - 1));
    h += '<div class="card"><h2>' + m[1] + ' · 目标 ' + pm.target + ' kcal</h2>';
    if (pm.empty || !pm.opts.length) {
      h += '<div class="empty">' + esc(pm.msg || "暂无可配方案") + '</div></div>';
      return;
    }
    h += '<div class="chips">'
       + pm.opts.map(function(o, i){
           return '<button type="button" class="chip" data-act="pOpt" data-m="' + m[0] + '" data-i="' + i + '" aria-pressed="' + (i === idx) + '">方案' + (i + 1) + '</button>';
         }).join("")
       + '</div>';
    var opt = pm.opts[idx];
    h += '<div class="row-between mt6"><span class="f-number">≈ ' + opt.kcal + ' kcal</span>'
       + '<span class="f-cap">' + (opt.diff >= 0 ? "超出 " + opt.diff : "差 " + (-opt.diff)) + ' · 蛋' + opt.pAll + 'g</span></div>';
    opt.items.forEach(function(it){
      h += '<div class="item"><div class="in"><div class="nm">' + esc(it.name) + '</div>'
         + '<div class="ds">' + esc(amountText(it)) + ' · 蛋' + r1(it.p) + ' 碳' + r1(it.c) + ' 脂' + r1(it.f) + '</div></div>'
         + '<span class="kc">' + Math.round(it.kcal) + '</span></div>';
    });
    h += '<button type="button" class="btn ghost block sm mt6" data-act="pUseMeal" data-m="' + m[0] + '">记入' + m[1] + '</button>'
       + '</div>';
  });
  h += '<button type="button" class="btn block" data-act="pUseAll">整套记入今日三餐</button>';
  return h;
}

/* ============================================================================
 * 九、弹层：编辑营养 / 设单位 / 新建 / 导入确认 / 免责声明
 * ========================================================================== */
function openEditFood(id){
  var f = findFood(id); if (!f) return;
  var e = eff(f);
  state.sheet = { type:"edit", id:id, err:{} };
  openSheet("编辑营养 · " + f.name,
    '<div class="card"><h2>覆盖「' + esc(f.name) + '」的营养值</h2>'
    + '<div class="f-cap" style="margin-bottom:10px;">默认每 100g：' + f.kcal + ' kcal · 蛋 ' + f.p + ' / 碳 ' + f.c + ' / 脂 ' + f.f
    + '。<b>只填要改的一项就行</b>，留空保持原值。</div>'
    + '<div class="row"><div style="flex:1;"><label class="fld">热量 kcal</label><input type="number" inputmode="decimal" id="eKcal" placeholder="' + e.kcal + '" value="' + e.kcal + '"></div>'
    + '<div style="flex:1;"><label class="fld">蛋白 g</label><input type="number" inputmode="decimal" id="eP" placeholder="' + e.p + '" value="' + e.p + '"></div></div>'
    + '<div class="row mt10"><div style="flex:1;"><label class="fld">碳水 g</label><input type="number" inputmode="decimal" id="eC" placeholder="' + e.c + '" value="' + e.c + '"></div>'
    + '<div style="flex:1;"><label class="fld">脂肪 g</label><input type="number" inputmode="decimal" id="eF" placeholder="' + e.f + '" value="' + e.f + '"></div></div>'
    + '<div class="err hidden" id="editErr"></div>'
    + '<button type="button" class="btn block mt10" data-act="editSave">保存覆盖</button>'
    + '<div class="f-cap mt6">覆盖只对之后的记录生效，已记下的历史条目不受影响。</div></div>');
}

function openUnitFood(id){
  var f = findFood(id); if (!f) return;
  state.sheet = { type:"unit", id:id, err:{} };
  openSheet("设单位 · " + f.name,
    '<div class="card"><h2>「' + esc(f.name) + '」怎么记</h2>'
    + '<label class="fld">单位类型</label><select id="uUnit">'
    + UNITS.map(function(u){ return '<option value="' + u.id + '"' + (u.id === f.unit ? " selected" : "") + '>' + u.label + '</option>'; }).join("")
    + '</select>'
    + '<div class="mt10"><label class="fld">单位重量 (g / ml)</label>'
    + '<input type="number" inputmode="decimal" id="uPer" value="' + num(f.per, 100) + '">'
    + '<div class="f-cap mt6">论克记时此值不参与计算。</div></div>'
    + '<div class="mt10"><label class="fld">单位叫法</label>'
    + '<input type="text" id="uLabel" value="' + esc(unitLabelOf(f)) + '" placeholder="如 袋 / 个 / 根 / 勺"></div>'
    + '<div class="err hidden" id="unitErr"></div>'
    + '<button type="button" class="btn block mt10" data-act="unitSave">保存</button></div>');
}

function openNewFood(){
  state.sheet = { type:"new", err:{} };
  openSheet("新建自定义食材",
    '<div class="card">'
    + '<label class="fld">名称</label><input type="text" id="nfName" placeholder="如 食堂红烧肉">'
    + '<div class="mt10"><label class="fld">分类</label><select id="nfCat">'
    + CATS.map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join("") + '</select></div>'
    + '<div class="row mt10"><div style="flex:1;"><label class="fld">热量 /100g</label><input type="number" inputmode="decimal" id="nfKcal"></div>'
    + '<div style="flex:1;"><label class="fld">蛋白 /100g</label><input type="number" inputmode="decimal" id="nfP"></div></div>'
    + '<div class="row mt10"><div style="flex:1;"><label class="fld">碳水 /100g</label><input type="number" inputmode="decimal" id="nfC"></div>'
    + '<div style="flex:1;"><label class="fld">脂肪 /100g</label><input type="number" inputmode="decimal" id="nfF"></div></div>'
    + '<div class="row mt10"><div style="flex:1;"><label class="fld">单位</label><select id="nfUnit">'
    + UNITS.map(function(u){ return '<option value="' + u.id + '"' + (u.id === "g" ? " selected" : "") + '>' + u.label + '</option>'; }).join("") + '</select></div>'
    + '<div style="flex:1;"><label class="fld">单位重量 (g)</label><input type="number" inputmode="decimal" id="nfPer" value="100"></div></div>'
    + '<div class="mt10"><label class="fld">单位叫法</label><input type="text" id="nfLabel" placeholder="如 袋 / 个 / 根"></div>'
    + '<div class="err hidden" id="newErr"></div>'
    + '<button type="button" class="btn block mt10" data-act="newSave">保存食材</button></div>');
}

function openModal(html){ $("modalBox").innerHTML = html; $("modal").classList.add("show"); }
function closeModal(){ $("modal").classList.remove("show"); }

function showDisclaimer(){
  openModal('<h2 class="f-title" style="margin:0 0 10px;">先说清楚</h2>'
    + '<div class="f-body">本工具为一般性营养计算，不构成医疗建议。有基础疾病、正在服药、或未成年者请咨询医生。</div>'
    + '<div class="f-cap mt10">数据只保存在这台设备的浏览器里，换设备请用导出 / 导入迁移。</div>'
    + '<button type="button" class="btn block mt14" data-act="disclaimerOk">我知道了</button>');
}

/* ============================================================================
 * 十、导出 / 导入
 * ========================================================================== */
function doExport(){
  var d = new Date(), stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  var payload = { app:"dorm-fatloss", schemaVersion:SCHEMA, exportedAt:new Date().toISOString(),
                  profile:DB.profile, foods:DB.foods, overrides:DB.overrides, logs:DB.logs,
                  workouts:DB.workouts, equipPref:DB.equipPref, flags:DB.flags };
  try {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "dorm-fatloss-backup-" + stamp + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
    toast("已导出备份");
  } catch(e){ showBanner("⚠ 导出失败，请检查浏览器下载权限"); }
}

var pendingImport = null;
function handleFile(file){
  var fr = new FileReader();
  fr.onerror = function(){ importError("文件读取失败，请重试"); };
  fr.onload = function(){
    var d = null;
    try { d = JSON.parse(String(fr.result)); } catch(e){ d = null; }
    if (!d || typeof d !== "object" || (!d.logs && !d.foods && !d.profile)) { importError("文件格式不正确，请选择本工具导出的 JSON 备份"); return; }
    var logs = (d.logs && typeof d.logs === "object" && !Array.isArray(d.logs)) ? d.logs : {};
    var foods = Array.isArray(d.foods) ? d.foods : [];
    var dayCount = Object.keys(logs).length;
    pendingImport = d;
    openModal('<h2 class="f-title" style="margin:0 0 10px;">确认导入</h2>'
      + '<div class="f-body">将覆盖 <b>' + dayCount + '</b> 天记录 / <b>' + foods.length + '</b> 条食材。</div>'
      + '<div class="f-cap mt10">相同日期以导入文件为准，相同 id 的食材以导入文件为准；其余保留。</div>'
      + '<div class="row mt14"><button type="button" class="btn" style="flex:1;" data-act="importConfirm">确认导入</button>'
      + '<button type="button" class="btn ghost" style="flex:1;" data-act="closeModal">取消</button></div>');
  };
  fr.readAsText(file);
}
function importError(msg){
  var el = $("impErr");
  if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  else showBanner(msg);
}
function doImport(){
  var d = pendingImport; if (!d) return;
  var logs = (d.logs && typeof d.logs === "object") ? d.logs : {};
  var foods = Array.isArray(d.foods) ? d.foods : [];
  var ov = (d.overrides && typeof d.overrides === "object" && !Array.isArray(d.overrides)) ? d.overrides : {};
  var dayCount = Object.keys(logs).length, replaced = 0, addedFoods = 0;

  Object.keys(logs).forEach(function(k){
    if (DB.logs[k]) replaced++;
    var L = logs[k] || {}, meals = (L.meals && typeof L.meals === "object") ? L.meals : {};
    var out = { breakfast:[], lunch:[], dinner:[], snack:[] };
    MEALS.forEach(function(m){
      out[m[0]] = (Array.isArray(meals[m[0]]) ? meals[m[0]] : []).map(normItem).filter(Boolean);
    });
    DB.logs[k] = { weight: (L.weight == null || !isFinite(num(L.weight, NaN))) ? null : r1(num(L.weight)), meals: out };
  });

  foods.forEach(function(f){
    if (!f || typeof f !== "object" || !f.name) return;
    var hit = findFood(f.id);
    var rec = {
      id: f.id || uid(), name: String(f.name), cat: CATS.indexOf(f.cat) >= 0 ? f.cat : "蛋白",
      kcal: num(f.kcal, 0), p: num(f.p, 0), c: num(f.c, 0), f: num(f.f, 0),
      unit: UNITS.some(function(u){ return u.id === f.unit; }) ? f.unit : "g",
      per: num(f.per, 1) > 0 ? num(f.per, 1) : 1,
      unitLabel: f.unitLabel || UNIT_NAME[f.unit] || "克",
      builtin: !!f.builtin
    };
    var builtinHit = BUILTIN.some(function(b){ return b.id === rec.id; });
    if (builtinHit) { rec.builtin = true; }
    if (hit) { Object.assign(hit, { name:rec.name, cat:rec.cat, kcal:rec.kcal, p:rec.p, c:rec.c, f:rec.f, unit:rec.unit, per:rec.per, unitLabel:rec.unitLabel, builtin:hit.builtin || rec.builtin }); }
    else if (!builtinHit) { DB.foods.push(rec); addedFoods++; }
  });

  Object.keys(ov).forEach(function(k){ DB.overrides[k] = Object.assign({}, DB.overrides[k] || {}, ov[k]); });
  if (d.profile && typeof d.profile === "object" && (d.profile.height || d.profile.weight)) {
    DB.profile = Object.assign({}, DB.profile, {
      gender: d.profile.gender === "female" ? "female" : "male",
      age: num(d.profile.age, DB.profile.age),
      height: d.profile.height ? num(d.profile.height) : DB.profile.height,
      weight: d.profile.weight ? num(d.profile.weight) : DB.profile.weight,
      activity: ACT[d.profile.activity] ? d.profile.activity : DB.profile.activity,
      deficit: num(d.profile.deficit, DB.profile.deficit),
      goal: (d.profile.goal === "maintain" || d.profile.goal === "gain") ? d.profile.goal : DB.profile.goal,
      level: (d.profile.level >= 1 && d.profile.level <= 5) ? Math.round(num(d.profile.level, DB.profile.level)) : DB.profile.level,
      surplus: isFinite(num(d.profile.surplus, DB.profile.surplus)) ? Math.max(0, num(d.profile.surplus, DB.profile.surplus)) : DB.profile.surplus,
      split: Object.assign({}, DB.profile.split, d.profile.split || {})
    });
  }
  /* workouts：按日合并，同日按 sid 去重（导入优先，同训练方案 §1.2 口径） */
  if (d.workouts && typeof d.workouts === "object" && !Array.isArray(d.workouts)) {
    Object.keys(d.workouts).forEach(function(day){
      var inc = Array.isArray(d.workouts[day]) ? d.workouts[day] : [];
      if (!DB.workouts[day] || !Array.isArray(DB.workouts[day])) DB.workouts[day] = [];
      inc.forEach(function(s){
        if (!s || !s.sid) return;
        var hit = DB.workouts[day].some(function(x){ return x.sid === s.sid; });
        if (!hit) DB.workouts[day].push(s);
      });
    });
  }
  if (d.equipPref && typeof d.equipPref === "object") {
    DB.equipPref = Object.assign({}, DB.equipPref, d.equipPref);
  }
  if (DB.equipPref && DB.equipPref.level && !DB.flags.trainDisclaimerSeen) DB.flags.trainDisclaimerSeen = true;
  save();
  pendingImport = null;
  closeModal();
  toast("已导入：" + dayCount + " 天记录" + (replaced ? "（覆盖 " + replaced + " 天）" : "") + " / 新增 " + addedFoods + " 条食材");
  renderFoods();
}

/* ============================================================================
