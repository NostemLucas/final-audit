# 🔌 Frontend Integration - Guía Completa

Guía paso a paso para integrar el sistema de autenticación con tu frontend.

## 📋 Tabla de Contenidos

- [Setup Inicial](#setup-inicial)
- [Configuración Axios](#configuración-axios)
- [Hooks de React](#hooks-de-react)
- [Context Provider](#context-provider)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Manejo de Errores](#manejo-de-errores)

---

## 🚀 Setup Inicial

### 1. Instalar Dependencias

```bash
npm install axios jwt-decode
# o
yarn add axios jwt-decode
```

### 2. Estructura de Archivos Recomendada

```
src/
├── api/
│   ├── axios.config.ts          # Configuración de Axios
│   └── interceptors.ts          # Interceptores
├── contexts/
│   └── AuthContext.tsx          # Context de autenticación
├── hooks/
│   ├── useAuth.ts              # Hook de autenticación
│   └── useAutoRefresh.ts       # Auto-refresh de tokens
├── services/
│   └── auth.service.ts         # Servicios de auth
└── utils/
    └── token.utils.ts          # Utilidades JWT
```

---

## ⚙️ Configuración Axios

### `src/api/axios.config.ts`

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  withCredentials: true, // ✅ CRÍTICO: Envía cookies HTTP-only
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
```

### `src/api/interceptors.ts`

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import api from './axios.config'

// ========================================
// Estado compartido para sincronización
// ========================================
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token!)
    }
  })

  failedQueue = []
}

// ========================================
// Interceptor de Requests
// ========================================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ========================================
// Interceptor de Responses (Auto-refresh)
// ========================================
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Si no es 401, rechazar directamente
    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Si ya se reintentó, rechazar
    if (originalRequest._retry) {
      // Limpiar sesión y redirigir a login
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // ========================================
    // Caso 1: Ya hay un refresh en progreso
    // ========================================
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    // ========================================
    // Caso 2: Primera petición que falla
    // ========================================
    originalRequest._retry = true
    isRefreshing = true

    try {
      // Llamar a refresh (cookie se envía automáticamente)
      const { data } = await api.post('/auth/refresh')
      const newAccessToken = data.accessToken

      // Guardar nuevo token
      localStorage.setItem('accessToken', newAccessToken)

      // Actualizar headers
      api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      }

      // Procesar cola
      processQueue(null, newAccessToken)

      // Reintentar petición original
      return api(originalRequest)
    } catch (refreshError) {
      // Refresh falló, cerrar sesión
      processQueue(refreshError as AxiosError, null)
      localStorage.removeItem('accessToken')
      window.location.href = '/login'

      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
```

---

## 🔧 Utilidades de Tokens

### `src/utils/token.utils.ts`

```typescript
import { jwtDecode } from 'jwt-decode'

export interface JwtPayload {
  sub: string
  email: string
  username: string
  roles: string[]
  organizationId: string
  exp: number
  iat: number
}

/**
 * Decodifica un JWT sin verificar la firma
 * Útil para leer el contenido del token en el frontend
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token)
  } catch {
    return null
  }
}

/**
 * Obtiene la fecha de expiración del token
 */
export const getTokenExpiration = (token: string): Date | null => {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return null

  return new Date(decoded.exp * 1000)
}

/**
 * Verifica si el token está expirado
 */
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token)
  if (!expiration) return true

  return expiration.getTime() < Date.now()
}

/**
 * Verifica si el token está por expirar pronto
 * @param token - JWT token
 * @param minutesBeforeExpiry - Minutos antes de expiración (default: 2)
 */
export const isTokenExpiringSoon = (
  token: string,
  minutesBeforeExpiry = 2
): boolean => {
  const expiration = getTokenExpiration(token)
  if (!expiration) return true

  const timeUntilExpiry = expiration.getTime() - Date.now()
  const minutesInMs = minutesBeforeExpiry * 60 * 1000

  return timeUntilExpiry < minutesInMs
}

/**
 * Obtiene el usuario del token
 */
export const getUserFromToken = (token: string) => {
  const decoded = decodeToken(token)
  if (!decoded) return null

  return {
    id: decoded.sub,
    email: decoded.email,
    username: decoded.username,
    roles: decoded.roles,
    organizationId: decoded.organizationId,
  }
}
```

---

## 🎣 Hooks de React

### `src/hooks/useAuth.ts`

```typescript
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }

  return context
}
```

### `src/hooks/useAutoRefresh.ts` (Opcional)

```typescript
import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { isTokenExpiringSoon } from '../utils/token.utils'

/**
 * Hook para refrescar tokens automáticamente antes de que expiren
 *
 * Uso:
 * function App() {
 *   useAutoRefresh()
 *   return <YourApp />
 * }
 */
export const useAutoRefresh = () => {
  const { accessToken, refreshAccessToken } = useAuth()

  useEffect(() => {
    if (!accessToken) return

    // Verificar cada minuto si el token está por expirar
    const interval = setInterval(() => {
      if (isTokenExpiringSoon(accessToken, 2)) {
        refreshAccessToken()
      }
    }, 60 * 1000) // Cada minuto

    return () => clearInterval(interval)
  }, [accessToken, refreshAccessToken])
}
```

---

## 🔐 Context Provider

### `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios.config'
import { getUserFromToken, isTokenExpired } from '../utils/token.utils'

interface User {
  id: string
  email: string
  username: string
  fullName: string
  roles: string[]
  organizationId: string
  status: string
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ========================================
  // Inicializar autenticación al cargar
  // ========================================
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken')

      if (!storedToken) {
        setIsLoading(false)
        return
      }

      // Si el token está expirado, intentar refresh
      if (isTokenExpired(storedToken)) {
        try {
          await refreshAccessToken()
        } catch {
          localStorage.removeItem('accessToken')
          setIsLoading(false)
        }
        return
      }

      // Token válido, extraer usuario
      const userData = getUserFromToken(storedToken)
      setUser(userData as User)
      setAccessToken(storedToken)
      setIsLoading(false)
    }

    initAuth()
  }, [])

  // ========================================
  // Login
  // ========================================
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        usernameOrEmail: email,
        password,
      })

      const { accessToken, user: userData } = response.data

      // Guardar token
      localStorage.setItem('accessToken', accessToken)
      setAccessToken(accessToken)
      setUser(userData)
    } catch (error: any) {
      // Manejar errores específicos
      if (error.response?.status === 401) {
        throw new Error('Credenciales inválidas')
      } else if (error.response?.status === 429) {
        throw new Error('Demasiados intentos. Intenta más tarde.')
      } else {
        throw new Error('Error al iniciar sesión')
      }
    }
  }, [])

  // ========================================
  // Logout
  // ========================================
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      // Limpiar estado incluso si el request falla
      localStorage.removeItem('accessToken')
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  // ========================================
  // Refresh Access Token
  // ========================================
  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await api.post('/auth/refresh')
      const newAccessToken = response.data.accessToken

      localStorage.setItem('accessToken', newAccessToken)
      setAccessToken(newAccessToken)

      const userData = getUserFromToken(newAccessToken)
      setUser(userData as User)
    } catch (error) {
      // Si el refresh falla, cerrar sesión
      localStorage.removeItem('accessToken')
      setAccessToken(null)
      setUser(null)
      throw error
    }
  }, [])

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

