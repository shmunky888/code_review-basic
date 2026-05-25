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
  it('renders the navbar brand link and avatar image', () => {
    render(<Navbar />)
    
    // Check if the link to homepage exists
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
    
    // Check if the avatar image exists
    const avatarImg = screen.getByAltText('Avatar')
    expect(avatarImg).toBeInTheDocument()
    expect(avatarImg).toHaveAttribute('src', '/avatar.png')
  })
})
