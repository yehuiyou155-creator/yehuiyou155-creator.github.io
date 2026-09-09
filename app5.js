 * 十一、事件
 * ========================================================================== */
document.addEventListener("click", function(ev){
  var el = ev.target.closest ? ev.target.closest("[data-act]") : null;
  if (!el) return;
  var act = el.dataset.act, S = state.sheet;

  /* 弹层内的动作：弹层已关就不再处理，避免拿到 null 状态 */
  if (!S && ["pick","quick","confirmAdd","manualToggle","manualSave","pcat","punit","qtyBack","newFormToggle","newFoodSave","editSave","unitSave","pGoal","pLevel","pOpt","pUseMeal","pUseAll"].indexOf(act) >= 0) return;

  switch (act) {
    case "tab": setTab(el.dataset.tab); break;
    case "theme": toggleTheme(); break;

    case "shiftDay":
      state.date = shiftDate(state.date, num(el.dataset.n, 0));
      if (state.date > todayKey()) state.date = todayKey();
      renderToday(); break;
    case "backToday": state.date = todayKey(); renderToday(); break;

    case "add": openAdd(el.dataset.d, el.dataset.m); break;
    case "closeSheet": closeSheet(); break;
    case "openPlanner": openPlanner(); break;

    /* 每餐搭配：切档位即重配并写库 */
    case "pGoal": {
      if (!S) break;
      S.goal = el.dataset.v;
      applyPlanGoal(S.goal, S.level);
      S.plans = buildPlans();
      S.opt = { breakfast:0, lunch:0, dinner:0 };
      openSheet($("sheetTitle").textContent, plannerSheetHTML());
      if (state.tab === "today") renderToday(); else renderLogs();
      break;
    }
    case "pLevel": {
      if (!S) break;
      S.level = num(el.dataset.v, 3);
      applyPlanGoal(S.goal, S.level);
      S.plans = buildPlans();
      S.opt = { breakfast:0, lunch:0, dinner:0 };
      openSheet($("sheetTitle").textContent, plannerSheetHTML());
      if (state.tab === "today") renderToday(); else renderLogs();
      break;
    }
    case "pOpt": {
      if (!S) break;
      S.opt[el.dataset.m] = num(el.dataset.i, 0);
      openSheet($("sheetTitle").textContent, plannerSheetHTML());
      break;
    }
    case "pUseMeal": {
      if (!S || !S.plans) break;
      var pm = S.plans[el.dataset.m];
      if (!pm || !pm.opts.length) break;
      var i0 = Math.min(S.opt[el.dataset.m] || 0, pm.opts.length - 1);
      pushItems(S.date || todayKey(), el.dataset.m, pm.opts[i0].items);
      if (state.tab === "today") renderToday(); else renderLogs();
      toast("已记入" + MEAL_NAME[el.dataset.m]);
      break;
    }
    case "pUseAll": {
      if (!S || !S.plans) break;
      var d0 = S.date || todayKey();
      MEALS3.forEach(function(m){
        var pz = S.plans[m[0]];
        if (pz && pz.opts.length) {
          var iz = Math.min(S.opt[m[0]] || 0, pz.opts.length - 1);
          pushItems(d0, m[0], pz.opts[iz].items);
        }
      });
      if (state.tab === "today") renderToday(); else renderLogs();
      toast("三餐已整套记入");
      break;
    }

    case "pick": {
      var f = findFood(el.dataset.id);
      if (f) { S.sel = f; S.unit = f.unit || "g"; S.qty = null; openSheet($("sheetTitle").textContent, addSheetHTML()); }
      break;
    }
    case "quick": {
      if (!S || !S.sel) break;
      var q = num(el.dataset.q, 1), u = S.unit || S.sel.unit || "g";
      pushItem(S.date, S.meal, makeItem(S.sel, q, u, unitLabelOf(S.sel)));
      toast("已记入" + MEAL_NAME[S.meal]);
      if (state.tab === "today") renderToday(); else renderLogs();
      break;
    }
    case "confirmAdd": {
      if (!S || !S.sel) break;
      var qv = num($("qQty").value, NaN);
      if (!(qv > 0)) { S.err.qty = "数量要大于 0"; openSheet($("sheetTitle").textContent, addSheetHTML()); break; }
      var uu = S.unit || S.sel.unit || "g";
      pushItem(S.date, S.meal, makeItem(S.sel, qv, uu, unitLabelOf(S.sel)));
      /* 多选连续加入：清掉选择让弹层保留，用户继续选下个食材；已加过的会在列表里打 ✓ */
      S.sel = null; S.unit = null; S.qty = null; S.err = {};
      openSheet("添加到" + MEAL_NAME[S.meal] + " · " + fmtDate(S.date), addSheetHTML());
      if (state.tab === "today") renderToday(); else renderLogs();
      toast("已记入" + MEAL_NAME[S.meal]);
      break;
    }
    case "manualToggle":
      S.manual = !S.manual; S.err = {}; openSheet($("sheetTitle").textContent, addSheetHTML()); break;
    case "manualSave": {
      var kc = num($("mKcal").value, NaN);
      if (!(kc >= 0)) { S.err.kcal = "热量必填，且不能是负数"; openSheet($("sheetTitle").textContent, addSheetHTML()); break; }
      var val = function(id){ var x = $(id).value.trim(); return x === "" ? 0 : Math.max(0, num(x, 0)); };
      pushItem(S.date, S.meal, {
        fid:null, name:"食堂（手动估）", qty:1, unit:"g", unitLabel:"份", grams:null,
        kcal: Math.round(kc), p: r1(val("mP")), c: r1(val("mC")), f: r1(val("mF")), manual:true
      });
      closeSheet();
      if (state.tab === "today") renderToday(); else renderLogs();
      toast("已记入" + MEAL_NAME[S.meal]);
      break;
    }
    case "pcat":
      S.cat = el.dataset.v;
      openSheet($("sheetTitle").textContent, addSheetHTML());
      break;
    case "punit":
      if (!S || !S.sel) break;
      S.unit = el.dataset.v;
      S.qty = (S.unit === "g" || S.unit === "ml") ? 100 : 1;
      S.err = {};
      openSheet($("sheetTitle").textContent, addSheetHTML());
      break;
    case "qtyBack":
      if (!S) break;
      S.sel = null; S.unit = null; S.qty = null; S.err = {};
      openSheet($("sheetTitle").textContent, addSheetHTML());
      break;
    case "newFormToggle":
      S.newForm = !S.newForm; S.err = {}; openSheet($("sheetTitle").textContent, addSheetHTML()); break;
    case "newFoodSave": {
      var nm = $("nfName").value.trim();
      if (!nm) { S.err.nf = "请填食材名称"; openSheet($("sheetTitle").textContent, addSheetHTML()); break; }
      var nf = {
        id: uid(), name: nm, cat: $("nfCat").value,
        kcal: num($("nfKcal").value, 0), p: num($("nfP").value, 0), c: num($("nfC").value, 0), f: num($("nfF").value, 0),
        unit: $("nfUnit").value, per: num($("nfPer").value, 100) > 0 ? num($("nfPer").value, 100) : 100,
        unitLabel: $("nfLabel").value.trim() || UNIT_NAME[$("nfUnit").value] || "克",
        builtin: false
      };
      DB.foods.push(nf); save();
      S.newForm = false; S.sel = nf; S.unit = nf.unit; S.qty = null; state.foodQ = "";
      openSheet($("sheetTitle").textContent, addSheetHTML());
      toast("已新建，选好数量就能入账");
      break;
    }

    case "delItem": {
      var d = el.dataset.d, m = el.dataset.m, i = num(el.dataset.i, 0);
      var L = DB.logs[d]; if (L && L.meals && L.meals[m]) { L.meals[m].splice(i, 1); save(); }
      if (state.tab === "today") renderToday(); else renderLogs();
      break;
    }
    case "saveWeight": {
      var wv = num($("wInput").value, NaN);
      if (!(wv > 0)) { toast("请输入有效体重"); break; }
      ensureDay(state.date).weight = r1(wv); save(); renderToday(); toast("已记录体重");
      break;
    }

    case "gender": DB.profile.gender = el.dataset.v; save(); renderCalc(); break;
    case "thinOverride":
      DB.flags.thinOverride = true; save(); refreshCalc(); toast("已关闭偏瘦拦截，缺口照你填的算"); break;

    case "setExp":
      DB.equipPref.level = el.dataset.v;
      DB.flags.trainDisclaimerSeen = true;
      state.trainLv = EXP_TO_LV[el.dataset.v] || "easy";
      save(); closeModal(); renderTrain();
      toast("已按经验设置默认难度");
      break;

    case "fcat": state.foodCat = el.dataset.v; renderFoods(); break;
    case "newFood": openNewFood(); break;
    case "editFood": openEditFood(el.dataset.id); break;
    case "unitFood": openUnitFood(el.dataset.id); break;
    case "resetFood":
      delete DB.overrides[el.dataset.id]; save(); renderFoods(); toast("已恢复默认"); break;
    case "delFood": {
      var fid = el.dataset.id, idx2 = -1;
      DB.foods.forEach(function(f, i){ if (f.id === fid) idx2 = i; });
      if (idx2 >= 0 && !DB.foods[idx2].builtin) { DB.foods.splice(idx2, 1); delete DB.overrides[fid]; save(); }
      renderFoods(); break;
    }
    case "editSave": {
      var f2 = findFood(S.id); if (!f2) break;
      var next = Object.assign({}, DB.overrides[f2.id] || {});
      var fields = { kcal:"eKcal", p:"eP", c:"eC", f:"eF" };
      var touched = 0;
      S.err = {};
      Object.keys(fields).forEach(function(k){
        var raw = $(fields[k]).value.trim();
        if (raw === "") return;                       /* 留空 = 保持原值 */
        var v = num(raw, NaN);
        if (!isFinite(v) || v < 0) { S.err.msg = "营养值不能是负数，也不能乱填"; return; }
        next[k] = v; touched++;
      });
      if (S.err.msg) { showSheetErr("editErr", S.err.msg); break; }
      if (!touched) { closeSheet(); break; }
      DB.overrides[f2.id] = next; save(); closeSheet(); renderFoods(); toast("已保存覆盖");
      break;
    }
    case "unitSave": {
      var f3 = findFood(S.id); if (!f3) break;
      var uu2 = $("uUnit").value, pv = num($("uPer").value, NaN), lb = $("uLabel").value.trim();
      S.err = {};
      if (!(pv > 0)) { S.err.msg = "单位重量要大于 0"; showSheetErr("unitErr", S.err.msg); break; }
      if ((uu2 === "pcs" || uu2 === "bag" || uu2 === "cup" || uu2 === "slice" || uu2 === "scoop") && !lb) {
        S.err.msg = "这个单位要填叫法，比如 袋 / 个 / 根"; showSheetErr("unitErr", S.err.msg); break;
      }
      f3.unit = uu2; f3.per = pv; f3.unitLabel = lb || UNIT_NAME[uu2];
      save(); closeSheet(); renderFoods(); toast("单位已更新");
      break;
    }
    case "newSave": {
      var nm2 = $("nfName").value.trim();
      if (!nm2) { showSheetErr("newErr", "请填食材名称"); break; }
      DB.foods.push({
        id: uid(), name: nm2, cat: $("nfCat").value,
        kcal: num($("nfKcal").value, 0), p: num($("nfP").value, 0), c: num($("nfC").value, 0), f: num($("nfF").value, 0),
        unit: $("nfUnit").value, per: num($("nfPer").value, 100) > 0 ? num($("nfPer").value, 100) : 100,
        unitLabel: $("nfLabel").value.trim() || UNIT_NAME[$("nfUnit").value] || "克",
        builtin: false
      });
      save(); closeSheet(); renderFoods(); toast("已新增食材");
      break;
    }

    case "export": doExport(); break;
    case "importPick": $("fileInput").click(); break;
    case "importConfirm": doImport(); break;
    case "closeModal": closeModal(); pendingImport = null; break;
    case "disclaimerOk":
      DB.flags.disclaimerSeen = true; save(); closeModal(); break;
    case "dismissBackup": DB.flags.backupPrompted = true; save(); renderFoods(); break;
    case "moreMonths": state.logMonths += 2; renderLogs(); break;
    case "openDay":
      state.date = el.dataset.v;
      if (state.date > todayKey()) state.date = todayKey();
      setTab("today");
      window.scrollTo(0, 0);
      break;
  }
});

