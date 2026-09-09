 * 七、记录页
 * ========================================================================== */
function weightSeries(){
  return Object.keys(DB.logs)
    .filter(function(k){ return DB.logs[k] && DB.logs[k].weight != null; })
    .sort()
    .map(function(k){ return { date:k, w: num(DB.logs[k].weight) }; });
}
function ma7(pts){
  return pts.map(function(p){
    var lo = shiftDate(p.date, -6), s = 0, n = 0;
    pts.forEach(function(q){ if (q.date >= lo && q.date <= p.date) { s += q.w; n++; } });
    return { date:p.date, v: s / n };
  });
}
function renderLogs(){
  var v = $("view-logs"), pts = weightSeries().slice(-30), h = "";
  var today = todayKey();
  var last7 = pts.filter(function(p){ return p.date >= shiftDate(today, -6) && p.date <= today; });
  var avg7 = last7.length ? last7.reduce(function(a, b){ return a + b.w; }, 0) / last7.length : null;

  h += '<div class="card"><h2>体重趋势</h2>';
  if (avg7 != null) {
    h += '<div class="f-cap">近 7 日均值</div><div class="f-display">' + r1(avg7) + ' <small style="font-size:14px;font-weight:600;">kg</small></div>';
  } else {
    h += '<div class="empty">近 7 天还没有体重记录</div>';
  }
  if (pts.length >= 2) {
    h += '<div class="chartbox mt10">' + chartSVG(pts) + '</div>'
       + '<div class="legend"><span><i style="background:var(--sage-l)"></i>单日体重</span>'
       + '<span><i style="background:var(--sage)"></i>7 日移动平均</span></div>';
  } else {
    h += '<div class="empty">至少记录 2 天体重才能看趋势</div>';
  }
  h += '<div class="f-cap mt10">单日波动 ±1kg 多为水分，看 7 日均值。</div></div>';

  /* 历史（按月分组 + 懒加载）；点某天跳到今日页该日期补记 */
  var dates = Object.keys(DB.logs).filter(function(k){
    var L2 = DB.logs[k];
    return L2 && (L2.weight != null || MEALS.some(function(m){ return (L2.meals[m[0]] || []).length; }));
  }).sort().reverse();

  h += '<div class="card"><h2>历史记录</h2>'
     + '<div class="f-cap" style="margin:-4px 0 6px;">点任意一天回到当天补记，条目可删。</div>';
  if (!dates.length) {
    h += '<div class="empty">还没有历史记录</div>';
  } else {
    var groups = [], cur = null;
    dates.forEach(function(d){
      var ym = d.slice(0, 7);
      if (!cur || cur.ym !== ym) { cur = { ym:ym, list:[] }; groups.push(cur); }
      cur.list.push(d);
    });
    var show = Math.min(groups.length, state.logMonths);
    for (var i = 0; i < show; i++) {
      h += '<div class="monthhd">' + groups[i].ym.replace("-", " 年 ") + ' 月</div>';
      groups[i].list.forEach(function(d){
        var L2 = DB.logs[d], cal = dayCalories(d);
        h += '<div class="dayrow" data-act="openDay" data-v="' + d + '">'
           + '<span class="dl">' + fmtDate(d) + ' ' + weekdayOf(d) + '</span>'
           + '<span class="dr">' + (L2.weight != null ? r1(L2.weight) + " kg · " : "") + cal + " kcal ›</span></div>";
      });
    }
    if (show < groups.length) {
      h += '<button type="button" class="btn ghost block mt10" data-act="moreMonths">加载更早的记录（还有 ' + (groups.length - show) + ' 个月）</button>';
    }
  }
  h += '</div>';
  v.innerHTML = h;
}

function chartSVG(pts){
  var W = 320, H = 130, pl = 30, pr = 8, pt = 10, pb = 20;
  var ws = pts.map(function(p){ return p.w; }), mas = ma7(pts).map(function(p){ return p.v; });
  var lo = Math.min.apply(null, ws.concat(mas)), hi = Math.max.apply(null, ws.concat(mas));
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  lo = Math.floor((lo - 0.2) * 2) / 2; hi = Math.ceil((hi + 0.2) * 2) / 2;
  var n = pts.length;
  function X(i){ return n === 1 ? (pl + (W - pl - pr) / 2) : pl + (W - pl - pr) * i / (n - 1); }
  function Y(v){ return pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo)); }
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="体重趋势">';
  [0, 0.5, 1].forEach(function(t){
    var y = pt + (H - pt - pb) * t, val = hi - (hi - lo) * t;
    s += '<line x1="' + pl + '" y1="' + y.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y.toFixed(1) + '" stroke="var(--chart-grid)" stroke-width="1"/>';
    s += '<text x="2" y="' + (y + 3.5).toFixed(1) + '" font-size="9" fill="var(--chart-axis)">' + r1(val) + '</text>';
  });
  var rawPts = pts.map(function(p, i){ return X(i).toFixed(1) + "," + Y(p.w).toFixed(1); }).join(" ");
  var maPts  = mas.map(function(v, i){ return X(i).toFixed(1) + "," + Y(v).toFixed(1); }).join(" ");
  s += '<polyline points="' + rawPts + '" fill="none" stroke="var(--sage-l)" stroke-width="1.4" stroke-linejoin="round" opacity=".85"/>';
  s += '<polyline points="' + maPts + '" fill="none" stroke="var(--sage)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
  pts.forEach(function(p, i){ s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.w).toFixed(1) + '" r="1.8" fill="var(--sage-l)"/>'; });
  s += '<text x="' + pl + '" y="' + (H - 6) + '" font-size="9" fill="var(--chart-axis)">' + fmtDate(pts[0].date) + '</text>';
  s += '<text x="' + (W - pr) + '" y="' + (H - 6) + '" font-size="9" fill="var(--chart-axis)" text-anchor="end">' + fmtDate(pts[n - 1].date) + '</text>';
  s += '</svg>';
  return s;
}

/* ============================================================================
 * 七·五、训练页（本批为界面预览：静态器材数据 + 卡内交互，不入库、不落盘）
 * 数据结构对齐《训练器材模块_可行性与施工方案》§3，后续批次接 schema 迁移与算法
 * ========================================================================== */
