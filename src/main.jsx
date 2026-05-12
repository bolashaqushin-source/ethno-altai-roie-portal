import React,{useEffect,useMemo,useState}from'react'
import{createRoot}from'react-dom/client'
import{createClient}from'@supabase/supabase-js'
import'./style.css'

const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY)
const pages=['Окно президента','Прайс каталог','Клиент база CRM','Услугалар / Турлар','Күнтізбе','Гид тур','Бухгалтерия','Расходтар','Маркетинг','Қызметкерлер','Договор']
const roles=['Директор','Сату менеджер','Маркетинг/SMM','Бухгалтер','Гид','Қызметкер']
const clientStatuses=['Жаңа лид','Сөйлесіп жатыр','Дожим керек','Реквизит жіберілді','Бронь','Тур алды','Отказ','Қайта жазу']
const clientTypes=['Жаңа клиент','Жылы клиент','Ыстық клиент','VIP','Отбасы','Достар','Үлкен топ','Қайта келетін клиент']
const expenseCats=['Ат','Тамақ','Бензин','Гид','Юрта','Домик','Баня','Реклама','Инвентарь','Ремонт','Басқа']
const money=n=>Number(n||0).toLocaleString('ru-RU')+' ₸'
const digits=p=>String(p||'').replace(/[^\d]/g,'')
const wa=(phone,text)=>`https://wa.me/${digits(phone)}?text=${encodeURIComponent(text||'')}`
const contractNo=s=>'EA-'+new Date().getFullYear()+'-'+String(s?.id||Date.now()).slice(0,6).toUpperCase()

function Field({label,value,onChange,type='text',required=false}){return <label>{label}<input required={required} type={type} value={value??''} onChange={e=>onChange(e.target.value)}/></label>}
function Text({label,value,onChange}){return <label className='wide'>{label}<textarea rows='4' value={value??''} onChange={e=>onChange(e.target.value)}/></label>}
function Select({label,value,options,onChange}){return <label>{label}<select value={value??''} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>}
function Table({rows,cols,moneyCols=[],actions}){return <div className='table'><table><thead><tr><th>№</th>{cols.map(c=><th key={c}>{c}</th>)}<th>Әрекет</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i}><td>{i+1}</td>{cols.map(c=><td key={c}>{moneyCols.includes(c)?money(r[c]):String(r[c]??'')}</td>)}<td className='actions'>{actions?.(r)}</td></tr>)}</tbody></table></div>}

function useTable(table){
 const[rows,setRows]=useState([])
 async function load(){const{data,error}=await supabase.from(table).select('*').order('created_at',{ascending:false});if(error)alert(table+': '+error.message);else setRows(data||[])}
 useEffect(()=>{load()},[])
 async function insert(p){const{error}=await supabase.from(table).insert(p);if(error)alert(error.message);else load()}
 async function update(id,p){const{error}=await supabase.from(table).update({...p,updated_at:new Date().toISOString()}).eq('id',id);if(error)alert(error.message);else load()}
 async function remove(id){if(!confirm('Өшірейік пе?'))return;const{error}=await supabase.from(table).delete().eq('id',id);if(error)alert(error.message);else load()}
 return{rows,load,insert,update,remove}
}

function App(){
 const[session,setSession]=useState(null),[profile,setProfile]=useState(null),[page,setPage]=useState(pages[0]),[mode,setMode]=useState('login')
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])
 async function loadProfile(){if(!session?.user)return;let{data}=await supabase.from('ea_profiles').select('*').eq('id',session.user.id).maybeSingle();setProfile(data)}
 useEffect(()=>{loadProfile()},[session?.user?.id])
 if(!session)return <Auth mode={mode} setMode={setMode}/>
 if(!profile)return <Profile session={session} done={loadProfile}/>
 return <Portal profile={profile} page={page} setPage={setPage}/>
}

