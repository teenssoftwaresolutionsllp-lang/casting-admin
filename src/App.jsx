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
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [detailPage, setDetailPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

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

  useEffect(() => {
    if (!token || !selectedMetric) return undefined;

    let cancelled = false;
    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError('');
      setDetails(null);

      try {
        const params = new URLSearchParams({ page: String(detailPage), limit: '20' });
        if (selectedMetric.role) params.set('role', selectedMetric.role);

        const response = await apiRequest(`/admin/users?${params.toString()}`, {}, token);
        let users = response.data || [];
        let contentItems = [];

        if (selectedMetric.contentKey) {
          const itemLists = await Promise.all(users.map(async (user) => {
            const items = await apiRequest(`/admin/users/${user.id}/${selectedMetric.contentKey}`, {}, token);
            return (items || []).map((item) => ({ ...item, owner: user }));
          }));
          contentItems = itemLists.flat();
        } else if (selectedMetric.countKey) {
          users = await Promise.all(users.map(async (user) => {
            const detail = await apiRequest(`/admin/users/${user.id}`, {}, token);
            return { ...user, metricCount: detail.stats?.[selectedMetric.countKey] ?? 0 };
          }));
          users = users.filter((user) => user.metricCount > 0);
        }

        if (!cancelled) {
          setDetails({
            users,
            contentItems,
            pagination: response.pagination || { page: detailPage, totalPages: 1, total: users.length },
          });
        }
      } catch (err) {
        if (!cancelled) setDetailsError(err.message || 'Unable to load dashboard details');
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [token, selectedMetric, detailPage]);

  if (loading) return <SectionCard title="Dashboard" subtitle="Loading stats..." />;
  if (error) return <ErrorState message={error} />;

  const cards = [
    { key: 'users', label: 'Total users', value: stats?.totalUsers || 0 },
    { key: 'artists', label: 'Artists', value: stats?.totalArtists || 0, role: 'artist' },
    { key: 'audiences', label: 'Audiences', value: stats?.totalAudiences || 0, role: 'audience' },
    { key: 'videos', label: 'Videos', value: stats?.totalVideos || 0, contentKey: 'videos' },
    { key: 'auditions', label: 'Auditions', value: stats?.totalAuditions || 0, contentKey: 'auditions' },
    { key: 'applications', label: 'Applications', value: stats?.totalApplications || 0, countKey: 'applicationsCount' },
  ];
  const selectedCard = cards.find((card) => card.key === selectedMetric?.key);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <div className="stats-grid">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`stat-card${selectedMetric?.key === card.key ? ' is-selected' : ''}`}
            aria-pressed={selectedMetric?.key === card.key}
            onClick={() => {
              setDetails(null);
              setDetailPage(1);
              setSelectedMetric((current) => current?.key === card.key ? null : card);
            }}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </button>
        ))}
      </div>

      {selectedCard ? (
        <section className="dashboard-details" aria-live="polite">
          <div className="details-heading">
            <div>
              <h3>{selectedCard.contentKey ? selectedCard.label : selectedCard.countKey ? `${selectedCard.label} by user` : selectedCard.label}</h3>
              <p>
                {selectedCard.contentKey
                  ? `Showing ${selectedCard.label.toLowerCase()} with their creator.`
                  : selectedCard.countKey ? 'Contribution counts for each user.' : 'Accounts matching this metric.'}
              </p>
            </div>
            {details?.pagination ? (
              <span>Page {details.pagination.page} of {details.pagination.totalPages || 1}</span>
            ) : null}
          </div>

          {detailsLoading ? <p className="details-message">Loading details...</p> : null}
          {detailsError ? <ErrorState message={detailsError} /> : null}

          {!detailsLoading && !detailsError && details ? (
            <>
              {selectedCard.contentKey ? (
                details.contentItems.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Content ID</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.contentItems.map((item) => (
                          <tr key={`${item.owner.id}-${item.id}`}>
                            <td>{item.id}</td>
                            <td>{item.owner.username || item.owner.fullName || '—'}</td>
                            <td>{item.owner.email || '—'}</td>
                            <td>{item.owner.role || '—'}</td>
                            <td>{item.title || `Untitled ${selectedCard.label.toLowerCase().replace(/s$/, '')}`}</td>
                            <td>{item.category || '—'}</td>
                            <td>
                              <Link className="edit-user-link" to={`/users/${item.owner.id}`}>Edit user</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="details-message">No {selectedCard.label.toLowerCase()} found for users on this page.</p>
              ) : details.users.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Mobile</th>
                        <th>TRK</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Country</th>
                        <th>Gender</th>
                        <th>Occupation</th>
                        {selectedCard.countKey ? <th>{selectedCard.label}</th> : <th>Joined</th>}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.username || user.fullName || '—'}</td>
                          <td>{user.email || '—'}</td>
                          <td>{user.role || '—'}</td>
                          <td>{user.mobile || '—'}</td>
                          <td>{user.trkCode || '—'}</td>
                          <td>{user.city || '—'}</td>
                          <td>{user.state || '—'}</td>
                          <td>{user.country || '—'}</td>
                          <td>{user.gender || '—'}</td>
                          <td>{user.occupation || '—'}</td>
                          <td>
                            {selectedCard.countKey
                              ? user.metricCount
                              : user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <UserRowActions
                              user={user}
                              token={token}
                              onDeleted={async () => {
                                setDetails((current) => current ? {
                                  ...current,
                                  users: current.users.filter((item) => item.id !== user.id),
                                  pagination: {
                                    ...current.pagination,
                                    total: Math.max(0, (current.pagination.total || 0) - 1),
                                  },
                                } : current);
                                try {
                                  setStats(await apiRequest('/admin/dashboard', {}, token));
                                } catch (err) {
                                  setDetailsError(`User was deleted, but dashboard totals could not be refreshed: ${err.message}`);
                                }
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="details-message">No matching details found on this page.</p>}

              <div className="pager">
                <button
                  type="button"
                  disabled={details.pagination.page <= 1}
                  onClick={() => setDetailPage((page) => page - 1)}
                >
                  Prev
                </button>
                <span>{details.pagination.total} users</span>
                <button
                  type="button"
                  disabled={details.pagination.page >= (details.pagination.totalPages || 1)}
                  onClick={() => setDetailPage((page) => page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <div className="mini-grid">
        <SectionCard title="New users today" value={stats?.newUsersToday ?? 0} />
        <SectionCard title="New this week" value={stats?.newUsersThisWeek ?? 0} />
        <SectionCard title="New this month" value={stats?.newUsersThisMonth ?? 0} />
      </div>
    </div>
  );
}

const EDITABLE_USER_FIELDS = [
  { key: 'fullName', label: 'Full name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'role', label: 'Role', type: 'role' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'trkCode', label: 'TRK code' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State / region' },
  { key: 'country', label: 'Country' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
  { key: 'website', label: 'Website', type: 'url' },
  { key: 'instagramHandle', label: 'Instagram' },
  { key: 'facebookUrl', label: 'Facebook', type: 'url' },
  { key: 'youtubeUrl', label: 'YouTube', type: 'url' },
  { key: 'address', label: 'Address' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'languages', label: 'Languages' },
];

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
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Mobile</th>
                <th>TRK</th>
                <th>City</th>
                <th>State</th>
                <th>Country</th>
                <th>Gender</th>
                <th>Occupation</th>
                <th>Email verified</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username || user.fullName || '—'}</td>
                  <td>{user.email || '—'}</td>
                  <td>{user.role || '—'}</td>
                  <td>{user.mobile || '—'}</td>
                  <td>{user.trkCode || '—'}</td>
                  <td>{user.city || '—'}</td>
                  <td>{user.state || '—'}</td>
                  <td>{user.country || '—'}</td>
                  <td>{user.gender || '—'}</td>
                  <td>{user.occupation || '—'}</td>
                  <td>{typeof user.emailVerified === 'boolean' ? (user.emailVerified ? 'Yes' : 'No') : '—'}</td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <UserRowActions
                      user={user}
                      token={token}
                      onDeleted={() => {
                        setUsers((current) => current.filter((item) => item.id !== user.id));
                        setPagination((current) => ({
                          ...current,
                          total: Math.max(0, current.total - 1),
                        }));
                      }}
                    />
                  </td>
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
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

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
        setEditValues(Object.fromEntries(
          EDITABLE_USER_FIELDS
            .filter(({ key }) => ['fullName', 'username', 'email', 'role', 'mobile', 'trkCode', 'city', 'state'].includes(key) || Object.hasOwn(user, key))
            .map(({ key, type }) => [key, type === 'date' && user[key] ? String(user[key]).slice(0, 10) : String(user[key] ?? '')]),
        ));
        setSaveError('');
        setSaveMessage('');
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
  const editableFields = EDITABLE_USER_FIELDS.filter(({ key }) => Object.hasOwn(editValues, key));
  const changedFields = editableFields.filter(({ key, type }) => {
    const originalValue = type === 'date' && user[key] ? String(user[key]).slice(0, 10) : String(user[key] ?? '');
    return editValues[key] !== originalValue;
  });

  async function saveProfile(e) {
    e.preventDefault();
    const changes = Object.fromEntries(
      changedFields.map(({ key }) => [key, editValues[key]]),
    );

    if (!Object.keys(changes).length) return;

    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const updatedUser = await apiRequest(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }, token);
      setData((current) => ({ ...current, user: { ...current.user, ...updatedUser } }));
      setEditValues((current) => Object.fromEntries(
        editableFields.map(({ key, type }) => [
          key,
          type === 'date' && updatedUser[key]
            ? String(updatedUser[key]).slice(0, 10)
            : String(updatedUser[key] ?? current[key] ?? ''),
        ]),
      ));
      setSaveMessage('Profile changes saved.');
    } catch (err) {
      setSaveError(err.message || 'Unable to save profile changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title={user?.fullName || 'User profile'} subtitle={user?.email} />

      <form className="detail-card profile-editor" onSubmit={saveProfile}>
        <div className="profile-editor-heading">
          <div>
            <h3>Profile details</h3>
            <p>Update the fields you need, then save your changes.</p>
          </div>
          <button type="submit" disabled={!changedFields.length || saving}>
            {saving ? 'Saving...' : `Save ${changedFields.length ? `${changedFields.length} changed` : 'changes'}`}
          </button>
        </div>
        {saveError ? <ErrorState message={saveError} /> : null}
        {saveMessage ? <p className="success-message" role="status">{saveMessage}</p> : null}
        <div className="profile-fields">
          {editableFields.map(({ key, label, type }) => (
            <label className="editable-field" key={key}>
              <span className="editable-field-label">{label}</span>
              {type === 'role' ? (
                <select
                  aria-label={label}
                  disabled={saving}
                  value={editValues[key]}
                  onChange={(event) => setEditValues((current) => ({ ...current, [key]: event.target.value }))}
                >
                  {[...new Set([editValues[key], 'artist', 'audience'].filter(Boolean))].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : type === 'textarea' ? (
                <textarea
                  aria-label={label}
                  disabled={saving}
                  value={editValues[key]}
                  onChange={(event) => setEditValues((current) => ({ ...current, [key]: event.target.value }))}
                  rows="3"
                />
              ) : (
                <input
                  aria-label={label}
                  type={type || 'text'}
                  disabled={saving}
                  value={editValues[key]}
                  onChange={(event) => setEditValues((current) => ({ ...current, [key]: event.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      </form>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Account information</h3>
          <ul>
            <li><strong>User ID:</strong> {user.id || '—'}</li>
            <li><strong>Role:</strong> {user.role || '—'}</li>
            <li><strong>Mobile:</strong> {user.mobile || '—'}</li>
            <li><strong>TRK code:</strong> {user.trkCode || '—'}</li>
            <li><strong>Location:</strong> {[user.city, user.state, user.country].filter(Boolean).join(', ') || '—'}</li>
            <li><strong>Joined:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</li>
            <li><strong>Last updated:</strong> {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '—'}</li>
            <li><strong>Email verified:</strong> {typeof user.emailVerified === 'boolean' ? (user.emailVerified ? 'Yes' : 'No') : '—'}</li>
          </ul>
        </div>

        <div className="detail-card">
          <h3>Stats</h3>
          <ul>
            <li><strong>Videos:</strong> {user.stats?.videosCount ?? videos?.length ?? 0}</li>
            <li><strong>Auditions:</strong> {user.stats?.auditionsCount ?? auditions?.length ?? 0}</li>
            <li><strong>Applications:</strong> {user.stats?.applicationsCount ?? applications?.length ?? 0}</li>
            <li><strong>Stories:</strong> {user.stats?.storiesCount ?? stories?.length ?? 0}</li>
            <li><strong>Followers:</strong> {user.stats?.followersCount ?? followers?.length ?? 0}</li>
            <li><strong>Following:</strong> {user.stats?.followingCount ?? following?.length ?? 0}</li>
          </ul>
        </div>
      </div>

      <SectionList title="Videos" items={videos || []} renderItem={(item) => <li key={item.id}>{item.title || 'Untitled video'} — {item.category || 'Videos'}</li>} />
      <SectionList title="Auditions" items={auditions || []} renderItem={(item) => <li key={item.id}>{item.title || 'Untitled audition'} — {item.category || 'Casting'}</li>} />
      <SectionList title="Applications" items={applications || []} renderItem={(item) => <li key={item.id}>{item.auditionTitle || 'Application'} — {item.status}</li>} />
      <SectionList title="Stories" items={stories || []} renderItem={(item) => <li key={item.id}>Story {item.id} — {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</li>} />
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

function UserRowActions({ user, token, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function deleteUser() {
    const name = user.fullName || user.email || 'this user';
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;

    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/admin/users/${user.id}`, { method: 'DELETE' }, token);
      await onDeleted();
    } catch (err) {
      setError(err.message || 'Unable to delete user.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="user-row-actions">
      <Link className="edit-user-link" to={`/users/${user.id}`}>
        Edit
      </Link>
      <button
        type="button"
        className="delete-user-button"
        aria-label={`Delete ${user.fullName || user.email || 'user'}`}
        title="Delete user"
        disabled={deleting}
        onClick={deleteUser}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
        </svg>
      </button>
      {error ? <span className="delete-user-error" role="alert">{error}</span> : null}
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
