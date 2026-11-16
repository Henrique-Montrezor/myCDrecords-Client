export type ApiUser = {
  id: number
  username: string
  email: string
  emailVerified?: boolean
}

export const publicReviewNotice = {
  version: 'public-reviews-v1',
  text: 'Entendo que minhas reviews serão públicas e que não devo publicar dados pessoais meus ou de terceiros.',
} as const

export type PublicReviewNoticeAcknowledgement = {
  accepted: true
  version: typeof publicReviewNotice.version
}

export type RecommendationLabItem = { albumId: string; score: number }
export type RecommendationLabSnapshot = {
  schemaVersion: 1
  mode: 'synthetic'
  modelVersion: 'pytorch-bpr-v1'
  datasetVersion: 'synthetic-families-v1'
  snapshotId: string
  generatedAt: string
  promotionAllowed: false
  realWorldQuality: 'not_measured'
  training: { initialLoss: number; finalLoss: number; epochs: number; seed: number; torchVersion: string }
  evaluation: {
    protocol: 'synthetic-leave-one-out'
    k: 3
    model: { recall: number; ndcg: number }
    baseline: { recall: number; ndcg: number }
  }
  profiles: Array<{
    id: string
    trainingAlbums: string[]
    heldOutAlbum: string
    recommendations: RecommendationLabItem[]
    baseline: RecommendationLabItem[]
  }>
}

export type AuthResponse = {
  message: string
  user?: ApiUser
  accessToken: string
  expiresIn: number
}

export type ApiErrorPayload = {
  message?: string
  error?: string | object
  code?: string
  details?: unknown
  requestId?: string
}

export type AlbumCredit = {
  name?: string
  artist?: { name?: string }
}

export type ApiAlbum = {
  id?: string
  title?: string
  name?: string
  artistCredit?: AlbumCredit[]
  artists?: AlbumCredit[]
  releaseDate?: string
  release_date?: string
  imageUrl?: string
  images?: Array<{ url?: string }>
  genres?: string[]
}

export type AlbumSearchResponse = {
  spotify?: ApiAlbum[]
  musicbrainz?: ApiAlbum[]
}

export const discoveryGenres = ['rock', 'pop', 'jazz', 'electronic', 'hip hop', 'gothic rock', 'post-punk', 'darkwave', 'gothic metal'] as const
export type DiscoveryGenre = typeof discoveryGenres[number]
export type DiscoveryFilters = { genre: DiscoveryGenre | ''; year: string; type: 'album' | 'ep' | 'single'; offset: string }
export type DiscoveryResponse = {
  source: 'musicbrainz'
  updatedAt: string
  items: ApiAlbum[]
  total: number
  nextOffset: number | null
}
export type DiscoveryPage = Omit<DiscoveryResponse, 'items'> & { albums: Album[] }

export type ApiDiscoverySelection = {
  sectionId: 'editorial'
  kind: 'editorial'
  title: string
  source: 'mycdrecords'
  status: 'ready' | 'empty'
  revision: number
  updatedAt: string | null
  curator: string | null
  items: Array<{ album: ApiAlbum; note: string }>
}
export type DiscoverySelectionData = Omit<ApiDiscoverySelection, 'items'> & {
  items: Array<{ album: Album; note: string }>
}

// Normalized card data shared by search, trending, artist discography and recommendations.
export type Album = {
  id: string
  title: string
  artist: string
  year: string
  cover: string
  link: string
}

// Raw MusicBrainz artist as returned by /api/artists/search and /api/artists/:mbid.
export type ApiArtist = {
  id: string
  name?: string
  type?: string | null
  country?: string | null
  disambiguation?: string | null
  'life-span'?: { begin?: string | null; end?: string | null; ended?: boolean | null } | null
  tags?: Array<{ name?: string; count?: number }>
  'release-groups'?: ApiReleaseGroup[]
}

export type ApiReleaseGroup = {
  id: string
  title?: string
  'first-release-date'?: string | null
  'primary-type'?: string | null
  'secondary-types'?: string[]
}

export type ArtistSummary = {
  id: string
  name: string
  type: string | null
  country: string | null
  years: string | null
  disambiguation: string | null
}

export type ArtistRelease = {
  id: string
  title: string
  year: string | null
  type: 'album' | 'ep' | 'single' | 'other'
  secondaryTypes: string[]
  coverUrl: string
}

export type ArtistDetails = ArtistSummary & {
  tags: string[]
  releases: ArtistRelease[]
}

// Raw item from /api/tracks/search (MusicBrainz recording + optional Spotify match).
export type ApiTrackResult = {
  musicbrainz?: {
    id?: string
    title?: string
    length?: number | null
    'artist-credit'?: AlbumCredit[]
    releases?: Array<{ id?: string; title?: string; date?: string; 'release-group'?: { id?: string; 'primary-type'?: string | null } }>
  }
  spotify?: {
    id?: string | null
    name?: string | null
    album?: string | null
    image?: string | null
    artists?: string[] | null
  }
}