/* 行内红字：不用 alert，也不重画整个弹层（保住已填内容） */
function showSheetErr(id, msg){
  var e = $(id);
  if (e) { e.textContent = msg; e.classList.remove("hidden"); return; }
  toast(msg);
}

/* 输入事件（不整页重渲染，避免丢焦点） */
document.addEventListener("input", function(ev){
  var id = ev.target.id;
  if (id === "fq") { state.foodQ = ev.target.value; refreshFoodList(); }
  else if (id === "pq") { state.foodQ = ev.target.value; var pl = $("pickerList"); if (pl && state.sheet) pl.innerHTML = pickerHTML(); }
  else if (id === "qQty") { if (state.sheet) state.sheet.qty = num(ev.target.value, 0); }
  else if (id === "cAge") { DB.profile.age = clamp(Math.round(num(ev.target.value, 20)), 10, 100); save(); refreshCalc(); }
  else if (id === "cHeight") { DB.profile.height = ev.target.value === "" ? null : num(ev.target.value, null); save(); refreshCalc(); }
  else if (id === "cWeight") { DB.profile.weight = ev.target.value === "" ? null : num(ev.target.value, null); save(); refreshCalc(); }
  else if (id === "cDef") {
    var v = num(ev.target.value, 0), e = $("cDefErr");
    if (v < 0) { e.textContent = "缺口不能是负数，填 0 表示维持体重"; e.classList.remove("hidden"); }
    else { e.classList.add("hidden"); DB.profile.deficit = clamp(v, 0, 2000); save(); refreshCalc(); }
  }
  else if (id === "sB" || id === "sL") {
    var b = clamp(num($("sB").value, 0), 0, 100), l = clamp(num($("sL").value, 0), 0, 100);
    DB.profile.split.breakfast = b; DB.profile.split.lunch = l;
    DB.profile.split.dinner = 100 - b - l;
    save(); refreshCalc();
  }
});
document.addEventListener("change", function(ev){
  var id = ev.target.id;
  if (id === "cAct") { DB.profile.activity = ev.target.value; save(); refreshCalc(); }
  else if (id === "fileInput") {
    if (ev.target.files && ev.target.files[0]) handleFile(ev.target.files[0]);
    ev.target.value = "";
  }
});

