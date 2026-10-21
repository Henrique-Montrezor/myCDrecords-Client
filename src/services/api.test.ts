import { describe, expect, it } from 'vitest'
import { normalizeArtist, normalizeArtistDetails, normalizeRecommendation, normalizeReleaseGroup, normalizeTrack } from './api'

describe('normalizeArtist', () => {
  it('maps MusicBrainz fields to pt-BR labels and a year range', () => {
    const artist = normalizeArtist({ id: 'a1', name: 'Nirvana', type: 'Group', country: 'US', disambiguation: '90s US grunge band', 'life-span': { begin: '1987-01', end: '1994-04-05', ended: true } })
    expect(artist).toEqual({ id: 'a1', name: 'Nirvana', type: 'Grupo', country: 'US', years: '1987–1994', disambiguation: '90s US grunge band' })
  })

  it('shows an open range for active artists and nulls for missing data', () => {
    expect(normalizeArtist({ id: 'a2', name: 'Someone', 'life-span': { begin: '2001' } }).years).toBe('2001–')
    expect(normalizeArtist({ id: 'a3' })).toEqual({ id: 'a3', name: 'Artista sem nome', type: null, country: null, years: null, disambiguation: null })
  })
})

describe('normalizeReleaseGroup', () => {
  it('classifies the release type and points to the Cover Art Archive', () => {
    const release = normalizeReleaseGroup({ id: 'rg1', title: 'Nevermind', 'first-release-date': '1991-09-24', 'primary-type': 'Album', 'secondary-types': ['Live'] })
    expect(release).toEqual({ id: 'rg1', title: 'Nevermind', year: '1991', type: 'album', secondaryTypes: ['Live'], coverUrl: 'https://coverartarchive.org/release-group/rg1/front-250' })
    expect(normalizeReleaseGroup({ id: 'rg2', 'primary-type': 'Broadcast' }).type).toBe('other')
  })
})

describe('normalizeArtistDetails', () => {
  it('sorts releases by newest first and keeps the top tags', () => {
    const details = normalizeArtistDetails({
      id: 'a1',
      name: 'Band',
      tags: [{ name: 'rock', count: 2 }, { name: 'grunge', count: 9 }, { count: 3 }],
      'release-groups': [
        { id: 'old', title: 'Old', 'first-release-date': '1989', 'primary-type': 'Album' },
        { id: 'new', title: 'New', 'first-release-date': '1993-09-21', 'primary-type': 'Album' },
        { id: 'undated', title: 'Undated', 'primary-type': 'Single' },
      ],
    })
    expect(details.tags).toEqual(['grunge', 'rock'])
    expect(details.releases.map((release) => release.id)).toEqual(['new', 'old', 'undated'])
  })
})

describe('normalizeTrack', () => {
  it('prefers the album release for the link and the Spotify image', () => {
    const track = normalizeTrack({
      musicbrainz: {
        id: 'rec1',
        title: 'Come As You Are',
        length: 219000,
        'artist-credit': [{ name: 'Nirvana' }],
        releases: [
          { id: 'r1', title: 'Come As You Are (single)', 'release-group': { id: 'rg-single', 'primary-type': 'Single' } },
          { id: 'r2', title: 'Nevermind', 'release-group': { id: 'rg-album', 'primary-type': 'Album' } },
        ],
      },
      spotify: { id: 'sp1', name: 'Come As You Are', album: 'Nevermind', image: 'https://img/nevermind.jpg', artists: ['Nirvana'] },
    }, 0)
    expect(track).toEqual({ id: 'rec1', title: 'Come As You Are', artist: 'Nirvana', durationMs: 219000, albumTitle: 'Nevermind', albumId: 'rg-album', imageUrl: 'https://img/nevermind.jpg' })
  })

  it('survives a result without Spotify or releases', () => {
    const track = normalizeTrack({ musicbrainz: { id: 'rec2', title: 'Demo' } }, 3)
    expect(track).toEqual({ id: 'rec2', title: 'Demo', artist: 'Artista desconhecido', durationMs: null, albumTitle: null, albumId: null, imageUrl: null })
  })
})

describe('normalizeRecommendation', () => {
  it('builds a card with an encoded album link', () => {
    const album = normalizeRecommendation({ album_id: 'id with space', album_title: 'Title', album_artist: 'Artist', album_image: null })
    expect(album).toEqual({ id: 'id with space', title: 'Title', artist: 'Artist', year: '', cover: '', link: '/albums/id%20with%20space' })
  })
})
