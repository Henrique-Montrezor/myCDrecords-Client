export type ApiUser = {
  id: number
  username: string
  email: string
  emailVerified?: boolean
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

export type ApiRecommendation = {
  album_id: string
  album_title: string
  album_artist: string
  album_image?: string | null
  album_genre?: string | null
  afinidade_score?: number
  total_avaliacoes?: number
  nota_media?: number | string | null
}

export type RecommendationKind = 'colaborativa' | 'genero' | 'popular' | 'vazio'

export type TasteProfile = { reviews: number; favorites: number }

export type RecommendationsResponse = {
  tipo: RecommendationKind
  data: ApiRecommendation[]
  perfil?: TasteProfile
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

export type ApiListDetails = ApiList & { items: ApiListItem[] }