/* 键盘弹起时用 visualViewport 上移弹层，避免输入框被遮 */
(function(){
  var sheet = $("sheet");
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var upd = function(){
      if (!sheet.classList.contains("show")) { sheet.style.transform = ""; return; }
      var off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      sheet.style.transform = off > 0 ? "translate(-50%, calc(-50% - " + off + "px))" : "";
    };
    vv.addEventListener("resize", upd);
    vv.addEventListener("scroll", upd);
  }
})();

/* ============================================================================
 * 十二、自检（仅 ?selftest=1 时显示，正式使用不会出现）
 * ========================================================================== */
function selfTest(){
  var backup = JSON.parse(JSON.stringify(DB));
  var cases = [
    { n:1, p:{gender:"male",   age:20, height:175, weight:70,  activity:"light",     deficit:500},  exp:{bmr:1699, tdee:2336, target:1840, p:126, f:51,  c:218} },
    { n:2, p:{gender:"female", age:20, height:160, weight:50,  activity:"sedentary", deficit:800},  exp:{bmr:1239, tdee:1487, target:1240, p:90,  f:34,  c:143} },
    { n:3, p:{gender:"male",   age:22, height:180, weight:120, activity:"sedentary", deficit:1000}, exp:{bmr:2220, tdee:2664, target:2220, p:194, f:62,  c:222} }
  ];
  var lines = [];
  cases.forEach(function(cs){
    DB.profile = Object.assign({}, DB.profile, cs.p);
    DB.flags.thinOverride = false;
    var r = compute();
    var got = { bmr:r.bmr, tdee:r.tdee, target:r.targetCal, p:r.protein, f:r.fat, c:r.carb };
    var ok = ["bmr","tdee","target","p","f","c"].every(function(k){ return got[k] === cs.exp[k]; });
    lines.push((ok ? "PASS" : "FAIL") + " 算例" + cs.n + " 期望 " + JSON.stringify(cs.exp) + " 实得 " + JSON.stringify(got));
  });
  /* 算例 4：偏瘦拦截 */
  DB.profile = Object.assign({}, DB.profile, {gender:"female", age:20, height:165, weight:45, activity:"sedentary", deficit:500});
  DB.flags.thinOverride = false;
  var r4 = compute();
  lines.push((r4.thinBlock && r4.deficitWanted === 500 ? "PASS" : "FAIL") + " 算例4 偏瘦拦截 thinBlock=" + r4.thinBlock + " BMI=" + r4.bmi);
  /* 覆盖只改热量：蛋白/碳水/脂肪保持原值 */
  DB.overrides["f01"] = { kcal:999 };
  var e1 = eff(findFood("f01"));
  var okOv = (e1.kcal === 999 && e1.p === 24 && e1.c === 2 && e1.f === 1.5);
  lines.push((okOv ? "PASS" : "FAIL") + " 只覆盖热量 → " + JSON.stringify({kcal:e1.kcal, p:e1.p, c:e1.c, f:e1.f}));
  delete DB.overrides["f01"];

  /* v1 → v2 迁移：构造三个旧键，验证升级后记录不丢、snack 补齐、内置改动落到 overrides */
  try {
    localStorage.removeItem("df_data");
    localStorage.setItem("df_profile_v1", JSON.stringify({gender:"female", age:21, height:168, weight:60, activity:"moderate", deficit:400, split:{breakfast:25, lunch:40, dinner:35}}));
    localStorage.setItem("df_foods_v1", JSON.stringify([
      {id:"b1", name:"即食鸡胸肉", kcal:130, p:24, c:2, f:1.5},   /* 内置被改过热量 → 应落成 override */
      {id:"x9", name:"食堂卤蛋",   kcal:150, p:12, c:1,  f:10}     /* 自定义 → 应保留为「我的」 */
    ]));
    localStorage.setItem("df_logs_v1", JSON.stringify({
      "2024-05-01": { weight:60.5, meals:{ breakfast:[{name:"即食鸡胸肉", grams:100, kcal:120, p:24, c:2, f:1.5}], lunch:[], dinner:[] } }
    }));
    migrate();
    var d1 = DB.logs["2024-05-01"];
    var chk = [
      DB.schemaVersion === SCHEMA,
      DB.profile.height === 168 && DB.profile.weight === 60 && DB.profile.split.breakfast === 25,
      !!d1 && d1.weight === 60.5 && d1.meals.breakfast.length === 1 && d1.meals.breakfast[0].kcal === 120,
      !!d1 && Array.isArray(d1.meals.snack) && d1.meals.snack.length === 0,
      !!DB.overrides["f01"] && DB.overrides["f01"].kcal === 130 && DB.overrides["f01"].p === undefined,
      DB.foods.some(function(f){ return f.name === "食堂卤蛋" && f.builtin === false; }),
      DB.foods.filter(function(f){ return f.builtin; }).length === 16,
      /* v2 → v3：老数据无档位字段 → 补默认 goal/level/surplus；workouts/equipPref 有默认容器 */
      DB.profile.goal === "fatloss" && DB.profile.level === 3 && DB.profile.surplus === 0,
      !!DB.workouts && typeof DB.workouts === "object",
      !!DB.equipPref && DB.equipPref.barWeight === 20
    ];
    lines.push((chk.every(Boolean) ? "PASS" : "FAIL") + " v1→v3 迁移（旧三键合并 + 档位字段补齐）" + JSON.stringify(chk));
  } catch(err) {
    lines.push("FAIL v1 迁移，异常：" + (err && err.message ? err.message : err));
  }
  /* 档位算例：增肌盈余 / 维持 / 减脂模板蛋白 */
  try {
    var baseT = Math.round(1698.75 * 1.375);              /* 男20/175/70/轻度 TDEE */
    DB.profile = Object.assign({}, DB.profile, { goal:"gain", level:3, deficit:0, surplus:150,
      height:175, weight:70, gender:"male", age:20, activity:"light" });
    DB.flags.thinOverride = false;
    var cg = compute();
    var okGain = cg.tdee === baseT + 150 && cg.protein === 140 && cg.deficit === 0;
    DB.profile.goal = "maintain";
    var cm = compute();
    var okMain = cm.tdee === baseT && cm.protein === 98 && cm.surplus === 0;
    DB.profile.goal = "fatloss"; DB.profile.deficit = 160;
    var cf = compute();
    var okFat = cf.deficit === 160 && cf.protein === 126;
    lines.push((okGain && okMain && okFat ? "PASS" : "FAIL")
      + " 档位算例 gain(" + cg.tdee + "/" + cg.protein + ") maintain(" + cm.tdee + "/" + cm.protein
      + ") fatloss(" + cf.deficit + "/" + cf.protein + ") 期望 (2486/140)(2336/98)(160/126)");
  } catch(e2) {
    lines.push("FAIL 档位算例，异常：" + (e2 && e2.message ? e2.message : e2));
  }
  /* 搭配结构算例：有方案、≤3组、无同种超3份、每组必含蛋白角色（§3.2a） */
  try {
    DB.profile = Object.assign({}, DB.profile, { goal:"fatloss", level:3, deficit:160,
      height:175, weight:70, gender:"male", age:20, activity:"light" });
    var c4 = compute();
    var pm = planOneMeal(c4.mealTarget.lunch, c4.mealMacro.lunch.p);
    var oks = [];
    oks.push(pm && !pm.empty && pm.opts.length > 0);
    oks.push(pm && pm.opts.length <= 3);
    var badDup = false, badOver = false, allMass = true;
    (pm ? pm.opts : []).forEach(function(o){
      var cid = {};
      o.items.forEach(function(it){ cid[it.fid] = (cid[it.fid] || 0) + 1; });
      Object.keys(cid).forEach(function(k){ if (cid[k] > 3) badOver = true; });
      var hasProt = o.items.some(function(it){
        var ff = findFood(it.fid); return ff && roleOf(ff) === "prot"; });
      if (!hasProt) badDup = true;
      if (o.items.some(function(it){ var ff = findFood(it.fid); return ff && roleOf(ff) === "carb"; })) allMass = false;
    });
    oks.push(!badDup); oks.push(!badOver); oks.push(!allMass);
    lines.push((oks.every(Boolean) ? "PASS" : "FAIL") + " 搭配结构（方案" + (pm ? pm.opts.length : 0)
      + "组/含蛋白/同种≤3/含碳水）" + JSON.stringify(oks));
  } catch(e3) {
    lines.push("FAIL 搭配结构，异常：" + (e3 && e3.message ? e3.message : e3));
  }
  /* 指南对齐断言：器材数据完整性 / 周计划可寻址 / 训练落盘回环 */
  try {
    var badEq = 0, badAct = 0;
    EQUIPMENT.forEach(function(eq){
      if (!eq.id || !eq.name || !eq.scene || !eq.loadType) { badEq++; return; }
      eq.actions.forEach(function(a){
        if (!a.id || !a.name || LV_ORDER.indexOf(a.lv || "easy") < 0) { badAct++; return; }
        if (!a.prime || !a.prepare || !a.steps || !a.steps.length || !a.breath || !a.errors || !a.errors.length || !a.safety || !a.poses || !a.poses.a) badAct++;
      });
    });
    var missPlan = 0;
    WEEK_PLAN.forEach(function(w){ w.acts.forEach(function(aid){ if (!findAct(aid)) missPlan++; }); });
    DB.profile = Object.assign({}, DB.profile, { height:175, weight:70, gender:"male", age:20, activity:"light" });
    state.trainUI["eq01a1"] = { w:10, reps:[10, 10, 10], done:[true, true, true] };
    persistTrain("eq01", "eq01a1");
    var dd = todayKey();
    var sesOK = !!DB.workouts[dd] && DB.workouts[dd].some(function(s){ return s.actId === "eq01a1" && s.sets.length === 3 && s.sets[0].done === true; });
    lines.push((badEq === 0 && badAct === 0 && missPlan === 0 && sesOK ? "PASS" : "FAIL")
      + " 指南对齐（器材表完整 " + EQUIPMENT.length + " 项 / 动作七段 / 周计划可寻址 / 落盘回环）"
      + JSON.stringify([badEq, badAct, missPlan, sesOK]));
  } catch(e4) {
    lines.push("FAIL 指南对齐，异常：" + (e4 && e4.message ? e4.message : e4));
  }
  /* 还原：内存与 localStorage 都回到自检前的状态 */
  DB = backup;
  try {
    localStorage.removeItem("df_profile_v1");
    localStorage.removeItem("df_foods_v1");
    localStorage.removeItem("df_custom_v1");
    localStorage.removeItem("df_logs_v1");
  } catch(e){}
  save();
  return lines.join("\n");
}

