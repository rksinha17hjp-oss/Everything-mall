import { useEffect, useMemo, useState } from 'react'
import {
  Search, ShoppingBag, UserRound, Heart, Menu, X, Sparkles, ArrowRight,
  Star, SlidersHorizontal, Plus, Minus, LogOut, Mail, LockKeyhole, LoaderCircle,
  Package, Store, ShieldCheck, ChevronRight, ShoppingCart, CheckCircle2
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { categories, demoProducts } from './data/demoProducts'

const money = (n) => n === 0 ? 'Explore' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0))
const categoryLabel = (id) => categories.find(c => c.id === id)?.name || id

function AuthModal({ onClose, onSignedIn }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(''); setMessage('')
    if (!supabase) {
      setError('Supabase is not configured yet. Follow README.md to connect your project.')
      setBusy(false); return
    }
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.session) {
          onSignedIn(data.session.user)
          onClose()
        } else {
          setMessage('Account request successful. Check your email to confirm the account, then sign in.')
        }
      } else if (mode === 'signin') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        onSignedIn(data.user)
        onClose()
      } else {
        const redirectTo = window.location.origin + window.location.pathname
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (err) throw err
        setMessage('If the email is registered, a password-reset link has been sent.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Account">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><X size={20}/></button>
      <div className="modal-mark"><ShoppingBag size={24}/></div>
      <p className="eyebrow">EVERYTHING MALL ACCOUNT</p>
      <h2>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2>
      <p className="muted">One account for your whole mall experience.</p>
      <form onSubmit={submit} className="auth-form">
        <label>Email address</label>
        <div className="field"><Mail size={18}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></div>
        {mode !== 'reset' && <><label>Password</label><div className="field"><LockKeyhole size={18}/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}/></div></>}
        {error && <p className="alert error">{error}</p>}
        {message && <p className="alert success">{message}</p>}
        <button className="btn btn-primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : null}{mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
      </form>
      <div className="auth-switch">
        {mode === 'signin' ? <><button onClick={() => {setMode('signup');setError('');setMessage('')}}>Create account</button><button onClick={() => {setMode('reset');setError('');setMessage('')}}>Forgot password?</button></> :
          <button onClick={() => {setMode('signin');setError('');setMessage('')}}>Back to sign in</button>}
      </div>
      {!isSupabaseConfigured && <p className="setup-note">Demo mode: configure Supabase to enable real accounts.</p>}
    </section>
  </div>
}

