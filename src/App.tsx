import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import AppShell from './components/AppShell'
import SessionGate from './components/SessionGate'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'

// Home stays in the main bundle (first screen after login); everything else loads on demand.
const AlbumPage = lazy(() => import('./album-page'))
const ArtistPage = lazy(() => import('./pages/ArtistPage'))
const ListDetailPage = lazy(() => import('./pages/ListDetailPage'))
const ListsPage = lazy(() => import('./pages/ListsPage'))
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ResetPasswordScreen = lazy(() => import('./components/ResetPasswordScreen'))
const SearchPage = lazy(() => import('./pages/SearchPage'))

function RouteFallback() {
  return <p className="loading-copy" role="status">Carregando...</p>
}

// Per-route boundary so the shell stays visible while a page chunk downloads.
function page(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

function AlbumRoute() {
  const { albumId = '' } = useParams()
  return <AlbumPage albumId={albumId} />
}

function ResetPasswordRoute() {
  const [params] = useSearchParams()
  const token = params.get('token')
  return token ? <ResetPasswordScreen token={token} /> : <Navigate to="/" replace />
}

function App() {
  return <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/auth/reset-password" element={<ResetPasswordRoute />} />
      <Route element={<SessionGate />}>
        <Route path="/albums/:albumId" element={<AlbumRoute />} />
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={page(<SearchPage />)} />
          <Route path="artists/:mbid" element={page(<ArtistPage />)} />
          <Route path="lists" element={page(<ListsPage />)} />
          <Route path="lists/:listId" element={page(<ListDetailPage />)} />
          <Route path="profile/:username" element={page(<ProfilePage />)} />
          <Route path="settings/profile" element={page(<ProfileEditPage />)} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
}

export default App



