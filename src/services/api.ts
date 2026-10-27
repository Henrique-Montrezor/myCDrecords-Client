import type { Album, AlbumDetails, AlbumSearchResponse, ApiActivity, ApiAlbum, ApiArtist, ApiComment, ApiErrorPayload, ApiFavorite, ApiFeedItem, ApiList, ApiListDetails, ApiRecommendation, ApiReleaseGroup, ApiReview, ApiTrackResult, ApiUserSummary, ArtistDetails, ArtistRelease, ArtistSummary, AuthResponse, FeedScope, PublicProfile, RatingSummary, RecommendationsResponse, TrackResult } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3004/api'
let accessToken: string | null = null

function asText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown
  requestId?: string

  constructor(status: number, payload: ApiErrorPayload) {
    // Some upstream errors arrive as objects in `error`; never surface "[object Object]".
    super(asText(payload.message) ?? asText(payload.error) ?? 'Não foi possível concluir a solicitação.')
    this.name = 'ApiError'
    this.status = status
    this.code = payload.code
    this.details = payload.details ?? (typeof payload.error === 'object' ? payload.error : undefined)
    this.requestId = payload.requestId
  }
}

type RequestOptions = RequestInit

export function setAccessToken(token: string | null) {
  accessToken = token
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : undefined
  if (!response.ok) throw new ApiError(response.status, { requestId: response.headers.get('x-request-id') ?? undefined, ...payload })
  return payload as T
}

function jsonBody<T extends object>(body: T): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await request<AuthResponse>('/auth/login', jsonBody({ email, password }))
  setAccessToken(response.accessToken)
  return response
}

export async function register(username: string, email: string, password: string, confirmPassword: string): Promise<AuthResponse> {
  const response = await request<AuthResponse>('/auth/register', jsonBody({ username, email, password, confirmPassword }))
  setAccessToken(response.accessToken)
  return response
}

let pendingRefresh: Promise<AuthResponse> | null = null

// Concurrent callers (such as StrictMode's double effect) share one request.
export function refreshSession(): Promise<AuthResponse> {
  pendingRefresh ??= request<AuthResponse>('/auth/refresh', jsonBody({}))
    .then((response) => {
      setAccessToken(response.accessToken)
      return response
    })
    .finally(() => { pendingRefresh = null })
  return pendingRefresh
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
  setAccessToken(null)
}

export function requestPasswordReset(email: string) {
  return request<{ message: string }>('/auth/password/request-reset', jsonBody({ email }))
}

export function resetPassword(token: string, password: string, confirmPassword: string) {
  return request<{ message: string }>('/auth/password/reset', jsonBody({ token, password, confirmPassword }))
}

export function verifyEmail(token: string) {
  return request<{ message: string }>('/auth/email/verify', jsonBody({ token }))
}

export function resendEmailVerification() {
  return request<{ message: string }>('/auth/email/resend-verification', { method: 'POST' })
}

function normalizeAlbum(album: ApiAlbum, index: number): Album {
  const artist = album.artistCredit?.[0]?.name ?? album.artists?.[0]?.name ?? 'Artista desconhecido'
  const releaseDate = album.releaseDate ?? album.release_date ?? ''
  const imageUrl = album.imageUrl ?? album.images?.[0]?.url ?? ''
  const id = album.id ?? `api-album-${index}`

  return {
    id,
    title: album.title ?? album.name ?? 'Álbum sem título',
    artist,
    year: releaseDate.slice(0, 4) || '—',
    cover: imageUrl,
    link: `/albums/${encodeURIComponent(id)}`,
  }
}

function normalizeAlbumResponse(response: AlbumSearchResponse): Album[] {
  const spotify = response.spotify ?? []
  const musicbrainz = response.musicbrainz ?? []
  const source = spotify.length > 0 ? spotify : musicbrainz
  return source.map(normalizeAlbum)
}

