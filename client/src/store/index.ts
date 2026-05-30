import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer, createTransform } from 'redux-persist'
import createWebStorage from 'redux-persist/lib/storage/createWebStorage'
import { combineReducers } from 'redux'
import authSlice from './slices/authSlice'

// SSR-safe storage: real localStorage in browser, noop on server (Next.js SSR)
const createNoopStorage = () => ({
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, value: string) => Promise.resolve(value),
  removeItem: (_key: string) => Promise.resolve(),
})

const storage =
  typeof window !== 'undefined' ? createWebStorage('local') : createNoopStorage()

// Security: strip accessToken before writing to localStorage so a stolen copy of
// localStorage (XSS, malicious extension) cannot yield a usable JWT.
// Only non-sensitive identity fields (role, userId, facultyId, batchId) are persisted.
// On page load the Shell triggers a silent /auth/refresh via the httpOnly cookie to
// obtain a fresh accessToken without requiring the user to re-enter credentials.
const authTransform = createTransform(
  // outbound: remove the token before it hits localStorage
  (state) => ({ ...(state as Record<string, unknown>), accessToken: null }),
  // inbound: keep null — the app will refresh it on mount
  (state) => state,
  { whitelist: ['auth'] },
)

const persistConfig = {
  key: 'dopa-fms',
  storage,
  whitelist: ['auth'],
  transforms: [authTransform],
}

const rootReducer = combineReducers({ auth: authSlice })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const persistedReducer = persistReducer(persistConfig, rootReducer as any)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (gDM) => gDM({ serializableCheck: false }),
})

export const persistor = persistStore(store)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
