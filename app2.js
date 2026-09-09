 * 四、今日页
 * ========================================================================== */
function renderToday(){
  var v = $("view-today"), ds = state.date, c = compute(), L = getDay(ds);
  var eaten = dayMacros(ds), remain = c ? c.targetCal - eaten.kcal : null;
  var isToday = ds === todayKey();
  var h = "";

  /* 日期条 */
  h += '<div class="card" style="padding:10px 12px;">'
     + '<div class="row">'
     + '<button type="button" class="mini" data-act="shiftDay" data-n="-1">‹ 前一天</button>'
     + '<div class="spacer" style="text-align:center;font-weight:700;font-variant-numeric:tabular-nums;">'
     + ds + " " + weekdayOf(ds) + (isToday ? "" : ' <span class="f-cap">补录中</span>') + '</div>'
     + '<button type="button" class="mini" data-act="shiftDay" data-n="1"' + (isToday ? " disabled" : "") + '>后一天 ›</button>'
     + '</div>'
     + (isToday ? "" : '<button type="button" class="btn ghost block sm mt6" data-act="backToday">回到今天</button>')
     + '</div>';

  if (!c) {
    h += '<div class="card"><h2>还没有目标</h2>'
       + '<div class="empty">先填写身高体重，才能算出你的目标</div>'
       + '<button type="button" class="btn block" data-act="tab" data-tab="calc">去填写身高体重</button></div>';
  } else {
    var pct = c.targetCal > 0 ? eaten.kcal / c.targetCal * 100 : 0;
    var over = pct > 100, shown = Math.min(100, pct);
    var C = 2 * Math.PI * 52;
    var stroke = over ? "var(--warn)" : "var(--sage)";
    h += '<div class="card">'
       + '<div class="ring-wrap"><div class="ring">'
       + '<svg width="118" height="118" viewBox="0 0 118 118">'
       + '<circle cx="59" cy="59" r="52" stroke="var(--track)" stroke-width="12" fill="none"/>'
       + '<circle class="ring-fg" cx="59" cy="59" r="52" stroke="' + stroke + '" stroke-width="12" fill="none" stroke-linecap="round"'
       + ' stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"'
       + ' data-to="' + (C * (1 - shown / 100)).toFixed(1) + '"/>'
       + '</svg>'
       + '<div class="ctr"><div class="v" style="color:' + stroke + '">' + Math.round(pct) + '%</div><div class="l">已吃 / 目标</div></div>'
       + '</div><div class="ring-info">'
       + '<div class="kv"><span>目标</span><b>' + c.targetCal + ' kcal</b></div>'
       + '<div class="kv"><span>已吃</span><b>' + eaten.kcal + ' kcal</b></div>'
       + '<div class="kv"><span>基础代谢</span><b>' + c.bmr + '</b></div>'
       + '<div class="kv"><span>每日消耗</span><b>' + c.tdee + '</b></div>'
       + '</div></div>'
       + '<div class="macros">'
       + macroCell("蛋白", eaten.p, c.protein)
       + macroCell("碳水", eaten.c, c.carb)
       + macroCell("脂肪", eaten.f, c.fat)
       + '</div></div>';

    /* 剩余额度 + 人话换算 */
    h += '<div class="card">';
    if (remain >= 0) {
      h += '<div class="f-cap">今日剩余</div>'
         + '<div class="f-display" style="color:var(--ok);">' + remain + ' <small style="font-size:14px;font-weight:600;">kcal</small></div>';
      var sg = suggestCombos(remain);
      if (sg.length) {
        h += '<div class="suggest"><div class="t">接下来还能这么吃</div>';
        sg.forEach(function(s){ h += '<div class="li">≈ ' + esc(s.text) + '（约 ' + s.tot + ' kcal）</div>'; });
        h += '</div>';
      } else {
        h += '<div class="f-cap mt10">剩下的额度不多了，喝口水吧。</div>';
      }
    } else {
      h += '<div class="f-cap">今日超出</div>'
         + '<div class="f-display" style="color:var(--warn);">' + (-remain) + ' <small style="font-size:14px;font-weight:600;">kcal</small></div>'
         + '<div class="f-cap mt6">超了就翻篇，明天照常记。</div>';
    }
    h += '</div>';

    c.warns.forEach(function(w){ h += '<div class="notice ' + w.type + '">' + esc(w.text) + '</div>'; });
    if (c.splitWarn) h += '<div class="notice warn">' + esc(c.splitWarn) + '</div>';
    /* 每餐智能搭配入口 */
    h += '<div class="card"><button type="button" class="btn block" data-act="openPlanner">⚡ 按档位帮我配三餐</button>'
       + '<div class="f-cap mt6">当前：' + (GOAL_LABEL[c.goal] || "减脂") + ' · 强度' + (c.level || 3)
       + '（每日 ' + c.targetCal + ' kcal · 蛋白 ' + c.protein + ' g）</div></div>';
  }

  /* 四组餐次 */
  MEALS.forEach(function(m){
    var k = m[0], items = L.meals[k] || [], sum = { kcal:0, p:0, c:0, f:0 };
    items.forEach(function(it){ sum.kcal += it.kcal; sum.p += it.p; sum.c += it.c; sum.f += it.f; });
    sum.kcal = Math.round(sum.kcal);
    var mt = c ? c.mealTarget[k] : null;
    var isOver = mt != null && sum.kcal > mt;
    h += '<div class="card mealcard">'
       + '<div class="mealhd"><span class="nm">' + m[1] + '</span>'
       + '<span class="vv' + (isOver ? " over" : "") + '">' + sum.kcal
       + (mt != null ? " / " + mt : "") + ' kcal</span></div>';
    if (items.length === 0) {
      h += '<div class="empty">今天还没记一笔。点下面的「+ 添加食物」开始</div>';
    } else {
      items.forEach(function(it, i){
        h += '<div class="item"><div class="in"><div class="nm">' + esc(it.name) + '</div>'
           + '<div class="ds">' + esc(amountText(it)) + ' · 蛋' + r1(it.p) + ' 碳' + r1(it.c) + ' 脂' + r1(it.f) + '</div></div>'
           + '<span class="kc">' + Math.round(it.kcal) + '</span>'
           + '<button type="button" class="del" data-act="delItem" data-d="' + ds + '" data-m="' + k + '" data-i="' + i + '" aria-label="删除">×</button></div>';
      });
    }
    h += '<button type="button" class="addbtn" data-act="add" data-d="' + ds + '" data-m="' + k + '">+ 添加食物</button>'
       + '</div>';
  });

  /* 体重 */
  h += '<div class="card"><h2>今日体重</h2>'
     + '<div class="row">'
     + '<input type="number" inputmode="decimal" step="0.1" id="wInput" value="' + (L.weight == null ? "" : L.weight) + '" placeholder="如 68.5" style="flex:1;">'
     + '<button type="button" class="btn" data-act="saveWeight">记录</button></div>'
     + '<div class="f-cap mt6">建议晨起空腹、固定条件称；同一天重复填会覆盖。</div></div>';

  h += '<div class="footnote">本工具只记热量，饮水不参与计算<br>活动量已包含日常运动，运动后目标不上浮</div>';
  v.innerHTML = h;

  /* 进度环补间：从空环过渡到目标值（尊重 prefers-reduced-motion，关闭时直接落位） */
  var ring = v.querySelector(".ring-fg");
  if (ring) requestAnimationFrame(function(){ ring.style.strokeDashoffset = ring.getAttribute("data-to"); });
  /* 宏量进度条从 0 补间到目标值 */
  v.querySelectorAll(".bar > i").forEach(function(b){
    var w = b.getAttribute("data-w");
    if (w != null) requestAnimationFrame(function(){ b.style.width = w + "%"; });
  });
}