export async function getTrendingAlbums(signal?: AbortSignal): Promise<Album[]> {
  const response = await request<AlbumSearchResponse>('/albums/trending', { signal })
  return normalizeAlbumResponse(response)
}

export const ALBUM_SEARCH_PAGE_SIZE = 12

export async function searchAlbums(query: string, signal?: AbortSignal, offset = 0): Promise<Album[]> {
  const params = new URLSearchParams({ name: query, limit: String(ALBUM_SEARCH_PAGE_SIZE), offset: String(offset) })
  const response = await request<AlbumSearchResponse>(`/albums/search?${params.toString()}`, { signal })
  return normalizeAlbumResponse(response)
}

function artistYears(artist: ApiArtist) {
  const span = artist['life-span']
  const begin = span?.begin?.slice(0, 4)
  if (!begin) return null
  const end = span?.end?.slice(0, 4)
  return end ? `${begin}–${end}` : span?.ended ? begin : `${begin}–`
}

const artistTypeLabels: Record<string, string> = { person: 'Artista solo', group: 'Grupo', orchestra: 'Orquestra', choir: 'Coro', character: 'Personagem', other: 'Outro' }

export function normalizeArtist(artist: ApiArtist): ArtistSummary {
  const type = artist.type?.toLowerCase()
  return {
    id: artist.id,
    name: artist.name ?? 'Artista sem nome',
    type: type ? artistTypeLabels[type] ?? artist.type ?? null : null,
    country: artist.country ?? null,
    years: artistYears(artist),
    disambiguation: artist.disambiguation || null,
  }
}

const releaseTypes: Record<string, ArtistRelease['type']> = { album: 'album', ep: 'ep', single: 'single' }

export function normalizeReleaseGroup(group: ApiReleaseGroup): ArtistRelease {
  const primary = group['primary-type']?.toLowerCase() ?? ''
  return {
    id: group.id,
    title: group.title ?? 'Sem título',
    year: group['first-release-date']?.slice(0, 4) || null,
    type: releaseTypes[primary] ?? 'other',
    secondaryTypes: group['secondary-types'] ?? [],
    coverUrl: `https://coverartarchive.org/release-group/${group.id}/front-250`,
  }
}

export function normalizeArtistDetails(artist: ApiArtist): ArtistDetails {
  const tags = [...(artist.tags ?? [])]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .flatMap((tag) => (tag.name ? [tag.name] : []))
    .slice(0, 8)
  const releases = (artist['release-groups'] ?? [])
    .map(normalizeReleaseGroup)
    .sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''))
  return { ...normalizeArtist(artist), tags, releases }
}

export async function searchArtists(query: string, signal?: AbortSignal): Promise<ArtistSummary[]> {
  const params = new URLSearchParams({ name: query, limit: '12' })
  const response = await request<{ artists?: ApiArtist[] }>(`/artists/search?${params.toString()}`, { signal })
  return (response.artists ?? []).filter((artist) => artist.id).map(normalizeArtist)
}

export async function getArtist(mbid: string, signal?: AbortSignal): Promise<ArtistDetails> {
  const response = await request<ApiArtist>(`/artists/${encodeURIComponent(mbid)}?include_albums=true`, { signal })
  return normalizeArtistDetails(response)
}

export function normalizeTrack(item: ApiTrackResult, index: number): TrackResult {
  const recording = item.musicbrainz
  const spotify = item.spotify
  const releases = recording?.releases ?? []
  // Prefer a release that belongs to an album so the link lands on the main record.
  const release = releases.find((entry) => entry['release-group']?.['primary-type']?.toLowerCase() === 'album') ?? releases[0]
  const artist = recording?.['artist-credit']?.[0]?.name ?? recording?.['artist-credit']?.[0]?.artist?.name ?? spotify?.artists?.[0] ?? 'Artista desconhecido'
  return {
    id: recording?.id ?? spotify?.id ?? `track-${index}`,
    title: recording?.title ?? spotify?.name ?? 'Faixa sem título',
    artist,
    durationMs: typeof recording?.length === 'number' ? recording.length : null,
    albumTitle: release?.title ?? spotify?.album ?? null,
    albumId: release?.['release-group']?.id ?? null,
    imageUrl: spotify?.image ?? null,
  }
}