export type TrackResult = {
  id: string
  title: string
  artist: string
  durationMs: number | null
  albumTitle: string | null
  albumId: string | null
  imageUrl: string | null
}

export type AlbumTrack = {
  id: string
  number: number
  discNumber: number
  title: string
  durationMs: number | null
  artists: string[]
}

export type AlbumDetails = {
  id: string
  source: 'spotify' | 'musicbrainz'
  title: string
  artists: Array<{ name: string }>
  releaseDate: string | null
  type: string | null
  coverUrl: string | null
  genres: string[]
  externalUrl: string | null
  totalTracks: number
  tracks: AlbumTrack[]
}

export type RatingSummary = {
  average: number | null
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export type PublicProfile = {
  id: number
  username: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  followers: number
  following: number
  reviews: number
  is_following: boolean
  is_self: boolean
}

export type ApiUserSummary = {
  id: number
  username: string
  avatar_url?: string | null
}

export type ApiFavorite = {
  position: number
  album_id: string
  album_title: string | null
  album_image: string | null
  album_artist: string | null
}

export type ApiActivity = {
  type: 'review' | 'like'
  review_id: number
  album_id: string
  album_title: string | null
  album_image: string | null
  album_artist: string | null
  rating: number
  text: string | null
  author_username: string | null
  created_at: string
}

export type ApiReview = {
  id: number
  user_id: number
  username?: string
  album_id: string | number
  album_title?: string
  album_image?: string
  album_artist?: string
  rating: number
  text?: string
  created_at: string
  score?: number
  user_vote?: 1 | -1 | null
  comment_count?: number
}

export type ApiComment = {
  id: number
  review_id: number
  user_id: number
  username: string
  avatar_url: string | null
  text: string
  created_at: string
  updated_at: string
}

type FeedBase = {
  id: number
  user_id: number
  username: string
  avatar_url: string | null
  created_at: string
}

export type ApiFeedItem =
  | (FeedBase & {
      type: 'review'
      album_id: string
      album_title: string | null
      album_image: string | null
      album_artist: string | null
      rating: number
      text: string | null
    })
  | (FeedBase & {
      type: 'list'
      list_id: number
      list_title: string
      item_count: number
      album_image: string | null
      text: string | null
    })
  | (FeedBase & {
      type: 'follow'
      target_id: number
      target_username: string
      target_avatar_url: string | null
    })

export type FeedScope = 'following' | 'friends'

export type RecommendationReason =
  | { type: 'tags'; tags: string[] }
  | { type: 'collaborative'; people: number }
  | { type: 'exploration'; tag: string; from: string }
  | { type: 'community'; people: number }
  | { type: 'preferences'; genres: string[]; artists: string[] }

export type ApiRecommendation = {
  album_id: string
  album_title: string
  album_artist: string
  album_image?: string | null
  release_date?: string | null
  source?: 'musicbrainz'
  reasons?: unknown[]
}

export type RecommendationKind = 'personalizada' | 'popular' | 'vazio'

export type TasteProfile = { reviews: number; favorites: number }

export type RecommendationEvidence = { signals: number; required: number }

export type RecommendationsResponse = {
  tipo: RecommendationKind
  data: ApiRecommendation[]
  perfil?: TasteProfile
  version?: string
  evidence?: RecommendationEvidence
  total?: number
  nextOffset?: number | null
}

export type RecommendedAlbum = Album & { reasons: RecommendationReason[] }

export type RecommendationsPage = {
  kind: RecommendationKind
  albums: RecommendedAlbum[]
  profile: TasteProfile
  evidence: RecommendationEvidence
  total: number
  nextOffset: number | null
}

export type RecommendationPreferences = { genres: string[]; artists: string[] }

export type DismissedRecommendationsResponse = {
  data: ApiRecommendation[]
  total: number
  nextOffset: number | null
}

export type DismissedRecommendationsPage = {
  albums: RecommendedAlbum[]
  total: number
  nextOffset: number | null
}

export type ApiList = {
  id: number
  user_id: number
  title: string
  description: string | null
  is_public: boolean | 0 | 1
  created_at: string
  updated_at: string
  item_count?: number
  username?: string
  is_saved?: boolean
  save_count?: number
  previews?: Array<{ album_id: string; album_title: string | null; album_image: string | null }>
  has_thumbnail?: boolean
  has_banner?: boolean
  image_revision?: number
}

export type ListScope = 'popular' | 'following' | 'friends' | 'mine' | 'saved'
export type ListDiscoveryFilters = { scope: ListScope; q: string; sort: 'popular' | 'recent'; page: number }
export type ListDiscoveryPage = {
  items: ApiList[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  mode: 'popular' | 'recent'
}

export type ApiListItem = {
  id: number
  list_id: number
  album_id: string
  album_title: string | null
  album_image: string | null
  album_artist: string | null
  position: number
  created_at: string
}

export type ApiListDetails = ApiList & { items: ApiListItem[]; page: number; pageSize: number; totalPages: number; order_revision: number }
export type ListImageKind = 'thumbnail' | 'banner'
