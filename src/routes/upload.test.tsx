import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { Upload } from './upload'

const generateUploadUrl = vi.fn()
const publishVersion = vi.fn()

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useMutation: () => generateUploadUrl,
  useAction: () => publishVersion,
}))

describe('Upload route', () => {
  beforeEach(() => {
    generateUploadUrl.mockReset()
    publishVersion.mockReset()
  })

  it('shows validation issues and disables publish by default', () => {
    render(<Upload />)
    const publishButton = screen.getByRole('button', { name: /publish/i })
    expect(publishButton).toBeTruthy()
    expect((publishButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Slug is required/i)).toBeTruthy()
    expect(screen.getByText(/Display name is required/i)).toBeTruthy()
    expect(screen.getByText(/Changelog is required/i)).toBeTruthy()
  })

  it('marks the input for folder uploads', async () => {
    render(<Upload />)
    const input = screen.getByTestId('upload-input')
    await waitFor(() => {
      expect(input.getAttribute('webkitdirectory')).not.toBeNull()
    })
  })

  it('enables publish when fields and files are valid, and allows removing files', async () => {
    render(<Upload />)
    fireEvent.change(screen.getByPlaceholderText('my-skill-pack'), {
      target: { value: 'cool-skill' },
    })
    fireEvent.change(screen.getByPlaceholderText('My Skill Pack'), {
      target: { value: 'Cool Skill' },
    })
    fireEvent.change(screen.getByPlaceholderText('1.0.0'), {
      target: { value: '1.2.3' },
    })
    fireEvent.change(screen.getByPlaceholderText('latest, beta'), {
      target: { value: 'latest' },
    })
    fireEvent.change(screen.getByPlaceholderText('What changed in this version?'), {
      target: { value: 'Initial drop.' },
    })

    const file = new File(['hello'], 'SKILL.md', { type: 'text/markdown' })
    const input = screen.getByTestId('upload-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    const publishButton = screen.getByRole('button', { name: /publish/i }) as HTMLButtonElement
    await waitFor(() => {
      expect(publishButton.disabled).toBe(false)
    })
    expect(screen.getByText(/Ready to publish/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    await waitFor(() => {
      expect(publishButton.disabled).toBe(true)
    })
    expect(screen.getByText(/Add at least one file/i)).toBeTruthy()
  })
})