export async function searchTracks(query: string, signal?: AbortSignal): Promise<TrackResult[]> {
  const params = new URLSearchParams({ name: query })
  const response = await request<ApiTrackResult[]>(`/tracks/search?${params.toString()}`, { signal })
  return (Array.isArray(response) ? response : []).map(normalizeTrack)
}

export function getAlbumById(id: string, signal?: AbortSignal) {
  return request<AlbumDetails>(`/albums/${encodeURIComponent(id)}`, { signal })
}

export function getAlbumRatingSummary(albumId: string, signal?: AbortSignal) {
  return request<RatingSummary>(`/reviews/albums/${encodeURIComponent(albumId)}/summary`, { signal })
}

export function getAlbumReviews(albumId: string, page = 1, signal?: AbortSignal) {
  return request<ApiReview[]>(`/reviews/albums/${encodeURIComponent(albumId)}/reviews?page=${page}`, { signal })
}

export function getMyAlbumReview(albumId: string, signal?: AbortSignal) {
  return request<ApiReview | null>(`/reviews/albums/${encodeURIComponent(albumId)}/mine`, { signal })
}

export function getUserReviews(userId: number, page = 1, signal?: AbortSignal) {
  return request<ApiReview[]>(`/reviews/users/${userId}/reviews?page=${page}`, { signal })
}

export type VoteResult = { score: number; upvotes: number; downvotes: number; userVote: 1 | -1 | null }

export function voteReview(reviewId: number, value: 1 | -1) {
  return request<VoteResult>('/social/vote', jsonBody({ targetType: 'review', targetId: reviewId, value }))
}

export function removeReviewVote(reviewId: number) {
  return request<VoteResult>('/social/vote', { method: 'DELETE', body: JSON.stringify({ targetType: 'review', targetId: reviewId }) })
}

export function getProfile(username: string, signal?: AbortSignal) {
  return request<PublicProfile>(`/profile/get-profile/${encodeURIComponent(username)}`, { signal })
}

export function updateProfile(input: { bio: string; avatar_url: string }) {
  return request<{ message: string }>('/profile/create-or-update-profile', jsonBody(input))
}

export type ProfileImageKind = 'avatar' | 'banner'

export function uploadProfileImage(kind: ProfileImageKind, image: Blob) {
  return request<{ url: string }>(`/profile/${kind}`, { method: 'POST', body: image, headers: { 'Content-Type': image.type } })
}

export function removeProfileImage(kind: ProfileImageKind) {
  return request<void>(`/profile/${kind}`, { method: 'DELETE' })
}

export function getFavorites(userId: number, signal?: AbortSignal) {
  return request<ApiFavorite[]>(`/profile/users/${userId}/favorites`, { signal })
}

export type FavoriteInput = { albumId: string; albumTitle: string; albumImage?: string; albumArtist: string }

export function saveFavorites(albums: FavoriteInput[]) {
  return request<ApiFavorite[]>('/profile/favorites', { method: 'PUT', body: JSON.stringify({ albums }) })
}

export function getUserActivity(userId: number, page = 1, signal?: AbortSignal) {
  return request<ApiActivity[]>(`/profile/users/${userId}/activity?page=${page}`, { signal })
}

export function searchUsers(term: string, signal?: AbortSignal) {
  return request<ApiUserSummary[]>(`/user/search-users?username=${encodeURIComponent(term)}`, { signal })
}

export function followUser(userId: number) {
  return request<{ message: string }>(`/social/follow/${userId}`, { method: 'POST' })
}

export function unfollowUser(userId: number) {
  return request<void>(`/social/follow/${userId}`, { method: 'DELETE' })
}

export async function getFollowers(userId: number, signal?: AbortSignal) {
  const response = await request<{ followers: ApiUserSummary[] }>(`/social/${userId}/followers`, { signal })
  return response.followers
}

