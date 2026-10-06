import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from './api';

const STORAGE_KEY = 'casting-admin-auth';

function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const login = (payload) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setAuth(payload);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  };

  const token = auth?.token;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={login} />} />
      <Route
        path="/"
        element={
          <ProtectedRoute auth={auth}>
            <AdminLayout admin={auth?.admin} onLogout={logout} token={token} />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage token={token} />} />
        <Route path="dashboard" element={<DashboardPage token={token} />} />
        <Route path="users" element={<UsersPage token={token} />} />
        <Route path="users/:id" element={<UserDetailPage token={token} />} />
        <Route path="logs" element={<ActivityLogsPage token={token} />} />
      </Route>
      <Route path="*" element={<Navigate to={auth ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

function ProtectedRoute({ auth, children }) {
  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@castingexpo.com', password: 'Admin@123' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      onLogin(result);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-block">
          <div className="brand-pill">Admin</div>
          <h1>Casting Admin</h1>
          <p>Manage talent, auditions, applications, and platform activity.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@castingexpo.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter password"
              required
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminLayout({ admin, onLogout, token }) {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Users', to: '/users' },
    { label: 'Activity Logs', to: '/logs' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">CA</div>
          <div>
            <h3>Casting Admin</h3>
            <small>{admin?.role || 'Admin'}</small>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="nav-item">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="user-box">
          <strong>{admin?.fullName || admin?.email}</strong>
          <span>{admin?.email}</span>
          <button onClick={() => { onLogout(); navigate('/login'); }}>Logout</button>
        </div>
      </aside>

      <main className="content-panel">
        <Outlet context={{ token }} />
      </main>
    </div>
  );
}

function DashboardPage({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiRequest('/admin/dashboard', {}, token);
        setStats(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
  }, [token]);

  if (loading) return <SectionCard title="Dashboard" subtitle="Loading stats..." />;
  if (error) return <ErrorState message={error} />;

  const cards = [
    { label: 'Total users', value: stats?.totalUsers || 0 },
    { label: 'Artists', value: stats?.totalArtists || 0 },
    { label: 'Audiences', value: stats?.totalAudiences || 0 },
    { label: 'Videos', value: stats?.totalVideos || 0 },
    { label: 'Auditions', value: stats?.totalAuditions || 0 },
    { label: 'Applications', value: stats?.totalApplications || 0 },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <div className="stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="mini-grid">
        <SectionCard title="New users today" value={stats?.newUsersToday ?? 0} />
        <SectionCard title="New this week" value={stats?.newUsersThisWeek ?? 0} />
        <SectionCard title="New this month" value={stats?.newUsersThisMonth ?? 0} />
      </div>
    </div>
  );
}

function UsersPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (role && role !== 'all') params.set('role', role);

        const response = await apiRequest(`/admin/users?${params.toString()}`, {}, token);
        setUsers(response.data || []);
        setPagination(response.pagination || { total: 0, totalPages: 1, page: 1, limit: 20 });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
  }, [token, page, search, role]);

  return (
    <div>
      <PageHeader title="Users" subtitle="Search, filter, and review user profiles" />

      <div className="toolbar">
        <input
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          placeholder="Search by name, email, mobile, TRK code"
        />
        <select value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }}>
          <option value="all">All roles</option>
          <option value="artist">Artist</option>
          <option value="audience">Audience</option>
        </select>
      </div>

      {loading ? <SectionCard title="Users" subtitle="Loading users..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>TRK</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} onClick={() => window.location.href = `#/users/${user.id}`} style={{ cursor: 'pointer' }}>
                  <td>{user.fullName || user.username || 'N/A'}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.trkCode || '—'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pager">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {pagination.page} / {pagination.totalPages || 1}</span>
        <button disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}