var EQ_SCENES = ["全部","宿舍","健身房"];
var EQ_MUSCLES = ["全部","肩","臂","胸","背","腿","臀","核心","心肺"];
var EQUIPMENT = [
  {
    id:"eq01", name:"可调哑铃", scene:"宿舍", muscles:["肩","臂"], loadType:"dumbbell", step:2.5, unit:"kg/只",
    actions:[
      {
        id:"eq01a1", name:"坐姿推举", lv:"mid", sets:3, lo:10, hi:12, rest:60, rec:7.5, animated:true,
        prime:"三角肌前束、肱三头肌",
        prepare:"坐实凳面，腰背贴紧靠垫，双脚踩实；哑铃置于肩侧，掌心朝前，肘在铃下方。",
        steps:["发力推起至手臂接近伸直，肘关节不锁死","控制下放，铃回到肩侧","节奏约2秒上、2秒下，不借腿蹬"],
        breath:"上推时呼气，下放时吸气",
        errors:["塌腰把肚子顶出去","肘关节完全锁死借力","下放时铃自由下坠、靠弹起完成"],
        safety:"有肩伤史者先减量或改绳索推举；手腕保持中立、不向后翻。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M62 92h44M84 92v28M104 58v34"/>
             <g class="eq-man"><circle class="hd" cx="84" cy="56" r="7"/><path d="M84 63v29M84 92h24M108 92v25M84 70L74 80L78 68M84 70L94 80L90 68"/><path class="dumb" d="M72 67h11M87 67h11"/></g>`,
          b:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M62 92h44M84 92v28M104 58v34"/>
             <g class="eq-man"><circle class="hd" cx="84" cy="56" r="7"/><path d="M84 63v29M84 92h24M108 92v25M84 70L78 42M84 70L90 42"/><path class="dumb" d="M72 41h11M87 41h11"/></g>`
        }
      },
      {
        id:"eq01a2", name:"弯举", lv:"easy", sets:3, lo:10, hi:12, rest:60, rec:7.5, animated:false,
        prime:"肱二头肌",
        prepare:"站直，肩胛下沉，大臂贴住身体两侧不动，掌心朝前，哑铃垂在大腿前。",
        steps:["只动肘关节，把铃弯举到肩前","顶端停1秒，主动控制下放到底","大臂全程不前后晃，不借腰甩"],
        breath:"上卷呼气，下放吸气",
        errors:["大臂离开身体前后摆动","手腕内勾","下放时直接丢掉张力"],
        safety:"肘痛时减轻重量；左右可交替做，避免身体扭转代偿。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="34" r="7"/><path d="M80 41v48M80 89L72 118M80 89L88 118M80 50L72 78L79 59M80 50L88 78L81 59"/><path class="dumb" d="M74 58h12"/></g>`
        }
      },
      {
        id:"eq01a3", name:"哑铃卧推", lv:"mid", sets:3, lo:8, hi:12, rest:75, rec:7.5, animated:false,
        prime:"胸大肌、三角肌前束、肱三头肌",
        prepare:"仰卧平板凳，双脚踩实；双手各握一铃于胸侧，肘约45°后展。",
        steps:["缓慢下放至胸侧，感受胸部拉伸","推起时想象胸部主动收缩，顶端肘不完全锁死","下放2秒、推起1秒，不借腰晃"],
        breath:"推起呼气，下放吸气",
        errors:["手肘外展成90°伤肩","只推不夹胸","借助身体晃动借力"],
        safety:"放下哑铃双手对称发力；大重量建议有人保护。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/>
             <path class="eq-eqline" d="M50 100h60M56 100v18M104 100v18"/>
             <g class="eq-man"><circle class="hd" cx="54" cy="90" r="6"/><path d="M60 92h40M100 92L104 118M60 92L56 118M70 92L70 74M90 92L90 74"/><path class="dumb" d="M64 72h12M84 72h12"/></g>`
        }
      }
    ]
  },
  {
    id:"eq02", name:"高位下拉", scene:"健身房", muscles:["背"], loadType:"plate", step:5, unit:"kg配重",
    actions:[
      {
        id:"eq02a1", name:"高位下拉", lv:"easy", sets:3, lo:12, hi:15, rest:75, rec:20, animated:true,
        prime:"背阔肌、斜方肌中下束、肱二头肌",
        prepare:"坐好后大腿卡在固定垫下；双手略宽于肩握住横杆，身体微后仰约10度，挺胸。",
        steps:["肩胛先下沉，肘向腰两侧带","把横杆拉到锁骨上方，背阔收住","控制回放至手臂接近伸直，肩胛不耸起"],
        breath:"下拉呼气，回放吸气",
        errors:["身体大幅后仰靠体重压","耸肩用手臂硬拽","回放时完全放松让肩耸到耳朵"],
        safety:"重量以能控制回放为准；腰部不适就减小后仰幅度。器械调节件、立柱与插销使用前确认到位。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M30 26h100M30 26v94M130 26v94M62 84h36M62 92h36M80 92v28M80 26v30M68 56h24"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="70" r="6"/><path d="M80 76v16M80 92h20M100 92v25M80 78L70 56M80 78L90 56"/></g>`,
          b:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M30 26h100M30 26v94M130 26v94M62 84h36M62 92h36M80 92v28M80 26v44M70 70h20"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="70" r="6"/><path d="M80 76v16M80 92h20M100 92v25M80 78L68 66M80 78L92 66"/></g>`
        }
      }
    ]
  },
  {
    id:"eq03", name:"弹力带", scene:"宿舍", muscles:["背","腿","臀"], loadType:"body", step:0, unit:"",
    actions:[
      {
        id:"eq03a1", name:"坐姿划船", lv:"easy", sets:3, lo:12, hi:15, rest:60, rec:0, animated:false,
        prime:"背阔肌、菱形肌、肱二头肌",
        prepare:"坐地，双脚踏住弹力带中段，膝盖微屈；双手握把，腰背挺直微后倾。",
        steps:["肩胛先后收，肘贴身体两侧向后拉","把手拉到下腹，两肩胛骨夹住","控制前伸回到起点，不耸肩"],
        breath:"后拉呼气，前伸吸气",
        errors:["身体前后大幅晃动","肘外翻变成抬肩","拉到底时耸肩"],
        safety:"选择拉到末端仍有余量的阻力带；带子在脚下踩实，防止回弹。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/>
             <path class="eq-band" d="M115 98L86 88"/>
             <g class="eq-man"><circle class="hd" cx="72" cy="58" r="7"/><path d="M72 65v28M72 93L115 98M115 98l6 3M72 72L70 86L86 88M72 72L74 86L86 88"/></g>`
        }
      },
      {
        id:"eq03a2", name:"带阻深蹲", lv:"easy", sets:3, lo:15, hi:20, rest:60, rec:0, animated:true,
        prime:"股四头肌、臀大肌",
        prepare:"双脚与肩同宽踩住弹力带，双手握带抬到肩前，挺胸，重心在足中。",
        steps:["屈膝屈髋同时下蹲，大腿尽量与地面平行","膝盖方向与脚尖一致，不内扣","脚跟蹬地站起，臀腿同时收紧"],
        breath:"下蹲吸气，站起呼气",
        errors:["脚跟离地","膝盖内扣","弯腰含胸、弓背下蹲"],
        safety:"膝痛者减小幅度、先对墙练习；带子有破损裂纹立即更换。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-band" d="M73 118L80 54M87 118L80 54"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="32" r="7"/><path d="M80 39v50M80 89L73 118M80 89L87 118M80 54h22"/></g>`,
          b:`<path class="eq-floor" d="M14 120h132"/><path class="eq-band" d="M64 118L80 64M96 118L80 64"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="44" r="7"/><path d="M80 51v44M80 95L64 95L64 118M80 95L96 95L96 118M80 64h22"/></g>`
        }
      }
    ]
  },
  {
    id:"eq04", name:"杠铃", scene:"健身房", muscles:["腿","胸","背"], loadType:"barbell", step:2.5, unit:"kg总重",
    actions:[
      {
        id:"eq04a1", name:"杠铃深蹲", lv:"easy", sets:3, lo:10, hi:12, rest:90, rec:20, animated:false, lvW:{easy:20},
        prime:"股四头肌、臀大肌、核心",
        prepare:"双脚与肩同宽脚尖微外展，杠铃置斜方肌上；挺胸收腹目视前方。",
        steps:["屈髋屈膝缓慢下蹲至大腿与地面平行或稍低","膝盖方向始终与脚尖一致，不内扣","脚跟发力蹬起回到起始位，重心压在脚掌中部"],
        breath:"下蹲吸气，蹬起呼气",
        errors:["膝盖内扣","弓腰驼背","脚跟离地重心前移"],
        safety:"首次上重量务必找保护者，或使用深蹲架安全杠；先空杆掌握轨迹。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M40 34v86M120 34v86M40 50h80"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="46" r="7"/><path d="M80 53v18M80 71L68 90M80 71L92 90M68 90v28M92 90v28M71 58h18"/></g>`
        }
      },
      {
        id:"eq04a2", name:"杠铃卧推", lv:"mid", sets:3, lo:8, hi:12, rest:90, rec:30, animated:false,
        prime:"胸大肌、肱三头肌、三角肌前束",
        prepare:"仰卧凳上双脚踩实，双手略宽于肩握杠；起杆后移到胸正上方。",
        steps:["缓慢下放杠至胸中上部，轻触不砸","发力推起至手臂接近伸直，肘不锁死","全程肩胛收紧贴凳，杠走直线"],
        breath:"推起呼气，下放吸气",
        errors:["杠下放砸胸","肘完全锁死","身体离凳借力"],
        safety:"大重量必须保护者；无人保护不做力竭组。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M40 40v78M120 40v78M40 56h80"/>
             <g class="eq-man"><circle class="hd" cx="54" cy="88" r="6"/><path d="M60 92h40M100 92L104 118M60 92L56 118M70 92L70 70M90 92L90 70"/><path class="dumb" d="M62 66h16M82 66h16"/></g>`
        }
      }
    ]
  },
  {
    id:"eq05", name:"卧推架 / 深蹲架", scene:"健身房", muscles:["胸","腿"], loadType:"barbell", step:2.5, unit:"kg总重",
    actions:[
      {
        id:"eq05a1", name:"架内卧推", lv:"easy", sets:3, lo:8, hi:12, rest:90, rec:20, animated:false, lvW:{easy:20},
        prime:"配套杠铃卧推（胸）",
        prepare:"杠铃挂钩调到胸/肩附近高度；躺好后双手对称握杠。",
        steps:["对称发力起杆，向后退一步站稳","下放推起同杠铃卧推","结束后对称把杠回挂，听咔哒到位"],
        breath:"推起呼气，下放吸气",
        errors:["挂钩高度不当起杆吃力","起杆不平衡","独自挑战大重量"],
        safety:"深蹲务必使用防摔安全杠；切勿无人保护做力竭卧推。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M34 34v84M126 34v84M34 52h92M50 100h60M56 100v18M104 100v18"/>
             <g class="eq-man"><circle class="hd" cx="54" cy="88" r="6"/><path d="M60 92h40M100 92L104 118M60 92L56 118M70 92L70 70M90 92L90 70"/></g>`
        }
      }
    ]
  },
  {
    id:"eq06", name:"史密斯机", scene:"健身房", muscles:["腿","胸","肩"], loadType:"barbell", step:2.5, unit:"kg总重",
    actions:[
      {
        id:"eq06a1", name:"史密斯机深蹲", lv:"easy", sets:3, lo:10, hi:12, rest:90, rec:20, animated:false, lvW:{easy:20},
        prime:"股四头肌、臀大肌",
        prepare:"杠铃调至肩高，双脚踏于杠下略前位置；学会旋转解锁与锁回。",
        steps:["挺直躯干下蹲，背部贴杆、膝盖不内扣","底部稍停顿发力上推","站稳后再把杠锁回轨道"],
        breath:"下蹲吸气，站起呼气",
        errors:["站位过前或过后扭腰","忽略锁杠操作","依赖器械核心偷懒"],
        safety:"固定轨迹不等于可随意加重量；仍要循序渐进并留意关节锁定风险。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M52 30v88M52 52h56M108 30v88"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="46" r="7"/><path d="M80 53v18M80 71L68 90M80 71L92 90M68 90v28M92 90v28M71 58h18"/></g>`
        }
      }
    ]
  },
  {
    id:"eq07", name:"龙门架 / 绳索", scene:"健身房", muscles:["背","臂"], loadType:"cable", step:5, unit:"kg配重",
    actions:[
      {
        id:"eq07a1", name:"绳索下拉", lv:"easy", sets:3, lo:12, hi:15, rest:75, rec:15, animated:false, lvW:{easy:15},
        prime:"背阔肌、肱二头肌",
        prepare:"坐稳、大腿被挡板压住；双手宽握横杆，肩胛下沉。",
        steps:["背部发力把横杆拉到胸口上方","缓慢放回感受背部拉伸","全程不身体后仰借力"],
        breath:"下拉呼气，回放吸气",
        errors:["大幅后仰借力","耸肩","快速甩放回程"],
        safety:"调节滑轮高度与身体对齐；可戴手套防磨手。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M36 26v92M36 30h60M96 30L88 58"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="66" r="6"/><path d="M80 72v18M80 90h18M98 90v28M80 74L88 58"/></g>`
        }
      },
      {
        id:"eq07a2", name:"绳索下压", lv:"mid", sets:3, lo:12, hi:15, rest:60, rec:20, animated:false, lvW:{easy:15},
        prime:"肱三头肌",
        prepare:"站姿，肘贴身体两侧，双手握绳/杆于胸前。",
        steps:["前臂下压到手臂接近伸直","顶峰收缩1秒","控制回程不甩"],
        breath:"下压呼气，回放吸气",
        errors:["肘离开身体","身体前倾借力","回程失控"],
        safety:"重量以能全程控制为准。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M36 26v92M36 30h40M76 30L80 58"/>
             <g class="eq-man"><circle class="hd" cx="96" cy="46" r="6"/><path d="M96 52v34M96 86L88 116M96 86L104 116M96 58L82 66L80 58"/></g>`
        }
      }
    ]
  },
  {
    id:"eq08", name:"引体向上架", scene:"健身房", muscles:["背","臂"], loadType:"body", step:0, unit:"",
    actions:[
      {
        id:"eq08a1", name:"弹力带辅助引体", lv:"easy", sets:3, lo:5, hi:8, rest:90, rec:0, animated:false,
        prime:"背阔肌、肱二头肌、握力",
        prepare:"弹力带挂杠踩稳，双手略比肩宽正握；肩胛先下沉。",
        steps:["背部发力把下颌拉过杠面","缓慢下放到手臂接近伸直","全程身体稳定不摆动"],
        breath:"上拉呼气，下放吸气",
        errors:["荡秋千靠惯性","只拉一半","耸肩用斜方肌硬扛"],
        safety:"拉不动就加辅助或做反向划船过渡；可使用助力带。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M40 30h80"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="52" r="6"/><path d="M80 58v26M80 84L72 112M80 84L88 112M74 44L74 30M86 44L86 30"/></g>`
        }
      },
      {
        id:"eq08a2", name:"标准引体向上", lv:"mid", sets:3, lo:3, hi:8, rest:120, rec:0, animated:false,
        prime:"背阔肌、菱形肌、肱二头肌",
        prepare:"正握略比肩宽，收紧核心肩胛下沉。",
        steps:["背部发力拉至下颌过杠","控制下降到手臂伸直（微弯）","完成 3-5 个即可进阶负重"],
        breath:"上拉呼气，下放吸气",
        errors:["摆动借力","半程","耸肩"],
        safety:"握不住用助力带；下降过程始终保持控制。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M40 30h80"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="42" r="6"/><path d="M80 48v24M80 72L72 104M80 72L88 104M74 36L74 30M86 36L86 30"/></g>`
        }
      }
    ]
  },
  {
    id:"eq09", name:"跑步机", scene:"健身房", muscles:["心肺"], loadType:"cardio", step:5, unit:"分钟",
    actions:[
      {
        id:"eq09a1", name:"快走 / 慢跑", lv:"easy", sets:1, lo:20, hi:30, rest:0, rec:20, animated:false, durMin:true,
        prime:"心肺耐力、下肢",
        prepare:"从低速起步踩上跑带站稳再提速；认识急停开关位置。",
        steps:["上身直立微前倾，目视前方摆臂自然","脚掌中部先着地，膝盖微屈缓冲","结束前先减速让心率平缓下降"],
        breath:"保持节奏呼吸，能说话的强度为宜",
        errors:["跳上跑台","抓着扶手跑","低头看手机"],
        safety:"穿跑步鞋；急停开关先找到位置；不适立即停止。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M40 100h84M48 100l10-14M118 100l-10-14"/>
             <g class="eq-man"><circle class="hd" cx="80" cy="42" r="6"/><path d="M80 48v26M80 74L68 92M80 74L94 90M68 92L62 112M94 90L100 112M72 54L90 62M72 54L60 64"/></g>`
        }
      }
    ]
  },
  {
    id:"eq10", name:"椭圆机", scene:"健身房", muscles:["心肺","腿","臀"], loadType:"cardio", step:5, unit:"分钟",
    actions:[
      {
        id:"eq10a1", name:"低阻力匀速踩踏", lv:"easy", sets:1, lo:20, hi:30, rest:0, rec:20, animated:false, durMin:true,
        prime:"心肺、下肢、核心",
        prepare:"双脚踏稳踏板，双手轻握动把；阻力从 1-3 档开始。",
        steps:["大腿主动下压配合手臂推拉，动作圆润不断线","全程双脚不离踏板","身体直立核心收紧不左右摆"],
        breath:"节奏呼吸，可边踩边说话",
        errors:["身体左右摇摆","脚尖点地","阻力过大卡顿"],
        safety:"对膝盖冲击小，适合减脂；饭后适度进行。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M56 100a24 16 0 1 0 48 0a24 16 0 1 0 -48 0M48 44h20M48 44v56"/>
             <g class="eq-man"><circle class="hd" cx="92" cy="40" r="6"/><path d="M92 46v28M92 74L72 88M92 74L108 66M72 88L64 114M72 88L84 100M68 50L92 58"/></g>`
        }
      }
    ]
  },
  {
    id:"eq11", name:"动感单车", scene:"健身房", muscles:["心肺","腿","臀"], loadType:"cardio", step:5, unit:"分钟",
    actions:[
      {
        id:"eq11a1", name:"匀速骑行", lv:"easy", sets:1, lo:20, hi:30, rest:0, rec:20, animated:false, durMin:true,
        prime:"心肺、股四头肌、臀肌",
        prepare:"调座椅：踩到最低点膝盖微屈不锁死；带好水。",
        steps:["腿部循环画圆，脚掌踩实不用脚尖猛踩","挺胸收腹双肘微屈握把放松","站姿骑行时重心在腿上不晃身"],
        breath:"跟随踏频呼吸，出汗多及时补水",
        errors:["座椅过高过低","身体过度前趴","站姿大幅晃身"],
        safety:"过度疲劳及时降速；课前带水。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M52 96a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M84 96h24M84 96L76 60M76 60h20M96 60L84 96M96 60v36"/>
             <g class="eq-man"><circle class="hd" cx="70" cy="44" r="6"/><path d="M70 50v24M70 74L84 96M70 54L84 62"/></g>`
        }
      }
    ]
  },
  {
    id:"eq12", name:"瑜伽垫 / 徒手", scene:"宿舍", muscles:["核心","胸","臀"], loadType:"body", step:0, unit:"",
    actions:[
      {
        id:"eq12a1", name:"平板支撑", lv:"easy", sets:3, lo:30, hi:60, rest:45, rec:0, animated:false, durSec:true,
        prime:"核心（腹直肌、腹斜肌）",
        prepare:"前臂撑地肘在肩正下方，双腿伸直脚尖着地。",
        steps:["身体呈一条直线，收紧腹部与臀部","自然呼吸不憋气，颈肩放松","塌腰或拱臀即为不合格，腹部发抖前停止"],
        breath:"自然呼吸，不憋气",
        errors:["塌腰下背下陷","臀部过高拱背","憋气硬撑"],
        safety:"垫面防滑、厚度6-8mm；下背痛立刻停止。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/>
             <g class="eq-man"><circle class="hd" cx="52" cy="88" r="6"/><path d="M58 94h44M102 94v14M58 94v14M62 100L48 112M58 88v6"/></g>`
        }
      },
      {
        id:"eq12a2", name:"跪姿俯卧撑", lv:"easy", sets:3, lo:10, hi:15, rest:60, rec:0, animated:false,
        prime:"胸大肌、肱三头肌",
        prepare:"双膝着地交叉小腿，双手略宽于肩撑地。",
        steps:["屈肘下放至胸近垫面","推起回到直臂支撑","全程身体从头到膝呈直线"],
        breath:"下放吸气，推起呼气",
        errors:["塌腰","肘外展过大","只做半程"],
        safety:"手腕不适改用握拳或俯卧撑支架。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/>
             <g class="eq-man"><circle class="hd" cx="44" cy="76" r="6"/><path d="M50 82L94 94M94 94v12M50 82L46 100M46 100v14M62 90v14"/></g>`
        }
      },
      {
        id:"eq12a3", name:"标准俯卧撑", lv:"mid", sets:3, lo:8, hi:15, rest:60, rec:0, animated:false,
        prime:"胸大肌、肱三头肌、核心",
        prepare:"双手略宽于肩撑地，身体从头到脚呈直线。",
        steps:["屈肘下放至胸离垫一拳","推起回到直臂","核心收紧不塌腰不撅臀"],
        breath:"下放吸气，推起呼气",
        errors:["塌腰","半程","耸肩"],
        safety:"做不动回到跪姿过渡。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/>
             <g class="eq-man"><circle class="hd" cx="40" cy="72" r="6"/><path d="M46 78L100 92M100 92v14M46 78L40 114M58 86v14"/></g>`
        }
      },
      {
        id:"eq12a4", name:"臀桥", lv:"easy", sets:3, lo:12, hi:15, rest:45, rec:0, animated:false,
        prime:"臀大肌、腘绳肌",
        prepare:"仰卧屈膝脚踩垫，双手放体侧。",
        steps:["臀部发力把髋顶起至肩膝一线","顶端夹臀停1秒","缓慢下放腰不塌"],
        breath:"顶起呼气，下放吸气",
        errors:["腰部代偿顶太高","双脚距离不当","用脚尖蹬"],
        safety:"腰部不适减小幅度。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/>
             <g class="eq-man"><circle class="hd" cx="50" cy="94" r="6"/><path d="M56 100L88 86M88 86L104 100M104 100v14M56 100v14"/></g>`
        }
      }
    ]
  },
  {
    id:"eq13", name:"腿举机", scene:"健身房", muscles:["腿","臀"], loadType:"plate", step:5, unit:"kg配重",
    actions:[
      {
        id:"eq13a1", name:"腿举", lv:"easy", sets:3, lo:12, hi:15, rest:90, rec:40, animated:false, lvW:{easy:40},
        prime:"股四头肌、臀大肌",
        prepare:"背臀贴靠靠垫，双脚与肩同宽踩踏板；松开安全销。",
        steps:["屈膝下放到约90度，膝盖不内扣","脚掌中部发力蹬起至接近伸直不锁死","控制回放不完全卸力"],
        breath:"蹬起呼气，回放吸气",
        errors:["膝盖内扣","腰臀离垫","锁膝耸肩"],
        safety:"双手扶稳把手；回放不放到底保持张力。",
        poses:{
          a:`<path class="eq-floor" d="M14 120h132"/><path class="eq-eqline" d="M40 40L60 100M40 40h16M52 70h56M52 70v14M96 100h24"/>
             <g class="eq-man"><circle class="hd" cx="60" cy="62" r="6"/><path d="M66 68L92 84M92 84L108 96M66 68L58 96M58 96v18"/></g>`
        }
      }
    ]
  }
];

/* ============ 大学生健身指南 · 常量表（内容源：《大学生健身指南.md》） ============ */
var LV = {
  easy: { name:"入门", mark:"🟢", factor:1.0 },
  mid:  { name:"进阶", mark:"🟡", factor:1.15 },
  hard: { name:"高级", mark:"🔴", factor:1.3 }
};
var LV_ORDER = ["easy", "mid", "hard"];
/* 经验档 → 默认难度（同轴映射，不做两套体系） */
var EXP_TO_LV = { fresh:"easy", novice:"mid", intermediate:"hard" };
var EXP_LABEL = { fresh:"零基础", novice:"练过 1–3 个月", intermediate:"半年以上" };
var SAFETY_RULES = [
  "先热身再训练：5–10 分钟轻量热身，动态拉伸在前",
  "用能力范围内重量：能标准完成 8–12 次、最后 1–2 次略费力",
  "大重量必须保护者：杠铃卧推/深蹲等力竭动作务必有人看护或用安全杠",
  "保持动作标准：宁可减重，也不要学会错误动作",
  "学会急停：跑步机/单车先认识急停开关位置",
  "检查器材：哑铃锁扣、卡扣、轨道完好再上",
  "发力呼气、还原吸气，避免长时间憋气",
  "头晕、胸闷、剧痛立即停止，必要时就医",
  "睡够 + 补水，训练后补充蛋白质",
  "训练后做静态拉伸，帮助恢复"
];
var WARMUP = [
  { t:"全身升温 3–5 分钟", d:"快走 / 慢跑 / 开合跳" },
  { t:"动态拉伸 2–3 分钟", d:"摆臂、高抬腿、弓步转体、肩绕环" },
  { t:"专项激活 2 分钟", d:"训练部位轻重量动作（空手深蹲、轻哑铃推举）" }
];
var COOLDOWN = [
  { m:"胸肩", d:"门框胸大肌拉伸 20–30 秒 × 2" },
  { m:"背", d:"婴儿式 / 猫牛式 20–30 秒 × 2" },
  { m:"腿前侧", d:"站立拉股四头肌 20–30 秒 × 2" },
  { m:"腿后侧", d:"坐姿前屈、直腿压腿 20–30 秒 × 2" },
  { m:"臀部", d:"坐姿4字抱膝、鸽子式 20–30 秒 × 2" }
];
/* 新手周计划（指南第八章，全部 🟢）：dow=星期几(1/3/5) */
var WEEK_PLAN = [
  { dow:1, name:"周一 · 腿+推", mins:50, acts:["eq06a1","eq01a3","eq13a1","eq12a1"] },
  { dow:3, name:"周三 · 有氧+背肩", mins:45, acts:["eq09a1","eq02a1","eq01a1"] },
  { dow:5, name:"周五 · 有氧+臂+核心", mins:45, acts:["eq10a1","eq07a2","eq12a2","eq12a1"] }
];

function findAct(id){
  for (var i = 0; i < EQUIPMENT.length; i++){
    var as = EQUIPMENT[i].actions;
    for (var j = 0; j < as.length; j++) if (as[j].id === id) return { eq:EQUIPMENT[i], act:as[j] };
  }
  return null;
}
/* 某动作的卡内交互态：当前重量、每组次数、每组完成情况 */
function eqUI(act){
  var ui = state.trainUI[act.id];
  if (!ui) { ui = { w:act.rec, reps:[], done:[] }; state.trainUI[act.id] = ui; }
  while (ui.reps.length < act.sets){ ui.reps.push(act.lo); ui.done.push(false); }
  return ui;
}
/* 重量向下吸附到器材步进网格，宁轻勿重；step/loadType 在器材级 */
function eqSnap(eq, w){
  if (eq.loadType === "body") return 0;
  var s = eq.step || 2.5;
  return r1(Math.floor((num(w, 0) + 1e-9) / s) * s);
}
function eqTotals(){
  var sets = 0, ton = 0;
  EQUIPMENT.forEach(function(e){
    e.actions.forEach(function(a){
      var ui = state.trainUI[a.id]; if (!ui) return;
      for (var i = 0; i < ui.done.length; i++){
        if (!ui.done[i]) continue;
        sets++;
        if (e.loadType === "body") continue;
        var mult = e.loadType === "dumbbell" ? 2 : 1;   /* 哑铃按双只计容量 */
        ton += num(ui.w, a.rec) * num(ui.reps[i], a.lo) * mult;
      }
    });
  });
  return { sets:sets, ton:Math.round(ton) };
}

function renderTrain(){
  var v = $("view-train");
  restoreTrain();
  EQUIPMENT.forEach(function(e){ e.actions.forEach(function(a){ eqUI(a); }); });
  var t = eqTotals(), h = "";

  h += '<div class="hero"><div class="l">今日训练</div>'
     + '<div class="v">' + t.sets + ' <small>组</small></div>'
     + '<div class="l mt6">训练容量 ' + t.ton + ' kg · 哑铃按双只计 · 有氧按时长计</div></div>';

  h += weekPlanHTML();

  h += '<div class="card"><div class="chips">' + EQ_SCENES.map(function(s){
        return '<button type="button" class="chip" data-act="eqScene" data-v="' + s + '" aria-pressed="' + (state.trainScene === s) + '">' + s + '</button>';
      }).join("") + '</div>'
     + '<div class="chips mt10">' + EQ_MUSCLES.map(function(m){
        return '<button type="button" class="chip" data-act="eqMuscle" data-v="' + m + '" aria-pressed="' + (state.trainMuscle === m) + '">' + m + '</button>';
      }).join("") + '</div>'
     + '<div class="chips mt10">' + ["全部"].concat(LV_ORDER).map(function(lv){
        var lbl = lv === "全部" ? "全部难度" : (LV[lv].mark + LV[lv].name);
        return '<button type="button" class="chip" data-act="eqLv" data-v="' + lv + '" aria-pressed="' + (state.trainLv === lv) + '">' + lbl + '</button>';
      }).join("") + '</div></div>';

  var list = EQUIPMENT.filter(function(e){
    if (state.trainScene !== "全部" && e.scene !== state.trainScene) return false;
    if (state.trainMuscle !== "全部" && e.muscles.indexOf(state.trainMuscle) < 0) return false;
    if (state.trainLv !== "全部" && !e.actions.some(function(a){ return (a.lv || "easy") === state.trainLv; })) return false;
    return true;
  });
  if (!list.length) h += '<div class="card"><div class="empty">该分类下没有器材，换个筛选试试。</div></div>';
  list.forEach(function(e){ h += eqCardHTML(e); });

  /* 热身 / 拉伸 */
  h += warmupHTML();

  /* 安全规范（可折叠） */
  h += '<div class="card"><div class="row-between"><span class="f-number">通用安全规范</span>'
     + '<button type="button" class="mini' + (state.trainSafety ? " on" : "") + '" data-act="trainSafety">' + (state.trainSafety ? "收起" : "展开") + '</button></div>';
  if (state.trainSafety) {
    h += '<ol style="margin:8px 0 0;padding-left:18px;">' + SAFETY_RULES.map(function(s){ return '<li style="margin:4px 0;">' + esc(s) + '</li>'; }).join("") + '</ol>';
  }
  h += '</div>';

  /* 器材速查表（可折叠） */
  h += '<div class="card"><div class="row-between"><span class="f-number">器材速查表</span>'
     + '<button type="button" class="mini' + (state.trainRef ? " on" : "") + '" data-act="trainRef">' + (state.trainRef ? "收起" : "展开") + '</button></div>';
  if (state.trainRef) {
    EQUIPMENT.forEach(function(e){
      var lvTxt = e.actions.map(function(a){ return LV[a.lv || "easy"] ? LV[a.lv].mark : ""; }).join("");
      h += '<div class="item"><div class="in"><div class="nm">' + esc(e.name)
         + '<span class="tag m">' + e.scene + '</span></div>'
         + '<div class="ds">' + e.muscles.join(" / ") + '</div></div>'
         + '<span class="kc">' + lvTxt + '</span></div>';
    });
  }
  h += '</div>';

  h += '<div class="footnote">第 1–2 周全用 🟢 入门；3–6 周引入 🟡；7 周后少量 🔴 且务必有人保护。坚持比强度重要。</div>';
  v.innerHTML = h;
}

/* 今日 draft ↔ 当日库恢复/落盘 */
function restoreTrain(){
  var d = todayKey();
  if (!DB.workouts || !DB.workouts[d] || !Array.isArray(DB.workouts[d])) return;
  DB.workouts[d].forEach(function(s){
    if (state.trainUI[s.actId]) return;
    var f = findAct(s.actId); if (!f) return;
    var ui = { w: s.sets.length ? num(s.sets[0].w, f.act.rec) : f.act.rec, reps: [], done: [] };
    s.sets.forEach(function(x){ ui.reps.push(num(x.r, f.act.lo)); ui.done.push(!!x.done); });
    while (ui.reps.length < f.act.sets){ ui.reps.push(f.act.lo); ui.done.push(false); }
    state.trainUI[s.actId] = ui;
  });
}
function persistTrain(eqId, actId){
  var ui = state.trainUI[actId]; if (!ui) return;
  var f = findAct(actId); if (!f) return;
  var d = todayKey();
  if (!DB.workouts[d] || !Array.isArray(DB.workouts[d])) DB.workouts[d] = [];
  var ses = null;
  DB.workouts[d].forEach(function(s){ if (s.actId === actId) ses = s; });
  if (!ses) { ses = { sid: uid(), eqId: eqId, actId: actId, loadType: f.eq.loadType, unit: f.eq.unit, sets: [], ts: Date.now() }; DB.workouts[d].push(ses); }
  ses.sets = [];
  for (var i = 0; i < ui.done.length; i++) ses.sets.push({ w: num(ui.w, 0), r: num(ui.reps[i], 0), done: !!ui.done[i] });
  save();
}

function weekPlanHTML(){
  var dow = new Date().getDay();
  if (state.planSel == null) {
    state.planSel = WEEK_PLAN[0].dow;
    WEEK_PLAN.forEach(function(w){ if (w.dow === dow) state.planSel = w.dow; });
  }
  var tpl = null;
  WEEK_PLAN.forEach(function(w){ if (w.dow === state.planSel) tpl = w; });
  if (!tpl) return "";
  var h = '<div class="card"><h2>本周计划（新手 · 每周 3 次）</h2>'
    + '<div class="chips">' + WEEK_PLAN.map(function(w){
        return '<button type="button" class="chip" data-act="planSel" data-v="' + w.dow + '" aria-pressed="' + (state.planSel === w.dow) + '">' + esc(w.name) + '</button>';
      }).join("") + '</div>'
    + '<div class="f-cap mt6">约 ' + tpl.mins + ' 分钟 · 热身 → 动作 → 拉伸</div>';
  tpl.acts.forEach(function(aid){
    var fa = findAct(aid); if (!fa) return;
    var lv = LV[fa.act.lv || "easy"];
    var repTxt = fa.act.sets + " 组 × " + fa.act.lo + "–" + fa.act.hi + (fa.act.durSec ? " 秒" : (fa.eq.loadType === "cardio" ? " 分钟" : " 次"));
    h += '<div class="item"><div class="in"><div class="nm">' + esc(fa.eq.name + " · " + fa.act.name)
       + (lv ? '<span class="tag b">' + lv.mark + lv.name + '</span>' : '') + '</div>'
       + '<div class="ds">' + repTxt + ' · 组间休 ' + fa.act.rest + 's</div></div></div>';
  });
  h += '<div class="f-cap mt6">在下方对应器材卡完成组次即自动记录。感觉疲劳就降强度，不逞强。</div></div>';
  return h;
}

function warmupHTML(){
  var h = '<div class="card"><div class="row-between"><span class="f-number">热身 · 练前 5–10 分钟（动态）</span>'
        + '<button type="button" class="mini' + (state.trainWarm ? " on" : "") + '" data-act="trainWarm">' + (state.trainWarm ? "收起" : "展开") + '</button></div>';
  if (state.trainWarm) {
    WARMUP.forEach(function(w){
      h += '<div class="item"><div class="in"><div class="nm">' + esc(w.t) + '</div><div class="ds">' + esc(w.d) + '</div></div></div>';
    });
    h += '<div class="f-cap mt6">运动前用动态拉伸；练后用静态拉伸，顺序别颠倒。</div>';
  }
  h += '</div>';
  h += '<div class="card"><div class="row-between"><span class="f-number">拉伸 · 练后 5–10 分钟（静态）</span>'
     + '<span class="f-cap">按今天练的部位拉</span></div>';
  COOLDOWN.forEach(function(w){
    h += '<div class="item"><div class="in"><div class="nm">' + esc(w.m) + '</div><div class="ds">' + esc(w.d) + '</div></div></div>';
  });
  h += '<div class="f-cap mt6">轻微牵拉感即可，不要拉到疼痛。</div></div>';
  return h;
}

function trainIntroHTML(){
  return '<h2 class="f-title" style="margin:0 0 8px;">训练前 · 安全三句</h2>'
    + '<div class="f-body">① 动作标准比重量重要；② 循序渐进，别第一天就上大重量；③ 大重量务必有人保护。</div>'
    + '<div class="f-cap mt10">选一下你的经验，用来定默认难度（之后可在训练页改）：</div>'
    + Object.keys(EXP_LABEL).map(function(k){
        return '<button type="button" class="btn ghost block sm mt6" data-act="setExp" data-v="' + k + '">' + EXP_LABEL[k] + '</button>';
      }).join("")
    + '<button type="button" class="btn ghost block sm" data-act="closeModal">稍后再说</button>'
    + '<div class="f-cap mt10">本模块为健身记录与一般科普，不构成医疗建议；有伤病史先咨询校医。</div>';
}

function eqStageSVG(act){
  var s = '<svg viewBox="0 0 160 140" role="img" aria-label="' + esc(act.name) + '动作示意">';
  s += '<g class="pose-a">' + act.poses.a + '</g>';
  if (act.poses.b) s += '<g class="pose-b">' + act.poses.b + '</g>';
  return s + '</svg>';
}

function eqCardHTML(e){
  var selId = state.trainSelAct[e.id] || e.actions[0].id;
  var act = e.actions.filter(function(a){ return a.id === selId; })[0] || e.actions[0];
  var ui = eqUI(act);
  var lv = LV[act.lv || "easy"] || LV.easy;
  var h = '<div class="card"><div class="row-between">'
       +  '<div class="f-number">' + esc(e.name) + '</div>'
       +  '<div><span class="tag b">' + lv.mark + lv.name + '</span>'
       +  e.muscles.map(function(m){ return '<span class="tag b">' + m + '</span>'; }).join("")
       +  '<span class="tag m">' + e.scene + '</span></div></div>';

  h += '<div class="eq-stage' + (act.animated && act.poses.b ? ' animated' : '') + '">' + eqStageSVG(act) + '</div>';

  if (e.actions.length > 1){
    h += '<div class="chips">' + e.actions.map(function(a){
      var lm = LV[a.lv || "easy"] ? LV[a.lv || "easy"].mark : "";
      return '<button type="button" class="chip" data-act="eqAct" data-eq="' + e.id + '" data-v="' + a.id + '" aria-pressed="' + (a.id === act.id) + '">' + lm + a.name + '</button>';
    }).join("") + '</div>';
  }

  if (e.loadType === "cardio"){
    h += '<div class="f-cap mt10" style="text-align:center;">有氧动作：目标 ' + act.lo + '–' + act.hi + ' 分钟，不上重量</div>';
  } else if (e.loadType === "body"){
    h += '<div class="f-cap mt10" style="text-align:center;">自重 / 弹力带动作，按组次完成即可</div>';
  } else {
    h += '<div class="f-cap mt10" style="text-align:center;">推荐起步 ' + act.rec + ' ' + e.unit + '（从轻开始，宁轻勿重）</div>'
       + '<div class="eq-load">'
       + '<button type="button" class="step-btn" data-act="eqW" data-v="' + act.id + '" data-d="-1" aria-label="减轻重量">−</button>'
       + '<div class="load-num"><div class="v num">' + r1(ui.w) + '</div><div class="u">' + e.unit + '</div></div>'
       + '<button type="button" class="step-btn" data-act="eqW" data-v="' + act.id + '" data-d="1" aria-label="增加重量">＋</button></div>';
  }

  var repUnit = e.loadType === "cardio" ? " 分钟" : (act.durSec ? " 秒" : " 次");
  h += '<div class="f-cap" style="text-align:center;">目标 ' + act.sets + ' 组 × ' + act.lo + '–' + act.hi + repUnit + ' · 组间休 ' + act.rest + ' 秒</div>';

  for (var i = 0; i < ui.done.length; i++){
    var sx = e.loadType === "cardio" ? '<b class="num">' + r1(ui.reps[i]) + '</b> 分钟'
           : (e.loadType === "body" ? (act.durSec ? '<b class="num">' + ui.reps[i] + '</b> 秒' : "按节奏完成")
                                    : '<b class="num">' + r1(ui.w) + '</b> ' + e.unit);
    h += '<div class="set-row' + (ui.done[i] ? ' done' : '') + '">'
       + '<span class="sn">' + (ui.done[i] ? '✓ ' : '') + '第' + (i + 1) + '组</span>'
       + '<span class="sx">' + sx + '</span>'
       + '<button type="button" class="repbtn" data-act="eqRep" data-v="' + act.id + '" data-i="' + i + '" data-d="-1" aria-label="减少次数">−</button>'
       + '<span class="repnum num">' + ui.reps[i] + '</span>'
       + '<button type="button" class="repbtn" data-act="eqRep" data-v="' + act.id + '" data-i="' + i + '" data-d="1" aria-label="增加次数">＋</button>'
       + '<button type="button" class="mini' + (ui.done[i] ? ' on' : '') + '" data-act="eqSetDone" data-v="' + act.id + '" data-i="' + i + '">' + (ui.done[i] ? "重做" : "完成") + '</button>'
       + '</div>';
  }
  h += '<button type="button" class="eq-addset" data-act="eqAddSet" data-v="' + act.id + '">+ 加一组</button>';

  var open = !!state.trainTut[act.id];
  h += '<button type="button" class="tut-toggle" data-act="eqTut" data-v="' + act.id + '">' + (open ? "收起教程 ▲" : "展开使用教程 ▼") + '</button>';
  if (open){
    h += '<div class="tut-body">'
      + '<h4>目标肌群</h4><div>' + esc(act.prime) + '</div>'
      + '<h4>起始姿势</h4><div>' + esc(act.prepare) + '</div>'
      + '<h4>动作步骤</h4><ul>' + act.steps.map(function(s){ return '<li>' + esc(s) + '</li>'; }).join("") + '</ul>'
      + '<h4>呼吸</h4><div>' + esc(act.breath) + '</div>'
      + '<h4>常见错误</h4><ul>' + act.errors.map(function(s){ return '<li>' + esc(s) + '</li>'; }).join("") + '</ul>'
      + '<h4>安全提示</h4><div>' + esc(act.safety) + '</div>'
      + '</div>';
  }
  h += '</div>';
  return h;
}

/* 训练页自有事件委托：只处理 #view-train 内部，其他点击落回原全局监听 */
document.addEventListener("click", function(ev){
  var tv = $("view-train");
  var el = ev.target.closest ? ev.target.closest("[data-act]") : null;
  if (!tv || !el || !tv.contains(el)) return;
  var act = el.dataset.act, id = el.dataset.v;
  if (act === "eqScene"){ state.trainScene = id; renderTrain(); }
  else if (act === "eqMuscle"){ state.trainMuscle = id; renderTrain(); }
  else if (act === "eqLv"){ state.trainLv = id; renderTrain(); }
  else if (act === "trainWarm"){ state.trainWarm = !state.trainWarm; renderTrain(); }
  else if (act === "trainSafety"){ state.trainSafety = !state.trainSafety; renderTrain(); }
  else if (act === "trainRef"){ state.trainRef = !state.trainRef; renderTrain(); }
  else if (act === "planSel"){ state.planSel = num(id, WEEK_PLAN[0].dow); renderTrain(); }
  else if (act === "eqAct"){ state.trainSelAct[el.dataset.eq] = id; renderTrain(); }
  else if (act === "eqTut"){ state.trainTut[id] = !state.trainTut[id]; renderTrain(); }
  else if (act === "eqW"){
    var f0 = findAct(id); if (!f0) return;
    var ui0 = eqUI(f0.act);
    ui0.w = clamp(eqSnap(f0.eq, num(ui0.w, f0.act.rec) + num(el.dataset.d, 0) * f0.eq.step), 0, 200);
    persistTrain(f0.eq.id, id);
    renderTrain();
  }
  else if (act === "eqRep"){
    var f1 = findAct(id); if (!f1) return;
    var ui1 = eqUI(f1.act), idx1 = num(el.dataset.i, 0);
    ui1.reps[idx1] = clamp(num(ui1.reps[idx1], f1.act.lo) + num(el.dataset.d, 0), 1, 200);
    persistTrain(f1.eq.id, id);
    renderTrain();
  }
  else if (act === "eqSetDone"){
    var f2 = findAct(id); if (!f2) return;
    var ui2 = eqUI(f2.act), idx2 = num(el.dataset.i, 0);
    ui2.done[idx2] = !ui2.done[idx2];
    if (ui2.done.every(Boolean)) toast(f2.act.name + "完成");
    persistTrain(f2.eq.id, id);
    renderTrain();
  }
  else if (act === "eqAddSet"){
    var f3 = findAct(id); if (!f3) return;
    var ui3 = eqUI(f3.act);
    ui3.reps.push(f3.act.lo); ui3.done.push(false);
    persistTrain(f3.eq.id, id);
    renderTrain();
  }
});

/* ============================================================================