function macroCell(label, val, tar){
  var pp = tar > 0 ? Math.min(100, val / tar * 100) : 0;
  return '<div class="macro"><div class="ml">' + label + '</div>'
       + '<div class="mv">' + r1(val) + '<span style="font-size:11px;color:var(--sub);font-weight:500;">/' + tar + '</span></div>'
       + '<div class="bar"><i class="' + (val > tar ? "over" : "") + '" style="width:0" data-w="' + pp + '"></i></div></div>';
}

/* 人话换算：只用用户自己的食材库倒推组合 */
function suggestCombos(remain){
  if (!(remain >= 100)) return [];
  var cands = DB.foods.map(function(f){
    var e = eff(f), per = servingGrams(f);
    return { f:f, per:per, kcal: e.kcal * per / 100, label: unitLabelOf(f) };
  }).filter(function(x){ return x.kcal > 0; });

  var prim = cands.filter(function(x){ return x.f.cat === "蛋白" || x.f.cat === "主食"; });
  var sec  = cands.filter(function(x){ return x.f.cat === "蔬菜" || x.f.cat === "水果" || x.f.cat === "调味"; });
  if (!prim.length) prim = cands.slice(0, 6);
  function amt(c, q){ return (c.f.unit === "g" || c.f.unit === "ml") ? (c.per * q) + "g" : (q + " " + c.label); }
  var out = [];
  prim.forEach(function(a){
    for (var qa = 1; qa <= 4; qa++) {
      var ka = a.kcal * qa;
      if (ka > remain) break;
      if (ka >= remain * 0.6) out.push({ score: remain - ka, text: amt(a, qa) + " " + a.f.name, tot: Math.round(ka), key: a.f.id });
      sec.forEach(function(b){
        if (b.f.id === a.f.id) return;
        for (var qb = 1; qb <= 4; qb++) {
          var tot = ka + b.kcal * qb;
          if (tot > remain) break;
          if (tot < remain * 0.6) continue;
          out.push({ score: remain - tot, text: amt(a, qa) + " " + a.f.name + " + " + amt(b, qb) + " " + b.f.name, tot: Math.round(tot), key: a.f.id });
        }
      });
    }
  });
  out.sort(function(x, y){ return x.score - y.score; });
  var used = {}, pick = [];
  for (var i = 0; i < out.length && pick.length < 3; i++) {
    if (used[out[i].key]) continue;
    used[out[i].key] = 1; pick.push(out[i]);
  }
  return pick;
}

