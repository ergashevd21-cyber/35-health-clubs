
(function(){
"use strict";
const REPORT_LOGO="https://static.tildacdn.one/tild3565-3438-4530-b765-303466353035/35HC_badge.png";
const BRAND_GREEN="#147568";
function rEsc(value){
 return String(value===null||value===undefined?"—":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]});
}
function rNum(value,digits){
 if(value===null||value===undefined||value===""||!Number.isFinite(Number(value)))return "—";
 return new Intl.NumberFormat("ru-RU",{minimumFractionDigits:0,maximumFractionDigits:digits===undefined?1:digits}).format(Number(value));
}
function rEnps(value){if(value===null||value===undefined||!Number.isFinite(Number(value)))return "—";return (Number(value)>0?"+":"")+rNum(value,0);}
function rTable(headers,rows,empty){
 if(!rows||!rows.length)return "<p class='empty'>"+rEsc(empty||"В этом периоде пока нет данных для отчёта.")+"</p>";
 return "<div class='table-box'><table><thead><tr>"+headers.map(h=>"<th>"+rEsc(h)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(row=>"<tr>"+row.map(v=>"<td>"+rEsc(v===null||v===undefined?"—":v)+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>";
}
function rSection(title,description,content){
 return "<section class='section'><div class='section-heading'><span class='section-kicker'>35 HEALTH CLUBS</span><h2>"+rEsc(title)+"</h2>"+(description?"<p>"+rEsc(description)+"</p>":"")+"</div>"+content+"</section>";
}
function rMetric(label,value,detail){
 return "<div class='metric'><span class='metric-label'>"+rEsc(label)+"</span><strong>"+rEsc(value)+"</strong><span class='metric-note'>"+rEsc(detail||"")+"</span></div>";
}
function rFrame(title,subtitle,body,reportType){
 const generated=new Date().toLocaleString("ru-RU");
 const styles=":root{--graphite:#55545b;--ink:#34363d;--muted:#68747a;--teal:#39a9a4;--green:#147568;--deep:#10584f;--aqua:#83c9c7;--line:#dce8e6;--soft:#eaf6f5}*{box-sizing:border-box}body{margin:0;background:#f2f7f6;color:var(--ink);font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;font-size:14px}.report{max-width:1080px;margin:32px auto;padding:34px;background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 18px 50px rgba(37,78,74,.12)}.brandline{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:20px;border-bottom:1px solid var(--line)}.brand-left{display:flex;align-items:center;gap:16px;min-width:0}.brand-logo{display:block;width:155px;height:76px;object-fit:cover;background:#fff;border-radius:9px;border:1px solid #edf2f1}.overline,.section-kicker{display:block;color:var(--green);font-size:10px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}.brand-name{font-size:15px;color:var(--graphite);font-weight:850}.meta{font-size:11px;color:var(--muted);text-align:right}.cover{margin:24px 0 20px;padding:28px;background:linear-gradient(125deg,#55545b,#3c6262 52%,#147568);border-radius:18px;color:#fff}.cover .overline{color:#bde7e3}.cover h1{margin:8px 0;font-size:clamp(27px,4vw,38px);line-height:1.12;color:#fff;letter-spacing:-.035em}.cover p{margin:8px 0 0;color:rgba(255,255,255,.85);max-width:760px}.badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.badge{display:inline-block;border-radius:999px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.25);padding:5px 10px;font-size:11px;font-weight:700;color:#fff}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0 8px}.metric{border:1px solid var(--line);border-radius:14px;background:linear-gradient(180deg,#fff,#f7fbfa);padding:16px;min-width:0}.metric-label{display:block;color:var(--muted);font-size:12px;font-weight:700}.metric strong{display:block;color:var(--deep);font-size:27px;line-height:1.2;letter-spacing:-.04em;margin:8px 0;overflow-wrap:anywhere}.metric-note{display:block;color:var(--muted);font-size:11px}.section{margin-top:28px;break-inside:auto}.section-heading{margin-bottom:12px}.section-kicker{font-size:9px;letter-spacing:.12em}.section h2{margin:4px 0 6px;color:var(--graphite);font-size:20px;letter-spacing:-.025em}.section-heading p{margin:0;color:var(--muted);font-size:12px;max-width:850px}.table-box{overflow-x:auto;border:1px solid var(--line);border-radius:12px;margin:12px 0}table{width:100%;border-collapse:separate;border-spacing:0;min-width:540px}th,td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid #e9f0ef}th{font-size:11px;text-transform:none;color:#245b56;background:#e8f4f2;font-weight:850}td{font-size:12px}tbody tr:nth-child(even){background:#f8fbfa}tbody tr:last-child td{border-bottom:0}.empty{padding:13px 15px;border:1px dashed #c7dcda;border-radius:11px;background:#f8fbfa;color:var(--muted);font-size:12px}.insight{border-left:4px solid var(--teal);background:#edf7f6;border-radius:0 12px 12px 0;padding:16px 18px;margin:10px 0}.insight strong{display:block;color:var(--deep);margin-bottom:4px}.actions{margin:0;padding-left:20px}.actions li{margin:8px 0}.method{background:#f7faf9;border:1px solid var(--line);border-radius:13px;padding:16px;color:var(--muted);font-size:11px}.footer{border-top:1px solid var(--line);margin-top:28px;padding-top:14px;color:var(--muted);font-size:10px;display:flex;justify-content:space-between;gap:16px}.toolbar{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:18px auto}.toolbar button{border:0;border-radius:10px;padding:11px 16px;background:var(--green);color:#fff;font-weight:750;font-size:13px;cursor:pointer}.toolbar button.secondary{background:#fff;color:var(--green);border:1px solid #b9d9d5}.trend-up{color:#14734f}.trend-down{color:#b43e3e}.no-print{display:flex}@media(max-width:760px){.report{margin:0 auto;border-radius:0;padding:18px}.brandline{align-items:flex-start;flex-wrap:wrap}.brand-logo{width:125px;height:62px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.metric strong{font-size:23px}.meta{text-align:left}.cover{padding:22px}}@media print{@page{size:A4;margin:14mm}body{background:#fff;font-size:11px}.report{width:100%;max-width:none;margin:0;padding:0;border:0;box-shadow:none;border-radius:0}.cover{print-color-adjust:exact;-webkit-print-color-adjust:exact}.metrics{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{padding:10px;break-inside:avoid}.metric strong{font-size:20px}.section{break-inside:avoid}.table-box{overflow:visible;border-color:#ccd9d7}table{min-width:0}th,td{padding:6px;font-size:9px}th{print-color-adjust:exact;-webkit-print-color-adjust:exact}.no-print{display:none!important}.footer{break-inside:avoid}}";
 return "<!doctype html><html lang='ru'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='color-scheme' content='light'><title>"+rEsc(title)+" — 35 Health Clubs</title><meta name='description' content='"+rEsc(subtitle)+"'><style>"+styles+"</style></head><body><main class='report'><header class='brandline'><div class='brand-left'><img class='brand-logo' src='"+REPORT_LOGO+"' alt='35 Health Clubs'><div><span class='overline'>People &amp; Culture</span><div class='brand-name'>35 HEALTH CLUBS</div><div style='color:var(--muted);font-size:11px'>HR-аналитика · "+rEsc(reportType)+"</div></div></div><div class='meta'>Дата формирования<br><strong>"+rEsc(generated)+"</strong></div></header><section class='cover'><span class='overline'>ОТЧЁТ HR-АНАЛИТИКИ</span><h1>"+rEsc(title)+"</h1><p>"+rEsc(subtitle)+"</p><div class='badges'><span class='badge'>Только агрегированные данные</span><span class='badge'>35 Health Clubs · HR</span></div></section>"+body+"<footer class='footer'><span>35 Health Clubs · People &amp; Culture</span><span>Агрегированный отчёт · не содержит исходных комментариев</span></footer></main><div class='toolbar no-print'><button type='button' onclick='window.print()'>Печать / сохранить в PDF</button><button type='button' class='secondary' onclick='window.close()'>Закрыть отчёт</button></div></body></html>";
}
function rSave(filename,html){
 const blob=new Blob([html],{type:"text/html;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(function(){URL.revokeObjectURL(url);},1500);
}
function rAspectStatus(score){return score<60?"Зона внимания":score<75?"Есть потенциал улучшения":"Относительно сильная сторона";}
function rActions(aspects,comparisonRows){
 const actions=[];
 const advice={
  leadership:"Провести короткие встречи с руководителями и проверить регулярность обратной связи.",
  processes:"Выбрать 2–3 препятствия в рабочих процессах, назначить ответственных и сроки исправления.",
  collaboration:"Проверить передачу задач между отделами и согласовать правила взаимодействия.",
  training:"Проверить программу обучения и готовность сотрудников после обучения.",
  engagement:"Обсудить с командой одну инициативу для улучшения вовлечённости.",
  compensation:"Проверить прозрачность правил оплаты и пересмотра вознаграждения.",
  loyalty:"Проверить, что влияет на готовность рекомендовать компанию как место работы.",
  other:"Уточнить основную причину низкой оценки и согласовать одно действие."
 };
 (aspects||[]).filter(a=>a.score!==null&&a.score!==undefined&&Number(a.score)<60).forEach(a=>{
  if(actions.length<4)actions.push({label:a.label,text:advice[a.id]||advice.other});
 });
 (comparisonRows||[]).filter(r=>r.id!=="mood"&&Number(r.delta)<=-5).forEach(r=>{
  if(actions.length<5&&!actions.some(a=>a.label===r.label))actions.push({label:r.label,text:"Проверить причины снижения и согласовать конкретное действие до следующего замера."});
 });
 if(!actions.length)actions.push({label:"Поддерживать регулярный замер",text:"Сохранить текущие практики и повторно проверить динамику после следующего опроса."});
 return "<ol class='actions'>"+actions.map(a=>"<li><strong>"+rEsc(a.label)+".</strong> "+rEsc(a.text)+"</li>").join("")+"</ol>";
}
function exportCompanyBeautifulHtml(){
 if(typeof lastCompanyOverview==="undefined"||!lastCompanyOverview){alert("Общая аналитика ещё не загрузилась. Обновите страницу и попробуйте снова.");return;}
 const from=document.getElementById("compareMonthFrom")?.value||lastCompanyOverview.previousMonth;
 const to=document.getElementById("compareMonthTo")?.value||lastCompanyOverview.currentMonth;
 const o=lastCompanyOverview,cmp=buildOverviewComparisons(o,from,to);
 const old=cmp.old||{},now=cmp.now||{};
 const fmt=v=>v===null||v===undefined?"—":rNum(v,1);
 const enps=v=>v===null||v===undefined?"—":rEnps(v);
 const responseText=v=>v===null||v===undefined?"Недостаточно данных":String(v);
 const summary=comparisonSummary(cmp);
 const cards="<div class='metrics'>"+
  rMetric("Индекс позитивных оценок · "+monthLabel(to),fmt(now.moodIndex)==="—"?"—":fmt(now.moodIndex)+"/100",now.moodIndex===null||now.moodIndex===undefined?"Недостаточно сопоставимых вопросов":"Ориентир по агрегированным оценкам")+
  rMetric("eNPS · "+monthLabel(to),enps(now.enps?.score),"Только при наличии минимум 5 оценок")+
  rMetric("Ответы · "+monthLabel(from),responseText(old.responses),"Число отправок опросов, не уникальных сотрудников")+
  rMetric("Одинаковых вопросов",cmp.matchedQuestions?String(cmp.matchedQuestions):"—","Основа корректного сравнения")+
 "</div>";
 const insights="<div class='insight'><strong>Краткий вывод</strong><span>"+rEsc(summary)+"</span></div>";
 const compareRows=(cmp.rows||[]).map(r=>[r.label, r.id==="enps"?rEnps(r.previous):rNum(r.previous,1)+(r.id==="mood"?" /100":""),r.id==="enps"?rEnps(r.current):rNum(r.current,1)+(r.id==="mood"?" /100":""),(r.delta>0?"+":"")+(r.id==="enps"?rNum(r.delta,0):rNum(r.delta,1)),trendLabel(r.delta,r.id)]);
 const comparisonTable=rTable(["Аспект","Период 1 · "+monthLabel(from),"Период 2 · "+monthLabel(to),"Изменение","Оценка"],compareRows,"Сравнить периоды пока нельзя: недостаточно одинаковых вопросов с 5 и более ответами.");
 const aspectFor=function(month){
  const data=(o.monthly||[]).find(m=>m.month===month);
  return (data?.aspects||[]).filter(a=>a.score!==null&&a.score!==undefined).sort((a,b)=>Number(a.score)-Number(b.score)).map(a=>[a.label,rNum(a.score,1)+"/100",a.responses??"—",rAspectStatus(Number(a.score))]);
 };
 const currentAspects="<div class='two-tables'>"+rSection("Состояние аспектов · "+monthLabel(from),"Текущая оценка направлений за выбранный период.",rTable(["Направление","Оценка","Ответов","Статус"],aspectFor(from),"В этом периоде нет аспектов с минимум 5 ответами."))+"</div>"+
  rSection("Состояние аспектов · "+monthLabel(to),"Направления отсортированы от более низкой оценки к более высокой.",rTable(["Направление","Оценка","Ответов","Статус"],aspectFor(to),"В этом периоде нет аспектов с минимум 5 ответами."));
 const surveyRows=(typeof lastSurveyList!=="undefined"?(lastSurveyList||[]):[]).map(s=>[
  s.title,s.status||"—",
  s.monthlyResponseCounts?.[from]===null||s.monthlyResponseCounts?.[from]===undefined?"—":s.monthlyResponseCounts[from],
  s.monthlyResponseCounts?.[to]===null||s.monthlyResponseCounts?.[to]===undefined?"—":s.monthlyResponseCounts[to],
  s.monthlyResponseCounts?.[from]!==null&&s.monthlyResponseCounts?.[from]!==undefined&&s.monthlyResponseCounts?.[to]!==null&&s.monthlyResponseCounts?.[to]!==undefined?"Можно сравнить объём ответов":"Мало ответов в одном из периодов"
 ]);
 const surveyTable=rSection("Сравнение опросов","Количество ответов скрывается, если за месяц меньше 5 отправок.",rTable(["Опрос","Статус","Ответы · "+monthLabel(from),"Ответы · "+monthLabel(to),"Комментарий"],surveyRows,"Нет опубликованных опросов."));
 const recommendations=rSection("Что стоит проверить в первую очередь","Это направления для проверки, а не утверждение о причине проблемы.",rActions((now.aspects||[]),cmp.rows));
 const historyRows=(o.monthly||[]).filter(m=>m.responses!==null&&m.responses!==undefined||m.moodIndex!==null&&m.moodIndex!==undefined||m.enps?.score!==null&&m.enps?.score!==undefined).map(m=>[monthLabel(m.month),m.responses??"—",m.moodIndex===null||m.moodIndex===undefined?"—":rNum(m.moodIndex,1)+"/100",rEnps(m.enps?.score),m.eligibleQuestions??0]);
 const history=rSection("История показателей","История доступна только по месяцам, где есть безопасные агрегаты.",rTable(["Месяц","Ответы","Индекс · 0–100","eNPS","Вопросов с 5+ ответами"],historyRows,"История пока не содержит достаточных данных."));
 const methodology=rSection("Как читать отчёт","Индекс позитивных оценок — ориентировочный показатель, а не валидированный психологический тест.","<div class='method'><p><strong>Сравнение:</strong> аспекты сравниваются только по совпадающим вопросам, одинаковым по формулировке и типу. Не менее 5 ответов необходимо в каждом периоде.</p><p><strong>eNPS:</strong> сторонники оценивают 9–10, нейтральные — 7–8, критики — 0–6. eNPS = доля сторонников минус доля критиков.</p><p><strong>Количество ответов:</strong> это число отправок опроса, не число уникальных сотрудников. Один сотрудник может участвовать в нескольких опросах.</p><p><strong>Конфиденциальность:</strong> отчёт содержит только агрегированные показатели. Исходные ответы и индивидуальные комментарии в него не включаются. Малые группы скрываются.</p></div>");
 const body=cards+insights+rSection("Сравнение периодов","Сравнение показывает изменение одинаковых вопросов и аспектов.",comparisonTable)+currentAspects+surveyTable+recommendations+history+methodology;
 const html=rFrame("Общая HR-аналитика компании", "Сравнение "+monthLabel(from)+" и "+monthLabel(to)+". Общее настроение, аспекты компании, опросы и рекомендации HR.",body,"Общий обзор компании");
 const filename="35HC-HR-otchet-"+from+"-"+to+".html";
 rSave(filename,html);
}
function exportSelectedSurveyBeautifulHtml(){
 if(typeof lastLiveData==="undefined"||!lastLiveData||!lastLiveData.selectedSurveyId){const msg=document.getElementById("gateStatus");if(msg){msg.textContent="Сначала выберите опрос.";msg.className="muted error";}else alert("Сначала выберите опрос.");return;}
 const d=lastLiveData,suppressed=Boolean(d.suppressed);
 const answerCount=suppressed?"Скрыто по порогу конфиденциальности":responseTextSafe(d.totalResponses);
 function responseTextSafe(v){return v===null||v===undefined?"—":String(v);}
 const score=d.enps?.score;
 const cards="<div class='metrics'>"+
  rMetric("Ответы",answerCount,"Число отправок выбранного опроса")+
  rMetric("eNPS",suppressed?"—":rEnps(score),"Сторонники 9–10 · критики 0–6")+
  rMetric("Вопросов в отчёте",suppressed?"—":String((d.questionStats||[]).length),"Показываются вопросы с минимум 5 ответами")+
  rMetric("Запуск",String(d.selectedRunTitle||"Запуск не указан"),"Дата формирования: "+new Date().toLocaleDateString("ru-RU"))+
 "</div>";
 const qRows=(d.questionStats||[]).map(q=>[
  q.label,
  q.type==="scale"?"Шкала 0–10":q.type==="text"?"Открытый ответ":q.type==="yesno"?"Да / нет":"Варианты",
  q.answered??"—",
  q.average===null||q.average===undefined?"—":rNum(q.average,2)+"/10",
  q.negativePercent===null||q.negativePercent===undefined?"—":rNum(q.negativePercent,1)+"%"
 ]);
 const qTable=rSection("Результаты по вопросам","Средняя оценка и доля негативных оценок показываются там, где это корректно. Исходные комментарии не выгружаются.",suppressed?"<div class='empty'>Результаты доступны после накопления не менее 5 ответов.</div>":rTable(["Вопрос","Тип ответа","Ответов","Средняя оценка","Негативные ответы"],qRows,"В этом опросе пока нет безопасных агрегатов."));
 const e=d.enps||{};
 const enRows=[["eNPS",rEnps(e.score),"Общая формула: % сторонников − % критиков"],["Оценок, учтённых в eNPS",e.responses??"—","Не менее 5 оценок"],["Сторонники",e.promoters??"—","Оценки 9–10; малая группа скрывается"],["Нейтральные",e.passives??"—","Оценки 7–8; малая группа скрывается"],["Критики",e.detractors??"—","Оценки 0–6; малая группа скрывается"]];
 const enSection=rSection("Лояльность и eNPS","Если по оценкам меньше 5 ответов, итоговый показатель не публикуется.",rTable(["Показатель","Значение","Пояснение"],suppressed?[]:enRows,"eNPS скрыт до накопления 5 ответов."));
 const monthlyRows=(d.monthlyStats||[]).map(m=>[monthLabel(m.month),m.responses??"—",rEnps(m.enps?.score),m.enps?.responses??"—"]);
 const monthlySection=rSection("Динамика по месяцам","Месяцы с недостаточным количеством ответов не попадают в сводную таблицу.",rTable(["Месяц","Ответов","eNPS","Оценок для eNPS"],monthlyRows,"Нет месяцев с достаточным количеством ответов."));
 const dailyRows=(d.submissionsByDay||[]).map(x=>[x.date,x.count]);
 const dailySection=rSection("Когда отвечали сотрудники","Показаны дни с 5 и более отправками.",rTable(["Дата","Ответов"],dailyRows,"Нет дней с безопасным числом ответов."));
 const topicRows=(d.openAnswerTopics||[]).map(x=>[x.label,x.responses]);
 const topicSection=rSection("Темы открытых ответов","Темы определяются по ключевым словам. Текст отдельных комментариев не включается.",rTable(["Тема","Упоминаний"],topicRows,"Нет тем с 5 и более упоминаниями."));
 const recommendations=[];
 (d.questionStats||[]).filter(q=>q.negativePercent!==null&&q.negativePercent!==undefined&&Number(q.negativePercent)>=25).slice(0,5).forEach(q=>recommendations.push({label:q.label,text:"Обсудить причины негативных оценок и выбрать одно конкретное улучшение, которое можно проверить в следующем опросе."}));
 if(!recommendations.length)recommendations.push({label:"Следующий шаг",text:"Продолжать измерение и проверить динамику после следующего опроса. Не делать выводы по одной волне опроса."});
 const actionHtml="<ol class='actions'>"+recommendations.map(a=>"<li><strong>"+rEsc(a.label)+".</strong> "+rEsc(a.text)+"</li>").join("")+"</ol>";
 const actionSection=rSection("Рекомендации HR","Практические шаги для проверки, а не автоматические решения.",actionHtml);
 const confidentiality=rSection("Конфиденциальность","В отчёт не включаются ответы отдельных сотрудников и исходные комментарии.","<div class='method'><p>Порог публикации — минимум 5 ответов. Если данных недостаточно, показатель отображается как «—» или скрывается.</p><p>Результаты отражают только выбранный опрос и не должны автоматически распространяться на всю компанию.</p></div>");
 const body=cards+qTable+enSection+monthlySection+dailySection+topicSection+actionSection+confidentiality;
 const runTitle=String(d.selectedRunTitle||"Запуск не указан");
 const title="Отчёт по опросу: "+String(d.selectedSurveyTitle||"Выбранный опрос")+" — "+runTitle;
 const html=rFrame(title,"Отдельный отчёт по выбранному опросу и конкретному запуску: "+runTitle+". Сводные показатели, вопросы, динамика и рекомендации HR.",body,"Отчёт по опросу");
 rSave("35HC-HR-otchet-opros-"+String(d.selectedRunId||"run").slice(0,8)+"-"+new Date().toISOString().slice(0,10)+".html",html);
}
const companyButton=document.getElementById("exportCompanyHtml");
if(companyButton)companyButton.addEventListener("click",exportCompanyBeautifulHtml);
const surveyButton=document.getElementById("exportLiveHtml");
if(surveyButton)surveyButton.addEventListener("click",exportSelectedSurveyBeautifulHtml);
})();
