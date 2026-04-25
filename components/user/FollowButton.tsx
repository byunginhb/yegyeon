'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  targetUserId: string
  initialFollowing: boolean
  isLoggedIn: boolean
}

export default function FollowButton({ targetUserId, initialFollowing, isLoggedIn }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }

    setLoading(true)
    // 낙관적 업데이트
    setFollowing((prev) => !prev)

    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      })
      const json = await res.json()
      if (json.success) {
        setFollowing(json.data.following)
      } else {
        // 롤백
        setFollowing((prev) => !prev)
      }
    } catch {
      // 롤백
      setFollowing((prev) => !prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={following ? 'outline' : 'default'}
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="min-w-20"
    >
      {following ? '팔로잉' : '팔로우'}
    </Button>
  )
}