/* ============================================================================
 * 五、计算页
 * ========================================================================== */
function renderCalc(){
  var p = DB.profile, v = $("view-calc");
  var h = '<div class="card">'
    + '<h2>身体数据</h2>'
    + '<div class="row"><div style="flex:1;"><label class="fld">性别</label>'
    + '<div class="seg"><button type="button" data-act="gender" data-v="male" aria-pressed="' + (p.gender === "male") + '">男</button>'
    + '<button type="button" data-act="gender" data-v="female" aria-pressed="' + (p.gender === "female") + '">女</button></div></div>'
    + '<div style="width:110px;"><label class="fld">年龄</label>'
    + '<input type="number" inputmode="numeric" id="cAge" value="' + p.age + '"></div></div>'
    + '<div class="row mt10"><div style="flex:1;"><label class="fld">身高 (cm)</label>'
    + '<input type="number" inputmode="decimal" id="cHeight" value="' + (p.height == null ? "" : p.height) + '" placeholder="175"></div>'
    + '<div style="flex:1;"><label class="fld">体重 (kg)</label>'
    + '<input type="number" inputmode="decimal" step="0.1" id="cWeight" value="' + (p.weight == null ? "" : p.weight) + '" placeholder="68.5"></div></div>'
    + '<div class="mt10"><label class="fld">活动量（已包含日常运动）</label>'
    + '<select id="cAct">' + Object.keys(ACT).map(function(k){
        return '<option value="' + k + '"' + (p.activity === k ? " selected" : "") + '>' + ACT_LABEL[k] + ' × ' + ACT[k] + '</option>';
      }).join("") + '</select></div>'
    + '<div class="mt10"><label class="fld">每日热量缺口 (kcal)</label>'
    + '<input type="number" inputmode="numeric" id="cDef" value="' + p.deficit + '" placeholder="0 = 维持体重">'
    + '<div class="f-cap mt6">填 0 表示维持。上限会自动限制在 1000 kcal 与每日消耗的 25% 之内。</div>'
    + '<div class="err hidden" id="cDefErr"></div></div>'
    + '</div>';

  h += '<div class="card"><h2>三餐比例（%）</h2>'
    + '<div class="row"><div style="flex:1;"><label class="fld">早餐</label>'
    + '<input type="number" inputmode="numeric" id="sB" value="' + p.split.breakfast + '"></div>'
    + '<div style="flex:1;"><label class="fld">午餐</label>'
    + '<input type="number" inputmode="numeric" id="sL" value="' + p.split.lunch + '"></div>'
    + '<div style="flex:1;"><label class="fld">晚餐（自动）</label>'
    + '<input type="number" id="sD" disabled value=""></div></div>'
    + '<div class="f-cap mt6">晚餐 = 100 − 早餐 − 午餐，自动算出。加餐不计入比例。</div>'
    + '<div class="err hidden" id="splitErr"></div></div>';

  h += '<div id="calcOut"></div>';
  h += '<div class="disclaimer mt14">本工具为一般性营养计算，不构成医疗建议。有基础疾病、正在服药、或未成年者请咨询医生。</div>';
  h += '<div class="footnote">数据仅保存在本机浏览器，换设备请用导出 / 导入迁移</div>';
  v.innerHTML = h;
  refreshCalc();
}

