import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  accessToken: string | null
  role: string | null
  userId: string | null
  facultyId: string | null
  batchId: string | null
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { accessToken: null, role: null, userId: null, facultyId: null, batchId: null } as AuthState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthState>) => { Object.assign(state, action.payload) },
    clearCredentials: (state) => {
      state.accessToken = null; state.role = null; state.userId = null
      state.facultyId = null; state.batchId = null
    },
  },
})

export const { setCredentials, clearCredentials } = authSlice.actions
export default authSlice.reducer