function UserDetailPage({ token }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [user, videos, auditions, applications, stories, followers, following, activity] = await Promise.all([
          apiRequest(`/admin/users/${id}`, {}, token),
          apiRequest(`/admin/users/${id}/videos`, {}, token),
          apiRequest(`/admin/users/${id}/auditions`, {}, token),
          apiRequest(`/admin/users/${id}/applications`, {}, token),
          apiRequest(`/admin/users/${id}/stories`, {}, token),
          apiRequest(`/admin/users/${id}/followers`, {}, token),
          apiRequest(`/admin/users/${id}/following`, {}, token),
          apiRequest(`/admin/users/${id}/activity?page=1&limit=10`, {}, token),
        ]);

        setData({ user, videos, auditions, applications, stories, followers, following, activity });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token && id) load();
  }, [token, id]);

  if (loading) return <SectionCard title="User details" subtitle="Loading profile..." />;
  if (error) return <ErrorState message={error} />;

  const { user, videos, auditions, applications, stories, followers, following, activity } = data;

  return (
    <div>
      <PageHeader title={user?.fullName || 'User profile'} subtitle={user?.email} />

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Profile</h3>
          <ul>
            <li><strong>Role:</strong> {user.role}</li>
            <li><strong>Mobile:</strong> {user.mobile || '—'}</li>
            <li><strong>TRK:</strong> {user.trkCode || '—'}</li>
            <li><strong>Location:</strong> {user.city || '—'}, {user.state || ''}</li>
            <li><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</li>
          </ul>
        </div>

        <div className="detail-card">
          <h3>Stats</h3>
          <ul>
            <li><strong>Videos:</strong> {user.stats?.videosCount ?? 0}</li>
            <li><strong>Auditions:</strong> {user.stats?.auditionsCount ?? 0}</li>
            <li><strong>Applications:</strong> {user.stats?.applicationsCount ?? 0}</li>
            <li><strong>Followers:</strong> {user.stats?.followersCount ?? 0}</li>
            <li><strong>Following:</strong> {user.stats?.followingCount ?? 0}</li>
          </ul>
        </div>
      </div>

      <SectionList title="Videos" items={videos || []} renderItem={(item) => <li key={item.id}>{item.title || 'Untitled video'} — {item.category || 'Videos'}</li>} />
      <SectionList title="Auditions" items={auditions || []} renderItem={(item) => <li key={item.id}>{item.title || 'Untitled audition'} — {item.category || 'Casting'}</li>} />
      <SectionList title="Applications" items={applications || []} renderItem={(item) => <li key={item.id}>{item.auditionTitle || 'Application'} — {item.status}</li>} />
      <SectionList title="Stories" items={stories || []} renderItem={(item) => <li key={item.id}>{item.title || 'Story'} — {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</li>} />
      <SectionList title="Followers" items={followers || []} renderItem={(item) => <li key={item.id}>{item.fullName}</li>} />
      <SectionList title="Following" items={following || []} renderItem={(item) => <li key={item.id}>{item.fullName}</li>} />
      <SectionList title="Recent activity" items={activity?.logs || []} renderItem={(item) => <li key={item.id}>{item.action} — {new Date(item.createdAt).toLocaleString()}</li>} />
    </div>
  );
}

function ActivityLogsPage({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiRequest('/admin/activity-logs?page=1&limit=50', {}, token);
        setLogs(response.logs || response.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
  }, [token]);

  if (loading) return <SectionCard title="Activity logs" subtitle="Loading logs..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Activity logs" subtitle="Latest platform events" />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.action}</td>
                <td>{log.user?.fullName || log.userId || 'System'}</td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, value }) {
  return (
    <div className="section-card">
      <h3>{title}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
      {value !== undefined ? <strong>{value}</strong> : null}
    </div>
  );
}

function SectionList({ title, items, renderItem }) {
  return (
    <div className="section-card">
      <h3>{title}</h3>
      <ul className="list-block">
        {items && items.length ? items.map(renderItem) : <li>No data available</li>}
      </ul>
    </div>
  );
}

function ErrorState({ message }) {
  return <div className="error-box">{message}</div>;
}

export default App;