function refreshCalc(){
  var p = DB.profile, out = $("calcOut");
  if (!out) return;
  var c = compute(), h = "";

  if (!c) {
    out.innerHTML = '<div class="card"><h2>你的目标</h2><div class="empty">先填写身高体重，才能算出你的目标</div></div>';
    return;
  }

  if (c.thinBlock) {
    h += '<div class="notice warn">当前 BMI ' + c.bmi + ' 属偏瘦范围，建议维持而非继续减脂'
       + '<div class="mt6"><button type="button" class="btn danger sm" data-act="thinOverride">我已知情，仍要设置缺口</button></div></div>';
  }
  c.warns.forEach(function(w){ h += '<div class="notice ' + w.type + '">' + esc(w.text) + '</div>'; });
  if (c.splitWarn) h += '<div class="notice warn">' + esc(c.splitWarn) + '</div>';

  h += '<div class="hero"><div class="l">每日目标热量</div>'
     + '<div class="v">' + c.targetCal + ' <small>kcal</small></div>'
     + '<div class="l mt6">' + (GOAL_LABEL[c.goal] || "减脂") + ' · 强度' + (c.level || 3)
     + ' · 生效缺口 ' + c.deficit + ' kcal · 消耗 ' + c.tdee + ' · 基础代谢 ' + c.bmr + '</div></div>';

  h += '<div class="card"><h2>宏量目标（克）</h2><div class="res">'
     + '<div class="cell"><div class="l">蛋白</div><div class="v">' + c.protein + ' g</div></div>'
     + '<div class="cell"><div class="l">碳水</div><div class="v">' + c.carb + ' g</div></div>'
     + '<div class="cell"><div class="l">脂肪</div><div class="v">' + c.fat + ' g</div></div>'
     + '<div class="cell"><div class="l">BMI</div><div class="v">' + c.bmi + ' · ' + c.bmiLabel + '</div></div>'
     + '</div>'
     + '<div class="f-cap mt10">档位：' + (GOAL_LABEL[c.goal] || "减脂") + ' · 强度' + (c.level || 3)
     + '，蛋白系数 ' + (c.pFactor || 1.8) + ' g/kg'
     + (c.isGain ? '（盈余 ' + (DB.profile.surplus || 0) + ' kcal 已并入每日目标）' : '')
     + '——系数是档位模板，实际已受 35% 热量闸与 200g 上限约束，以显示值为准。</div>'
     + '<div class="f-cap mt10">按中国成人标准：偏瘦 &lt;18.5 / 正常 18.5–23.9 / 超重 24–27.9 / 肥胖 ≥28。</div></div>';

  h += '<div class="card"><h2>拆到三餐（kcal）</h2><div class="res">'
     + '<div class="cell"><div class="l">早餐 ' + c.split.breakfast + '%</div><div class="v">' + c.mealTarget.breakfast + '</div></div>'
     + '<div class="cell"><div class="l">午餐 ' + c.split.lunch + '%</div><div class="v">' + c.mealTarget.lunch + '</div></div>'
     + '<div class="cell"><div class="l">晚餐 ' + c.split.dinner + '%</div><div class="v">' + c.mealTarget.dinner + '</div></div>'
     + '<div class="cell"><div class="l">加餐</div><div class="v">不限</div></div>'
     + '</div></div>';

  out.innerHTML = h;
  syncSeg();

  var sd = $("sD"); if (sd) sd.value = c.split.dinner;
  var se = $("splitErr");
  if (se) { if (c.splitWarn) { se.textContent = c.splitWarn; se.classList.remove("hidden"); } else se.classList.add("hidden"); }
}

