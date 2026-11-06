import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return <SonnerToaster position="top-right" richColors />
}

export { SonnerToaster as ToasterPrimitive }

export function useToast() {
  return { show: sonnerToast }
}