/* ============================================================================
 * 十三、启动
 * ========================================================================== */
/* 主题切换：浅色 / 深色，偏好持久化到 localStorage；未显式选择时跟随系统 */
function setTheme(mode){
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  var dark = mode === "dark" || (mode === "auto" && mq && mq.matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try { localStorage.setItem("df_theme", mode); } catch(e){}
  var b = document.querySelector(".theme-btn");
  if (b) b.innerHTML = dark
    ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>'
    : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>';
}
function toggleTheme(){
  var cur = document.documentElement.getAttribute("data-theme");
  setTheme(cur === "dark" ? "light" : "dark");
}

/* 分段控件：滑动选择块（iOS Segmented Control 观感） */
function syncSeg(){
  var segs = document.querySelectorAll(".seg");
  for (var i = 0; i < segs.length; i++){
    var seg = segs[i], on = seg.querySelector("button[aria-pressed=true]"), thumb = seg.querySelector(".seg-thumb");
    if (!thumb){ thumb = document.createElement("span"); thumb.className = "seg-thumb"; seg.appendChild(thumb); }
    if (on){ thumb.style.width = on.offsetWidth + "px"; thumb.style.transform = "translateX(" + (on.offsetLeft - 3) + "px)"; thumb.style.opacity = "1"; }
  }
}

/* 导航栏大标题：滚动时收起为紧凑标题（iOS 大标题折叠） */
function syncNav(){
  var t = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  var tb = document.querySelector(".topbar");
  if (tb) tb.classList.toggle("scrolled", t > 10);
}

(function init(){
  migrate();
  state.date = todayKey();
  setTheme(localStorage.getItem("df_theme") || "auto");
  setTab("today");
  window.addEventListener("scroll", syncNav, {passive:true});
  syncNav();
  if (!DB.flags.disclaimerSeen) showDisclaimer();
  if (location.search.indexOf("selftest") >= 0) {
    var pre = document.createElement("pre");
    pre.style.cssText = "white-space:pre-wrap;font-size:12px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px;margin:0 14px 80px;";
    pre.textContent = selfTest();
    document.querySelector(".app").appendChild(pre);
  }
  /* 跟随系统主题变化（仅在用户未显式选择时） */
  if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(){
    if ((localStorage.getItem("df_theme") || "auto") === "auto") setTheme("auto");
  });
})();

/* PWA：注册 Service Worker（仅 https / localhost；file:// 打开自动跳过，不影响单文件使用） */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  navigator.serviceWorker.register("sw.js").catch(function () {});
}