/* ============================================================================
 * 六、食材库
 * ========================================================================== */
function renderFoods(){
  var v = $("view-foods"), cat = state.foodCat, h = "";
  var days = logDayCount();

  if (days >= 7 && !DB.flags.backupPrompted) {
    h += '<div class="notice info">已经记了 ' + days + ' 天了，导出一份备份吧。'
       + '<div class="row mt6"><button type="button" class="btn sm" data-act="export">立即导出</button>'
       + '<button type="button" class="btn ghost sm" data-act="dismissBackup">以后再说</button></div></div>';
  }

  h += '<div class="card"><input type="text" id="fq" value="' + esc(state.foodQ) + '" placeholder="搜索食材，如 鸡胸 / 黄瓜">'
     + '<div class="chips mt10">' + ["全部"].concat(CATS).map(function(c){
        return '<button type="button" class="chip" data-act="fcat" data-v="' + esc(c) + '" aria-pressed="' + (cat === c) + '">' + c + '</button>';
      }).join("") + '</div></div>';

  h += '<div class="card"><h2>食材清单 · <span id="foodCount">0</span> 条</h2><div id="foodList"></div></div>';

  h += '<div class="card"><h2>备份</h2>'
     + '<div class="row"><button type="button" class="btn ghost" style="flex:1;" data-act="export">导出备份</button>'
     + '<button type="button" class="btn ghost" style="flex:1;" data-act="importPick">导入备份</button></div>'
     + '<div class="f-cap mt10">导出文件名 dorm-fatloss-backup-YYYYMMDD.json。导入会按日期 / id 合并，导入文件优先。</div>'
     + '<div class="err hidden" id="impErr"></div></div>';

  h += '<div class="footnote">覆盖只影响之后的记录，已记的历史条目是快照，不会变。</div>';
  v.innerHTML = h;
  refreshFoodList();
}

/* 搜索时只重画列表，不动输入框（避免中文输入法被打断） */
function refreshFoodList(){
  var box = $("foodList"); if (!box) return;
  box.innerHTML = foodListHTML();
}
function foodListHTML(){
  var q = state.foodQ.trim(), cat = state.foodCat, h = "", n = 0;
  var list = DB.foods.filter(function(f){
    if (cat !== "全部" && f.cat !== cat) return false;
    if (q && f.name.indexOf(q) < 0) return false;
    return true;
  });
  n = list.length;
  if (!list.length) {
    return '<div class="empty">没找到「' + esc(q || cat) + '」。可以手动估算，或新建为自定义食材</div>'
      + '<button type="button" class="btn block" data-act="newFood">+ 新建自定义食材</button>';
  }
  list.forEach(function(f){
    var e = eff(f), isOv = !!DB.overrides[f.id];
    var unitTxt = (f.unit === "g" || f.unit === "ml") ? "论克记" : ("1 " + esc(unitLabelOf(f)) + " ≈ " + num(f.per, 100) + " g");
    h += '<div class="foodrow"><div class="fi">'
       + '<div class="fn">' + esc(f.name) + (f.builtin ? '<span class="tag b">内置</span>' : '<span class="tag m">我的</span>')
       + (isOv ? '<span class="tag m">已改</span>' : '') + '</div>'
       + '<div class="fd">每 100g：' + e.kcal + ' kcal · 蛋 ' + e.p + ' / 碳 ' + e.c + ' / 脂 ' + e.f + '</div>'
       + '<div class="fd">' + f.cat + ' · ' + unitTxt + '</div>'
       + '<div class="fa">'
       + '<button type="button" class="mini" data-act="editFood" data-id="' + f.id + '">编辑营养</button>'
       + '<button type="button" class="mini" data-act="unitFood" data-id="' + f.id + '">设单位</button>'
       + (f.builtin ? (isOv ? '<button type="button" class="mini" data-act="resetFood" data-id="' + f.id + '">恢复默认</button>' : '')
                    : '<button type="button" class="mini" data-act="delFood" data-id="' + f.id + '">删除</button>')
       + '</div></div></div>';
  });
  var cc = $("foodCount"); if (cc) cc.textContent = String(n);
  return h;
}

/* ============================================================================