export async function getFollowing(userId: number, signal?: AbortSignal) {
  const response = await request<{ following: ApiUserSummary[] }>(`/social/${userId}/following`, { signal })
  return response.following
}

export function getFeed(page = 1, scope: FeedScope = 'following', signal?: AbortSignal) {
  return request<ApiFeedItem[]>(`/social/feed?page=${page}&scope=${scope}`, { signal })
}

export type ReviewInput = { rating: number; text: string }

export function postReview(album: AlbumDetails, input: ReviewInput) {
  return request<{ reviewId: number }>('/reviews/post-review', jsonBody({
    albumId: album.id,
    albumTitle: album.title,
    albumImage: album.coverUrl ?? '',
    albumArtist: album.artists.map((artist) => artist.name).join(', '),
    genre: album.genres[0] ?? '',
    ...input,
  }))
}

export function updateReview(reviewId: number, input: ReviewInput) {
  return request<{ message?: string }>(`/reviews/${reviewId}/update`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteReview(reviewId: number) {
  return request<void>(`/reviews/${reviewId}/delete`, { method: 'DELETE' })
}

export const COMMENTS_PAGE_SIZE = 20

export function getReviewComments(reviewId: number, page = 1, signal?: AbortSignal) {
  return request<ApiComment[]>(`/reviews/${reviewId}/comments?page=${page}`, { signal })
}

export function postComment(reviewId: number, text: string) {
  return request<ApiComment>(`/reviews/${reviewId}/comments`, jsonBody({ text }))
}

export function updateComment(commentId: number, text: string) {
  return request<ApiComment>(`/reviews/comments/${commentId}`, { method: 'PUT', body: JSON.stringify({ text }) })
}

export function deleteComment(commentId: number) {
  return request<void>(`/reviews/comments/${commentId}`, { method: 'DELETE' })
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function normalizeRecommendation(item: ApiRecommendation): Album {
  return {
    id: item.album_id,
    title: item.album_title || 'Álbum sem título',
    artist: item.album_artist || 'Artista desconhecido',
    year: '',
    cover: item.album_image ?? '',
    link: `/albums/${encodeURIComponent(item.album_id)}`,
  }
}

export async function getRecommendations(signal?: AbortSignal, limit = 8) {
  const response = await request<RecommendationsResponse>(`/recommendations?limit=${limit}`, { signal })
  return {
    kind: response.tipo,
    albums: (response.data ?? []).map(normalizeRecommendation),
    profile: response.perfil ?? { reviews: 0, favorites: 0 },
  }
}

export type ListInput = { title: string; description: string; isPublic: boolean }

export function getMyLists(signal?: AbortSignal) {
  return request<ApiList[]>('/lists/me', { signal })
}

export function getUserLists(userId: number, signal?: AbortSignal) {
  return request<ApiList[]>(`/lists/user/${userId}`, { signal })
}

export function getList(listId: number, signal?: AbortSignal) {
  return request<ApiListDetails>(`/lists/${listId}`, { signal })
}

export function createList(input: ListInput) {
  return request<{ listId: number }>('/lists', jsonBody(input))
}

export function updateList(listId: number, input: Partial<ListInput>) {
  return request<{ message: string }>(`/lists/${listId}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteList(listId: number) {
  return request<void>(`/lists/${listId}`, { method: 'DELETE' })
}

export function addAlbumToList(listId: number, album: AlbumDetails) {
  return request<{ message: string }>(`/lists/${listId}/items`, jsonBody({
    albumId: album.id,
    albumTitle: album.title,
    albumImage: album.coverUrl ?? undefined,
    albumArtist: album.artists.map((artist) => artist.name).join(', '),
  }))
}

export function removeAlbumFromList(listId: number, albumId: string) {
  return request<void>(`/lists/${listId}/items/${encodeURIComponent(albumId)}`, { method: 'DELETE' })
}