function Auth({mode,setMode}){
 const[f,setF]=useState({email:'',password:''})
 async function submit(e){e.preventDefault();const res=mode==='login'?await supabase.auth.signInWithPassword(f):await supabase.auth.signUp(f);if(res.error)alert(res.error.message);else if(mode!=='login')alert('Тіркелді. Енді кіріп көр.')}
 return <div className='auth'><form className='authCard' onSubmit={submit}><h1>Ethno Altai System</h1><p>{mode==='login'?'Кіру':'Тіркелу'}</p><Field label='Email' value={f.email} onChange={v=>setF({...f,email:v})} required/><Field label='Құпиясөз' type='password' value={f.password} onChange={v=>setF({...f,password:v})} required/><button className='primary'>{mode==='login'?'Кіру':'Тіркелу'}</button><button type='button' onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Тіркелу':'Кіру бетіне өту'}</button></form></div>
}
function Profile({session,done}){
 const[f,setF]=useState({name:'',phone:'',role:'Директор'})
 async function save(e){e.preventDefault();const{error}=await supabase.from('ea_profiles').insert({id:session.user.id,...f});if(error)alert(error.message);else done()}
 return <div className='auth'><form className='authCard' onSubmit={save}><h1>Профиль</h1><Field label='Аты' value={f.name} onChange={v=>setF({...f,name:v})} required/><Field label='Телефон' value={f.phone} onChange={v=>setF({...f,phone:v})}/><Select label='Роль' value={f.role} options={roles} onChange={v=>setF({...f,role:v})}/><button className='primary'>Сақтау</button></form></div>
}
function Portal({profile,page,setPage}){
 const catalog=useTable('ea_catalog'),clients=useTable('ea_clients'),services=useTable('ea_services'),expenses=useTable('ea_expenses'),marketing=useTable('ea_marketing'),employees=useTable('ea_employees'),contracts=useTable('ea_contracts')
 const all={catalog,clients,services,expenses,marketing,employees,contracts}
 const refresh=()=>Object.values(all).forEach(x=>x.load())
 return <div className='app'><aside><h2>Ethno Altai</h2><div className='me'><b>{profile.name}</b><span>{profile.role}</span></div>{pages.map(p=><button className={p===page?'active':''} onClick={()=>setPage(p)} key={p}>{p}</button>)}<button onClick={()=>supabase.auth.signOut()}>Шығу</button></aside><main><header><div><h1>{page}</h1><p>Business System v5</p></div><button onClick={refresh}>Жаңарту</button></header>
 {page==='Окно президента'&&<President {...all}/>}
 {page==='Прайс каталог'&&<Catalog table={catalog}/>}
 {page==='Клиент база CRM'&&<Clients table={clients}/>}
 {page==='Услугалар / Турлар'&&<Services table={services} clients={clients.rows} catalog={catalog.rows}/>}
 {page==='Күнтізбе'&&<Calendar services={services.rows}/>}
 {page==='Гид тур'&&<Guide services={services.rows} expenses={expenses}/>}
 {page==='Бухгалтерия'&&<Accounting services={services.rows} expenses={expenses.rows}/>}
 {page==='Расходтар'&&<Expenses table={expenses} services={services.rows}/>}
 {page==='Маркетинг'&&<Marketing table={marketing}/>}
 {page==='Қызметкерлер'&&<Employees table={employees}/>}
 {page==='Договор'&&<Contracts services={services.rows} contracts={contracts}/>}
 </main></div>
}

function President({clients,services,expenses,employees}){
 const planned=services.rows.reduce((s,x)=>s+Number(x.total_price||0),0),income=services.rows.reduce((s,x)=>s+Number(x.paid||0),0),exp=expenses.rows.reduce((s,x)=>s+Number(x.amount||0),0),profit=income-exp
 return <><section className='stats'><div><span>Клиент</span><b>{clients.rows.length}</b></div><div><span>Услуга</span><b>{services.rows.length}</b></div><div><span>Жоспар сумма</span><b>{money(planned)}</b></div><div><span>Нақты доход</span><b>{money(income)}</b></div><div><span>Расход</span><b>{money(exp)}</b></div><div><span>Прибыль</span><b>{money(profit)}</b></div><div><span>Қызметкер</span><b>{employees.rows.length}</b></div></section><div className='grid2'><div className='card'><h2>Соңғы клиенттер</h2><Table rows={clients.rows.slice(0,8)} cols={['name','phone','status','client_type']}/></div><div className='card'><h2>Жақын турлар</h2><Table rows={services.rows.slice(0,8)} cols={['date_from','date_to','client_name','service_name','payment_status']}/></div></div><div className='card'><h2>Барлық қозғалыс</h2><Table rows={services.rows} cols={['service_name','client_name','people_count','date_from','total_price','paid','rest','status']} moneyCols={['total_price','paid','rest']}/></div></>
}

