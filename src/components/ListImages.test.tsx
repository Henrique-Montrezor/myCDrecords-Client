import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../services/api'
import { prepareImage } from '../lib/image'
import ListImage from './ListImage'
import ListImageEditor from './ListImageEditor'
import ImageUpload from './ImageUpload'

vi.mock('../contexts/SessionContext', () => ({ useSession: () => ({ user: { id: 7 }, status: 'authenticated' }) }))
vi.mock('../services/api', async (original) => ({ ...(await original<typeof api>()),
  getListImage: vi.fn(), uploadListImage: vi.fn(), removeListImage: vi.fn(), uploadProfileImage: vi.fn(),
}))
vi.mock('../lib/image', async (original) => ({ ...(await original<typeof import('../lib/image')>()), prepareImage: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:private-image'), revokeObjectURL: vi.fn() }))
  vi.mocked(api.getListImage).mockResolvedValue(new Blob(['image'], { type: 'image/jpeg' }))
  vi.mocked(prepareImage).mockResolvedValue(new Blob(['prepared'], { type: 'image/jpeg' }))
  vi.mocked(api.uploadListImage).mockResolvedValue({ url: '/lists/4/images/thumbnail' })
  vi.mocked(api.removeListImage).mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const list = { id: 4, user_id: 7, title: 'Arquivo', description: null, is_public: false as const, created_at: '', updated_at: '' }

it('loads protected bytes via the service, revokes object URLs and retries failed images', async () => {
  vi.mocked(api.getListImage).mockRejectedValueOnce(new api.ApiError(403, { message: 'Lista privada.' }))
  const { unmount } = render(<ListImage listId={4} kind="banner" revision={2} alt="Capa da lista Arquivo" retry />)
  expect(await screen.findByText('Imagem indisponível')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar carregar imagem novamente' }))
  expect(await screen.findByRole('img', { name: 'Capa da lista Arquivo' })).toBeTruthy()
  expect(api.getListImage).toHaveBeenCalledWith(4, 'banner', expect.any(AbortSignal))
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-image')
})

it('uploads a prepared thumbnail, previews it and removes it without touching profile images', async () => {
  const changed = vi.fn()
  render(<ListImageEditor list={list} onChanged={changed} onClose={vi.fn()} />)
  const input = screen.getByLabelText('Foto da lista')
  await userEvent.upload(input, new File(['image'], 'photo.png', { type: 'image/png' }))
  expect(await screen.findByText('Imagem salva.')).toBeTruthy()
  expect(prepareImage).toHaveBeenCalledWith(expect.any(File), 512, 512)
  expect(api.uploadListImage).toHaveBeenCalledWith(4, 'thumbnail', expect.any(Blob))
  expect(await screen.findByRole('img', { name: 'Prévia da foto da lista' })).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Remover foto da lista' }))
  expect(await screen.findByText('Imagem removida.')).toBeTruthy()
  expect(api.removeListImage).toHaveBeenCalledWith(4, 'thumbnail')
  expect(api.uploadProfileImage).not.toHaveBeenCalled()
  expect(changed).toHaveBeenCalledTimes(2)
})

it('shows the specific upload error and does not claim success or change preview', async () => {
  vi.mocked(api.uploadListImage).mockRejectedValue(new api.ApiError(422, { message: 'Imagem inválida ou danificada.' }))
  const changed = vi.fn()
  render(<ListImageEditor list={list} onChanged={changed} onClose={vi.fn()} />)
  await userEvent.upload(screen.getByLabelText('Capa da lista'), new File(['bad'], 'cover.jpg', { type: 'image/jpeg' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Imagem inválida ou danificada.')
  expect(changed).not.toHaveBeenCalled()
  expect(screen.queryByText('Imagem salva.')).toBeNull()
  expect(prepareImage).toHaveBeenCalledWith(expect.any(File), 1600, 480)
})

it('keeps the existing profile upload adapter working', async () => {
  const change = vi.fn()
  vi.mocked(api.uploadProfileImage).mockResolvedValue({ url: 'https://example.com/avatar.jpg' })
  render(<ImageUpload kind="avatar" label="Foto de perfil" hint="Quadrada" hasImage={false} onChange={change}><span>Prévia</span></ImageUpload>)
  await userEvent.upload(screen.getByLabelText('Foto de perfil'), new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }))
  await waitFor(() => expect(change).toHaveBeenCalledWith('https://example.com/avatar.jpg'))
  expect(api.uploadProfileImage).toHaveBeenCalledWith('avatar', expect.any(Blob))
})

it('has accessible upload and removal controls without axe violations', async () => {
  const { container } = render(<ListImageEditor list={list} onChanged={vi.fn()} onClose={vi.fn()} />)
  expect((await axe.run(container)).violations.map((violation) => violation.id)).toEqual([])
})
