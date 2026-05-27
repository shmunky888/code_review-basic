import React from 'react'
import { render, screen } from '@testing-library/react'
import Navbar from '../app/components/Navbar'

// Mock next/image since next-router/next-image doesn't work out of the box in some jest environments
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

describe('Navbar', () => {
  it('renders the navbar brand link with accessible name and avatar image', () => {
    render(<Navbar />)

    // Link has explicit accessible text, not relying on child image alt
    const link = screen.getByRole('link', { name: /code review/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')

    // Brand text is visible alongside the avatar
    expect(screen.getByText('Code Review')).toBeInTheDocument()

    // Avatar image is decorative (empty alt), verify it exists by src
    const avatarImg = screen.queryByAltText('') as HTMLImageElement
    expect(avatarImg).not.toBeNull()
    expect(avatarImg).toHaveAttribute('src', '/avatar.png')
  })
})