function Catalog({table}){
 const empty={title:'',price:0,category:'Тур',full_description:'',media_links:'',is_active:true}
 const[f,setF]=useState(empty),[edit,setEdit]=useState(null)
 async function save(e){e.preventDefault();edit?await table.update(edit,f):await table.insert(f);setEdit(null);setF(empty)}
 return <div className='card'><h2>Прайс каталог</h2><p className='muted'>Фото/видео үшін media links ішіне Google Drive, Instagram, YouTube сілтемесін жаз.</p><form onSubmit={save} className='form'><Field label='Атауы' value={f.title} onChange={v=>setF({...f,title:v})} required/><Field label='Бағасы' type='number' value={f.price} onChange={v=>setF({...f,price:v})}/><Select label='Категория' value={f.category} options={['Тур','Қону','Ат','Юрта аренда','Жеке тур','Қосымша']} onChange={v=>setF({...f,category:v})}/><Field label='Фото/видео сілтеме' value={f.media_links} onChange={v=>setF({...f,media_links:v})}/><Text label='Описание толық' value={f.full_description} onChange={v=>setF({...f,full_description:v})}/><div className='wide'><button className='primary'>{edit?'Өзгерісті сақтау':'Қосу'}</button></div></form><Table rows={table.rows} cols={['title','category','price','full_description','media_links']} moneyCols={['price']} actions={r=><><button onClick={()=>{setEdit(r.id);setF({...empty,...r})}}>Өзг.</button><button onClick={()=>table.remove(r.id)}>Өшір</button></>}/></div>
}

