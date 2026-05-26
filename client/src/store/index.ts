import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
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

const persistConfig = { key: 'dopa-fms', storage, whitelist: ['auth'] }

const rootReducer = combineReducers({ auth: authSlice })

export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducer),
  middleware: (gDM) => gDM({ serializableCheck: false }),
})

export const persistor = persistStore(store)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