function App() {
  const [products, setProducts] = useState(demoProducts)
  const [source, setSource] = useState('demo')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sort, setSort] = useState('featured')
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [toast, setToast] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let active = true
    async function loadProducts() {
      if (!supabase) return
      setLoadingProducts(true)
      const { data, error } = await supabase
        .from('products')
        .select('id,name,description,price,compare_at_price,category_id,rating,badge,emoji,store_id,stores(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!active) return
      if (!error && data?.length) {
        setProducts(data.map(p => ({
          id: p.id, name: p.name, description: p.description || '',
          price: Number(p.price), compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
          category: p.category_id, rating: Number(p.rating || 0), badge: p.badge || '',
          emoji: p.emoji || '🛍️', store_name: p.stores?.name || 'Mall Store'
        })))
        setSource('supabase')
      } else if (!error && data?.length === 0) {
        setProducts(demoProducts)
        setSource('demo')
      } else {
        console.warn('Supabase catalogue unavailable; using demo catalogue.', error)
      }
      setLoadingProducts(false)
    }
    loadProducts()
    return () => { active = false }
  }, [])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = products.filter(p => {
      const categoryMatch = activeCategory === 'all' || p.category === activeCategory
      const text = `${p.name} ${p.description} ${p.store_name} ${p.category}`.toLowerCase()
      return categoryMatch && (!q || text.includes(q))
    })
    if (sort === 'price-low') list = [...list].sort((a,b) => a.price - b.price)
    if (sort === 'price-high') list = [...list].sort((a,b) => b.price - a.price)
    if (sort === 'rating') list = [...list].sort((a,b) => b.rating - a.rating)
    return list
  }, [products, search, activeCategory, sort])

  function notify(text) {
    setToast(text)
    window.setTimeout(() => setToast(''), 2400)
  }
  function addToCart(product) {
    setCart(old => {
      const found = old.find(i => i.id === product.id)
      return found ? old.map(i => i.id === product.id ? {...i, quantity: i.quantity + 1} : i) : [...old, {...product, quantity: 1}]
    })
    notify('Added to your demo cart')
  }
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    notify('Signed out')
  }

  return <div className="app-shell">
    <div className="announcement"><Sparkles size={14}/> Meet your new favourite way to shop <span>·</span> One mall. Everything.</div>
    <header className="site-header">
      <button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu">{mobileMenu ? <X/> : <Menu/>}</button>
      <a href="#" className="brand" onClick={e => {e.preventDefault();setActiveCategory('all');setSearch('')}}>
        <span className="brand-icon"><ShoppingBag size={22}/></span><span>everything<span className="brand-accent">mall</span><small>ONE MALL. EVERYTHING.</small></span>
      </a>
      <div className="header-search">
        <Search size={19}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, stores and more..." aria-label="Search products"/>
        <kbd>↵</kbd>
      </div>
      <div className="header-actions">
        <button className="header-action" onClick={() => setAuthOpen(true)}><UserRound size={19}/><span>{user ? 'Account' : 'Sign in'}</span></button>
        <button className="header-action" onClick={() => notify(`${wishlist.length} saved item${wishlist.length === 1 ? '' : 's'}`)}><Heart size={19}/><span>Saved</span></button>
        <button className="header-action cart-action" onClick={() => notify(`Demo cart: ${cartCount} item(s) · ${money(cartTotal)}`)}><ShoppingCart size={20}/><span>Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
      </div>
    </header>

    <nav className={`category-nav ${mobileMenu ? 'nav-open' : ''}`}>
      {categories.map(c => <button key={c.id} className={activeCategory === c.id ? 'nav-category active' : 'nav-category'} onClick={() => {setActiveCategory(c.id);setMobileMenu(false);document.getElementById('catalogue')?.scrollIntoView({behavior:'smooth'})}}><span>{c.emoji}</span>{c.name}</button>)}
      <button className="nav-category ai-nav" onClick={() => notify('AI assistant is planned for Phase 2')}><Sparkles size={16}/> AI Assistant <span className="soon">SOON</span></button>
    </nav>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-pill"><span className="pulse-dot"></span> YOUR WORLD, ALL IN ONE PLACE</div>
          <h1>Everything you love.<br/><span>All in one mall.</span></h1>
          <p>Discover products, everyday essentials and services from one beautifully connected marketplace.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => document.getElementById('catalogue')?.scrollIntoView({behavior:'smooth'})}>Explore the mall <ArrowRight size={18}/></button>
            <button className="btn btn-quiet" onClick={() => setAuthOpen(true)}><UserRound size={17}/> Join for free</button>
          </div>
          <div className="hero-proof"><span><ShieldCheck size={16}/> Built for smarter shopping</span><span><Package size={16}/> Multiple categories</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of the digital mall">
          <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div>
          <div className="art-glow"></div>
          <div className="mall-building"><div className="mall-roof"></div><div className="mall-sign">EVERYTHING<br/><b>MALL</b></div><div className="mall-windows"><i>👟</i><i>🎧</i><i>🛋️</i><i>🧴</i><i>🥑</i><i>🍜</i></div><div className="mall-door"></div></div>
          <div className="float-card float-card-top"><span className="float-icon purple">✨</span><span><b>One smart search</b><small>Find more, faster</small></span></div>
          <div className="float-card float-card-bottom"><span className="float-icon green">🛍️</span><span><b>Your mall, your way</b><small>Explore every category</small></span></div>
          <div className="sparkle sparkle-a">✦</div><div className="sparkle sparkle-b">✧</div>
        </div>
      </section>

      <section className="trust-strip">
        <div><span className="trust-icon">🛒</span><span><b>All-in-one discovery</b><small>Many categories, one place</small></span></div>
        <div><span className="trust-icon">🔎</span><span><b>Easy to explore</b><small>Search and filter products</small></span></div>
        <div><span className="trust-icon">💜</span><span><b>Made for you</b><small>Personalisation-ready</small></span></div>
      </section>

      <section className="section categories-section">
        <div className="section-heading"><div><p className="eyebrow">EXPLORE THE MALL</p><h2>One mall. <span>Every interest.</span></h2><p className="muted">Pick a department and discover something new.</p></div><button className="text-link" onClick={() => {setActiveCategory('all');document.getElementById('catalogue')?.scrollIntoView({behavior:'smooth'})}}>View all <ArrowRight size={16}/></button></div>
        <div className="category-grid">
          {categories.filter(c => c.id !== 'all').map((c, i) => <button key={c.id} className={`category-card category-color-${i % 6}`} onClick={() => {setActiveCategory(c.id);document.getElementById('catalogue')?.scrollIntoView({behavior:'smooth'})}}><span className="category-emoji">{c.emoji}</span><span className="category-name">{c.name}</span><span className="category-arrow"><ArrowRight size={15}/></span></button>)}
        </div>
      </section>

      <section className="promo-banner">
        <div className="promo-spark">✦</div><div><p className="eyebrow">A SMARTER WAY TO DISCOVER</p><h2>Your next great find is<br/>just a search away.</h2><p>Browse the catalogue today. AI-powered discovery is on our roadmap.</p></div><button className="btn btn-light" onClick={() => {document.querySelector('.header-search input')?.focus();window.scrollTo({top:0,behavior:'smooth'})}}>Start exploring <Search size={17}/></button><div className="promo-orb orb-a"></div><div className="promo-orb orb-b"></div>
      </section>

      <section className="section catalogue-section" id="catalogue">
        <div className="section-heading catalogue-heading"><div><p className="eyebrow">THE DISCOVERY EDIT</p><h2>{activeCategory === 'all' ? 'Popular right now' : `${categoryLabel(activeCategory)} picks`}</h2><p className="muted">{source === 'supabase' ? 'Live catalogue from your Supabase database.' : 'Sample catalogue for the starter demo. Connect Supabase to load database products.'}</p></div><div className="catalogue-controls"><label className="sort-select"><SlidersHorizontal size={16}/><select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Top rated</option></select></label></div></div>
        <div className="catalogue-search-mobile"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the mall..."/></div>
        <div className="filter-chips">{categories.map(c => <button key={c.id} className={activeCategory === c.id ? 'filter-chip selected' : 'filter-chip'} onClick={() => setActiveCategory(c.id)}>{c.emoji} {c.name}</button>)}</div>
        {loadingProducts && <p className="inline-status"><LoaderCircle className="spin" size={16}/> Loading catalogue…</p>}
        {filteredProducts.length === 0 ? <div className="empty-state"><Search size={30}/><h3>No matching items</h3><p>Try another search or choose a different category.</p><button className="btn btn-outline" onClick={() => {setSearch('');setActiveCategory('all')}}>Clear filters</button></div> :
          <div className="product-grid">{filteredProducts.map(p => <article className="product-card" key={p.id}>
            <div className="product-image" role="button" tabIndex={0} onClick={() => setSelectedProduct(p)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedProduct(p) }} aria-label={`View ${p.name}`}><span className="product-visual">{p.emoji || '🛍️'}</span>{p.badge && <span className="product-badge">{p.badge}</span>}<button className={`wish-btn ${wishlist.includes(p.id) ? 'wished' : ''}`} onClick={e => {e.stopPropagation();setWishlist(old => old.includes(p.id) ? old.filter(id => id !== p.id) : [...old,p.id]);notify(wishlist.includes(p.id) ? 'Removed from saved items' : 'Saved for later')}} aria-label="Save item"><Heart size={17} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'}/></button></div>
            <div className="product-info"><p className="product-store">{p.store_name || 'Mall Store'} <span>·</span> {categoryLabel(p.category)}</p><button className="product-title" onClick={() => setSelectedProduct(p)}>{p.name}</button><div className="rating"><Star size={14} fill="currentColor"/><b>{Number(p.rating || 0).toFixed(1)}</b><span>Sample rating</span></div><div className="product-bottom"><div className="price-line"><b>{money(p.price)}</b>{p.compare_at_price && <del>{money(p.compare_at_price)}</del>}</div><button className="add-btn" onClick={() => addToCart(p)} aria-label={`Add ${p.name} to demo cart`}><Plus size={19}/></button></div></div>
          </article>)}</div>}
        <div className="catalogue-note"><ShieldCheck size={16}/>{source === 'demo' ? 'Demo data only — sample products, ratings and store names are illustrative.' : 'Catalogue loaded from Supabase. Confirmed stock and real fulfilment require additional modules.'}</div>
      </section>

      <section className="seller-cta"><div className="seller-cta-icon"><Store size={26}/></div><div><p className="eyebrow">FOR BUSINESSES</p><h2>Bring your store to Everything Mall.</h2><p className="muted">Seller onboarding and inventory tools are part of the next build phase.</p></div><button className="btn btn-outline" onClick={() => notify('Seller dashboard is planned for Phase 2')}>Become a seller <ArrowRight size={17}/></button></section>
    </main>

    <footer className="footer"><a href="#" className="brand footer-brand"><span className="brand-icon"><ShoppingBag size={20}/></span><span>everything<span className="brand-accent">mall</span><small>ONE MALL. EVERYTHING.</small></span></a><p>Discover more. Do more. All in one place.</p><div className="footer-links"><a href="#catalogue">Explore</a><a href="#catalogue">Categories</a><button onClick={() => setAuthOpen(true)}>My account</button><a href="mailto:hello@example.com">Contact demo</a></div><small>© {new Date().getFullYear()} Everything Mall · Student project prototype</small></footer>

    {selectedProduct && <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}><section className="product-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"><button className="icon-btn modal-close" onClick={() => setSelectedProduct(null)} aria-label="Close"><X/></button><div className="detail-visual">{selectedProduct.emoji || '🛍️'}</div><p className="eyebrow">{categoryLabel(selectedProduct.category)}</p><h2>{selectedProduct.name}</h2><p className="muted">{selectedProduct.description}</p><div className="rating"><Star size={15} fill="currentColor"/><b>{Number(selectedProduct.rating || 0).toFixed(1)}</b><span>Sample rating</span></div><div className="detail-price">{money(selectedProduct.price)}</div><p className="setup-note">Prototype listing. Real stock, delivery and purchase processing are not enabled.</p><button className="btn btn-primary full" onClick={() => {addToCart(selectedProduct);setSelectedProduct(null)}}><ShoppingCart size={18}/> Add to demo cart</button></section></div>}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSignedIn={setUser}/>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    {user && <div className="user-pill"><span className="user-dot"></span>{user.email}<button onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={16}/></button></div>}
    <div className="mobile-bottom-nav"><button onClick={() => {setActiveCategory('all');window.scrollTo({top:0,behavior:'smooth'})}><ShoppingBag/><span>Home</span></button><button onClick={() => document.getElementById('catalogue')?.scrollIntoView({behavior:'smooth'})}><Search/><span>Explore</span></button><button onClick={() => notify(`Demo cart: ${cartCount} item(s) · ${money(cartTotal)}`)}><ShoppingCart/><span>Cart {cartCount ? `(${cartCount})` : ''}</span></button><button onClick={() => setAuthOpen(true)}><UserRound/><span>Account</span></button></div>
  </div>
}

export default App