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
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
        alert(data.error || 'Error al crear la sesion de pago')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      alert('Error de conexion')
    }
  }

  return (
    <button onClick={handleSubscribe} className={className}>
      {label}
    </button>
  )
}
