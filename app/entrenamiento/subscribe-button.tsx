'use client'

export function SubscribeButton() {
  async function handleSubscribe() {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) {
      window.location.href = url
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      className="mt-2 px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800"
    >
      Suscribirse
    </button>
  )
}
