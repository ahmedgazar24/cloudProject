import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mj_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`
      } catch (_) {
        localStorage.removeItem('mj_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const userData = data.user
    setUser(userData)
    localStorage.setItem('mj_user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`
    return userData
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('mj_user')
    delete api.defaults.headers.common['Authorization']
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    return data
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
