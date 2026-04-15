'use client'

interface SubscribeButtonProps {
  className?: string
  label?: string
}

export function SubscribeButton({
  className = "mt-2 px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800",
  label = "Suscribirse",
}: SubscribeButtonProps) {
  async function handleSubscribe() {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) {
      window.location.href = url
    }
  }

  return (
    <button onClick={handleSubscribe} className={className}>
      {label}
    </button>
  )
}