---

## 🎨 Ejemplos de Uso

### 1. Setup en App.tsx

```typescript
import { AuthProvider } from './contexts/AuthContext'
import { useAutoRefresh } from './hooks/useAutoRefresh'

function AppContent() {
  useAutoRefresh() // Auto-refresh proactivo
  return <YourRoutes />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
```

### 2. Página de Login

```typescript
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
```

### 3. Protected Route

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div>Cargando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Uso en rutas
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### 4. Navbar con Logout

```typescript
import { useAuth } from '../hooks/useAuth'

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <nav>
      <span>Hola, {user?.fullName}</span>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </nav>
  )
}
```

### 5. Llamadas a API Protegidas

```typescript
import api from '../api/axios.config'

// El interceptor agrega automáticamente el token
export const getUsers = async () => {
  const response = await api.get('/users')
  return response.data
}

export const updateUser = async (id: string, data: any) => {
  const response = await api.patch(`/users/${id}`, data)
  return response.data
}

// Si el token expiró, el interceptor lo refresca automáticamente
```

### 6. Password Reset

```typescript
import { useState } from 'react'
import api from '../api/axios.config'

export const RequestResetPage = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await api.post('/auth/password/request-reset', { email })
      setMessage(response.data.message)
    } catch (error) {
      setMessage('Error al solicitar reset de contraseña')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <button type="submit">Enviar link de reset</button>
      {message && <div>{message}</div>}
    </form>
  )
}

export const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  // Obtener token de URL
  const searchParams = new URLSearchParams(window.location.search)
  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await api.post('/auth/password/reset', { token, newPassword })
      setMessage('Contraseña actualizada exitosamente')
    } catch (error) {
      setMessage('Token inválido o expirado')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Nueva contraseña"
      />
      <button type="submit">Cambiar contraseña</button>
      {message && <div>{message}</div>}
    </form>
  )
}
```

---

## ⚠️ Manejo de Errores

### Errores Comunes

```typescript
try {
  await login(email, password)
} catch (error: any) {
  switch (error.response?.status) {
    case 401:
      setError('Credenciales inválidas')
      break
    case 429:
      setError('Demasiados intentos. Intenta en 15 minutos.')
      break
    case 403:
      setError('Usuario inactivo o suspendido')
      break
    default:
      setError('Error al iniciar sesión')
  }
}
```

### Interceptor Global de Errores

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Logging de errores
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    })

    // Mostrar toast/notification
    if (error.response?.status === 500) {
      toast.error('Error del servidor. Intenta más tarde.')
    }

    return Promise.reject(error)
  }
)
```

---

## 📝 Checklist de Integración

- [ ] Instalar `axios` y `jwt-decode`
- [ ] Configurar `axios.create()` con `withCredentials: true`
- [ ] Implementar interceptores de request y response
- [ ] Crear utilidades de tokens
- [ ] Crear AuthContext y AuthProvider
- [ ] Implementar hooks (`useAuth`, `useAutoRefresh`)
- [ ] Proteger rutas con ProtectedRoute
- [ ] Implementar login/logout en UI
- [ ] Probar refresh automático
- [ ] Manejar errores apropiadamente

---

## 🎯 Tips de Producción

1. **Nunca guardes el refresh token en localStorage/sessionStorage**
   - Solo en HTTP-only cookies ✅

2. **Usa HTTPS en producción**
   - Las cookies secure solo funcionan con HTTPS

3. **Configura CORS correctamente**
   ```typescript
   app.enableCors({
     origin: process.env.FRONTEND_URL,
     credentials: true,
   })
   ```

4. **Maneja la expiración del refresh token**
   - Si el refresh falla, redirige a login

5. **Usa auto-refresh proactivo**
   - Mejor UX (usuario no ve errores 401)

6. **Implementa logout al cerrar todas las pestañas**
   ```typescript
   useEffect(() => {
     const handleBeforeUnload = () => {
       // Opcional: logout si no hay otras pestañas
     }
     window.addEventListener('beforeunload', handleBeforeUnload)
     return () => window.removeEventListener('beforeunload', handleBeforeUnload)
   }, [])
   ```
