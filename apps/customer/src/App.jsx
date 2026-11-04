import { useEffect, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Activity, ArrowRight, ChevronRight, Clock3, Menu, Search, ShieldCheck, X } from 'lucide-react'
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { auth, db, firebaseReady } from './firebase/client'

const dateLabel = value => value?.toDate ? value.toDate().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : 'Recently'
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

async function ensureCustomerProfile(user, fallbackName = '') {
  const profileRef = doc(db, 'users', user.uid)
  const profile = await getDoc(profileRef)
  if (profile.exists()) return

  const email = user.email || ''
  const displayName = (user.displayName || fallbackName || email.split('@')[0] || 'Reader').slice(0, 100)
  await setDoc(profileRef, {
    uid: user.uid,
    displayName,
    email,
    role: 'customer',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

function useNews(category) {
  const [news,setNews]=useState([]),[loading,setLoading]=useState(firebaseReady),[error,setError]=useState('')
  useEffect(()=>{ if(!db)return; let active=true; const clauses=[where('status','==','published'),orderBy('publishedAt','desc'),limit(24)]; if(category) clauses.unshift(where('categoryName','==',category)); getDocs(query(collection(db,'news'),...clauses)).then(s=>{if(active)setNews(s.docs.map(d=>({id:d.id,...d.data()}))) }).catch(e=>{if(active)setError(e.message)}).finally(()=>active&&setLoading(false)); return()=>{active=false} },[category])
  return {news,loading,error}
}
function useCategories(){const [items,setItems]=useState([]);useEffect(()=>{if(!db)return;let live=true;getDocs(query(collection(db,'categories'),where('active','==',true),limit(30))).then(s=>{if(live)setItems(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.name.localeCompare(b.name)))}).catch(()=>{});return()=>{live=false}},[]);return items}
function Image({src,category='News',...props}) { const [broken,setBroken]=useState(false); const gradients={World:'linear-gradient(135deg,#15446d,#89b5cd)',Politics:'linear-gradient(135deg,#422e72,#bd9dd4)',Business:'linear-gradient(135deg,#2b554e,#a7c6aa)',Technology:'linear-gradient(135deg,#163d61,#6bb3c8)',Science:'linear-gradient(135deg,#31456b,#8ca7d3)',Health:'linear-gradient(135deg,#376d64,#add7c1)',Culture:'linear-gradient(135deg,#8a483e,#e1ad78)',Climate:'linear-gradient(135deg,#37684c,#acd687)'}; return src&&!broken?<img src={src} onError={()=>setBroken(true)} loading="lazy" {...props}/>:<div className="image-fallback" style={{background:gradients[category]||gradients.News}} aria-label={`${category} image placeholder`}><span>NI</span></div> }
function Header({user}) { const [open,setOpen]=useState(false);return <><div className="topline"><div className="wrap topinner"><span><span className="live-dot"/> INDEPENDENT JOURNALISM · HUMAN-LED VERIFICATION</span><span>Wednesday, November 04</span></div></div><header className="header"><div className="wrap nav"><Link to="/" className="brand"><span className="brand-mark">N</span><span>newsintel<span className="brand-ai"> AI</span><small>KNOW MORE. VERIFY BETTER.</small></span></Link><button className="menu-toggle" onClick={()=>setOpen(!open)} aria-label="Toggle menu">{open?<X/>:<Menu/>}</button><nav className={open?'navlinks open':'navlinks'}><Link to="/">Home</Link><Link to="/latest">Latest News</Link><Link to="/categories">Categories</Link><Link to="/verify">Verify News</Link><Link to="/search" className="search-nav"><Search size={16}/> Search</Link><Link className="nav-account" to={user?'/profile':'/login'}>{user?'My account':'Sign in'} <ArrowRight size={15}/></Link></nav></div></header></>}
function Footer(){return <footer><div className="wrap footer"><div><Link className="brand" to="/"><span className="brand-mark">N</span><span>newsintel<span className="brand-ai"> AI</span><small>KNOW MORE. VERIFY BETTER.</small></span></Link><p>Independent reporting for a world that moves fast.<br/>Thoughtful journalism, grounded in evidence.</p></div><div><b>Explore</b><Link to="/latest">Latest stories</Link><Link to="/categories">All categories</Link><Link to="/verify">Submit a claim</Link></div><div><b>Our standard</b><span>Evidence before certainty</span><span>Human review always</span><span>Corrections are transparent</span></div><div className="copyright">© 2026 NewsIntel AI. Read critically. Share responsibly.</div></div></footer>}
function Card({item,large=false}){return <Link to={`/news/${item.slug||item.id}`} className={`story ${large?'story-large':''}`}><div className="story-image"><Image src={item.imageUrl} category={item.categoryName}/>{item.breaking&&<span className="breaking">BREAKING</span>}</div><div className="story-meta"><span>{item.categoryName||'Latest'}</span><i/> <time>{dateLabel(item.publishedAt)}</time></div><h3>{item.title}</h3><p>{item.excerpt}</p><span className="read-link">Read story <ArrowRight size={14}/></span></Link>}
function SectionTitle({eyebrow,title,link,href='/latest'}){return <div className="section-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{link&&<Link to={href}>{link}<ArrowRight size={15}/></Link>}</div>}
function Home(){const topics=useCategories();const {news,loading,error}=useNews(); const featured=news.find(n=>n.featured)||news[0];const others=news.filter(n=>n.id!==featured?.id);return <><main className="wrap home-main"><section className="welcome"><div><span className="eyebrow">THE NEWS, WITH CONTEXT</span><h1>Stay informed.<br/><em>Think clearly.</em></h1><p>Journalism built on curiosity, clarity, and the courage to ask one more question.</p><Link className="button button-dark" to="/latest">Explore the latest <ArrowRight size={16}/></Link></div><div className="welcome-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><Activity size={44}/><span>Signal<br/>over noise</span></div><span className="art-label label-one">01 / REPORT</span><span className="art-label label-two">02 / VERIFY</span></div></section>
<section className="trust-strip"><div><ShieldCheck/><span><b>Human-led verification</b><small>Evidence matters. Context matters.</small></span></div><div><Activity/><span><b>Independent perspective</b><small>Reporting that puts facts first.</small></span></div><div><Clock3/><span><b>Always up to date</b><small>Fresh coverage, thoughtful analysis.</small></span></div></section>
<section className="content-section"><SectionTitle eyebrow="THE FRONT PAGE" title="Today’s stories" link="View all stories"/>{error&&<div className="notice error">Could not load news: {error}</div>}{loading?<div className="loading">Loading the latest reporting…</div>:featured?<div className="feature-layout"><Card item={featured} large/><div className="side-stories">{others.slice(0,3).map(item=><Card key={item.id} item={item}/>)}</div></div>:<div className="empty-state"><span className="empty-icon">N</span><h3>Your next great read is on its way.</h3><p>Published stories will appear here once the newsroom is connected.</p><Link to="/latest" className="read-link">Explore the latest <ArrowRight size={14}/></Link></div>}</section>
<section className="verify-band"><div className="verify-icon"><ShieldCheck size={34}/></div><div><span className="eyebrow">PAUSE BEFORE YOU SHARE</span><h2>Seen something that doesn’t add up?</h2><p>Send us a claim. Our team will review the evidence with care.</p></div><Link className="button button-light" to="/verify">Submit for review <ArrowRight size={16}/></Link></section>
<section className="category-section"><SectionTitle eyebrow="FIND YOUR FOCUS" title="Explore by topic" link="All categories" href="/categories"/><div className="category-pills">{topics.map((c,i)=><Link key={c.id} to={`/category/${c.name}`}><span>{String(i+1).padStart(2,"0")}</span>{c.name}<ChevronRight size={15}/></Link>)}</div></section></main></>}
function Listing({category}){const {news,loading,error}=useNews(category);return <main className="wrap page-main"><div className="page-heading"><span className="eyebrow">{category?'TOPIC / '+category.toUpperCase():'THE NEWSROOM'}</span><h1>{category||'Latest news'}</h1><p>Clear reporting and considered perspectives, updated as stories develop.</p></div>{error&&<div className="notice error">{error}</div>}{loading?<div className="loading">Loading stories…</div>:news.length?<div className="cards-grid">{news.map(n=><Card key={n.id} item={n}/>)}</div>:<div className="empty-state"><h3>No published stories yet</h3><p>New reporting will appear here as soon as it is published.</p></div>}</main>}
function Categories(){const items=useCategories();return <main className="wrap page-main"><div className="page-heading"><span className="eyebrow">FOLLOW WHAT MATTERS</span><h1>Explore topics</h1><p>Choose a desk to see its latest reporting.</p></div>{items.length?<div className="category-grid">{items.map((c,i)=><Link key={c.id} to={`/category/${c.name}`}><span className="category-number">{String(i+1).padStart(2,'0')}</span><b>{c.name}</b><ArrowRight/></Link>)}</div>:<div className="empty-state"><p>Active categories will appear here when the newsroom is configured.</p></div>}</main>}
function Details(){const {slug}=useParams();const [item,setItem]=useState(null),[loading,setLoading]=useState(true);useEffect(()=>{if(!db)return;let dead=false;(async()=>{try{let s=await getDoc(doc(db,'news',slug));if(!s.exists()){const q=await getDocs(query(collection(db,'news'),where('slug','==',slug),where('status','==','published'),limit(1)));s=q.docs[0]}if(!dead&&s?.exists())setItem({id:s.id,...s.data()})}finally{if(!dead)setLoading(false)}})();return()=>{dead=true}},[slug]);if(loading)return <main className="wrap page-main loading">Loading story…</main>;if(!item)return <main className="wrap page-main"><div className="empty-state"><h2>Story unavailable</h2><p>This story may have moved or is not published.</p><Link to="/latest" className="read-link">Back to latest news</Link></div></main>;return <main className="wrap article"><Link to="/latest" className="back-link">← Latest stories</Link><div className="article-head"><div className="story-meta"><span>{item.categoryName}</span><i/><time>{dateLabel(item.publishedAt)}</time></div><h1>{item.title}</h1><p>{item.excerpt}</p><div className="byline">Reporting by <b>{item.author||'NewsIntel newsroom'}</b></div></div><Image className="article-image" src={item.imageUrl} category={item.categoryName}/><article className="article-copy">{(item.content||'').split('\n').filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}{item.tags?.length>0&&<div className="tags">{item.tags.map(t=><span key={t}>#{t}</span>)}</div>}</article></main>}
function SearchPage(){const [params]=useSearchParams(),[term,setTerm]=useState(params.get('q')||''),{news,loading}=useNews();const results=news.filter(n=>`${n.title} ${n.excerpt} ${n.categoryName} ${(n.tags||[]).join(' ')}`.toLowerCase().includes(term.toLowerCase()));return <main className="wrap page-main"><div className="page-heading"><span className="eyebrow">SEARCH THE NEWSROOM</span><h1>Find a story</h1><p>Search headlines, summaries, topics, and tags in published news.</p></div><div className="search-box"><Search/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Try a headline, topic, or keyword…" autoFocus/></div>{loading?<div className="loading">Loading search index…</div>:term?<><p className="result-count">{results.length} {results.length===1?'story':'stories'} matching “{term}”</p><div className="cards-grid">{results.map(n=><Card key={n.id} item={n}/>)}</div></>:<div className="empty-state"><p>Enter a search term to explore published stories.</p></div>}<p className="helper-text">Search is limited to loaded published stories. Firestore does not provide unrestricted full-text search.</p></main>}
function AuthPage({mode='login',setUser}){
  const nav=useNavigate()
  const [form,setForm]=useState({name:'',email:'',password:''})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)

  const finishSignIn=async user=>{
    await ensureCustomerProfile(user,form.name)
    setUser(user)
    nav('/profile')
  }

  const submit=async e=>{
    e.preventDefault()
    setBusy(true)
    setError('')
    try{
      if(!auth||!db)throw new Error('Add Firebase settings to the repository root .env file to enable accounts.')
      if(mode==='forgot'){
        await sendPasswordResetEmail(auth,form.email)
        setError('Password reset email sent.')
        return
      }
      if(mode==='register'){
        const credential=await createUserWithEmailAndPassword(auth,form.email,form.password)
        await updateProfile(credential.user,{displayName:form.name})
        await finishSignIn(credential.user)
      }else{
        const credential=await signInWithEmailAndPassword(auth,form.email,form.password)
        await finishSignIn(credential.user)
      }
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  const continueWithGoogle=async()=>{
    setBusy(true)
    setError('')
    try{
      if(!auth||!db)throw new Error('Add Firebase settings to the repository root .env file to enable accounts.')
      const credential=await signInWithPopup(auth,googleProvider)
      await finishSignIn(credential.user)
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <span className="eyebrow">NEWSINTEL AI ACCOUNT</span>
    <h1>{mode==='register'?'Join the conversation':mode==='forgot'?'Reset your password':'Welcome back'}</h1>
    <p>{mode==='register'?'Save your submissions and follow stories.':'Sign in to access your reader profile.'}</p>
    {mode!=='forgot'&&<>
      <button className="button google-button full" type="button" onClick={continueWithGoogle} disabled={busy}>
        <svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.25 5.48-4.72 7.18l7.58 5.88c4.42-4.08 7.22-10.1 7.22-17.53Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.92l-7.58-5.88c-2.1 1.4-4.78 2.23-8.32 2.23-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z"/></svg>
        {busy?'Please wait…':'Continue with Google'}
      </button>
      <div className="auth-divider"><span>or continue with email</span></div>
    </>}
    {mode==='register'&&<label>Your name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}
    <label>Email address<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    {mode!=='forgot'&&<label>Password<input type="password" minLength="6" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}
    {error&&<div className="notice error">{error}</div>}
    <button className="button button-dark full" disabled={busy}>{busy?'Please wait…':mode==='register'?'Create account':mode==='forgot'?'Send reset link':'Sign in'} <ArrowRight size={16}/></button>
    {mode==='login'&&<Link className="text-link" to="/forgot-password">Forgot password?</Link>}
    <p className="auth-switch">{mode==='login'?<>New here? <Link to="/register">Create an account</Link></>:<>Already have an account? <Link to="/login">Sign in</Link></>}</p>
  </form></main>
}
function Verify(){const [user,setUser]=useState(null),[f,setF]=useState({headline:'',claim:'',sourceUrl:'',additionalInformation:''}),[state,setState]=useState(''),[busy,setBusy]=useState(false);useEffect(()=>auth?onAuthStateChanged(auth,u=>setUser(u)):undefined,[]);const submit=async e=>{e.preventDefault();setBusy(true);try{if(!db||!user)throw new Error(!user?'Sign in to send a claim for review.':'Connect Firebase first.');if(f.sourceUrl&&new URL(f.sourceUrl).protocol!=='https:')throw new Error('Source links must use HTTPS.');await addDoc(collection(db,'verificationRequests'),{...f,userId:user.uid,status:'pending',result:'unverified',reviewNotes:'',evidenceUrls:[],createdAt:serverTimestamp(),updatedAt:serverTimestamp()});setState('Thanks. Your claim has been submitted for human review. We will not label it true or false without evidence.');setF({headline:'',claim:'',sourceUrl:'',additionalInformation:''})}catch(e){setState(e.message)}finally{setBusy(false)}};return <main className="wrap page-main verify-page"><div className="page-heading"><span className="eyebrow">CHECK BEFORE YOU SHARE</span><h1>Submit a claim</h1><p>Help our team investigate a claim. Submission is not a verdict; a reviewer will examine available evidence.</p></div><form className="form-card" onSubmit={submit}><label>Headline of the story<input required maxLength="180" value={f.headline} onChange={e=>setF({...f,headline:e.target.value})} placeholder="What did you see?"/></label><label>Claim or content<textarea required minLength="20" rows="5" value={f.claim} onChange={e=>setF({...f,claim:e.target.value})} placeholder="Describe the statement you would like us to review…"/></label><label>Source URL (optional)<input type="url" placeholder="https://" value={f.sourceUrl} onChange={e=>setF({...f,sourceUrl:e.target.value})}/></label><label>Additional context (optional)<textarea rows="3" value={f.additionalInformation} onChange={e=>setF({...f,additionalInformation:e.target.value})}/></label>{state&&<div className={`notice ${state.startsWith('Thanks')?'success':'error'}`}>{state}</div>}<button className="button button-dark" disabled={busy}>{busy?'Sending…':'Send for review'} <ArrowRight size={16}/></button><p className="helper-text">You must be signed in to submit. We store your request privately for newsroom review.</p></form></main>}
function Profile({user}){const [items,setItems]=useState([]);useEffect(()=>{if(!db||!user)return;getDocs(query(collection(db,'verificationRequests'),where('userId','==',user.uid),orderBy('createdAt','desc'),limit(30))).then(s=>setItems(s.docs.map(d=>({id:d.id,...d.data()})))).catch(()=>{})},[user]);if(!user)return <main className="wrap page-main"><div className="empty-state"><h2>Sign in to see your profile</h2><Link className="button button-dark" to="/login">Sign in</Link></div></main>;return <main className="wrap page-main"><div className="page-heading"><span className="eyebrow">YOUR NEWSINTEL</span><h1>Hello, {user.displayName||'Reader'}.</h1><p>{user.email}</p></div><h2 className="minor-title">Your verification submissions</h2>{items.length?items.map(x=><div className="request-row" key={x.id}><b>{x.headline}</b><span>{x.status||'pending'}</span></div>):<div className="empty-state"><p>You haven’t submitted any claims yet.</p><Link to="/verify" className="read-link">Submit a claim <ArrowRight size={14}/></Link></div>}<button className="button button-outline" onClick={()=>signOut(auth)}>Sign out</button></main>}
function App(){const [user,setUser]=useState(null);useEffect(()=>auth?onAuthStateChanged(auth,setUser):undefined,[]);return <><Header user={user}/><Routes><Route path="/" element={<Home/>}/><Route path="/latest" element={<Listing/>}/><Route path="/category/:category" element={<CategoryRoute/>}/><Route path="/categories" element={<Categories/>}/><Route path="/news/:slug" element={<Details/>}/><Route path="/search" element={<SearchPage/>}/><Route path="/verify" element={<Verify/>}/><Route path="/login" element={<AuthPage setUser={setUser}/>}/><Route path="/register" element={<AuthPage mode="register" setUser={setUser}/>}/><Route path="/forgot-password" element={<AuthPage mode="forgot" setUser={setUser}/>}/><Route path="/profile" element={<Profile user={user}/>}/><Route path="*" element={<Listing/>}/></Routes><Footer/></>}
function CategoryRoute(){const {category}=useParams();return <Listing category={decodeURIComponent(category)}/>}
export default App