function Clients({table}){
 const empty={name:'',phone:'',client_type:'Жаңа клиент',category:'Жылы',status:'Жаңа лид',source:'Instagram',approach_note:'',followup_note:'',next_action:'',next_date:'',whatsapp_template:'',payment_requisites_sent:false,note:''}
 const[f,setF]=useState(empty),[edit,setEdit]=useState(null),[filter,setFilter]=useState('Барлығы')
 const rows=filter==='Барлығы'?table.rows:table.rows.filter(x=>x.status===filter||x.client_type===filter)
 async function save(e){e.preventDefault();edit?await table.update(edit,f):await table.insert(f);setEdit(null);setF(empty)}
 const msg=f.whatsapp_template||`Сәлем, ${f.name}! Ethno Altai бойынша хабарласып едім. Сізге қай тур ыңғайлы?`
 return <div className='card'><h2>Клиентский база / CRM</h2><form onSubmit={save} className='form'><Field label='Аты' value={f.name} onChange={v=>setF({...f,name:v})} required/><Field label='Номер' value={f.phone} onChange={v=>setF({...f,phone:v})} required/><Select label='Қандай клиент' value={f.client_type} options={clientTypes} onChange={v=>setF({...f,client_type:v})}/><Select label='Статус' value={f.status} options={clientStatuses} onChange={v=>setF({...f,status:v})}/><Select label='Санат' value={f.category} options={['Суық','Жылы','Ыстық','VIP']} onChange={v=>setF({...f,category:v})}/><Field label='Қайдан келді' value={f.source} onChange={v=>setF({...f,source:v})}/><Field label='Келесі дата' type='date' value={f.next_date||''} onChange={v=>setF({...f,next_date:v})}/><Field label='Келесі әрекет' value={f.next_action} onChange={v=>setF({...f,next_action:v})}/><Text label='Жеке подход / анкета / қалай сөйлесу керек' value={f.approach_note} onChange={v=>setF({...f,approach_note:v})}/><Text label='Дожим описание' value={f.followup_note} onChange={v=>setF({...f,followup_note:v})}/><Text label='WhatsApp дайын сообщение' value={f.whatsapp_template} onChange={v=>setF({...f,whatsapp_template:v})}/><Text label='Комментарий' value={f.note} onChange={v=>setF({...f,note:v})}/><div className='wide actions'><button className='primary'>{edit?'Сақтау':'Клиент қосу'}</button>{f.phone&&<a target='_blank' href={wa(f.phone,msg)}>WhatsApp жазу</a>}{f.phone&&<a target='_blank' href={wa(f.phone,`Сәлем, ${f.name}! Төлем реквизиті: Kaspi. Төлемнен кейін чек жіберіңіз.`)}>Реквизит жіберу</a>}</div></form><div className='filters'><button onClick={()=>setFilter('Барлығы')}>Барлығы</button>{[...clientStatuses,...clientTypes].map(x=><button onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><Table rows={rows} cols={['name','phone','client_type','category','status','source','next_date','approach_note']} actions={r=><><button onClick={()=>{setEdit(r.id);setF({...empty,...r,next_date:r.next_date||''})}}>Ашу/өзг.</button><a target='_blank' href={wa(r.phone,r.whatsapp_template||`Сәлем, ${r.name}! Ethno Altai бойынша жазып тұрмын.`)}>WA</a><button onClick={()=>table.remove(r.id)}>Өшір</button></>}/></div>
}

function Services({table,clients,catalog}){
 const empty={client_id:'',catalog_id:'',service_name:'',client_name:'',phone:'',people_count:1,date_from:'',date_to:'',total_price:0,prepayment:0,paid:0,rest:0,payment_status:'Предоплата күтуде',status:'Тіркелді',note:''}
 const[f,setF]=useState(empty),[edit,setEdit]=useState(null)
 function pickClient(id){const c=clients.find(x=>x.id===id);setF({...f,client_id:id,client_name:c?.name||'',phone:c?.phone||''})}
 function pickCatalog(id){const c=catalog.find(x=>x.id===id);const total=Number(c?.price||0);setF({...f,catalog_id:id,service_name:c?.title||'',total_price:total,rest:Math.max(total-Number(f.paid||0),0)})}
 function updPaid(v){const paid=Number(v||0),total=Number(f.total_price||0);setF({...f,paid,prepayment:f.prepayment||paid,rest:Math.max(total-paid,0),payment_status:paid>=total&&total>0?'Толық төледі':paid>0?'Предоплата төледі':'Предоплата күтуде'})}
 async function save(e){e.preventDefault();edit?await table.update(edit,f):await table.insert(f);setEdit(null);setF(empty)}
 return <div className='card'><h2>Услугалар / Турлар</h2><form className='form' onSubmit={save}><label>Клиент<select value={f.client_id} onChange={e=>pickClient(e.target.value)}><option value=''>Таңдау</option>{clients.map(c=><option value={c.id} key={c.id}>{c.name} — {c.phone}</option>)}</select></label><label>Услуга/тур<select value={f.catalog_id} onChange={e=>pickCatalog(e.target.value)}><option value=''>Таңдау</option>{catalog.map(c=><option value={c.id} key={c.id}>{c.title} — {money(c.price)}</option>)}</select></label><Field label='Аты' value={f.client_name} onChange={v=>setF({...f,client_name:v})} required/><Field label='Номер' value={f.phone} onChange={v=>setF({...f,phone:v})} required/><Field label='Услуга атауы' value={f.service_name} onChange={v=>setF({...f,service_name:v})}/><Field label='Неше адам' type='number' value={f.people_count} onChange={v=>setF({...f,people_count:v})}/><Field label='Қай күннен' type='date' value={f.date_from||''} onChange={v=>setF({...f,date_from:v})}/><Field label='Қай күнге дейін' type='date' value={f.date_to||''} onChange={v=>setF({...f,date_to:v})}/><Field label='Жалпы сумма' type='number' value={f.total_price} onChange={v=>setF({...f,total_price:v,rest:Math.max(Number(v||0)-Number(f.paid||0),0)})}/><Field label='Предоплата' type='number' value={f.prepayment} onChange={v=>setF({...f,prepayment:v})}/><Field label='Қанша төледі' type='number' value={f.paid} onChange={updPaid}/><Field label='Қалғаны' type='number' value={f.rest} onChange={v=>setF({...f,rest:v})}/><Select label='Төлем статусы' value={f.payment_status} options={['Предоплата күтуде','Предоплата төледі','Толық төледі','Қарыз']} onChange={v=>setF({...f,payment_status:v})}/><Select label='Статус' value={f.status} options={['Тіркелді','Бронь','Тур жүріп жатыр','Тур өтті','Отмена']} onChange={v=>setF({...f,status:v})}/><Text label='Комментарий' value={f.note} onChange={v=>setF({...f,note:v})}/><div className='wide'><button className='primary'>{edit?'Сақтау':'Услуга тіркеу'}</button></div></form><Table rows={table.rows} cols={['service_name','client_name','phone','people_count','date_from','date_to','total_price','paid','rest','payment_status','status']} moneyCols={['total_price','paid','rest']} actions={r=><><button onClick={()=>{setEdit(r.id);setF({...empty,...r,date_from:r.date_from||'',date_to:r.date_to||''})}}>Өзг.</button><button onClick={()=>table.remove(r.id)}>Өшір</button></>}/></div>
}

function Calendar({services}){const groups=services.reduce((a,s)=>{const d=s.date_from||'Дата жоқ';(a[d]=a[d]||[]).push(s);return a},{});return <div className='grid3'>{Object.entries(groups).map(([d,items])=><div className='card' key={d}><h2>{d}</h2>{items.map(i=><p key={i.id}><b>{i.service_name}</b><br/>{i.client_name} • {i.people_count} адам • {i.date_from} - {i.date_to}</p>)}</div>)}</div>}

function Guide({services,expenses}){
 const empty={service_id:'',expense_date:new Date().toISOString().slice(0,10),title:'',category:'Ат',amount:0,source:'Гид',note:''}
 const[f,setF]=useState(empty)
 async function save(e){e.preventDefault();await expenses.insert(f);setF(empty)}
 return <div className='grid2'><div className='card'><h2>Гид расход жазу</h2><form className='form one' onSubmit={save}><label>Қай тур<select value={f.service_id} onChange={e=>setF({...f,service_id:e.target.value})}><option value=''>Таңдау</option>{services.map(s=><option value={s.id} key={s.id}>{s.date_from} — {s.service_name} — {s.client_name}</option>)}</select></label><Field label='Дата' type='date' value={f.expense_date} onChange={v=>setF({...f,expense_date:v})}/><Field label='Расход атауы' value={f.title} onChange={v=>setF({...f,title:v})} required/><Select label='Категория' value={f.category} options={expenseCats} onChange={v=>setF({...f,category:v})}/><Field label='Сумма' type='number' value={f.amount} onChange={v=>setF({...f,amount:v})}/><Text label='Комментарий' value={f.note} onChange={v=>setF({...f,note:v})}/><button className='primary'>Расход қосу</button></form></div><div className='card'><h2>Гид көретін турлар</h2><Table rows={services} cols={['date_from','date_to','service_name','client_name','phone','people_count','status']}/></div></div>
}

function Accounting({services,expenses}){
 const plannedIncome=services.reduce((s,x)=>s+Number(x.total_price||0),0)
 const income=services.reduce((s,x)=>s+Number(x.paid||0),0)
 const exp=expenses.reduce((s,x)=>s+Number(x.amount||0),0)
 const profit=income-exp
 const zakat=profit>0?profit*.026:0,altaiyr=profit>0?profit*.30:0,invest=profit>0?profit*.10:0,oborot=profit-zakat-altaiyr-invest
 const rows=services.map(s=>{const serviceExpense=expenses.filter(e=>e.service_id===s.id).reduce((a,e)=>a+Number(e.amount||0),0);const actualIncome=Number(s.paid||0);const p=actualIncome-serviceExpense;const safe=p>0?p:0;return{...s,planned_total:Number(s.total_price||0),actual_income:actualIncome,expense:serviceExpense,profit:p,zakat:safe*.026,altaiyr:safe*.30,investment:safe*.10,turnover:p-(safe*.026)-(safe*.30)-(safe*.10)}})
 return <><section className='stats'><div><span>Жоспар сумма</span><b>{money(plannedIncome)}</b></div><div><span>Нақты доход</span><b>{money(income)}</b></div><div><span>Общ расход</span><b>{money(exp)}</b></div><div><span>Нақты прибыль</span><b>{money(profit)}</b></div><div><span>2.6% зекет</span><b>{money(zakat)}</b></div><div><span>30% Әлтайыр</span><b>{money(altaiyr)}</b></div><div><span>10% инвестиция</span><b>{money(invest)}</b></div><div><span>Оборотқа қалған</span><b>{money(oborot)}</b></div></section><div className='card'><h2>Бухгалтерия автомат таблица</h2><p className='muted'>Есеп тек нақты төленген ақша бойынша жүреді. Толық баға ақпарат үшін ғана.</p><Table rows={rows} cols={['date_from','service_name','client_name','planned_total','actual_income','expense','profit','zakat','altaiyr','investment','turnover','payment_status']} moneyCols={['planned_total','actual_income','expense','profit','zakat','altaiyr','investment','turnover']}/></div><div className='card'><h2>Барлық расходтар</h2><Table rows={expenses} cols={['expense_date','title','category','amount','source','note']} moneyCols={['amount']}/></div></>
}

function Expenses({table,services}){
 const empty={service_id:'',expense_date:new Date().toISOString().slice(0,10),title:'',category:'Басқа',amount:0,source:'Ручной',note:''}
 const[f,setF]=useState(empty),[edit,setEdit]=useState(null)
 async function save(e){e.preventDefault();edit?await table.update(edit,f):await table.insert(f);setEdit(null);setF(empty)}
 return <div className='card'><h2>Расходтар</h2><form className='form' onSubmit={save}><label>Тур/услуга<select value={f.service_id} onChange={e=>setF({...f,service_id:e.target.value})}><option value=''>Жалпы расход</option>{services.map(s=><option value={s.id} key={s.id}>{s.date_from} — {s.service_name} — {s.client_name}</option>)}</select></label><Field label='Дата' type='date' value={f.expense_date} onChange={v=>setF({...f,expense_date:v})}/><Field label='Атауы' value={f.title} onChange={v=>setF({...f,title:v})} required/><Select label='Категория' value={f.category} options={expenseCats} onChange={v=>setF({...f,category:v})}/><Field label='Сумма' type='number' value={f.amount} onChange={v=>setF({...f,amount:v})}/><Field label='Қайдан' value={f.source} onChange={v=>setF({...f,source:v})}/><Text label='Комментарий' value={f.note} onChange={v=>setF({...f,note:v})}/><div className='wide'><button className='primary'>{edit?'Сақтау':'Расход қосу'}</button></div></form><Table rows={table.rows} cols={['expense_date','title','category','amount','source','note']} moneyCols={['amount']} actions={r=><><button onClick={()=>{setEdit(r.id);setF({...empty,...r,expense_date:r.expense_date||''})}}>Өзг.</button><button onClick={()=>table.remove(r.id)}>Өшір</button></>}/></div>
}

function Marketing({table}){
 const empty={channel:'Instagram',campaign:'',content_type:'Reels',publish_date:'',status:'Идея',budget:0,leads:0,sales:0,responsible:'',note:''}
 const[f,setF]=useState(empty),[edit,setEdit]=useState(null)
 async function save(e){e.preventDefault();edit?await table.update(edit,f):await table.insert(f);setEdit(null);setF(empty)}
 return <div className='card'><h2>Маркетинг</h2><form className='form' onSubmit={save}><Select label='Канал' value={f.channel} options={['Instagram','TikTok','Threads','WhatsApp','Сайт','Таныс']} onChange={v=>setF({...f,channel:v})}/><Field label='Кампания/контент' value={f.campaign} onChange={v=>setF({...f,campaign:v})} required/><Select label='Түрі' value={f.content_type} options={['Reels','Stories','Пост','Реклама','Эфир']} onChange={v=>setF({...f,content_type:v})}/><Field label='Дата' type='date' value={f.publish_date||''} onChange={v=>setF({...f,publish_date:v})}/><Select label='Статус' value={f.status} options={['Идея','Жасалып жатыр','Жарияланды','Рекламада','Бітті']} onChange={v=>setF({...f,status:v})}/><Field label='Бюджет' type='number' value={f.budget} onChange={v=>setF({...f,budget:v})}/><Field label='Лид' type='number' value={f.leads} onChange={v=>setF({...f,leads:v})}/><Field label='Сатылым' type='number' value={f.sales} onChange={v=>setF({...f,sales:v})}/><Field label='Жауапты' value={f.responsible} onChange={v=>setF({...f,responsible:v})}/><Text label='Комментарий' value={f.note} onChange={v=>setF({...f,note:v})}/><div className='wide'><button className='primary'>{edit?'Сақтау':'Қосу'}</button></div></form><Table rows={table.rows} cols={['channel','campaign','content_type','publish_date','status','budget','leads','sales','responsible']} moneyCols={['budget']} actions={r=><><button onClick={()=>{setEdit(r.id);setF({...empty,...r,publish_date:r.publish_date||''})}}>Өзг.</button><button onClick={()=>table.remove(r.id)}>Өшір</button></>}/></div>
}

function Employees({table}){
 const empty={name:'',phone:'',position:'',salary_type:'Келісім',salary_amount:0,note:'',is_active:true}
 const[f,setF]=useState(empty),[edit,setEdit]=useState(null)
 async function save(e){e.preventDefault();edit?await table.update(edit,f):await table.insert(f);setEdit(null);setF(empty)}
 return <div className='card'><h2>Қызметкерлер</h2><form className='form' onSubmit={save}><Field label='Аты' value={f.name} onChange={v=>setF({...f,name:v})} required/><Field label='Телефон' value={f.phone} onChange={v=>setF({...f,phone:v})}/><Field label='Қызметі' value={f.position} onChange={v=>setF({...f,position:v})}/><Select label='ЗП түрі' value={f.salary_type} options={['Келісім','Сағаттық','Процент','Айлық']} onChange={v=>setF({...f,salary_type:v})}/><Field label='ЗП сумма' type='number' value={f.salary_amount} onChange={v=>setF({...f,salary_amount:v})}/><Text label='Комментарий' value={f.note} onChange={v=>setF({...f,note:v})}/><div className='wide'><button className='primary'>{edit?'Сақтау':'Қызметкер қосу'}</button></div></form><Table rows={table.rows} cols={['name','phone','position','salary_type','salary_amount','note']} moneyCols={['salary_amount']} actions={r=><><button onClick={()=>{setEdit(r.id);setF({...empty,...r})}}>Өзг.</button><button onClick={()=>table.remove(r.id)}>Өшір</button></>}/></div>
}

function Contracts({services,contracts}){
 const[settings,setSettings]=useState(null),[selected,setSelected]=useState('')
 useEffect(()=>{supabase.from('ea_contract_settings').select('*').eq('id',1).maybeSingle().then(({data})=>setSettings(data))},[])
 const s=services.find(x=>x.id===selected)
 function makeText(service){const t=settings?.template||'';return t.replaceAll('{{client_name}}',service.client_name||'').replaceAll('{{phone}}',service.phone||'').replaceAll('{{service_name}}',service.service_name||'').replaceAll('{{date_from}}',service.date_from||'').replaceAll('{{date_to}}',service.date_to||'').replaceAll('{{total_price}}',money(service.total_price)).replaceAll('{{paid}}',money(service.paid)).replaceAll('{{rest}}',money(service.rest))}
 async function createContract(){if(!s)return alert('Услуга таңда');await contracts.insert({service_id:s.id,contract_no:contractNo(s),client_name:s.client_name,phone:s.phone,contract_text:makeText(s),status:'Дайындалды'})}
 function print(c){
  const w=window.open('','_blank')
  w.document.write(`
    <html>
      <head>
        <title>${c.contract_no || 'Ethno Altai договор'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page{
            size:A4;
            margin:18mm;
          }

          *{
            box-sizing:border-box;
          }

          body{
            margin:0;
            background:#f4f0e7;
            font-family:Arial, sans-serif;
            color:#111;
            line-height:1.55;
          }

          .toolbar{
            position:sticky;
            top:0;
            background:#111;
            color:white;
            padding:10px;
            display:flex;
            gap:8px;
            justify-content:center;
            z-index:10;
          }

          .toolbar button{
            border:0;
            border-radius:10px;
            background:#f4d84f;
            padding:10px 14px;
            font-weight:700;
            cursor:pointer;
          }

          .page{
            width:210mm;
            min-height:297mm;
            margin:18px auto;
            background:white;
            padding:24mm 20mm;
            box-shadow:0 20px 60px rgba(0,0,0,.16);
          }

          .top{
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            border-bottom:2px solid #111;
            padding-bottom:14px;
            margin-bottom:20px;
          }

          h1{
            margin:0;
            font-size:26px;
            letter-spacing:.5px;
          }

          .no{
            margin-top:8px;
            font-size:16px;
            font-weight:700;
          }

          .brand{
            text-align:right;
            font-size:12px;
            color:#555;
          }

          .box{
            border:1.5px solid #111;
            padding:16px;
            border-radius:8px;
            font-size:14px;
            white-space:pre-wrap;
          }

          .sign{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:60px;
            margin-top:46px;
            font-size:14px;
          }

          .line{
            margin-top:36px;
            border-bottom:1.5px solid #111;
            height:1px;
          }

          .footer{
            margin-top:40px;
            font-size:11px;
            color:#777;
            text-align:center;
          }

          @media(max-width:760px){
            body{
              background:white;
            }

            .page{
              width:100%;
              min-height:auto;
              margin:0;
              padding:22px 18px 80px;
              box-shadow:none;
            }

            .top{
              display:block;
            }

            .brand{
              text-align:left;
              margin-top:10px;
            }

            h1{
              font-size:23px;
            }

            .box{
              font-size:13px;
            }

            .sign{
              grid-template-columns:1fr;
              gap:28px;
            }
          }

          @media print{
            body{
              background:white;
            }

            .toolbar{
              display:none;
            }

            .page{
              margin:0;
              box-shadow:none;
              width:auto;
              min-height:auto;
              padding:0;
            }
          }
        </style>
      </head>

      <body>
        <div class="toolbar">
          <button onclick="
window.print();
setTimeout(()=>{
  alert('Телефонда: Поделиться → Сохранить в PDF таңдаңыз');
},500);
">
PDF сақтау
</button>
        </div>

        <main class="page">
          <div class="top">
            <div>
              <h1>ETHNO ALTAI ДОГОВОР</h1>
              <div class="no">${c.contract_no || ''}</div>
            </div>

            <div class="brand">
              Ethno Altai<br/>
              Катонқарағай туристік қызметі
            </div>
          </div>

          <div class="box">${(c.contract_text || '').replaceAll('<','&lt;').replaceAll('>','&gt;')}</div>

          <div class="sign">
            <div>
              <b>Турист қолы:</b>
              <div class="line"></div>
            </div>

            <div>
              <b>Ұйымдастырушы:</b>
              <div class="line"></div>
            </div>
          </div>

          <div class="footer">
            Бұл құжат Ethno Altai туристік қызметін броньдау/ұйымдастыру үшін жасалды.
          </div>
        </main>
      </body>
    </html>
  `)
  w.document.close()
}
 async function saveSettings(e){e.preventDefault();const{error}=await supabase.from('ea_contract_settings').upsert({...settings,id:1,updated_at:new Date().toISOString()});if(error)alert(error.message);else alert('Шаблон сақталды')}
 return <div><div className='card'><h2>Договор шаблон</h2>{settings&&<form className='form' onSubmit={saveSettings}><Field label='Компания' value={settings.company_name||''} onChange={v=>setSettings({...settings,company_name:v})}/><Field label='Телефон' value={settings.phone||''} onChange={v=>setSettings({...settings,phone:v})}/><Field label='Kaspi' value={settings.kaspi||''} onChange={v=>setSettings({...settings,kaspi:v})}/><Field label='Мекенжай' value={settings.address||''} onChange={v=>setSettings({...settings,address:v})}/><Text label='Толық договор шаблоны' value={settings.template||''} onChange={v=>setSettings({...settings,template:v})}/><div className='wide'><button className='primary'>Шаблон сақтау</button></div></form>}</div><div className='card'><h2>Договор жасау</h2><label>Услуга таңда<select value={selected} onChange={e=>setSelected(e.target.value)}><option value=''>Таңдау</option>{services.map(s=><option value={s.id} key={s.id}>{s.client_name} — {s.service_name} — {s.date_from}</option>)}</select></label>{s&&<div className='preview'><h3>Preview</h3><p>{makeText(s)}</p><button className='primary' onClick={createContract}>Договор сақтау</button><a target='_blank' href={wa(s.phone,`Сәлем, ${s.client_name}! Договор PDF дайын. Тексеріп шығыңыз.`)}>WhatsApp текст</a></div>}</div><div className='card'><h2>Договорлар</h2><Table rows={contracts.rows} cols={['contract_no','client_name','phone','status','sent_whatsapp']} actions={r=><><button onClick={()=>print(r)}>PDF</button><a target='_blank' href={wa(r.phone,`Сәлем, ${r.client_name}! Договор PDF жіберілді. Растап жіберіңіз.`)}>WA</a><button onClick={()=>contracts.remove(r.id)}>Өшір</button></>}/></div></div>
}

createRoot(document.getElementById('root')).render(<App/>)
