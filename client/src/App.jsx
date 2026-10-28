import { useEffect, useState } from 'react';
import './App.css';

const categories = ['Facility Fault', 'IT Support', 'Maintenance', 'Lost Property', 'Security', 'Other'];
const nextStatus = { New: 'Assigned', Assigned: 'In Progress', 'In Progress': 'Resolved', Resolved: 'Closed' };
const statuses = [...Object.keys(nextStatus), 'Closed'];
const emptyForm = { category: '', description: '', latitude: '', longitude: '' };

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
}

function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('civicconnect-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
    catch { return 'light'; }
  });
  const [session, setSession] = useState(null);
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category: '', status: '', search: '', from: '', sort: 'newest' });
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [summary, setSummary] = useState(null);

  async function api(path, method = 'GET', body) {
    const response = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && session) setSession(null);
      throw new Error(result.message || 'The request could not be completed. Please try again.');
    }
    return result;
  }

  async function refresh() {
    const query = new URLSearchParams({ ...filters, page });
    const result = await api(`/requests?${query}`);
    setIssues(result.data);
    setTotal(result.total);
    if (session?.user.role === 'Municipal Admin') setSummary((await api('/requests/summary')).data);
  }

  useEffect(() => {
    if (!session) return undefined;
    let cancelled = false;
    async function load() {
      try {
        const query = new URLSearchParams({ ...filters, page });
        const response = await fetch(`/api/requests?${query}`, { headers: { Authorization: `Bearer ${session.token}` } });
        const result = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          if (response.status === 401) setSession(null);
          throw new Error(result.message || 'Unable to load requests.');
        }
        setIssues(result.data);
        setTotal(result.total);
        if (session.user.role === 'Municipal Admin') {
          const summaryResponse = await fetch('/api/requests/summary', { headers: { Authorization: `Bearer ${session.token}` } });
          const summaryResult = await summaryResponse.json().catch(() => ({}));
          if (!cancelled && summaryResponse.ok) setSummary(summaryResult.data);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session, filters, page]);

  async function run(action) {
    setBusy(true);
    setError('');
    setMessage('');
    try { await action(); } catch (actionError) { setError(actionError.message); } finally { setBusy(false); }
  }

  function auth(event) {
    event.preventDefault();
    run(async () => {
      if (register) {
        await api('/auth/register', 'POST', { email, password });
        setRegister(false);
        setMessage('Account created. Sign in to continue.');
      } else {
        setSession(await api('/auth/login', 'POST', { email, password }));
        setPassword('');
        setDetail(null);
        setPage(1);
      }
    });
  }

  function submitReport(event) {
    event.preventDefault();
    run(async () => {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error('Enter a valid latitude (−90 to 90) and longitude (−180 to 180).');
      }
      const result = await api('/requests', 'POST', {
        category: form.category,
        description: form.description.trim(),
        location: { type: 'Point', coordinates: [longitude, latitude] },
      });
      setMessage(`Issue reported successfully! Reference: ${result.data._id}`);
      setForm(emptyForm);
      await refresh();
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser. Enter coordinates manually.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setForm((current) => ({ ...current, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
      setLocating(false);
    }, () => {
      setError('We could not access your location. Enter the coordinates manually instead.');
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function changeFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function signOut() {
    setSession(null); setIssues([]); setSummary(null); setDetail(null); setError(''); setMessage(''); setPage(1);
  }

  const setFormField = (key) => ({ value: form[key], onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value })) });
  const isStaff = session && session.user.role !== 'Citizen';
  const isAdmin = session?.user.role === 'Municipal Admin';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('civicconnect-theme', theme); } catch { /* Theme still works for this visit. */ }
  }, [theme]);

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        <a className="brand" href="#home" aria-label="CivicConnect home"><span className="brand-mark"><PinIcon /></span><span>Civic<span className="brand-accent">Connect</span></span></a>
        <div className="topbar-actions"><button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}><span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span><span className="theme-toggle-label">{theme === 'light' ? 'Dark' : 'Light'} mode</span></button><div className="topbar-right"><span className="service-indicator" />Community services</div></div>
      </header>

      <main id="home">
        {!session ? (
          <>
            <section className="hero auth-hero">
              <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" />A better neighbourhood starts here</span><h1>Better services.<br /><span>Stronger communities.</span></h1><p>Connect with your local services, make a report, and follow the progress that matters to you.</p><div className="hero-note"><span className="note-icon">✦</span><span>A clear place to start when something needs attention.</span></div></div>
              <div className="hero-art" aria-hidden="true"><div className="sun"/><div className="city-skyline"><span className="building building-left"/><span className="building building-center"/><span className="building building-right"/><span className="streetlamp"><i/><b/></span><span className="city-tree tree-left"><i/><b/></span><span className="city-tree tree-right"><i/><b/></span><span className="sidewalk"/></div><div className="art-card"><span className="art-card-icon"><PinIcon/></span><span className="art-card-lines"><i/><i/><i/></span><span className="art-check">✓</span></div><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span></div>
            </section>
            <section className="auth-layout">
              <div className="auth-story"><span className="section-kicker">COMMUNITY, CONNECTED</span><h2>Good things happen when we work together.</h2><p>Sign in to follow your requests or create an account to let your community team know what needs attention.</p><div className="story-points"><span><i>01</i><b>Share what needs attention</b></span><span><i>02</i><b>Keep track of your requests</b></span><span><i>03</i><b>See updates as they happen</b></span></div></div>
              <section className="form-card auth-card" aria-labelledby="auth-title">
                <div className="card-heading"><div><span className="section-kicker">WELCOME TO CIVICCONNECT</span><h2 id="auth-title">{register ? 'Create your account' : 'Welcome back'}</h2></div><span className="step-badge">SECURE</span></div>
                <p className="form-intro">{register ? 'Set up your resident account to get started.' : 'Sign in to continue to your community workspace.'}</p>
                <form onSubmit={auth} className="stacked-form">
                  <div className="field-group"><label htmlFor="email">Email<span className="required" aria-hidden="true">*</span></label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" placeholder="you@example.com" /></div>
                  <div className="field-group"><label htmlFor="password">Password<span className="required" aria-hidden="true">*</span></label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={register ? 12 : undefined} maxLength={128} required autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 12 characters' : 'Enter your password'} />{register && <p className="helper-text">New accounts start with resident access.</p>}</div>
                  <button className="submit-button" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create resident account' : 'Sign in'}<span aria-hidden="true">↗</span></button>
                </form>
                <p className="auth-switch">{register ? 'Already have an account?' : 'New to CivicConnect?'} <button type="button" onClick={() => { setRegister(!register); setError(''); setMessage(''); }}>{register ? 'Sign in' : 'Create an account'}</button></p>
              </section>
            </section>
          </>
        ) : (
          <>
            <section className="workspace-banner">
              <div><span className="eyebrow"><span className="eyebrow-line" />{isStaff ? 'SERVICE TEAM WORKSPACE' : 'YOUR COMMUNITY SPACE'}</span><h1>{isAdmin ? 'Community at a glance.' : isStaff ? 'Ready to make a difference.' : 'Your voice makes a difference.'}</h1><p>{isStaff ? 'Review requests, keep work moving, and leave a clear record for the community.' : 'Report a local issue and follow the progress of the things you have shared.'}</p></div>
              <div className="account-chip"><span className="account-avatar">{session.user.email.slice(0, 1).toUpperCase()}</span><span className="account-info"><strong>{session.user.email}</strong><small>{session.user.role}</small></span><button className="signout-button" disabled={busy} onClick={signOut}>Sign out</button></div>
            </section>

            {isAdmin && summary && <section className="overview-card"><div className="overview-heading"><div><span className="section-kicker">SERVICE OVERVIEW</span><h2>Today’s request snapshot</h2></div><span className="live-label"><i/>Live data</span></div><div className="metric-grid">{[['total', 'All requests'], ['open', 'Open'], ['overdue', 'Overdue'], ['resolved', 'Resolved'], ['closed', 'Closed']].map(([key, label], index) => <div className={`metric metric-${index}`} key={key}><span>{label}</span><strong>{summary[key] ?? 0}</strong></div>)}</div><div className="category-summary"><span>By category</span>{Object.entries(summary.categories || {}).map(([key, value]) => <span className="category-count" key={key}>{key}<b>{value}</b></span>)}</div></section>}

            {!isStaff && <section className="content-grid resident-grid" aria-label="Report an issue and view your requests">
              <div className="form-card">
                <div className="card-heading"><div><span className="section-kicker">YOUR VOICE MATTERS</span><h2>Report a community issue</h2></div><span className="step-badge">01 <span>/ 01</span></span></div>
                <p className="form-intro">Share a few details so the right team can understand what’s happening.</p>
                <form onSubmit={submitReport}>
                  <div className="field-group"><label htmlFor="category">Category:<span className="required" aria-hidden="true">*</span></label><div className="select-wrap"><select id="category" {...setFormField('category')} required><option value="">Select a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><span className="select-chevron" aria-hidden="true">⌄</span></div></div>
                  <div className="field-group"><div className="label-row"><label htmlFor="description">Description:<span className="required" aria-hidden="true">*</span></label><span className="field-hint">{form.description.length}/500</span></div><textarea id="description" {...setFormField('description')} placeholder="What happened? Add a nearby landmark or useful details." maxLength={500} rows={4} required /></div>
                  <div className="field-group location-group"><div className="label-row"><label>Where is it?<span className="required" aria-hidden="true">*</span></label><button className="location-button" type="button" onClick={useMyLocation} disabled={locating}><PinIcon/>{locating ? 'Finding you…' : 'Use my location'}</button></div><div className="coordinates-grid"><div className="coordinate-field"><label htmlFor="latitude">Latitude:<span className="required" aria-hidden="true">*</span></label><input id="latitude" type="number" step="any" min="-90" max="90" {...setFormField('latitude')} placeholder="e.g. −25.7479" required /></div><div className="coordinate-field"><label htmlFor="longitude">Longitude:<span className="required" aria-hidden="true">*</span></label><input id="longitude" type="number" step="any" min="-180" max="180" {...setFormField('longitude')} placeholder="e.g. 28.2293" required /></div></div><p className="helper-text">Location helps the service team find the issue faster.</p></div>
                  <button className="submit-button" disabled={busy}>{busy ? 'Sending your report…' : 'Submit report'}<span aria-hidden="true">↗</span></button>
                  <p className="privacy-note"><span aria-hidden="true">◈</span>Your report is handled with care and used to support local services.</p>
                </form>
              </div>
              <aside className="side-column"><div className="info-card response-card"><div className="info-icon">◷</div><span className="section-kicker">WHAT HAPPENS NEXT</span><h3>Every report is a step forward.</h3><p>Your information gives the community team a clear place to start. You’ll see a confirmation as soon as your report is received.</p><div className="response-rule"/><div className="response-step"><span>01</span><div><strong>We receive your report</strong><small>Your details are recorded for the team.</small></div></div><div className="response-step"><span>02</span><div><strong>The team can review it</strong><small>Clear categories help it reach the right place.</small></div></div></div><div className="help-card"><span className="help-spark">✦</span><div><strong>Small details make a big difference.</strong><p>Add a nearby landmark or helpful context to your description.</p></div></div></aside>
            </section>}

            <section className="requests-panel">
              <div className="panel-heading"><div><span className="section-kicker">{isStaff ? 'INCOMING WORK' : 'YOUR ACTIVITY'}</span><h2>{isStaff ? 'Service requests' : 'Your requests'}</h2><p>{isStaff ? 'Use the filters to find and prioritise work.' : 'Your submitted reports and the latest available status.'}</p></div><div className="request-total"><strong>{total}</strong><span>matching<br/>requests</span></div></div>
              <div className="filters"><label>Category<select value={filters.category} onChange={(event) => changeFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Status<select value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Submitted from<input type="date" value={filters.from} onChange={(event) => changeFilter('from', event.target.value)} /></label><label className="search-filter">Search description<input value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} maxLength={100} placeholder="Search requests" /></label><label>Sort by<select value={filters.sort} onChange={(event) => changeFilter('sort', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
              {issues.length ? <div className="request-list">{issues.map((item) => <article className="request-row" key={item._id}><div className="request-category-icon"><PinIcon/></div><div className="request-main"><div className="request-title-row"><h3>{item.category}</h3><span className={`status-pill status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></div><p>{item.description}</p><div className="request-meta"><span>{new Date(item.createdAt).toLocaleString()}</span><span>{item.priority} priority</span>{item.overdue && <span className="overdue-tag">Overdue</span>}</div></div><button className="view-button" disabled={busy} onClick={() => run(async () => { const result = await api(`/requests/${item._id}`); setDetail(result.data); setPriority(result.data.priority); setNote(''); })}>View details <span>↗</span></button></article>)}</div> : <div className="empty-state"><span className="empty-icon">⌕</span><h3>No matching requests</h3><p>{isStaff ? 'Try changing the filters or check again shortly.' : 'When you share a report, it will appear here.'}</p></div>}
              <nav className="pagination" aria-label="Request pages"><button className="secondary-button" disabled={busy || page === 1} onClick={() => setPage((current) => current - 1)}>← Previous</button><span>Page <strong>{page}</strong></span><button className="secondary-button" disabled={busy || page * 50 >= total} onClick={() => setPage((current) => current + 1)}>Next →</button></nav>
            </section>

            {detail && <section className="detail-panel" aria-labelledby="detail-heading"><div className="panel-heading detail-heading"><div><span className="section-kicker">REQUEST RECORD</span><h2 id="detail-heading">Request details</h2></div><button className="secondary-button" onClick={() => setDetail(null)}>Close details</button></div><div className="detail-summary"><div><span className="section-kicker">CATEGORY</span><strong>{detail.category}</strong></div><div><span className="section-kicker">CURRENT STATUS</span><span className={`status-pill status-${detail.status.toLowerCase().replaceAll(' ', '-')}`}>{detail.status}</span></div><div><span className="section-kicker">PRIORITY</span><strong>{detail.priority}</strong></div><div><span className="section-kicker">REFERENCE</span><code>{detail._id}</code></div></div><p className="detail-description">{detail.description}</p><p className="detail-location">Location coordinates: {detail.location.coordinates.join(', ')} · Owner: {detail.assignee || 'Unassigned'}</p><div className="history-grid"><div><h3>Status history</h3>{detail.history.length ? <ol className="history-list">{detail.history.map((entry, index) => <li key={`${entry.at}-${index}`}><span className="history-dot"/><div><strong>{entry.status}</strong><small>{new Date(entry.at).toLocaleString()}</small></div></li>)}</ol> : <p className="muted-copy">No status changes recorded yet.</p>}</div><div><h3>Notes & updates</h3>{detail.notes.length ? <ul className="note-list">{detail.notes.map((entry, index) => <li key={`${entry.at}-${index}`}><p>{entry.text}</p><small>{new Date(entry.at).toLocaleString()}</small></li>)}</ul> : <p className="muted-copy">No notes have been added.</p>}{!isStaff && detail.notifications.map((notification, index) => <p className="update-note" key={`${notification.at}-${index}`}>Request updated to {notification.status} · {new Date(notification.at).toLocaleString()}</p>)}</div></div>
              {isStaff && detail.status !== 'Closed' && <form className="detail-actions" onSubmit={(event) => { event.preventDefault(); run(async () => { const result = await api(`/requests/${detail._id}`, 'PATCH', { version: detail.__v, note: note || undefined, priority }); setDetail(result.data); setNote(''); await refresh(); setMessage('Request updated.'); }); }}><div className="field-group"><label htmlFor="priority">Priority</label><select id="priority" disabled={busy} value={priority} onChange={(event) => setPriority(event.target.value)}>{['Low', 'Normal', 'High'].map((value) => <option key={value}>{value}</option>)}</select></div><div className="field-group"><label htmlFor="action-note">Action or resolution note</label><textarea id="action-note" disabled={busy} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={3} placeholder="Add context for the next person or record the resolution." /></div><div className="detail-action-buttons"><button className="secondary-button" disabled={busy}>Save note and priority</button>{nextStatus[detail.status] && <button type="button" className="submit-button compact-submit" disabled={busy} onClick={() => run(async () => { const result = await api(`/requests/${detail._id}`, 'PATCH', { version: detail.__v, status: nextStatus[detail.status], note: note || undefined }); setDetail(result.data); setNote(''); await refresh(); setMessage('Status updated.'); })}>{detail.status === 'New' ? 'Accept request' : `Move to ${nextStatus[detail.status]}`} <span aria-hidden="true">↗</span></button>}</div></form>}
            </section>}
          </>
        )}

        {(error || message) && <div className={`toast ${error ? 'toast-error' : 'toast-success'}`} role={error ? 'alert' : 'status'}><span>{error ? '!' : '✓'}</span><p>{error || message}</p><button aria-label="Dismiss message" onClick={() => { setError(''); setMessage(''); }}>×</button></div>}
      </main>
      <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark"><PinIcon/></span><span>Civic<span className="brand-accent">Connect</span></span></a><span>Working together for better local services.</span><span>Community first <b>♥</b></span></footer>
    </div>
  );
}

export default App;
